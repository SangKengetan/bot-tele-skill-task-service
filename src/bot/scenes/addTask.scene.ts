import { Scenes } from 'telegraf';
import { MyContext } from '../context';
import { logger } from '../../utils/logger';
import { buildReminderOptionsKeyboard, formatDate, escapeMarkdown } from '../utils/format.util';

// 1. Step: Ask for Title
const askTitle = async (ctx: MyContext) => {
  await ctx.reply('Sip! Apa judul task yang ingin kamu tambahkan?');
  ctx.scene.session.taskData = {};
  return ctx.wizard.next();
};

// 2. Step: Save Title, Ask for Deadline
const askDeadline = async (ctx: MyContext) => {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Tolong kirimkan dalam bentuk teks ya.');
    return;
  }

  const title = ctx.message.text;
  ctx.scene.session.taskData.title = title;

  await ctx.reply(
    'Okey. Kapan deadline-nya?\n' +
    'Contoh format: 2026-09-25 15:00\n' +
    '(Atau ketik "skip" jika tidak ada deadline)'
  );
  
  return ctx.wizard.next();
};

// 3. Step: Save Deadline, Save Task to DB, Ask for Reminder
const saveTask = async (ctx: MyContext) => {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Tolong kirimkan dalam bentuk teks ya.');
    return;
  }

  const input = ctx.message.text.trim();
  let deadlineAt: string | undefined = undefined;

  if (input.toLowerCase() !== 'skip') {
    // Basic parsing assuming YYYY-MM-DD HH:MM
    const parsedDate = new Date(input);
    if (isNaN(parsedDate.getTime())) {
      await ctx.reply('Format tanggal tidak valid. Coba lagi (YYYY-MM-DD HH:MM) atau ketik "skip".');
      return; // Stay in the same step
    }
    deadlineAt = parsedDate.toISOString();
  }

  ctx.scene.session.taskData.deadline_at = deadlineAt;

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

    // Create Task
    const task = await ctx.taskService.createTask({
      user_id: user.id,
      title: ctx.scene.session.taskData.title!,
      priority: 'medium',
      deadline_at: deadlineAt,
    });

    const deadlineDisplay = deadlineAt ? formatDate(new Date(deadlineAt)) : 'Tidak ada';

    // If task has a deadline, offer reminder options
    if (deadlineAt) {
      await ctx.reply(
        `✅ Task berhasil dibuat\\!\n\n📌 Judul: *${escapeMarkdown(task.title)}*\n⏰ Deadline: ${deadlineDisplay}\n\n🔔 Ingin disetelkan pengingat?`,
        {
          parse_mode: 'Markdown',
          ...buildReminderOptionsKeyboard(task.id),
        }
      );
    } else {
      await ctx.reply(
        `✅ Task berhasil dibuat!\n\n📌 Judul: ${task.title}\n⏰ Deadline: Tidak ada`
      );
    }
  } catch (err: any) {
    logger.error({ err }, 'Error saving task from wizard');
    await ctx.reply('Maaf, terjadi kesalahan saat menyimpan task.');
  }

  return ctx.scene.leave();
};

export const addTaskWizard = new Scenes.WizardScene<MyContext>(
  'ADD_TASK_WIZARD',
  askTitle,
  askDeadline,
  saveTask
);
