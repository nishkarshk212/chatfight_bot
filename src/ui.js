const { Markup } = require('telegraf');

module.exports = {
  startKeyboard: () => {
    return Markup.inlineKeyboard([
      [Markup.button.url('➕ Add me in a group', `https://t.me/${process.env.BOT_USERNAME}?startgroup=true`)],
      [
        Markup.button.callback('⚙️ Settings', 'settings'),
        Markup.button.callback('📊 Your stats', 'stats')
      ],
      [Markup.button.url('📣 Updates', 'https://t.me/your_channel')]
    ]);
  },

  statsKeyboard: () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('⬅️ Back', 'back_to_start')]
    ]);
  },

  leaderboardKeyboard: (period = 'overall') => {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`${period === 'overall' ? '●' : '○'} Overall ✅`, 'lb_overall')],
      [
        Markup.button.callback(`${period === 'today' ? '●' : '○'} Today`, 'lb_today'),
        Markup.button.callback(`${period === 'weekly' ? '●' : '○'} Week`, 'lb_weekly')
      ],
      [Markup.button.callback('📊 View complete leaderboard', 'full_leaderboard')]
    ]);
  },

  groupSettingsKeyboard: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('🏳️ Language', 'gs_lang'),
        Markup.button.callback('👾 Games', 'gs_games')
      ],
      [Markup.button.callback('📚 Other settings', 'gs_other')],
      [Markup.button.callback('⬅️ Back', 'back_to_start')]
    ]);
  },

  languageKeyboard: (currentLang) => {
    const langs = [
      { code: 'AR', flag: '🇸🇦' }, { code: 'DE', flag: '🇩🇪' }, { code: 'EN', flag: '🇺🇸' },
      { code: 'ES', flag: '🇪🇸' }, { code: 'FA', flag: '🇮🇷' }, { code: 'FR', flag: '🇫🇷' },
      { code: 'HI', flag: '🇮🇳' }, { code: 'ID', flag: '🇮🇩' }, { code: 'IT', flag: '🇮🇹' },
      { code: 'ML', flag: '🇮🇳' }, { code: 'PT', flag: '🇵🇹' }, { code: 'RO', flag: '🇷🇴' },
      { code: 'RU', flag: '🇷🇺' }
    ];

    const buttons = langs.map(l => 
      Markup.button.callback(`${l.code} ${l.flag}${currentLang === l.code ? ' ●' : ''}`, `setlang_${l.code}`)
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    rows.push([Markup.button.callback('⬅️ Back', 'gs_main')]);
    return Markup.inlineKeyboard(rows);
  },

  gamesKeyboard: () => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback('⚡ Fast Typing', 'gs_game_fast'),
        Markup.button.callback('🔮 Hangman', 'gs_game_hangman')
      ],
      [Markup.button.callback('⬅️ Back', 'gs_main')]
    ]);
  },

  gameSettingsKeyboard: (game, enabled) => {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`State: ${enabled ? '✅' : '❌'}`, `toggle_game_${game}`)],
      [Markup.button.callback('⬅️ Back', 'gs_games')]
    ]);
  },

  otherSettingsKeyboard: (s) => {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`${s.daily_report ? '✅' : '❌'} Daily messages`, 'toggle_s_daily_report'),
        Markup.button.callback(`${s.count_media ? '✅' : '❌'} Media`, 'toggle_s_count_media')
      ],
      [
        Markup.button.callback(`${s.show_chart ? '✅' : '❌'} Chart`, 'toggle_s_show_chart'),
        Markup.button.callback(`${s.show_propic ? '✅' : '❌'} Show propic`, 'gs_profile_view')
      ],
      [Markup.button.callback(`${s.weekly_report ? '✅' : '❌'} Send weekly ranking on Monday`, 'toggle_s_weekly_report')],
      [Markup.button.callback(`${s.notifications ? '🎯' : '⭕'} Notification for achieved goals`, 'gs_objectives')],
      [Markup.button.callback('⬅️ Back', 'gs_main')]
    ]);
  },

  profileViewKeyboard: (current) => {
    const options = [
      { label: 'Text only', id: 'text_only' },
      { label: 'Text + profile picture', id: 'text_pic' },
      { label: 'Text + graphic report', id: 'text_graphic' },
      { label: 'Graphical report only', id: 'graphic_only' }
    ];

    const buttons = options.map(opt => [
      Markup.button.callback(`${current === opt.id ? '✅ ' : '» '}${opt.label}`, `setpv_${opt.id}`)
    ]);

    buttons.push([Markup.button.callback('⬅️ Back', 'gs_other')]);
    return Markup.inlineKeyboard(buttons);
  },

  objectivesKeyboard: (enabled) => {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`State: ${enabled ? '✅' : '❌'}`, 'toggle_s_notifications')],
      [Markup.button.callback('🔽 Message rate 🔽', 'set_obj_rate')],
      [Markup.button.callback('🔽 Message text 🔽', 'set_obj_text')],
      [Markup.button.callback('⬅️ Back', 'gs_other')]
    ]);
  },

  formatOtherSettings: (s) => {
    return `ChatFight ⚡                                     admin
📚 *Manage other bot settings*
Here you can manage other bot settings.

${s.daily_report ? '✅' : '❌'} *Daily report*: Choose whether to send the daily leaderboard automatically at midnight
${s.count_media ? '✅' : '❌'} *Count media*: Choose if you want to count media messages (such as photos, videos, etc...)
${s.show_propic ? '✅' : '❌'} *Show propic*: Choose whether to show the user's profile picture when running the /profile command
${s.show_chart ? '✅' : '❌'} *Show chart*: Choose whether to show the message graph when running the /rankings command`;
  },

  formatProfileView: () => {
    return `ChatFight ⚡                                     admin
📷 *Choose your preferred profile view*
• Text only ([Preview](https://t.me/your_channel))
• Text + profile picture ([Preview](https://t.me/your_channel))
• Text + graphic report ([Preview](https://t.me/your_channel))
• Graphic report only ([Preview](https://t.me/your_channel))`;
  },

  formatObjectivesSettings: (s) => {
    return `ChatFight ⚡                                     admin
🎯 *OBJECTIVES NOTIFICATION*
The bot will send a message to the chat to notify you of the goal achieved every so many messages written daily.

⏱ *Frequency:* every ${s.objectives_rate} messages
📝 *Message text:* ${s.objectives_text}`;
  },

  formatHangmanSettings: (enabled) => {
    return `ChatFight ⚡                                     admin
🔮 *HANGMAN*
Relive the experience of the classic Hangman game comfortably in your group, with words chosen by you.

Using the /hangman command, you can choose the first word for the game or let the bot choose it automatically. From that moment on, users can propose a letter (or try to guess the entire word) by replying to the bot's message, with a maximum of 7 attempts.

When the user has guessed the word, only administrators can choose a new word to continue the game. At any time, here in the settings or with the /stophangman command, you can stop the game.

🧪 *Maximum number of attempts:* 7`;
  },

  formatFastTypingSettings: (enabled) => {
    return `ChatFight ⚡                                     admin
⚡ *FAST TYPING*
The bot will send an image containing a word that users must retype as a text message as quickly as possible. The first one to type it wins.

⏱ *Frequency:* 1 hour`;
  },

  formatStats: (user, stats, ranks) => {
    return `📊 *YOUR STATS*
👥 ChatFight detects you in *${stats.overall.groups} groups*.

— *Overall stats*
🏆 Global ranking position: *${ranks.overall.rank}º* of *~${ranks.overall.total}*
📩 Messages sent: *${stats.overall.total.toLocaleString()}*
👥 Active groups: *${stats.overall.groups}*

— *Today's stats*
🏆 Global ranking position: *${ranks.today.rank}º* of *~${ranks.today.total}*
📩 Messages sent: *${stats.today.total.toLocaleString()}*
👥 Active groups: *${stats.today.groups}*

— *This week's stats*
🏆 Global ranking position: *${ranks.weekly.rank}º* of *~${ranks.weekly.total}*
📩 Messages sent: *${stats.weekly.total.toLocaleString()}*
👥 Active groups: *${stats.weekly.groups}*`;
  },

  formatLeaderboard: (leaderboard, totalMessages, period = 'overall') => {
    let text = `📈 *LEADERBOARD*\n`;
    
    leaderboard.forEach((entry, index) => {
      const name = entry.first_name || entry.username || `User ${entry.user_id}`;
      text += `${index + 1}. 👤 [${name}](tg://user?id=${entry.user_id}) • ${entry.total.toLocaleString()}\n`;
    });

    text += `\n✉️ *Total messages:* ${totalMessages.toLocaleString()}\n\n`;
    text += `Enable *AI Summary* in this group using the /upgrade command.`;
    
    return text;
  },

  formatGlobalUserLeaderboard: (leaderboard, period = 'overall') => {
    const periodText = period === 'today' ? 'TODAY' : period === 'weekly' ? 'THIS WEEK' : 'OVERALL';
    let text = `🌍 *GLOBAL USERS LEADERBOARD - ${periodText}*\n\n`;
    
    leaderboard.forEach((entry, index) => {
      const name = entry.first_name || entry.username || `User ${entry.user_id}`;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      text += `${medal} 👤 [${name}](tg://user?id=${entry.user_id}) • ${entry.total.toLocaleString()} messages in ${entry.groups} groups\n`;
    });

    text += `\n💡 Use /topusers to view the global ranking across all groups.`;
    
    return text;
  },

  formatGlobalGroupLeaderboard: (leaderboard, period = 'overall') => {
    const periodText = period === 'today' ? 'TODAY' : period === 'weekly' ? 'THIS WEEK' : 'OVERALL';
    let text = `🏢 *GLOBAL GROUPS LEADERBOARD - ${periodText}*\n\n`;
    
    leaderboard.forEach((entry, index) => {
      const title = entry.title || `Group ${entry.group_id}`;
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      text += `${medal} 💬 [${title}](https://t.me/c/${String(entry.group_id).slice(4)}/1) • ${entry.total.toLocaleString()} messages • ${entry.active_users} active users\n`;
    });

    text += `\n💡 Use /topgroups to view the global group ranking.`;
    
    return text;
  },

  formatMyTopGroups: (userGroups, period = 'overall') => {
    const periodText = period === 'today' ? 'TODAY' : period === 'weekly' ? 'THIS WEEK' : 'OVERALL';
    let text = `🏅 *MY TOP GROUPS - ${periodText}*\n\n`;
    
    if (userGroups.length === 0) {
      text += `You haven't sent any messages ${period === 'today' ? 'today' : period === 'weekly' ? 'this week' : 'yet'}.\n`;
    } else {
      userGroups.forEach((group, index) => {
        const title = group.title || `Group ${group.group_id}`;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        text += `${medal} 💬 *${title}*\n`;
        text += `   Your rank: #${group.user_rank_in_group} • Messages: ${group.user_messages.toLocaleString()}\n\n`;
      });
    }

    text += `💡 Use /mytop to see your ranking in all your groups.`;
    
    return text;
  }
};
