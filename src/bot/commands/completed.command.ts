import { Markup } from 'telegraf';
import { MyContext } from '../context';
import { resolveUser, formatDate, buildCompletedTaskKeyboard, escapeMarkdown } from '../utils/format.util';
import { logger } from '../../utils/logger';

export const completedCommand = async (ctx: MyContext): Promise<void> => {
  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  try {
    const { tasks } = await ctx.taskService.getCompletedTasks(user.id, 10, 0);

    if (tasks.length === 0) {
      await ctx.reply('📭 Belum ada task yang selesai. Yuk mulai kerjakan!');
      return;
    }

    await ctx.reply(`✅ *TASK SELESAI* (menampilkan 10 terakhir)`, { parse_mode: 'Markdown' });

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      const completedAt = task.completed_at ? `\n   🕐 Selesai: ${formatDate(task.completed_at)}` : '';
      const message = `${i + 1}\\. *${escapeMarkdown(task.title)}*${completedAt}`;

      await ctx.reply(message, {
        parse_mode: 'Markdown',
        ...buildCompletedTaskKeyboard(task.id),
      });
    }

    // If a full page was returned, there might be more
    if (tasks.length === 10) {
      await ctx.reply(
        `_Menampilkan 10 task selesai terbaru._`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([[
            Markup.button.callback('📋 Muat 10 Berikutnya', `completed_page:10`),
          ]]),
        }
      );
    }
  } catch (err) {
    logger.error({ err }, 'Error in /completed command');
    await ctx.reply('❌ Terjadi kesalahan saat mengambil task selesai.\nCoba ketik /completed lagi.');
  }
};
