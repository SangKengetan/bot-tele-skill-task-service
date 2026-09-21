import { Markup } from 'telegraf';
import { MyContext } from '../context';
import {
  resolveUser,
  formatTaskDetail,
  buildDetailKeyboard,
  buildReminderOptionsKeyboard,
  formatDate,
  escapeMarkdown,
} from '../utils/format.util';
import { logger } from '../../utils/logger';

/**
 * Central callback query handler for all inline keyboard buttons.
 *
 * Callback data format: `action:param1:param2`
 * Examples:
 *   complete:<taskId>
 *   delete:<taskId>
 *   confirm_delete:<taskId>
 *   cancel_task:<taskId>
 *   reopen:<taskId>
 *   detail:<taskId>
 *   reminder:<taskId>
 *   reminder_opt:<taskId>:<option>
 *   cancel_reminder:<reminderId>
 *   snooze:<taskId>:<minutes>
 *   noop
 */
export async function handleCallbackQuery(ctx: MyContext): Promise<void> {
  // callbackQuery is always present when this handler is called
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;

  const data = callbackQuery.data;
  if (!data) return;

  const user = await resolveUser(ctx);
  if (!user) {
    await ctx.answerCbQuery('❌ Gagal mendapatkan info user.');
    return;
  }

  try {
    const [action, ...params] = data.split(':');

    switch (action) {
      case 'complete':
        await handleComplete(ctx, params[0]!, user.id);
        break;

      case 'delete':
        await handleDeleteConfirm(ctx, params[0]!);
        break;

      case 'confirm_delete':
        await handleDelete(ctx, params[0]!, user.id);
        break;

      case 'cancel_task':
        await handleCancelTask(ctx, params[0]!, user.id);
        break;

      case 'reopen':
        await handleReopen(ctx, params[0]!, user.id);
        break;

      case 'detail':
        await handleDetail(ctx, params[0]!, user.id);
        break;

      case 'reminder':
        await handleReminderMenu(ctx, params[0]!);
        break;

      case 'reminder_opt':
        await handleReminderOption(ctx, params[0]!, params[1]!, user.id);
        break;

      case 'cancel_reminder':
        await handleCancelReminder(ctx, params[0]!);
        break;

      case 'snooze':
        await handleSnooze(ctx, params[0]!, parseInt(params[1]!, 10), user.id);
        break;

      case 'noop':
        await ctx.answerCbQuery('👌');
        break;

      default:
        await ctx.answerCbQuery('⚠️ Aksi tidak dikenali.');
    }
  } catch (err) {
    logger.error({ err, data }, 'Error handling callback query');
    await ctx.answerCbQuery('❌ Terjadi kesalahan.');
  }
}

// ─── Action Handlers ──────────────────────────────────────────────────────────

async function handleComplete(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.completeTask(taskId, userId);
  await ctx.answerCbQuery('✅ Task ditandai selesai!');
  await ctx.editMessageText(
    `✅ *TASK SELESAI*\n\n📌 *${escapeMarkdown(task.title)}*\n🕐 Diselesaikan: ${formatDate(task.completed_at)}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleDeleteConfirm(ctx: MyContext, taskId: string): Promise<void> {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `⚠️ *KONFIRMASI HAPUS*\n\nApakah kamu yakin ingin menghapus task ini secara permanen?\nAksi ini tidak bisa dibatalkan.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🗑️ Ya, Hapus!', `confirm_delete:${taskId}`),
          Markup.button.callback('↩️ Batal', `noop`),
        ],
      ]),
    }
  );
}

async function handleDelete(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  await ctx.taskService.deleteTask(taskId, userId);
  await ctx.answerCbQuery('🗑️ Task berhasil dihapus!');
  await ctx.editMessageText('🗑️ *Task berhasil dihapus secara permanen.*', {
    parse_mode: 'Markdown',
  });
}

