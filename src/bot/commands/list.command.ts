import { MyContext } from '../context';
import { logger } from '../../utils/logger';

export const listCommand = async (ctx: MyContext) => {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    return ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
  }

  try {
    // Get user to find their internal UUID
    const user = await ctx.userService.upsertUser({
      telegram_user_id: telegramUserId,
      display_name: ctx.from?.first_name || 'User',
    });

    const result = await ctx.taskService.getTasks({
      user_id: user.id,
      status: 'pending',
      limit: 10,
    });

    if (result.tasks.length === 0) {
      await ctx.reply('Kamu tidak punya task yang sedang aktif saat ini. Santai dulu! 🏖️');
      return;
    }

    let message = '📋 *Daftar Task Aktif:*\n\n';
    result.tasks.forEach((task, index) => {
      const deadline = task.deadline_at 
        ? `\n⏰ Deadline: ${new Date(task.deadline_at).toLocaleString('id-ID')}` 
        : '';
      message += `${index + 1}. *${task.title}*${deadline}\n\n`;
    });

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error({ err }, 'Error in /tasks command');
    await ctx.reply('Maaf, terjadi kesalahan saat mengambil daftar task.');
  }
};
