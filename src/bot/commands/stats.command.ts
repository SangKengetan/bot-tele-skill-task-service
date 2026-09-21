import { MyContext } from '../context';
import { resolveUser } from '../utils/format.util';
import { logger } from '../../utils/logger';

export const statsCommand = async (ctx: MyContext): Promise<void> => {
  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  try {
    const stats = await ctx.taskService.getStats(user.id);

    const completionPct = stats.completion_rate
      ? `${(stats.completion_rate * 100).toFixed(1)}%`
      : '0%';

    const message = [
      `📊 *STATISTIK TASK*`,
      ``,
      `📋 Total Task: *${stats.total}*`,
      `⏳ Pending: *${stats.pending}*`,
      `✅ Selesai: *${stats.completed}*`,
      `🚫 Dibatalkan: *${stats.cancelled}*`,
      `⚠️ Overdue: *${stats.overdue}*`,
      ``,
      `📈 Completion Rate: *${completionPct}*`,
    ].join('\n');

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (err) {
    logger.error({ err }, 'Error in /stats command');
    await ctx.reply('Maaf, terjadi kesalahan saat mengambil statistik.');
  }
};