async function handleCancelTask(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.cancelTask(taskId, ctx.reminderRepo, userId);
  await ctx.answerCbQuery('🚫 Task dibatalkan!');
  await ctx.editMessageText(
    `🚫 *TASK DIBATALKAN*\n\n📌 *${escapeMarkdown(task.title)}*\n\nSemua pengingat terkait juga telah dibatalkan.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Buka Kembali', `reopen:${taskId}`)],
      ]),
    }
  );
}

async function handleReopen(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.reopenTask(taskId, userId);
  await ctx.answerCbQuery('🔄 Task dibuka kembali!');
  await ctx.editMessageText(
    `🔄 *TASK DIBUKA KEMBALI*\n\n📌 *${escapeMarkdown(task.title)}*\nStatus: pending`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Selesai', `complete:${taskId}`),
          Markup.button.callback('📋 Detail', `detail:${taskId}`),
        ],
      ]),
    }
  );
}

async function handleDetail(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.getTask(taskId, userId);
  await ctx.answerCbQuery();
  await ctx.editMessageText(formatTaskDetail(task), {
    parse_mode: 'Markdown',
    ...buildDetailKeyboard(task),
  });
}

async function handleReminderMenu(ctx: MyContext, taskId: string): Promise<void> {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `⏰ *SET PENGINGAT*\n\nPilih kapan kamu ingin diingatkan:`,
    {
      parse_mode: 'Markdown',
      ...buildReminderOptionsKeyboard(taskId),
    }
  );
}

async function handleReminderOption(
  ctx: MyContext,
  taskId: string,
  option: string,
  userId: string
): Promise<void> {
  // Get the task to determine deadline
  const task = await ctx.taskService.getTask(taskId, userId);

  let remindAt: Date;
  const now = new Date();

  switch (option) {
    case '1h':
      if (task.deadline_at) {
        remindAt = new Date(task.deadline_at.getTime() - 60 * 60 * 1000);
      } else {
        // No deadline — remind 1 hour from now
        remindAt = new Date(now.getTime() + 60 * 60 * 1000);
      }
      break;

    case '1d':
      if (task.deadline_at) {
        remindAt = new Date(task.deadline_at.getTime() - 24 * 60 * 60 * 1000);
      } else {
        remindAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }
      break;

    case 'deadline':
      if (!task.deadline_at) {
        await ctx.answerCbQuery('⚠️ Task ini tidak punya deadline!');
        return;
      }
      remindAt = new Date(task.deadline_at);
      break;

    default:
      await ctx.answerCbQuery('⚠️ Opsi tidak valid.');
      return;
  }

  // Validate reminder is in the future
  if (remindAt <= now) {
    await ctx.answerCbQuery('⚠️ Waktu pengingat sudah lewat!');
    return;
  }

  await ctx.reminderService.createReminder(taskId, {
    remind_at: remindAt.toISOString(),
  });

  await ctx.answerCbQuery('🔔 Pengingat berhasil diset!');
  await ctx.editMessageText(
    `🔔 *PENGINGAT DISET*\n\n📌 *${escapeMarkdown(task.title)}*\n⏰ Akan diingatkan: ${formatDate(remindAt)}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleCancelReminder(ctx: MyContext, reminderId: string): Promise<void> {
  await ctx.reminderService.cancelReminder(reminderId);
  await ctx.answerCbQuery('❌ Pengingat dibatalkan!');
  await ctx.editMessageText('❌ *Pengingat berhasil dibatalkan.*', {
    parse_mode: 'Markdown',
  });
}

async function handleSnooze(
  ctx: MyContext,
  taskId: string,
  minutes: number,
  userId: string
): Promise<void> {
  const task = await ctx.taskService.getTask(taskId, userId);
  const remindAt = new Date(Date.now() + minutes * 60 * 1000);

  await ctx.reminderService.createReminder(taskId, {
    remind_at: remindAt.toISOString(),
  });

  await ctx.answerCbQuery(`⏰ Ditunda ${minutes} menit!`);
  await ctx.editMessageText(
    `⏰ *PENGINGAT DITUNDA*\n\n📌 *${escapeMarkdown(task.title)}*\n🔔 Diingatkan lagi: ${formatDate(remindAt)}`,
    { parse_mode: 'Markdown' }
  );
}
