require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const cron = require('node-cron');
const db = require('./db');
const ui = require('./ui');
const graph = require('./graph');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Get bot username on launch
bot.telegram.getMe().then((botInfo) => {
  process.env.BOT_USERNAME = botInfo.username;
  
  // Set command suggestions
  bot.telegram.setMyCommands([
    { command: 'rankings', description: 'View the group leaderboard' },
    { command: 'topgame', description: 'View the group points leaderboard' },
    { command: 'topusers', description: 'View the global users leaderboard' },
    { command: 'topgroups', description: 'View the global groups leaderboard' },
    { command: 'profile', description: 'View your stats' },
    { command: 'mygifts', description: 'View your gifts' },
    { command: 'mytop', description: 'See the ranking of groups you are a member of' },
    { command: 'groupstats', description: '[ADMINISTRATORS] View the group stats' },
    { command: 'hangman', description: '[ADMINISTRATORS] Start the hangman game' },
    { command: 'stophangman', description: '[ADMINISTRATORS] Stop the hangman game' },
    { command: 'settings', description: 'Manage bot settings' }
  ]);
});

// Middleware for message tracking
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.from && !ctx.from.is_bot) {
    db.updateUser(ctx.from);
    if (ctx.chat && (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup')) {
      db.updateGroup(ctx.chat);
      db.incrementMessageCount(ctx.from.id, ctx.chat.id);
      
      // Check for message milestones
      const settings = db.getGroupSettings(ctx.chat.id);
      if (settings.notifications) {
        const milestone = db.checkMessageMilestone(ctx.chat.id);
        if (milestone > 0) {
          const milestoneMessages = {
            500: `🎉 *MILESTONE REACHED!*\n\nThis group has sent *500 messages* today! Keep the conversation going! 🔥`,
            1000: `🏆 *AMAZING MILESTONE!*\n\nThis group has sent *1,000 messages* today! You're on fire! 🔥🔥`,
            1500: `💎 *INCREDIBLE MILESTONE!*\n\nThis group has sent *1,500 messages* today! This community is unstoppable! 🚀`
          };
          
          await ctx.reply(milestoneMessages[milestone], {
            parse_mode: 'Markdown'
          });
        }
      }
    }
  }
  return next();
});

// Start command
bot.start((ctx) => {
  const welcomeText = `🤖 *Welcome*, this bot will count group messages, create rankings and give prizes to users!\n\n📚 By using this bot, you consent to the processing of your data through the [Privacy Policy](https://t.me/your_channel) and to compliance with the [Rules](https://t.me/your_channel).`;
  
  // You can also add an image as in the screenshot
  // ctx.replyWithPhoto('https://path_to_image', { caption: welcomeText, ...ui.startKeyboard() });
  
  ctx.reply(welcomeText, {
    parse_mode: 'Markdown',
    ...ui.startKeyboard()
  });
});

// Stats handler (Alias for /profile)
const statsHandler = async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view stats.');
  
  const userId = ctx.from.id;
  const stats = db.getUserStats(userId);
  const ranks = {
    overall: db.getGlobalRank(userId, 'overall'),
    today: db.getGlobalRank(userId, 'today'),
    weekly: db.getGlobalRank(userId, 'weekly')
  };

  const text = ui.formatStats(ctx.from, stats, ranks);
  
  const keyboard = ui.statsKeyboard();
  if (ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    } catch (error) {
      const botMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
      autoDeleteMessage(ctx, botMsg.message_id);
    }
  } else {
    const botMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
    autoDeleteMessage(ctx, botMsg.message_id);
    // Auto-delete the command message
    autoDeleteMessage(ctx, ctx.message.message_id);
  }
};

bot.action('stats', statsHandler);
bot.command('profile', statsHandler);
bot.command('stats', statsHandler);

