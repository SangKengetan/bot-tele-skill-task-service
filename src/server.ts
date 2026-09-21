import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { closeDb, checkDbConnection } from './config/database';
import { logger } from './utils/logger';
import { ReminderJob } from './jobs/reminder.job';
import { ReminderRepository } from './repositories/reminder.repository';
import { TelegramNotificationService } from './services/notification.service';
import { setupBot } from './bot';
import { db } from './config/database';
import { Telegraf } from 'telegraf';
import { MyContext } from './bot/context';

async function main() {
  // Verify database connection before starting
  try {
    await checkDbConnection();
    logger.info('Database connection verified');
  } catch (err) {
    logger.fatal({ err }, 'Cannot connect to database — exiting');
    process.exit(1);
  }

  // ─── Initialize Bot ──────────────────────────────────────────────────────────
  const bot = new Telegraf<MyContext>(env.TELEGRAM_BOT_TOKEN);

  
  const notificationService = new TelegramNotificationService(bot);

  const { app, userService, taskService, reminderRepo, reminderService } = createApp(notificationService);

  // Setup commands and middleware for bot
  setupBot(bot, userService, taskService, reminderService, reminderRepo);

  // ─── Start reminder scheduler ─────────────────────────────────────────────────
  const reminderJob = new ReminderJob(reminderRepo, notificationService);
  reminderJob.start();

  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `Task Service started on port ${env.PORT}`
    );
  });

  bot.launch(() => {
    logger.info('Telegram Bot is running');
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — graceful shutdown starting');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop scheduler and bot
      reminderJob.stop();
      bot.stop('SIGINT');

      // Close database pool
      await closeDb();

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

void main();
