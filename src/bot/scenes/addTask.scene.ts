import { Scenes } from 'telegraf';
import { MyContext } from '../context';
import { logger } from '../../utils/logger';
import { buildReminderOptionsKeyboard, formatDate, escapeMarkdown } from '../utils/format.util';

/**
 * Parse deadline input string into a Date or null (skip).
 * Returns undefined if the input is invalid.
 *
 * Supported formats:
 *  - "skip"                   → null (no deadline)
 *  - "hari ini"               → today at 23:59
 *  - "hari ini HH:MM"         → today at specified time
 *  - "YYYY-MM-DD HH:MM"       → specific date & time
 *  - "YYYY-MM-DD"             → specific date at 23:59
 */
function parseDeadlineInput(input: string): Date | null | undefined {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === 'skip') {
    return null;
  }

  // "hari ini" or aliases → today 23:59
  if (lower === 'hari ini' || lower === 'hariini' || lower === 'today') {
    const d = new Date();
    d.setHours(23, 59, 0, 0);
    return d;
  }

  // "hari ini HH:MM" or "hari ini jam HH:MM" → today at specified time
  const hariIniTimeMatch = lower.match(/^(hari ini|hariini|today)\s+(?:jam\s+)?(\d{1,2}):(\d{2})$/);
  if (hariIniTimeMatch) {
    const hours = parseInt(hariIniTimeMatch[2]!, 10);
    const minutes = parseInt(hariIniTimeMatch[3]!, 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      const d = new Date();
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
    return undefined;
  }

  // "YYYY-MM-DD" without time → set to 23:59
  const dateOnlyMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateOnlyMatch) {
    const parsed = new Date(`${dateOnlyMatch[1]}T23:59:00`);
    if (!isNaN(parsed.getTime())) return parsed;
    return undefined;
  }

  // "YYYY-MM-DD HH:MM" or other parseable formats
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) return parsed;

  return undefined; // invalid
}

// ─── Step 1: Ask for Tasks ────────────────────────────────────────────────────

const askTasks = async (ctx: MyContext) => {
  ctx.scene.session.taskData = {};

  await ctx.reply(
    'Sip\\! Masukkan task yang ingin kamu tambahkan\\.\n\n' +
    'Bisa lebih dari 1 task — pisahkan setiap task dengan Enter \\(baris baru\\)\\.\n\n' +
    'Contoh:\n' +
    'Masak\\-masak\n' +
    'Buat tugas\n' +
    'Meeting jam 3',
    { parse_mode: 'MarkdownV2' }
  );

  return ctx.wizard.next();
};

// ─── Step 2: Save Tasks, Ask for Deadline ────────────────────────────────────

const askDeadline = async (ctx: MyContext) => {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Tolong kirimkan dalam bentuk teks ya.');
    return;
  }

  const input = ctx.message.text.trim();
  const taskLines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  if (taskLines.length === 0) {
    await ctx.reply('Daftar task kosong. Coba kirimkan lagi.');
    return;
  }

  ctx.scene.session.taskData.titles = taskLines;

  await ctx.reply(
    `Oke, ${taskLines.length} task dicatat ✍️\n\n` +
    'Kapan deadline-nya?\n\n' +
    '📅 Format yang didukung:\n' +
    '• "hari ini" → hari ini jam 23:59\n' +
    '• "hari ini 15:00" atau "hari ini jam 15:00"\n' +
    '• "2026-09-25" → tanggal tertentu jam 23:59\n' +
    '• "2026-09-25 15:00" → tanggal & jam tertentu\n' +
    '• "skip" → tidak ada deadline'
  );

  return ctx.wizard.next();
};

// ─── Step 3: Save Deadline & Create Tasks ────────────────────────────────────

const saveTasks = async (ctx: MyContext) => {
  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('Tolong kirimkan dalam bentuk teks ya.');
    return;
  }

  const input = ctx.message.text.trim();
  const parsedDeadline = parseDeadlineInput(input);

  if (parsedDeadline === undefined) {
    await ctx.reply(
      'Format deadline tidak valid. Coba lagi:\n' +
      '• "hari ini"\n' +
      '• "hari ini 15:00"\n' +
      '• "2026-09-25 15:00"\n' +
      '• "skip"'
    );
    return; // Stay in this step
  }

  const deadlineAt = parsedDeadline ? parsedDeadline.toISOString() : undefined;
  const titles: string[] = ctx.scene.session.taskData.titles || [];

  try {
    const telegramUserId = ctx.from?.id.toString();
    const displayName = ctx.from?.first_name || 'User';

    if (!telegramUserId) {
      await ctx.reply('Gagal mendapatkan ID Telegram Anda.');
      return ctx.scene.leave();
    }

    const user = await ctx.userService.upsertUser({
      telegram_user_id: telegramUserId,
      display_name: displayName,
      timezone: 'Asia/Makassar',
    });

    const deadlineDisplay = deadlineAt ? formatDate(new Date(deadlineAt)) : 'Tidak ada';

    // Single task → keep reminder flow
    if (titles.length === 1) {
      const task = await ctx.taskService.createTask({
        user_id: user.id,
        title: titles[0]!,
        priority: 'medium',
        deadline_at: deadlineAt,
      });

      if (deadlineAt) {
        await ctx.reply(
          `✅ Task berhasil dibuat\\!\n\n📌 Judul: *${escapeMarkdown(task.title)}*\n⏰ Deadline: ${escapeMarkdown(deadlineDisplay)}\n\n🔔 Ingin disetelkan pengingat?`,
          {
            parse_mode: 'MarkdownV2',
            ...buildReminderOptionsKeyboard(task.id),
          }
        );
      } else {
        await ctx.reply(
          `✅ Task berhasil dibuat!\n\n📌 Judul: ${task.title}\n⏰ Deadline: Tidak ada`
        );
      }
    } else {
      // Multiple tasks → batch create & show summary
      let successCount = 0;
      const failedTitles: string[] = [];

      for (const title of titles) {
        try {
          await ctx.taskService.createTask({
            user_id: user.id,
            title,
            priority: 'medium',
            deadline_at: deadlineAt,
          });
          successCount++;
        } catch {
          failedTitles.push(title);
        }
      }

      const taskListDisplay = titles
        .slice(0, 10) // cap display to avoid too-long messages
        .map((t, i) => `${i + 1}. ${t}`)
        .join('\n');

      let reply =
        `✅ Berhasil menambahkan *${successCount}* task\!\n` +
        `⏰ Deadline: *${escapeMarkdown(deadlineDisplay)}*\n\n` +
        `📋 Daftar task:\n${escapeMarkdown(taskListDisplay)}`;

      if (titles.length > 10) {
        reply += `\n_\.\.\.dan ${titles.length - 10} task lainnya_`;
      }

      if (failedTitles.length > 0) {
        reply += `\n\n⚠️ Gagal menyimpan ${failedTitles.length} task\.`;
      }

      await ctx.reply(reply, { parse_mode: 'MarkdownV2' });
    }
  } catch (err: any) {
    logger.error({ err }, 'Error saving tasks from ADD_TASK_WIZARD');
    await ctx.reply('Maaf, terjadi kesalahan saat menyimpan task.');
  }

  return ctx.scene.leave();
};

export const addTaskWizard = new Scenes.WizardScene<MyContext>(
  'ADD_TASK_WIZARD',
  askTasks,
  askDeadline,
  saveTasks
);
