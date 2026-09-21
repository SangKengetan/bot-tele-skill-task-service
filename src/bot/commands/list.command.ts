import { MyContext } from '../context';
import { resolveUser, formatTaskItem, buildPendingTaskKeyboard } from '../utils/format.util';
import { logger } from '../../utils/logger';

export const listCommand = async (ctx: MyContext): Promise<void> => {
  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  try {
    const result = await ctx.taskService.listTasks({
      user_id: user.id,
      status: 'pending',
      limit: 10,
      offset: 0,
    });

    if (result.tasks.length === 0) {
      await ctx.reply('Kamu tidak punya task yang sedang aktif saat ini. Santai dulu! 🏖️');
      return;
    }

    await ctx.reply(
      `📋 *DAFTAR TASK AKTIF* (${result.tasks.length} dari ${result.pagination.total} task)`,
      { parse_mode: 'Markdown' }
    );

    for (let i = 0; i < result.tasks.length; i++) {
      const task = result.tasks[i]!;
      await ctx.reply(formatTaskItem(task, i), {
        parse_mode: 'Markdown',
        ...buildPendingTaskKeyboard(task.id),
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in /tasks command');
    await ctx.reply('Maaf, terjadi kesalahan saat mengambil daftar task.');
  }
};
