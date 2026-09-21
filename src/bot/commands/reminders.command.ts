import { Markup } from 'telegraf';
import { MyContext } from '../context';
import { resolveUser, formatDate, escapeMarkdown } from '../utils/format.util';
import { logger } from '../../utils/logger';

export const remindersCommand = async (ctx: MyContext): Promise<void> => {
  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  try {
    const { reminders } = await ctx.reminderService.listReminders({
      user_id: user.id,
      status: 'pending',
      limit: 10,
      offset: 0,
    });

    if (reminders.length === 0) {
      await ctx.reply('🔔 Tidak ada pengingat aktif saat ini.');
      return;
    }

    await ctx.reply(`🔔 *PENGINGAT AKTIF* (${reminders.length} pengingat)`, {
      parse_mode: 'Markdown',
    });

    for (let i = 0; i < reminders.length; i++) {
      const reminder = reminders[i]!;
      const message = `${i + 1}\\. 🔔 Task ID: \`${reminder.task_id.slice(0, 8)}\\.\\.\\.\`\n   ⏰ Pengingat: ${formatDate(reminder.remind_at)}`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Batalkan', `cancel_reminder:${reminder.id}`)],
        ]),
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in /reminders command');
    await ctx.reply('Maaf, terjadi kesalahan saat mengambil daftar pengingat.');
  }
};
