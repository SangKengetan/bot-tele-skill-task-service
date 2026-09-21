import { Telegraf } from 'telegraf';
import { ReminderWithContext } from '../types/reminder.types';
import { logger } from '../utils/logger';

/**
 * Interface that defines the notification contract.
 */
export interface NotificationService {
  sendReminder(reminder: ReminderWithContext): Promise<void>;
}

/**
 * Real implementation — sends a message via Telegram bot.
 */
export class TelegramNotificationService implements NotificationService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly bot: Telegraf<any>) {}

  async sendReminder(reminder: ReminderWithContext): Promise<void> {
    try {
      if (!reminder.telegram_user_id) {
        logger.warn({ reminderId: reminder.id }, 'Missing telegram_user_id for reminder');
        return;
      }

      const message = `🔔 *PENGINGAT TASK*\n\n📌 *Judul:* ${reminder.task_title}\n⏰ *Waktu Pengingat:* ${reminder.remind_at ? new Date(reminder.remind_at).toLocaleString('id-ID') : 'Sekarang'}\n\nSemangat mengerjakannya! 💪`;
      
      await this.bot.telegram.sendMessage(reminder.telegram_user_id, message, {
        parse_mode: 'Markdown',
      });

      logger.info(
        {
          reminderId: reminder.id,
          taskId: reminder.task_id,
          telegramUserId: reminder.telegram_user_id,
        },
        'Reminder notification sent successfully via Telegram'
      );
    } catch (error) {
      logger.error(
        {
          reminderId: reminder.id,
          err: error,
        },
        'Failed to send reminder notification via Telegram'
      );
    }
  }
}

