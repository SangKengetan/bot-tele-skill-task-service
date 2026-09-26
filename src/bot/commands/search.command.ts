import { Markup } from 'telegraf';
import { MyContext } from '../context';
import { resolveUser, formatTaskItem } from '../utils/format.util';
import { logger } from '../../utils/logger';

export const searchCommand = async (ctx: MyContext): Promise<void> => {
  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  // Extract search query from message text
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const query = message.text.replace(/^\/search\s*/i, '').trim();

  if (!query) {
    await ctx.reply(
      '🔍 *Cara Penggunaan:*\n`/search <kata kunci>`\n\nContoh: `/search laporan`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    const { tasks } = await ctx.taskService.searchTasks({
      user_id: user.id,
      q: query,
      limit: 10,
      offset: 0,
    });

    if (tasks.length === 0) {
      await ctx.reply(`🔍 Tidak ditemukan task dengan kata kunci "*${query}*".`, {
        parse_mode: 'Markdown',
      });
      return;
    }

    await ctx.reply(`🔍 *HASIL PENCARIAN* untuk "*${query}*" (${tasks.length} hasil)`, {
      parse_mode: 'Markdown',
    });

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]!;
      await ctx.reply(formatTaskItem(task, i), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('📋 Detail', `detail:${task.id}`),
            Markup.button.callback('✅ Selesai', `complete:${task.id}`),
          ],
        ]),
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in /search command');
    await ctx.reply('❌ Terjadi kesalahan saat mencari task.\nCoba ketik /search lagi.');
  }
};