// Leaderboard command (Alias for /rankings)
const leaderboardHandler = async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view the leaderboard.');
  
  if (ctx.chat.type === 'private') {
    return ctx.reply('Leaderboard is only available in groups.');
  }

  const groupId = ctx.chat.id;
  const settings = db.getGroupSettings(groupId);
  const leaderboard = db.getLeaderboard(groupId, 'overall');
  const totalMessages = db.getTotalMessages(groupId, 'overall');
  
  const text = ui.formatLeaderboard(leaderboard, totalMessages, 'overall');
  const keyboard = ui.leaderboardKeyboard('overall');

  if (settings.show_chart) {
    const graphBuffer = await graph.generateLeaderboardGraph(leaderboard);
    const botMsg = await ctx.replyWithPhoto({ source: graphBuffer }, {
      caption: text,
      parse_mode: 'Markdown',
      ...keyboard
    });
    autoDeleteMessage(ctx, botMsg.message_id);
  } else {
    const botMsg = await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
    autoDeleteMessage(ctx, botMsg.message_id);
  }
  
  // Auto-delete the command message
  autoDeleteMessage(ctx, ctx.message.message_id);
};

bot.command('leaderboard', leaderboardHandler);
bot.command('rankings', leaderboardHandler);

// Back to start
bot.action('back_to_start', (ctx) => {
  const welcomeText = `🤖 *Welcome*, this bot will count group messages, create rankings and give prizes to users!\n\n📚 By using this bot, you consent to the processing of your data through the [Privacy Policy](https://t.me/your_channel) and to compliance with the [Rules](https://t.me/your_channel).`;
  
  ctx.editMessageText(welcomeText, {
    parse_mode: 'Markdown',
    ...ui.startKeyboard()
  });
});

// Settings handler
bot.action('settings', (ctx) => {
  if (ctx.chat.type === 'private') {
    ctx.editMessageText('⚙️ *SETTINGS*\n\nChoose an option to configure the bot.', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔔 Notifications', 'toggle_notifications')],
        [Markup.button.callback('⬅️ Back', 'back_to_start')]
      ])
    });
  } else {
    // In group, show group settings
    ctx.editMessageText('⚙️ *GROUP SETTINGS*\n\nChoose an option to configure the bot for this group.', {
      parse_mode: 'Markdown',
      ...ui.groupSettingsKeyboard()
    });
  }
});

// Admin check helper
const isAdmin = async (ctx) => {
  if (ctx.chat.type === 'private') return true;
  const member = await ctx.getChatMember(ctx.from.id);
  return ['administrator', 'creator'].includes(member.status);
};

// Auto-delete message helper
const autoDeleteMessage = async (ctx, messageId, delay = 60000) => {
  try {
    const settings = db.getGroupSettings(ctx.chat.id);
    if (settings.auto_delete_commands && ctx.chat.type !== 'private') {
      setTimeout(async () => {
        try {
          await ctx.deleteMessage(messageId);
        } catch (error) {
          // Message might already be deleted
        }
      }, delay);
    }
  } catch (error) {
    // Not in a group chat or other error
  }
};

// Group Settings Callback Handlers
bot.action('gs_main', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  ctx.editMessageText('⚙️ *GROUP SETTINGS*\n\nChoose an option to configure the bot for this group.', {
    parse_mode: 'Markdown',
    ...ui.groupSettingsKeyboard()
  });
});

bot.action('gs_lang', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const settings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText('ChatFight ⚡                                     admin\n🏳️ *Choose the group language*', {
    parse_mode: 'Markdown',
    ...ui.languageKeyboard(settings.language)
  });
});

bot.action(/setlang_(.+)/, async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const lang = ctx.match[1];
  db.updateGroupSetting(ctx.chat.id, 'language', lang);
  ctx.editMessageText('ChatFight ⚡                                     admin\n🏳️ *Choose the group language*', {
    parse_mode: 'Markdown',
    ...ui.languageKeyboard(lang)
  });
});

bot.action('gs_games', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  ctx.editMessageText('ChatFight ⚡                                     admin\n👾 *Choose the game to manage*\nYou can view the local score leaderboard with the command /topgame.', {
    parse_mode: 'Markdown',
    ...ui.gamesKeyboard()
  });
});

bot.action('gs_game_hangman', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const settings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText(ui.formatHangmanSettings(settings.hangman_enabled), {
    parse_mode: 'Markdown',
    ...ui.gameSettingsKeyboard('hangman', settings.hangman_enabled)
  });
});

