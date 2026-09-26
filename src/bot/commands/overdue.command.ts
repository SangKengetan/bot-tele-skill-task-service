import { MyContext } from '../context';
import { resolveUser, formatTaskItem, buildPendingTaskKeyboard } from '../utils/format.util';
import { logger } from '../../utils/logger';

export const overdueCommand = async (ctx: MyContext): Promise<void> => {
  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  try {
    const tasks = await ctx.taskService.getOverdueTasks(user.id);

    if (tasks.length === 0) {
      await ctx.reply('🎉 Tidak ada task yang overdue. Mantap!');
      return;
    }

    await ctx.reply(`⚠️ *TASK OVERDUE* (${tasks.length} task)`, { parse_mode: 'Markdown' });

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      await ctx.reply(formatTaskItem(task, i), {
        parse_mode: 'Markdown',
        ...buildPendingTaskKeyboard(task.id),
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in /overdue command');
    await ctx.reply('❌ Terjadi kesalahan saat mengambil task overdue.\nCoba ketik /overdue lagi.');
  }
};
