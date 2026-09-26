import { Markup } from 'telegraf';
import { MyContext } from '../context';
import {
  resolveUser,
  formatTaskDetail,
  formatTaskItem,
  buildDetailKeyboard,
  buildPendingTaskKeyboard,
  buildCompletedTaskKeyboard,
  buildReminderOptionsKeyboard,
  formatReminderCard,
  buildReminderCardKeyboard,
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
        await handleDeleteConfirm(ctx, params[0]!, user.id);
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
        await handleReminderMenu(ctx, params[0]!, user.id);
        break;

      case 'reminder_opt':
        await handleReminderOption(ctx, params[0]!, params[1]!, user.id);
        break;

      case 'skip_reminder':
        await handleSkipReminder(ctx, params[0]!);
        break;

      case 'reminders_page':
        await handleRemindersPage(ctx, user.id, parseInt(params[0] ?? '0', 10));
        break;

      case 'cancel_reminder':
        await handleCancelReminder(ctx, user.id, params[0]!, parseInt(params[1] ?? '0', 10));
        break;

      case 'snooze':
        await handleSnooze(ctx, params[0]!, parseInt(params[1]!, 10), user.id);
        break;

      case 'snooze_tomorrow':
        await handleSnoozeTomorrow(ctx, params[0]!, user.id);
        break;

      case 'tasks_page':
        await handleTasksPage(ctx, user.id, parseInt(params[0] ?? '0', 10));
        break;

      case 'completed_page':
        await handleCompletedPage(ctx, user.id, parseInt(params[0] ?? '0', 10));
        break;

      case 'noop':
        await ctx.answerCbQuery('👌');
        break;

      default:
        await ctx.answerCbQuery('⚠️ Aksi tidak dikenali.');
    }
  } catch (err) {
    logger.error({ err, data }, 'Error handling callback query');
    await ctx.answerCbQuery('❌ Terjadi kesalahan. Coba lagi.');
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

async function handleDeleteConfirm(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.getTask(taskId, userId);
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `⚠️ *KONFIRMASI HAPUS*\n\nHapus task:\n📌 *"${escapeMarkdown(task.title)}"*\n\nAksi ini *tidak bisa dibatalkan.*`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🗑️ Ya, Hapus!', `confirm_delete:${taskId}`),
          Markup.button.callback('↩️ Batal', `detail:${taskId}`),
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
    `🔄 *TASK DIBUKA KEMBALI*\n\n📌 *${escapeMarkdown(task.title)}*\n⏳ Status: Aktif`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Selesai', `complete:${taskId}`),
          Markup.button.callback('⏰ Set Reminder', `reminder:${taskId}`),
        ],
        [
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

async function handleReminderMenu(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.getTask(taskId, userId);
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `⏰ *SET PENGINGAT*\n\nPilih kapan kamu ingin diingatkan:`,
    {
      parse_mode: 'Markdown',
      ...buildReminderOptionsKeyboard(taskId, !!task.deadline_at),
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

async function handleRemindersPage(
  ctx: MyContext,
  userId: string,
  targetIndex: number
): Promise<void> {
  const { reminders } = await ctx.reminderService.listReminders({
    user_id: userId,
    status: 'pending',
    limit: 50,
    offset: 0,
  });

  if (reminders.length === 0) {
    await ctx.answerCbQuery('Tidak ada pengingat aktif.');
    await ctx.editMessageText('🔔 *Tidak ada pengingat aktif saat ini.*', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const currentIndex = ((targetIndex % reminders.length) + reminders.length) % reminders.length;
  const currentReminder = reminders[currentIndex]!;

  await ctx.answerCbQuery();
  try {
    await ctx.editMessageText(
      formatReminderCard(currentReminder, currentIndex, reminders.length),
      {
        parse_mode: 'Markdown',
        ...buildReminderCardKeyboard(currentReminder, currentIndex, reminders.length),
      }
    );
  } catch (err: any) {
    if (err?.description?.includes('message is not modified')) {
      return;
    }
    throw err;
  }
}

async function handleCancelReminder(
  ctx: MyContext,
  userId: string,
  reminderId: string,
  currentIndex: number = 0
): Promise<void> {
  await ctx.reminderService.cancelReminder(reminderId);
  await ctx.answerCbQuery('❌ Pengingat berhasil dibatalkan!');

  const { reminders } = await ctx.reminderService.listReminders({
    user_id: userId,
    status: 'pending',
    limit: 50,
    offset: 0,
  });

  if (reminders.length === 0) {
    await ctx.editMessageText(
      '✅ *Pengingat berhasil dibatalkan.*\n\n🔔 Tidak ada pengingat aktif lainnya.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const nextIndex = Math.min(currentIndex, reminders.length - 1);
  const currentReminder = reminders[nextIndex]!;

  await ctx.editMessageText(
    formatReminderCard(currentReminder, nextIndex, reminders.length),
    {
      parse_mode: 'Markdown',
      ...buildReminderCardKeyboard(currentReminder, nextIndex, reminders.length),
    }
  );
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

// ─── Additional Handlers ─────────────────────────────────────────────────────

async function handleSkipReminder(ctx: MyContext, taskId: string): Promise<void> {
  await ctx.answerCbQuery('ℹ️ Pengingat dilewati.');
  await ctx.editMessageText(
    `✅ *TASK TERSIMPAN*\n\n⏭️ Pengingat tidak disetel.\nKamu bisa menambahkan pengingat kapan saja melalui detail task.`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[
        Markup.button.callback('📋 Lihat Detail Task', `detail:${taskId}`),
      ]]),
    }
  );
}

async function handleSnoozeTomorrow(ctx: MyContext, taskId: string, userId: string): Promise<void> {
  const task = await ctx.taskService.getTask(taskId, userId);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  await ctx.reminderService.createReminder(taskId, {
    remind_at: tomorrow.toISOString(),
  });

  await ctx.answerCbQuery('📅 Ditunda ke besok pagi!');
  await ctx.editMessageText(
    `📅 *PENGINGAT DITUNDA*\n\n📌 *${escapeMarkdown(task.title)}*\n🔔 Diingatkan lagi: ${formatDate(tomorrow)}`,
    { parse_mode: 'Markdown' }
  );
}

async function handleTasksPage(ctx: MyContext, userId: string, offset: number): Promise<void> {
  await ctx.answerCbQuery();

  const result = await ctx.taskService.listTasks({
    user_id: userId,
    status: 'pending',
    limit: 10,
    offset,
  });

  if (result.tasks.length === 0) {
    await ctx.reply('✅ _Semua task sudah ditampilkan._', { parse_mode: 'Markdown' });
    return;
  }

  for (let i = 0; i < result.tasks.length; i++) {
    const task = result.tasks[i]!;
    await ctx.reply(formatTaskItem(task, offset + i), {
      parse_mode: 'Markdown',
      ...buildPendingTaskKeyboard(task.id),
    });
  }

  const nextOffset = offset + 10;
  if (nextOffset < result.pagination.total) {
    await ctx.reply(
      `_Menampilkan ${offset + 1}\u2013${offset + result.tasks.length} dari ${result.pagination.total} task._`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[
          Markup.button.callback('📋 Muat 10 Berikutnya', `tasks_page:${nextOffset}`),
        ]]),
      }
    );
  }
}

async function handleCompletedPage(ctx: MyContext, userId: string, offset: number): Promise<void> {
  await ctx.answerCbQuery();

  const { tasks } = await ctx.taskService.getCompletedTasks(userId, 10, offset);

  if (tasks.length === 0) {
    await ctx.reply('✅ _Semua riwayat task selesai sudah ditampilkan._', { parse_mode: 'Markdown' });
    return;
  }

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]!;
    const completedAt = task.completed_at ? `\n   🕐 Selesai: ${formatDate(task.completed_at)}` : '';
    const message = `${offset + i + 1}\\. *${escapeMarkdown(task.title)}*${completedAt}`;
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...buildCompletedTaskKeyboard(task.id),
    });
  }

  // If we got a full page (10), there might be more
  if (tasks.length === 10) {
    const nextOffset = offset + 10;
    await ctx.reply(
      `_Menampilkan task selesai ke\-${offset + 1} sampai ${offset + tasks.length}._`,
      {
        parse_mode: 'MarkdownV2',
        ...Markup.inlineKeyboard([[
          Markup.button.callback('📋 Muat 10 Berikutnya', `completed_page:${nextOffset}`),
        ]]),
      }
    );
  }
}
