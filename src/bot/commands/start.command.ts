import { MyContext } from '../context';
import { logger } from '../../utils/logger';

export const startCommand = async (ctx: MyContext): Promise<void> => {
  const telegramUserId = ctx.from?.id.toString();
  const displayName = ctx.from?.first_name || 'User';

  if (!telegramUserId) {
    await ctx.reply('Gagal mendapatkan informasi akun Telegram Anda.');
    return;
  }

  try {
    // Register or update user in database
    await ctx.userService.upsertUser({
      telegram_user_id: telegramUserId,
      display_name: displayName,
      timezone: 'Asia/Makassar',
    });

    await ctx.reply(
      `Halo ${displayName}\u0021 Selamat datang di Task Manager Bot\. \uD83E\uDD16\n\n` +
      `Saya bisa membantu Anda mencatat tugas dan memberikan pengingat\.\n\n` +
      `Gunakan perintah berikut:\n` +
      `\uD83D\uDCCC *Kelola Task:*\n` +
      `/addtask \- Menambah task baru\n` +
      `/addharian \- Menambah task harian sekaligus\n` +
      `/tasks \- Melihat daftar task aktif\n` +
      `/today \- Task hari ini\n` +
      `/overdue \- Task yang telat\n` +
      `/completed \- Riwayat task selesai\n` +
      `/search <kata> \- Cari task\n\n` +
      `\uD83D\uDCCA *Lainnya:*\n` +
      `/reminders \- Kelola pengingat aktif\n` +
      `/stats \- Ringkasan statistik\n`,
      { parse_mode: 'MarkdownV2' }
    );
  } catch (err) {
    logger.error({ err }, 'Error in /start command');
    await ctx.reply('Maaf, terjadi kesalahan. Coba ketik /start lagi.');
  }
};
