import cron from 'node-cron';
import { ReminderRepository } from '../repositories/reminder.repository';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Reminder Scheduler Job
 *
 * Polls PostgreSQL every REMINDER_INTERVAL_SECONDS for due reminders.
 * Uses an atomic UPDATE...RETURNING to claim reminders and prevent double-processing.
 *
 * Architecture:
 * - claimDueReminders() atomically marks reminders as 'sent' before returning them
 * - If notification delivery fails, status is reset to 'failed'
 * - NotificationService is injected — Task Service has no knowledge of Telegram/Hermes
 */
export class ReminderJob {
  private task: cron.ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    private reminderRepo: ReminderRepository,
    private notificationService: NotificationService
  ) {}

  start(): void {
    const intervalSeconds = env.REMINDER_INTERVAL_SECONDS;
    // Convert seconds to cron expression (run every N seconds using */N)
    const cronExpression =
      intervalSeconds < 60
        ? `*/${intervalSeconds} * * * * *` // seconds-level (6-field cron)
        : `*/${Math.floor(intervalSeconds / 60)} * * * *`; // minutes-level (5-field cron)

    logger.info(
      { cronExpression, intervalSeconds },
      'Starting reminder scheduler'
    );

    this.task = cron.schedule(cronExpression, async () => {
      await this.processReminders();
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Reminder scheduler stopped');
    }
  }

  private async processReminders(): Promise<void> {
    // Prevent overlapping runs if processing takes longer than the interval
    if (this.isRunning) {
      logger.warn('Reminder job still running from previous tick — skipping');
      return;
    }

    this.isRunning = true;

    try {
      // Atomically claim due reminders (UPDATE...RETURNING prevents double-processing)
      const dueReminders = await this.reminderRepo.claimDueReminders();

      if (dueReminders.length === 0) {
        return;
      }

      logger.info({ count: dueReminders.length }, 'Processing due reminders');

      for (const reminder of dueReminders) {
        try {
          await this.notificationService.sendReminder(reminder);
          logger.info(
            { reminderId: reminder.id, taskId: reminder.task_id },
            'Reminder sent successfully'
          );
        } catch (err) {
          // Mark as failed so it can be monitored/retried
          await this.reminderRepo.markFailed(reminder.id);
          logger.error(
            { err, reminderId: reminder.id },
            'Failed to send reminder — marked as failed'
          );
        }
      }
    } catch (err) {
      logger.error({ err }, 'Error in reminder job processing loop');
    } finally {
      this.isRunning = false;
    }
  }
}
