const { Telegraf } = require('telegraf');
const path = require('path');

// Import the leaderboard generator
const leaderboardGenerator = require('./leaderboard_generator');

class TelegramBot {
  constructor(token) {
    this.bot = new Telegraf(token);
    this.setupHandlers();
  }

  setupHandlers() {
    // Start command
    this.bot.start((ctx) => {
      ctx.reply('🤖 Welcome to ChatFight Bot!\n\nUse /leaderboard to see the group rankings.');
    });

    // Leaderboard command
    this.bot.command('leaderboard', async (ctx) => {
      try {
        // Sample leaderboard data for testing
        const sampleLeaderboard = [
          { user_id: 123456, first_name: 'jayden_test', username: 'jayden_test', total: 120 },
          { user_id: 234567, first_name: 'shishim_test', username: 'shishim_test', total: 55 },
          { user_id: 345678, first_name: '8308499_test', username: '8308499_test', total: 43 },
          { user_id: 456789, first_name: 'Siaaa', username: 'siaaa', total: 21 },
          { user_id: 567890, first_name: 'SHISHI_test', username: 'shishi_test', total: 20 },
          { user_id: 678901, first_name: '6962775_test', username: '6962775_test', total: 16 },
          { user_id: 789012, first_name: 'lovernoir', username: 'lovernoir', total: 15 },
          { user_id: 890123, first_name: 'lovernoir2', username: 'lovernoir2', total: 10 },
          { user_id: 901234, first_name: 'Ms', username: 'ms_test', total: 8 },
          { user_id: 112345, first_name: '7556225_test', username: '7556225_test', total: 7 }
        ];

        // Generate leaderboard image
        const imageBuffer = await leaderboardGenerator.generateLeaderboardGraph(sampleLeaderboard);

        // Send the image
        await ctx.replyWithPhoto(
          { source: imageBuffer },
          {
            caption: '📈 **LEADERBOARD**\n\nTop 10 users in this group!',
            parse_mode: 'Markdown'
          }
        );
      } catch (error) {
        console.error('Error generating leaderboard:', error);
        ctx.reply('❌ Error generating leaderboard. Please try again later.');
      }
    });

    // Test command to check image loading
    this.bot.command('test', async (ctx) => {
      try {
        const bgPath = path.join(__dirname, '..', '2026-04-23 18.44.50.jpg');
        const frontPath = path.join(__dirname, '..', '2026-04-22 21.30.02.jpg');

        const fs = require('fs');
        const bgExists = fs.existsSync(bgPath);
        const frontExists = fs.existsSync(frontPath);

        ctx.reply(`Image files status:\n✅ Background: ${bgExists ? 'Found' : 'NOT FOUND'}\n✅ Front: ${frontExists ? 'Found' : 'NOT FOUND'}`);
      } catch (error) {
        ctx.reply(`Error: ${error.message}`);
      }
    });

    // Error handler
    this.bot.catch((err, ctx) => {
      console.error('Bot error:', err);
    });
  }

  async start() {
    try {
      await this.bot.launch();
      console.log('✅ Bot is running...');
      
      // Enable graceful stop
      process.once('SIGINT', () => this.bot.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    } catch (error) {
      console.error('Failed to start bot:', error);
      process.exit(1);
    }
  }
}

module.exports = TelegramBot;
