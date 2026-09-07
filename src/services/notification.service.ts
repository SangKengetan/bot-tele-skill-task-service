import { ReminderWithContext } from '../types/reminder.types';
import { logger } from '../utils/logger';

/**
 * Interface that defines the notification contract.
 * Task Service is completely decoupled from any messaging platform.
 *
 * Hermes/Telegram adapter will implement this interface and inject it at startup.
 * For MVP, MockNotificationService is used.
 */
export interface NotificationService {
  sendReminder(reminder: ReminderWithContext): Promise<void>;
}

/**
 * Mock implementation — logs to console.
 * Replace by injecting a real implementation (e.g., TelegramNotificationService from Hermes).
 *
 * TODO: In production, Hermes will POST to a webhook or implement this interface directly.
 */
export class MockNotificationService implements NotificationService {
  async sendReminder(reminder: ReminderWithContext): Promise<void> {
    logger.info(
      {
        reminderId: reminder.id,
        taskId: reminder.task_id,
        telegramUserId: reminder.telegram_user_id,
        taskTitle: reminder.task_title,
        remindAt: reminder.remind_at,
      },
      '[MOCK] Sending reminder notification'
    );

    // Simulate async delivery
    await Promise.resolve();

    logger.info({ reminderId: reminder.id }, '[MOCK] Reminder notification sent successfully');
  }
}
