import { MyContext } from '../context';
import {
  resolveUser,
  formatReminderCard,
  buildReminderCardKeyboard,
} from '../utils/format.util';
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
      limit: 50,
      offset: 0,
    });

    if (reminders.length === 0) {
      await ctx.reply('🔔 Tidak ada pengingat aktif saat ini.');
      return;
    }

    const currentIndex = 0;
    const currentReminder = reminders[currentIndex]!;

    await ctx.reply(formatReminderCard(currentReminder, currentIndex, reminders.length), {
      parse_mode: 'Markdown',
      ...buildReminderCardKeyboard(currentReminder, currentIndex, reminders.length),
    });
  } catch (err) {
    logger.error({ err }, 'Error in /reminders command');
    await ctx.reply('❌ Terjadi kesalahan saat mengambil pengingat.\nCoba ketik /reminders lagi.');
  }
};

