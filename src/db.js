const { models } = require('./mongodb');
const ui = require('./ui');

module.exports = {
  updateUser: async (user) => {
    await models.User.findOneAndUpdate(
      { id: user.id },
      { 
        id: user.id, 
        username: user.username || null, 
        first_name: user.first_name || null 
      },
      { upsert: true, new: true }
    );
  },

  updateGroup: async (group) => {
    await models.Group.findOneAndUpdate(
      { id: group.id },
      { id: group.id, title: group.title || null },
      { upsert: true, new: true }
    );
    
    // Ensure group settings exist
    await models.GroupSettings.findOneAndUpdate(
      { group_id: group.id },
      { group_id: group.id },
      { upsert: true, new: true }
    );
  },

  getGroupSettings: async (groupId) => {
    const settings = await models.GroupSettings.findOne({ group_id: groupId });
    return settings || {
      group_id: groupId,
      language: 'EN',
      daily_report: 0,
      count_media: 1,
      show_propic: 0,
      show_chart: 1,
      notifications: 1,
      hangman_enabled: 0,
      fast_typing_enabled: 0,
      auto_delete_commands: 1
    };
  },

  updateGroupSetting: async (groupId, setting, value) => {
    const allowedSettings = [
      'language', 'daily_report', 'count_media', 'show_propic', 
      'show_chart', 'notifications', 'hangman_enabled', 'fast_typing_enabled',
      'weekly_report', 'profile_view', 'objectives_rate', 'objectives_text',
      'auto_delete_commands'
    ];
    if (!allowedSettings.includes(setting)) return;

    await models.GroupSettings.findOneAndUpdate(
      { group_id: groupId },
      { [setting]: value }
    );
  },

  incrementMessageCount: async (userId, groupId) => {
    const today = new Date().toISOString().split('T')[0];
    await models.Stat.findOneAndUpdate(
      { user_id: userId, group_id: groupId, date: today },
      { 
        $inc: { count: 1 },
        $setOnInsert: { user_id: userId, group_id: groupId, date: today }
      },
      { upsert: true, new: true }
    );
  },

  // Check and return milestone reached (if any)
  checkMessageMilestone: async (groupId) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get total messages today for this group
    const totalToday = await this.getTotalMessages(groupId, 'today');
    
    // Get or create milestone record for today
    let milestoneRecord = await models.DailyMilestone.findOne({ group_id: groupId, date: today });
    
    if (!milestoneRecord) {
      await models.DailyMilestone.create({ group_id: groupId, date: today });
      milestoneRecord = { group_id: groupId, date: today, milestone_500: 0, milestone_1000: 0, milestone_1500: 0 };
    }
    
    // Check which milestone was reached
    if (totalToday >= 1500 && !milestoneRecord.milestone_1500) {
      await models.DailyMilestone.findOneAndUpdate(
        { group_id: groupId, date: today },
        { milestone_1500: 1 }
      );
      return 1500;
    }
    
    if (totalToday >= 1000 && !milestoneRecord.milestone_1000) {
      await models.DailyMilestone.findOneAndUpdate(
        { group_id: groupId, date: today },
        { milestone_1000: 1 }
      );
      return 1000;
    }
    
    if (totalToday >= 500 && !milestoneRecord.milestone_500) {
      await models.DailyMilestone.findOneAndUpdate(
        { group_id: groupId, date: today },
        { milestone_500: 1 }
      );
      return 500;
    }
    
    return 0; // No milestone reached
  },

  getUserStats: async (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const overall = await models.Stat.aggregate([
      { $match: { user_id: userId } },
      { $group: { _id: null, total: { $sum: '$count' }, groups: { $addToSet: '$group_id' } } }
    ]);

    const daily = await models.Stat.aggregate([
      { $match: { user_id: userId, date: today } },
      { $group: { _id: null, total: { $sum: '$count' }, groups: { $addToSet: '$group_id' } } }
    ]);

    const weekly = await models.Stat.aggregate([
      { $match: { user_id: userId, date: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$count' }, groups: { $addToSet: '$group_id' } } }
    ]);

    return {
      overall: { total: overall[0]?.total || 0, groups: overall[0]?.groups?.length || 0 },
      today: { total: daily[0]?.total || 0, groups: daily[0]?.groups?.length || 0 },
      weekly: { total: weekly[0]?.total || 0, groups: weekly[0]?.groups?.length || 0 }
    };
  },

  getLeaderboard: async (groupId, period = 'overall') => {
    let dateFilter = {};
    
    if (groupId) {
      dateFilter.group_id = groupId;
    }

    if (period === 'today') {
      const today = new Date().toISOString().split('T')[0];
      dateFilter.date = today;
    } else if (period === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateFilter.date = { $gte: weekAgo };
    }

    const leaderboard = await models.Stat.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$user_id', total: { $sum: '$count' } } },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $project: { user_id: '$_id', username: '$user.username', first_name: '$user.first_name', total: 1, _id: 0 } }
    ]);

    return leaderboard;
  },

  getGlobalRank: async (userId, period = 'overall') => {
    let dateFilter = {};
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter.date = today;
    } else if (period === 'weekly') {
      dateFilter.date = { $gte: weekAgo };
    }

    const userStats = await models.Stat.aggregate([
      { $match: { ...dateFilter, user_id: userId } },
      { $group: { _id: '$user_id', total: { $sum: '$count' } } }
    ]);

    const allUsersStats = await models.Stat.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$user_id', total: { $sum: '$count' } } },
      { $sort: { total: -1 } }
    ]);

    const totalUsers = allUsersStats.length;
    const userRank = allUsersStats.findIndex(u => u._id === userId) + 1;

    return { rank: userRank || totalUsers, total: totalUsers };
  },

  getGlobalUserLeaderboard: async (period = 'overall', limit = 20) => {
    let dateFilter = {};
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter.date = today;
    } else if (period === 'weekly') {
      dateFilter.date = { $gte: weekAgo };
    }

    const leaderboard = await models.Stat.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$user_id', total: { $sum: '$count' }, groups: { $addToSet: '$group_id' } } },
      { $sort: { total: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      { $project: { user_id: '$_id', username: '$user.username', first_name: '$user.first_name', total: 1, groups: { $size: '$groups' }, _id: 0 } }
    ]);

    return leaderboard;
  },

  getGlobalGroupLeaderboard: async (period = 'overall', limit = 20) => {
    let dateFilter = {};
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter.date = today;
    } else if (period === 'weekly') {
      dateFilter.date = { $gte: weekAgo };
    }

    const leaderboard = await models.Stat.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$group_id', total: { $sum: '$count' }, active_users: { $addToSet: '$user_id' } } },
      { $sort: { total: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'groups',
          localField: '_id',
          foreignField: 'id',
          as: 'group'
        }
      },
      { $unwind: '$group' },
      { $project: { group_id: '$_id', title: '$group.title', total: 1, active_users: { $size: '$active_users' }, _id: 0 } }
    ]);

    return leaderboard;
  },

  getUserGroups: async (userId, period = 'overall') => {
    let dateFilter = {};
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter.date = today;
    } else if (period === 'weekly') {
      dateFilter.date = { $gte: weekAgo };
    }

    const userGroups = await models.Stat.aggregate([
      { $match: { ...dateFilter, user_id: userId } },
      { $group: { _id: '$group_id', user_messages: { $sum: '$count' } } },
      { $sort: { user_messages: -1 } },
      {
        $lookup: {
          from: 'groups',
          localField: '_id',
          foreignField: 'id',
          as: 'group'
        }
      },
      { $unwind: '$group' },
      { $project: { group_id: '$_id', title: '$group.title', user_messages: 1, _id: 0 } }
    ]);

    // Add rank calculation
    for (let i = 0; i < userGroups.length; i++) {
      const groupStats = await models.Stat.aggregate([
        { $match: { ...dateFilter, group_id: userGroups[i].group_id } },
        { $group: { _id: '$user_id', total: { $sum: '$count' } } },
        { $sort: { total: -1 } }
      ]);
      
      userGroups[i].user_rank_in_group = groupStats.findIndex(u => u._id === userId) + 1;
    }

    return userGroups;
  },

  getTotalMessages: async (groupId, period = 'overall') => {
    let dateFilter = {};
    if (groupId) {
      dateFilter.group_id = groupId;
    }

    if (period === 'today') {
      const today = new Date().toISOString().split('T')[0];
      dateFilter.date = today;
    } else if (period === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateFilter.date = { $gte: weekAgo };
    }

    const result = await models.Stat.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, total: { $sum: '$count' } } }
    ]);

    return result[0]?.total || 0;
  },

  // Daily data update - called at midnight
  performDailyUpdate: async (bot) => {
    console.log(`Performing daily update for ${new Date().toISOString()}`);
    
    // Reset daily milestones for the new day
    await models.DailyMilestone.deleteMany({});
    console.log('Daily milestones reset');
    
    // Get all groups with daily_report enabled
    const groupsWithDailyReport = await models.GroupSettings.find({ daily_report: 1 });
    
    console.log(`Found ${groupsWithDailyReport.length} groups with daily reports enabled`);
    
    // Send daily leaderboard to each group
    for (const group of groupsWithDailyReport) {
      try {
        const leaderboard = await this.getLeaderboard(group.group_id, 'today');
        const totalMessages = await this.getTotalMessages(group.group_id, 'today');
        
        if (leaderboard.length > 0) {
          const text = ui.formatLeaderboard(leaderboard, totalMessages, 'today');
          const keyboard = ui.leaderboardKeyboard('today');
          
          await bot.telegram.sendMessage(group.group_id, `📊 *DAILY LEADERBOARD*\n\n${text}`, {
            parse_mode: 'Markdown',
            ...keyboard
          });
          
          console.log(`Sent daily report to group: ${group.group_id}`);
        }
      } catch (error) {
        console.error(`Error sending daily report to group ${group.group_id}:`, error);
      }
    }
    
    return groupsWithDailyReport;
  },

  // Weekly data update - called on Mondays
  performWeeklyUpdate: async (bot) => {
    console.log(`Performing weekly update for ${new Date().toISOString()}`);
    
    // Get all groups with weekly_report enabled
    const groupsWithWeeklyReport = await models.GroupSettings.find({ weekly_report: 1 });
    
    console.log(`Found ${groupsWithWeeklyReport.length} groups with weekly reports enabled`);
    
    // Send weekly leaderboard to each group
    for (const group of groupsWithWeeklyReport) {
      try {
        const leaderboard = await this.getLeaderboard(group.group_id, 'weekly');
        const totalMessages = await this.getTotalMessages(group.group_id, 'weekly');
        
        if (leaderboard.length > 0) {
          const text = ui.formatLeaderboard(leaderboard, totalMessages, 'weekly');
          const keyboard = ui.leaderboardKeyboard('weekly');
          
          await bot.telegram.sendMessage(group.group_id, `📊 *WEEKLY LEADERBOARD*\n\n${text}`, {
            parse_mode: 'Markdown',
            ...keyboard
          });
          
          console.log(`Sent weekly report to group: ${group.group_id}`);
        }
      } catch (error) {
        console.error(`Error sending weekly report to group ${group.group_id}:`, error);
      }
    }
    
    return groupsWithWeeklyReport;
  }
};
