const Database = require('better-sqlite3');
const path = require('path');
const ui = require('./ui');

const db = new Database(path.join(__dirname, '../bot.db'));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT
  );

  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY,
    title TEXT
  );

  CREATE TABLE IF NOT EXISTS group_settings (
    group_id INTEGER PRIMARY KEY,
    language TEXT DEFAULT 'EN',
    daily_report INTEGER DEFAULT 0,
    count_media INTEGER DEFAULT 1,
    show_propic INTEGER DEFAULT 0,
    show_chart INTEGER DEFAULT 1,
    notifications INTEGER DEFAULT 1,
    weekly_report INTEGER DEFAULT 0,
    profile_view TEXT DEFAULT 'text_only',
    objectives_rate INTEGER DEFAULT 500,
    objectives_text TEXT DEFAULT 'default',
    hangman_enabled INTEGER DEFAULT 0,
    fast_typing_enabled INTEGER DEFAULT 0,
    auto_delete_commands INTEGER DEFAULT 1,
    FOREIGN KEY (group_id) REFERENCES groups(id)
  );

  CREATE TABLE IF NOT EXISTS stats (
    user_id INTEGER,
    group_id INTEGER,
    date TEXT,
    count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, group_id, date)
  );

  CREATE TABLE IF NOT EXISTS daily_milestones (
    group_id INTEGER,
    date TEXT,
    milestone_500 INTEGER DEFAULT 0,
    milestone_1000 INTEGER DEFAULT 0,
    milestone_1500 INTEGER DEFAULT 0,
    PRIMARY KEY (group_id, date)
  );

  CREATE INDEX IF NOT EXISTS idx_stats_user_id ON stats(user_id);
  CREATE INDEX IF NOT EXISTS idx_stats_group_id ON stats(group_id);
  CREATE INDEX IF NOT EXISTS idx_stats_date ON stats(date);
