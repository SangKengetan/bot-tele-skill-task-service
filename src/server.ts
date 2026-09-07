import 'dotenv/config';
import { createApp } from './app';
import { env } from './config/env';
import { closeDb, checkDbConnection } from './config/database';
import { logger } from './utils/logger';
import { ReminderJob } from './jobs/reminder.job';
import { ReminderRepository } from './repositories/reminder.repository';
import { NotificationService } from './services/notification.service';
import { db } from './config/database';

async function main() {
  // Verify database connection before starting
  try {
    await checkDbConnection();
    logger.info('Database connection verified');
  } catch (err) {
    logger.fatal({ err }, 'Cannot connect to database — exiting');
    process.exit(1);
  }

  const app = createApp();

  // ─── Start reminder scheduler ─────────────────────────────────────────────────
  const reminderRepo = new ReminderRepository(db);
  const notificationService = app.locals['notificationService'] as NotificationService;
  const reminderJob = new ReminderJob(reminderRepo, notificationService);
  reminderJob.start();

  // ─── Start HTTP server ────────────────────────────────────────────────────────
  const server = app.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, env: env.NODE_ENV },
      `Task Service started on port ${env.PORT}`
    );
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — graceful shutdown starting');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Stop scheduler
      reminderJob.stop();

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