bot.action('gs_game_fast', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const settings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText(ui.formatFastTypingSettings(settings.fast_typing_enabled), {
    parse_mode: 'Markdown',
    ...ui.gameSettingsKeyboard('fast_typing', settings.fast_typing_enabled)
  });
});

bot.action(/toggle_game_(.+)/, async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const game = ctx.match[1];
  const settingKey = `${game}_enabled`;
  const settings = db.getGroupSettings(ctx.chat.id);
  const newValue = settings[settingKey] ? 0 : 1;
  db.updateGroupSetting(ctx.chat.id, settingKey, newValue);
  
  if (game === 'hangman') {
    ctx.editMessageText(ui.formatHangmanSettings(newValue), {
      parse_mode: 'Markdown',
      ...ui.gameSettingsKeyboard(game, newValue)
    });
  } else {
    ctx.editMessageText(ui.formatFastTypingSettings(newValue), {
      parse_mode: 'Markdown',
      ...ui.gameSettingsKeyboard(game, newValue)
    });
  }
});

bot.action('gs_other', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const settings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText(ui.formatOtherSettings(settings), {
    parse_mode: 'Markdown',
    ...ui.otherSettingsKeyboard(settings)
  });
});

bot.action(/toggle_s_(.+)/, async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const setting = ctx.match[1];
  const settings = db.getGroupSettings(ctx.chat.id);
  const newValue = settings[setting] ? 0 : 1;
  db.updateGroupSetting(ctx.chat.id, setting, newValue);
  
  const updatedSettings = db.getGroupSettings(ctx.chat.id);
  // Determine which UI to show based on the current view
  if (ctx.callbackQuery.message.text.includes('OBJECTIVES NOTIFICATION')) {
    ctx.editMessageText(ui.formatObjectivesSettings(updatedSettings), {
      parse_mode: 'Markdown',
      ...ui.objectivesKeyboard(updatedSettings.notifications)
    });
  } else {
    ctx.editMessageText(ui.formatOtherSettings(updatedSettings), {
      parse_mode: 'Markdown',
      ...ui.otherSettingsKeyboard(updatedSettings)
    });
  }
});

bot.action('gs_profile_view', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const settings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText(ui.formatProfileView(), {
    parse_mode: 'Markdown',
    ...ui.profileViewKeyboard(settings.profile_view)
  });
});

bot.action(/setpv_(.+)/, async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const view = ctx.match[1];
  db.updateGroupSetting(ctx.chat.id, 'profile_view', view);
  ctx.editMessageText(ui.formatProfileView(), {
    parse_mode: 'Markdown',
    ...ui.profileViewKeyboard(view)
  });
});

bot.action('gs_objectives', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  const settings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText(ui.formatObjectivesSettings(settings), {
    parse_mode: 'Markdown',
    ...ui.objectivesKeyboard(settings.notifications)
  });
});

bot.action('set_obj_rate', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  // In a real implementation, you'd use a wizard or prompt for a number.
  // For this task, we'll cycle through some common values.
  const rates = [100, 500, 1000, 2000, 5000];
  const settings = db.getGroupSettings(ctx.chat.id);
  const nextRate = rates[(rates.indexOf(settings.objectives_rate) + 1) % rates.length];
  db.updateGroupSetting(ctx.chat.id, 'objectives_rate', nextRate);
  
  const updatedSettings = db.getGroupSettings(ctx.chat.id);
  ctx.editMessageText(ui.formatObjectivesSettings(updatedSettings), {
    parse_mode: 'Markdown',
    ...ui.objectivesKeyboard(updatedSettings.notifications)
  });
});

bot.action('set_obj_text', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.answerCbQuery('Only admins can change settings.');
  ctx.answerCbQuery('To change the text, use /setobjectivestext [text]');
});

