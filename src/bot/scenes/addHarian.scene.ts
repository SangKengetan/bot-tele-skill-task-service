import { Scenes } from 'telegraf';
import { MyContext } from '../context';
import { logger } from '../../utils/logger';
import { formatDate, escapeMarkdown } from '../utils/format.util';

// 1. Step: Ask for Date
const askDate = async (ctx: MyContext) => {
  await ctx.reply(
    'Mari tambahkan task harian!\n\n' +
    'Tanggal berapa task ini ingin dikerjakan?\n' +
    'Contoh format: 2026-09-25\n' +
    '(Atau ketik "hari ini" untuk tanggal hari ini)'
  );
  ctx.scene.session.taskData = {};
  return ctx.wizard.next();
};

// 2. Step: Save Date, Ask for Tasks
const askTasks = async (ctx: MyContext) => {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Tolong kirimkan dalam bentuk teks ya.');
    return;
  }

  const input = ctx.message.text.trim().toLowerCase();
  let targetDate = new Date();

  if (input !== 'hari ini' && input !== 'hariini' && input !== 'today') {
    const parsedDate = new Date(input);
    if (isNaN(parsedDate.getTime())) {
      await ctx.reply('Format tanggal tidak valid. Coba lagi (YYYY-MM-DD) atau ketik "hari ini".');
      return; // Stay in the same step
    }
    targetDate = parsedDate;
  }

  // Set the time to 23:59:59 to represent the end of that day
  targetDate.setHours(23, 59, 59, 999);
  ctx.scene.session.taskData.deadline_at = targetDate.toISOString();

  await ctx.reply(
    'Okey, tanggal ditetapkan ke ' + formatDate(targetDate) + '.\n\n' +
    'Sekarang, masukkan list keseluruhan kegiatan di tanggal tersebut.\n' +
    'Pisahkan setiap kegiatan dengan Enter (baris baru).\n\n' +
    'Contoh:\n' +
    'Masak-masak\n' +
    'Buat tugas'
  );
  
  return ctx.wizard.next();
};

// 3. Step: Save Tasks to DB
const saveTasks = async (ctx: MyContext) => {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Tolong kirimkan dalam bentuk teks ya.');
    return;
  }

  const input = ctx.message.text.trim();
  const taskLines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (taskLines.length === 0) {
    await ctx.reply('Daftar task kosong. Dibatalkan.');
    return ctx.scene.leave();
  }

  const deadlineAt = ctx.scene.session.taskData.deadline_at;

  try {
    const telegramUserId = ctx.from?.id.toString();
    const displayName = ctx.from?.first_name || 'User';

    if (!telegramUserId) {
      await ctx.reply('Gagal mendapatkan ID Telegram Anda.');
      return ctx.scene.leave();
    }

    // Ensure user exists and get UUID
    const user = await ctx.userService.upsertUser({
      telegram_user_id: telegramUserId,
      display_name: displayName,
      timezone: 'Asia/Makassar',
    });

    let successCount = 0;
    for (const title of taskLines) {
      await ctx.taskService.createTask({
        user_id: user.id,
        title: title,
        priority: 'medium',
        deadline_at: deadlineAt,
      });
      successCount++;
    }

    const deadlineDisplay = deadlineAt ? formatDate(new Date(deadlineAt)) : 'Tidak ada';

    await ctx.reply(
      `✅ Berhasil menambahkan ${successCount} task untuk tanggal ${deadlineDisplay}!`
    );

  } catch (err: any) {
    logger.error({ err }, 'Error saving daily tasks from wizard');
    await ctx.reply('Maaf, terjadi kesalahan saat menyimpan task.');
  }

  return ctx.scene.leave();
};

export const addHarianWizard = new Scenes.WizardScene<MyContext>(
  'ADD_HARIAN_WIZARD',
  askDate,
  askTasks,
  saveTasks
);