`);

module.exports = {
  updateUser: (user) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO users (id, username, first_name) VALUES (?, ?, ?)');
    stmt.run(user.id, user.username || null, user.first_name || null);
  },

  updateGroup: (group) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO groups (id, title) VALUES (?, ?)');
    stmt.run(group.id, group.title || null);
    
    // Ensure group settings exist
    const settingsStmt = db.prepare('INSERT OR IGNORE INTO group_settings (group_id) VALUES (?)');
    settingsStmt.run(group.id);
  },

  getGroupSettings: (groupId) => {
    const stmt = db.prepare('SELECT * FROM group_settings WHERE group_id = ?');
    return stmt.get(groupId) || {
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

  updateGroupSetting: (groupId, setting, value) => {
    // Basic validation to prevent SQL injection (even with placeholders, good practice)
    const allowedSettings = [
      'language', 'daily_report', 'count_media', 'show_propic', 
      'show_chart', 'notifications', 'hangman_enabled', 'fast_typing_enabled',
      'weekly_report', 'profile_view', 'objectives_rate', 'objectives_text',
      'auto_delete_commands'
    ];
    if (!allowedSettings.includes(setting)) return;

    const stmt = db.prepare(`UPDATE group_settings SET ${setting} = ? WHERE group_id = ?`);
    stmt.run(value, groupId);
  },

  incrementMessageCount: (userId, groupId) => {
    const today = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO stats (user_id, group_id, date, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(user_id, group_id, date) DO UPDATE SET count = count + 1
    `);
    stmt.run(userId, groupId, today);
  },

  // Check and return milestone reached (if any)
  checkMessageMilestone: (groupId) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Get total messages today for this group
    const totalToday = db.getTotalMessages(groupId, 'today');
    
    // Get or create milestone record for today
    let milestoneRecord = db.prepare('SELECT * FROM daily_milestones WHERE group_id = ? AND date = ?').get(groupId, today);
    
    if (!milestoneRecord) {
      db.prepare('INSERT INTO daily_milestones (group_id, date) VALUES (?, ?)').run(groupId, today);
      milestoneRecord = { group_id: groupId, date: today, milestone_500: 0, milestone_1000: 0, milestone_1500: 0 };
    }
    
    // Check which milestone was reached
    if (totalToday >= 1500 && !milestoneRecord.milestone_1500) {
      db.prepare('UPDATE daily_milestones SET milestone_1500 = 1 WHERE group_id = ? AND date = ?').run(groupId, today);
      return 1500;
    }
    
    if (totalToday >= 1000 && !milestoneRecord.milestone_1000) {
      db.prepare('UPDATE daily_milestones SET milestone_1000 = 1 WHERE group_id = ? AND date = ?').run(groupId, today);
      return 1000;
    }
    
    if (totalToday >= 500 && !milestoneRecord.milestone_500) {
      db.prepare('UPDATE daily_milestones SET milestone_500 = 1 WHERE group_id = ? AND date = ?').run(groupId, today);
      return 500;
    }
    
    return 0; // No milestone reached
  },

  getUserStats: (userId) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const overall = db.prepare('SELECT SUM(count) as total, COUNT(DISTINCT group_id) as groups FROM stats WHERE user_id = ?').get(userId);
    const daily = db.prepare('SELECT SUM(count) as total, COUNT(DISTINCT group_id) as groups FROM stats WHERE user_id = ? AND date = ?').get(userId, today);
    const weekly = db.prepare('SELECT SUM(count) as total, COUNT(DISTINCT group_id) as groups FROM stats WHERE user_id = ? AND date >= ?').get(userId, weekAgo);

    return {
      overall: { total: overall.total || 0, groups: overall.groups || 0 },
      today: { total: daily.total || 0, groups: daily.groups || 0 },
      weekly: { total: weekly.total || 0, groups: weekly.groups || 0 }
    };
  },

  getLeaderboard: (groupId, period = 'overall') => {
    let dateFilter = '';
    const params = [];
    
    if (groupId) {
      dateFilter += ' WHERE group_id = ?';
      params.push(groupId);
    }

    if (period === 'today') {
      const today = new Date().toISOString().split('T')[0];
      dateFilter += (groupId ? ' AND' : ' WHERE') + ' date = ?';
      params.push(today);
    } else if (period === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateFilter += (groupId ? ' AND' : ' WHERE') + ' date >= ?';
      params.push(weekAgo);
    }

    const stmt = db.prepare(`
      SELECT s.user_id, u.username, u.first_name, SUM(s.count) as total
      FROM stats s
      JOIN users u ON s.user_id = u.id
      ${dateFilter}
      GROUP BY s.user_id
      ORDER BY total DESC
      LIMIT 10
    `);

    return stmt.all(...params);
  },

  getGlobalRank: (userId, period = 'overall') => {
    let dateFilter = '';
    const params = [];
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter = 'WHERE date = ?';
      params.push(today);
    } else if (period === 'weekly') {
      dateFilter = 'WHERE date >= ?';
      params.push(weekAgo);
    }

    const subquery = `SELECT user_id, SUM(count) as total FROM stats ${dateFilter} GROUP BY user_id`;
    
    const countStmt = db.prepare(`SELECT COUNT(*) as total_users FROM (${subquery})`);
    const rankStmt = db.prepare(`
      SELECT rank FROM (
        SELECT user_id, RANK() OVER (ORDER BY SUM(count) DESC) as rank
        FROM stats
        ${dateFilter}
        GROUP BY user_id
      ) WHERE user_id = ?
    `);

    const totalUsers = countStmt.get(...params).total_users;
    const userRank = rankStmt.get(...params, userId);

    return { rank: userRank ? userRank.rank : totalUsers, total: totalUsers };
  },

  getGlobalUserLeaderboard: (period = 'overall', limit = 20) => {
    let dateFilter = '';
    const params = [];
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter = 'WHERE date = ?';
      params.push(today);
    } else if (period === 'weekly') {
      dateFilter = 'WHERE date >= ?';
      params.push(weekAgo);
    }

    const stmt = db.prepare(`
      SELECT s.user_id, u.username, u.first_name, SUM(s.count) as total, COUNT(DISTINCT s.group_id) as groups
      FROM stats s
      JOIN users u ON s.user_id = u.id
      ${dateFilter}
      GROUP BY s.user_id
      ORDER BY total DESC
      LIMIT ?
    `);

    return stmt.all(...params, limit);
  },

  getGlobalGroupLeaderboard: (period = 'overall', limit = 20) => {
    let dateFilter = '';
    const params = [];
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter = 'WHERE date = ?';
      params.push(today);
    } else if (period === 'weekly') {
      dateFilter = 'WHERE date >= ?';
      params.push(weekAgo);
    }

    const stmt = db.prepare(`
      SELECT s.group_id, g.title, COUNT(DISTINCT s.user_id) as active_users, SUM(s.count) as total
      FROM stats s
      JOIN groups g ON s.group_id = g.id
      ${dateFilter}
      GROUP BY s.group_id
      ORDER BY total DESC
      LIMIT ?
    `);

    return stmt.all(...params, limit);
  },

  getUserGroups: (userId, period = 'overall') => {
    let dateFilter = '';
    const params = [userId];
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (period === 'today') {
      dateFilter = 'AND date = ?';
      params.push(today);
    } else if (period === 'weekly') {
      dateFilter = 'AND date >= ?';
      params.push(weekAgo);
    }

    const stmt = db.prepare(`
      SELECT s.group_id, g.title, SUM(s.count) as user_messages,
             RANK() OVER (ORDER BY SUM(s.count) DESC) as user_rank_in_group
      FROM stats s
      JOIN groups g ON s.group_id = g.id
      WHERE s.user_id = ? ${dateFilter}
      GROUP BY s.group_id
      ORDER BY user_messages DESC
    `);

    return stmt.all(...params);
  },

  getTotalMessages: (groupId, period = 'overall') => {
    let dateFilter = '';
    const params = [];
    if (groupId) {
      dateFilter += ' WHERE group_id = ?';
      params.push(groupId);
    }

    if (period === 'today') {
      const today = new Date().toISOString().split('T')[0];
      dateFilter += (groupId ? ' AND' : ' WHERE') + ' date = ?';
      params.push(today);
    } else if (period === 'weekly') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dateFilter += (groupId ? ' AND' : ' WHERE') + ' date >= ?';
      params.push(weekAgo);
    }

    const stmt = db.prepare(`SELECT SUM(count) as total FROM stats ${dateFilter}`);
    return stmt.get(...params).total || 0;
  },

  // Daily data update - called at midnight
  performDailyUpdate: (bot) => {
    console.log(`Performing daily update for ${new Date().toISOString()}`);
    
    // Reset daily milestones for the new day
    db.prepare('DELETE FROM daily_milestones').run();
    console.log('Daily milestones reset');
    
    // The daily data is automatically tracked by the date column
    // This function can be used for:
    // 1. Archiving old data if needed
    // 2. Sending daily reports to groups that have it enabled
    // 3. Cleaning up very old data (optional)
    
    // Get all groups with daily_report enabled
    const groupsWithDailyReport = db.prepare(`
      SELECT gs.group_id, g.title 
      FROM group_settings gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.daily_report = 1
    `).all();
    
    console.log(`Found ${groupsWithDailyReport.length} groups with daily reports enabled`);
    
    // Send daily leaderboard to each group
    groupsWithDailyReport.forEach(group => {
      try {
        const leaderboard = db.getLeaderboard(group.group_id, 'today');
        const totalMessages = db.getTotalMessages(group.group_id, 'today');
        
        if (leaderboard.length > 0) {
          const text = ui.formatLeaderboard(leaderboard, totalMessages, 'today');
          const keyboard = ui.leaderboardKeyboard('today');
          
          bot.telegram.sendMessage(group.group_id, `📊 *DAILY LEADERBOARD*\n\n${text}`, {
            parse_mode: 'Markdown',
            ...keyboard
          });
          
          console.log(`Sent daily report to group: ${group.title} (${group.group_id})`);
        }
      } catch (error) {
        console.error(`Error sending daily report to group ${group.group_id}:`, error);
      }
    });
    
    return groupsWithDailyReport;
  },

  // Weekly data update - called on Mondays
  performWeeklyUpdate: (bot) => {
    console.log(`Performing weekly update for ${new Date().toISOString()}`);
    
    // Get all groups with weekly_report enabled
    const groupsWithWeeklyReport = db.prepare(`
      SELECT gs.group_id, g.title 
      FROM group_settings gs
      JOIN groups g ON gs.group_id = g.id
      WHERE gs.weekly_report = 1
    `).all();
    
    console.log(`Found ${groupsWithWeeklyReport.length} groups with weekly reports enabled`);
    
    // Send weekly leaderboard to each group
    groupsWithWeeklyReport.forEach(group => {
      try {
        const leaderboard = db.getLeaderboard(group.group_id, 'weekly');
        const totalMessages = db.getTotalMessages(group.group_id, 'weekly');
        
        if (leaderboard.length > 0) {
          const text = ui.formatLeaderboard(leaderboard, totalMessages, 'weekly');
          const keyboard = ui.leaderboardKeyboard('weekly');
          
          bot.telegram.sendMessage(group.group_id, `📊 *WEEKLY LEADERBOARD*\n\n${text}`, {
            parse_mode: 'Markdown',
            ...keyboard
          });
          
          console.log(`Sent weekly report to group: ${group.title} (${group.group_id})`);
        }
      } catch (error) {
        console.error(`Error sending weekly report to group ${group.group_id}:`, error);
      }
    });
    
    return groupsWithWeeklyReport;
  }
};