// Group Stats
bot.command('groupstats', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view group stats.');
  const groupId = ctx.chat.id;
  const totalMessages = db.getTotalMessages(groupId, 'overall');
  const todayMessages = db.getTotalMessages(groupId, 'today');
  const botMsg = await ctx.reply(`📊 *GROUP STATS*\n\n📩 Total messages: *${totalMessages.toLocaleString()}*\n📩 Messages today: *${todayMessages.toLocaleString()}*`, { parse_mode: 'Markdown' });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});

// Placeholder commands for global features
bot.command('topusers', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view global users leaderboard.');
  
  const period = 'overall'; // Default period
  const leaderboard = db.getGlobalUserLeaderboard(period, 20);
  const text = ui.formatGlobalUserLeaderboard(leaderboard, period);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Overall', 'gub_overall')],
    [
      Markup.button.callback('Today', 'gub_today'),
      Markup.button.callback('Week', 'gub_weekly')
    ]
  ]);
  
  const botMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});

bot.command('topgroups', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view global groups leaderboard.');
  
  const period = 'overall'; // Default period
  const leaderboard = db.getGlobalGroupLeaderboard(period, 20);
  const text = ui.formatGlobalGroupLeaderboard(leaderboard, period);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Overall', 'ggb_overall')],
    [
      Markup.button.callback('Today', 'ggb_today'),
      Markup.button.callback('Week', 'ggb_weekly')
    ]
  ]);
  
  const botMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});
bot.command('topgame', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view game scores.');
  const botMsg = await ctx.reply('👾 *TOP GAME SCORES*\nComing soon!', { parse_mode: 'Markdown' });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});
bot.command('mygifts', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view gifts.');
  const botMsg = await ctx.reply('🎁 *YOUR GIFTS*\nYou have no gifts yet.', { parse_mode: 'Markdown' });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});
bot.command('mytop', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can view top groups.');
  
  const userId = ctx.from.id;
  const period = 'overall'; // Default period
  const userGroups = db.getUserGroups(userId, period);
  const text = ui.formatMyTopGroups(userGroups, period);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Overall', 'mtg_overall')],
    [
      Markup.button.callback('Today', 'mtg_today'),
      Markup.button.callback('Week', 'mtg_weekly')
    ]
  ]);
  
  const botMsg = await ctx.reply(text, { parse_mode: 'Markdown', ...keyboard });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});
bot.command('hangman', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can start hangman game.');
  const botMsg = await ctx.reply('🎮 *HANGMAN*\nGame starting soon...', { parse_mode: 'Markdown' });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});
bot.command('stophangman', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can stop hangman game.');
  const botMsg = await ctx.reply('🎮 *HANGMAN*\nGame stopped.', { parse_mode: 'Markdown' });
  autoDeleteMessage(ctx, botMsg.message_id);
  autoDeleteMessage(ctx, ctx.message.message_id);
});

// Settings command
bot.command('settings', async (ctx) => {
  if (!await isAdmin(ctx)) return ctx.reply('Only admins can access settings.');
  
  if (ctx.chat.type === 'private') {
    ctx.reply('⚙️ *SETTINGS*\n\nChoose an option to configure the bot.', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔔 Notifications', 'toggle_notifications')],
        [Markup.button.callback('⬅️ Back', 'back_to_start')]
      ])
    });
  } else {
    ctx.reply('⚙️ *GROUP SETTINGS*\n\nChoose an option to configure the bot for this group.', {
      parse_mode: 'Markdown',
      ...ui.groupSettingsKeyboard()
    });
  }
});

