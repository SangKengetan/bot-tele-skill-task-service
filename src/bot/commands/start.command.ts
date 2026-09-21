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
      `Halo ${displayName}! Selamat datang di Task Manager Bot. 🤖\n\n` +
      `Saya bisa membantu Anda mencatat tugas dan memberikan pengingat.\n\n` +
      `Gunakan perintah berikut:\n` +
      `📌 *Kelola Task:*\n` +
      `/addtask - Menambah task baru\n` +
      `/tasks - Melihat daftar task aktif\n` +
      `/today - Task hari ini\n` +
      `/overdue - Task yang telat\n` +
      `/completed - Riwayat task selesai\n` +
      `/search <kata> - Cari task\n\n` +
      `📊 *Lainnya:*\n` +
      `/reminders - Kelola pengingat aktif\n` +
      `/stats - Ringkasan statistik\n`
    );
  } catch (err) {
    logger.error({ err }, 'Error in /start command');
    await ctx.reply('Maaf, terjadi kesalahan saat menyiapkan akun Anda.');
  }
};
