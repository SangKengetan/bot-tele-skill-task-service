import { MyContext } from '../context';
import { logger } from '../../utils/logger';

export const startCommand = async (ctx: MyContext) => {
  const telegramUserId = ctx.from?.id.toString();
  const displayName = ctx.from?.first_name || 'User';

  if (!telegramUserId) {
    return ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
  }

  try {
    // Register or update user in database
    await ctx.userService.upsertUser({
      telegram_user_id: telegramUserId,
      display_name: displayName,
    });

    await ctx.reply(
      `Halo ${displayName}! Selamat datang di Task Manager Bot. 🤖\n\n` +
      `Saya bisa membantu Anda mencatat tugas dan memberikan pengingat.\n\n` +
      `Gunakan perintah berikut:\n` +
      `/addtask - Menambah task baru\n` +
      `/tasks - Melihat daftar task\n`
    );
  } catch (err) {
    logger.error({ err }, 'Error in /start command');
    await ctx.reply('Maaf, terjadi kesalahan saat menyiapkan akun Anda.');
  }
};
