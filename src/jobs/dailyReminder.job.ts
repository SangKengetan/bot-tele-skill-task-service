import cron, { ScheduledTask } from 'node-cron';
import { TaskRepository } from '../repositories/task.repository';
import { NotificationService } from '../services/notification.service';
import { logger } from '../utils/logger';
import { Task } from '../types/task.types';

/**
 * Daily Reminder Scheduler Job
 *
 * Runs at 8 AM, 11 AM, 4 PM, and 9 PM to remind users of pending tasks for today.
 */
export class DailyReminderJob {
  private task: ScheduledTask | null = null;
  private isRunning = false;

  constructor(
    private taskRepo: TaskRepository,
    private notificationService: NotificationService
  ) { }

  start(): void {
    // Run at 08:00, 11:00, 16:00, 17:00, 21:00 in Asia/Makassar
    const cronExpression = '0 8,11,16,21 * * *';

    logger.info(
      { cronExpression, timezone: 'Asia/Makassar' },
      'Starting daily reminder scheduler'
    );

    this.task = cron.schedule(cronExpression, async () => {
      await this.processDailyReminders();
    }, {
      timezone: 'Asia/Makassar'
    });
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      logger.info('Daily reminder scheduler stopped');
    }
  }

  private async processDailyReminders(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Daily reminder job still running from previous tick — skipping');
      return;
    }

    this.isRunning = true;

    try {
      const pendingTasks = await this.taskRepo.findAllTodayPending();

      if (pendingTasks.length === 0) {
        return;
      }

      // Group tasks by telegram_user_id
      const tasksByUser = new Map<string, (Task & { telegram_user_id: string })[]>();

      for (const task of pendingTasks) {
        if (!task.telegram_user_id) continue;

        const userTasks = tasksByUser.get(task.telegram_user_id) || [];
        userTasks.push(task);
        tasksByUser.set(task.telegram_user_id, userTasks);
      }

      logger.info({ userCount: tasksByUser.size }, 'Sending daily reminders to users');

      for (const [telegramUserId, tasks] of tasksByUser.entries()) {
        await this.notificationService.sendDailySummary(telegramUserId, tasks);
      }
    } catch (err) {
      logger.error({ err }, 'Error in daily reminder job processing loop');
    } finally {
      this.isRunning = false;
    }
  }
}