// Leaderboard command (e.g. /leaderboard)
bot.command('leaderboard', async (ctx) => {
  if (ctx.chat.type === 'private') {
    return ctx.reply('Leaderboard is only available in groups.');
  }

  const groupId = ctx.chat.id;
  const settings = db.getGroupSettings(groupId);
  const leaderboard = db.getLeaderboard(groupId, 'overall');
  const totalMessages = db.getTotalMessages(groupId, 'overall');
  
  const text = ui.formatLeaderboard(leaderboard, totalMessages, 'overall');
  const keyboard = ui.leaderboardKeyboard('overall');

  if (settings.show_chart) {
    const graphBuffer = await graph.generateLeaderboardGraph(leaderboard);
    await ctx.replyWithPhoto({ source: graphBuffer }, {
      caption: text,
      parse_mode: 'Markdown',
      ...keyboard
    });
  } else {
    ctx.reply(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  }
});

// Leaderboard actions
bot.action(/lb_(.+)/, async (ctx) => {
  const period = ctx.match[1];
  const groupId = ctx.chat.id;
  const settings = db.getGroupSettings(groupId);
  
  const leaderboard = db.getLeaderboard(groupId, period);
  const totalMessages = db.getTotalMessages(groupId, period);
  
  const text = ui.formatLeaderboard(leaderboard, totalMessages, period);
  const keyboard = ui.leaderboardKeyboard(period);
  
  try {
    if (settings.show_chart) {
      const graphBuffer = await graph.generateLeaderboardGraph(leaderboard);
      await ctx.editMessageMedia({
        type: 'photo',
        media: { source: graphBuffer },
        caption: text,
        parse_mode: 'Markdown'
      }, keyboard);
    } else {
      await ctx.editMessageText(text, {
        parse_mode: 'Markdown',
        ...keyboard
      });
    }
  } catch (error) {
    // Message not modified or other error
    console.error('Error updating leaderboard:', error);
  }
});

// Global User Leaderboard actions
bot.action(/gub_(.+)/, async (ctx) => {
  const period = ctx.match[1];
  const leaderboard = db.getGlobalUserLeaderboard(period, 20);
  const text = ui.formatGlobalUserLeaderboard(leaderboard, period);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(`${period === 'overall' ? '●' : '○'} Overall`, 'gub_overall')],
    [
      Markup.button.callback(`${period === 'today' ? '●' : '○'} Today`, 'gub_today'),
      Markup.button.callback(`${period === 'weekly' ? '●' : '○'} Week`, 'gub_weekly')
    ]
  ]);
  
  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (error) {
    console.error('Error updating global user leaderboard:', error);
  }
});

// Global Group Leaderboard actions
bot.action(/ggb_(.+)/, async (ctx) => {
  const period = ctx.match[1];
  const leaderboard = db.getGlobalGroupLeaderboard(period, 20);
  const text = ui.formatGlobalGroupLeaderboard(leaderboard, period);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(`${period === 'overall' ? '●' : '○'} Overall`, 'ggb_overall')],
    [
      Markup.button.callback(`${period === 'today' ? '●' : '○'} Today`, 'ggb_today'),
      Markup.button.callback(`${period === 'weekly' ? '●' : '○'} Week`, 'ggb_weekly')
    ]
  ]);
  
  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (error) {
    console.error('Error updating global group leaderboard:', error);
  }
});

// My Top Groups actions
bot.action(/mtg_(.+)/, async (ctx) => {
  const period = ctx.match[1];
  const userId = ctx.from.id;
  const userGroups = db.getUserGroups(userId, period);
  const text = ui.formatMyTopGroups(userGroups, period);
  
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(`${period === 'overall' ? '●' : '○'} Overall`, 'mtg_overall')],
    [
      Markup.button.callback(`${period === 'today' ? '●' : '○'} Today`, 'mtg_today'),
      Markup.button.callback(`${period === 'weekly' ? '●' : '○'} Week`, 'mtg_weekly')
    ]
  ]);
  
  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      ...keyboard
    });
  } catch (error) {
    console.error('Error updating my top groups:', error);
  }
});

bot.launch().then(() => {
  console.log('Bot is running...');
  
  // Schedule daily data update at midnight (00:00)
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily data update...');
    db.performDailyUpdate(bot);
    console.log('Daily data update completed.');
  }, {
    timezone: 'UTC' // You can change this to your local timezone
  });
  
  // Schedule weekly report on Mondays at 9:00 AM
  cron.schedule('0 9 * * 1', () => {
    console.log('Running weekly data update...');
    db.performWeeklyUpdate(bot);
    console.log('Weekly data update completed.');
  }, {
    timezone: 'UTC' // You can change this to your local timezone
  });
  
  console.log('Scheduled tasks initialized:');
  console.log('- Daily data update: Midnight UTC');
  console.log('- Weekly report: Monday 9:00 AM UTC');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
