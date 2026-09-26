import { Markup } from 'telegraf';
import { MyContext } from '../context';
import { Task } from '../../types/task.types';
import { Reminder, ReminderWithTask } from '../../types/reminder.types';

/**
 * Format a date to Indonesian locale string.
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'Tidak ada';
  const d = typeof date === 'string' ? new Date(date) : date;
  const formatted = d.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatted} WITA`;
}

/**
 * Priority emoji mapping.
 */
function priorityEmoji(priority: string): string {
  switch (priority) {
    case 'urgent': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

/**
 * Translate task status to Indonesian.
 */
function translateStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Aktif',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
  };
  return map[status] ?? status;
}

/**
 * Translate task priority to Indonesian.
 */
function translatePriority(priority: string): string {
  const map: Record<string, string> = {
    urgent: 'Mendesak',
    high: 'Tinggi',
    medium: 'Sedang',
    low: 'Rendah',
  };
  return map[priority] ?? priority;
}

/**
 * Status emoji mapping.
 */
function statusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'completed': return '✅';
    case 'cancelled': return '🚫';
    default: return '📌';
  }
}

/**
 * Format a single task item for display in a message.
 */
export function formatTaskItem(task: Task, index?: number): string {
  const prefix = index !== undefined ? `${index + 1}. ` : '';
  const deadline = task.deadline_at
    ? `\n   ⏰ Deadline: ${formatDate(task.deadline_at)}`
    : '';
  const priority = `\n   ${priorityEmoji(task.priority)} Prioritas: ${translatePriority(task.priority)}`;
  const status = `\n   ${statusEmoji(task.status)} Status: ${translateStatus(task.status)}`;

  return `${prefix}*${escapeMarkdown(task.title)}*${deadline}${priority}${status}`;
}

/**
 * Format task detail for a single task view.
 */
export function formatTaskDetail(task: Task): string {
  const lines = [
    `📋 *DETAIL TASK*`,
    ``,
    `📌 *Judul:* ${escapeMarkdown(task.title)}`,
    `${statusEmoji(task.status)} *Status:* ${translateStatus(task.status)}`,
    `${priorityEmoji(task.priority)} *Prioritas:* ${translatePriority(task.priority)}`,

    `⏰ *Deadline:* ${formatDate(task.deadline_at)}`,
    `📅 *Dijadwalkan:* ${formatDate(task.scheduled_at)}`,
    `🕐 *Dibuat:* ${formatDate(task.created_at)}`,
  ];

  if (task.completed_at) {
    lines.push(`✅ *Selesai:* ${formatDate(task.completed_at)}`);
  }
  if (task.cancelled_at) {
    lines.push(`🚫 *Dibatalkan:* ${formatDate(task.cancelled_at)}`);
  }
  if (task.description) {
    lines.push(``, `📝 *Deskripsi:* ${escapeMarkdown(task.description)}`);
  }

  return lines.join('\n');
}

/**
 * Build inline keyboard buttons for a pending task.
 */
export function buildPendingTaskKeyboard(taskId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Selesai', `complete:${taskId}`),
      Markup.button.callback('⏰ Reminder', `reminder:${taskId}`),
    ],
    [
      Markup.button.callback('🗑️ Hapus', `delete:${taskId}`),
      Markup.button.callback('📋 Detail', `detail:${taskId}`),
    ],
  ]);
}

/**
 * Build inline keyboard for a completed task.
 */
export function buildCompletedTaskKeyboard(taskId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('🔄 Buka Kembali', `reopen:${taskId}`),
      Markup.button.callback('🗑️ Hapus', `delete:${taskId}`),
    ],
  ]);
}

/**
 * Build inline keyboard for task detail view.
 */
export function buildDetailKeyboard(task: Task) {
  const buttons = [];

  if (task.status === 'pending') {
    buttons.push([
      Markup.button.callback('✅ Selesai', `complete:${task.id}`),
      Markup.button.callback('⏰ Reminder', `reminder:${task.id}`),
    ]);
    buttons.push([
      Markup.button.callback('❌ Batalkan', `cancel_task:${task.id}`),
      Markup.button.callback('🗑️ Hapus', `delete:${task.id}`),
    ]);
  } else if (task.status === 'completed') {
    buttons.push([
      Markup.button.callback('🔄 Buka Kembali', `reopen:${task.id}`),
      Markup.button.callback('🗑️ Hapus', `delete:${task.id}`),
    ]);
  } else if (task.status === 'cancelled') {
    buttons.push([
      Markup.button.callback('🔄 Buka Kembali', `reopen:${task.id}`),
      Markup.button.callback('🗑️ Hapus', `delete:${task.id}`),
    ]);
  }

  return Markup.inlineKeyboard(buttons);
}

/**
 * Build reminder option keyboard for a task.
 */
/**
 * @param hasDeadline - Adjust button labels depending on whether task has a deadline.
 *                       When false, shows relative labels ("dari sekarang") instead of "Sebelum Deadline".
 */
export function buildReminderOptionsKeyboard(taskId: string, hasDeadline: boolean = true) {
  const label1h = hasDeadline ? '⏰ 1 Jam Sebelum' : '⏰ 1 Jam dari Sekarang';
  const label1d = hasDeadline ? '📅 1 Hari Sebelum' : '📅 1 Hari dari Sekarang';

  const rows: ReturnType<typeof Markup.button.callback>[][] = [
    [
      Markup.button.callback(label1h, `reminder_opt:${taskId}:1h`),
      Markup.button.callback(label1d, `reminder_opt:${taskId}:1d`),
    ],
  ];

  if (hasDeadline) {
    rows.push([
      Markup.button.callback('🔔 Pas Deadline', `reminder_opt:${taskId}:deadline`),
      Markup.button.callback('⏭️ Lewati', `skip_reminder:${taskId}`),
    ]);
  } else {
    rows.push([
      Markup.button.callback('⏭️ Lewati', `skip_reminder:${taskId}`),
    ]);
  }

  return Markup.inlineKeyboard(rows);
}

/**
 * Build inline keyboard for reminder notification (sent by scheduler).
 */
export function buildReminderNotificationKeyboard(taskId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('✅ Tandai Selesai', `complete:${taskId}`),
      Markup.button.callback('⏰ Tunda 30m', `snooze:${taskId}:30`),
    ],
    [
      Markup.button.callback('⏰ Tunda 1 Jam', `snooze:${taskId}:60`),
      Markup.button.callback('📅 Tunda Besok Pagi', `snooze_tomorrow:${taskId}`),
    ],
  ]);
}

/**
 * Format relative time in Indonesian.
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'sudah lewat';
  }

  const diffMin = Math.round(diffMs / (60 * 1000));
  if (diffMin < 60) {
    return `dalam ${Math.max(1, diffMin)} menit`;
  }

  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) {
    const isSameDay =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
    if (isSameDay) {
      return `hari ini (${diffHours} jam lagi)`;
    }
    return `dalam ${diffHours} jam`;
  }

  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 1) {
    return `besok (dalam ${diffHours} jam)`;
  }

  return `${diffDays} hari lagi`;
}

/**
 * Format a single reminder as an interactive card.
 */
export function formatReminderCard(
  reminder: ReminderWithTask,
  currentIndex: number,
  total: number
): string {
  const title = reminder.task_title
    ? escapeMarkdown(reminder.task_title)
    : `Task #${reminder.task_id.slice(0, 8)}`;
  const priority = reminder.task_priority ?? 'normal';
  const status = reminder.task_status ?? 'pending';
  const relativeRemind = formatRelativeTime(reminder.remind_at);
  const deadlineText = reminder.task_deadline_at
    ? formatDate(reminder.task_deadline_at)
    : 'Tidak ada';

  const lines = [
    `🔔 *PENGINGAT AKTIF* (${currentIndex + 1} dari ${total})`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `📌 *Tugas:* *${title}*`,
    `${priorityEmoji(priority)} *Prioritas:* ${translatePriority(priority)}  |  ${statusEmoji(status)} *Status:* ${translateStatus(status)}`,

    `⏰ *Waktu Pengingat:* ${formatDate(reminder.remind_at)}`,
    `   └ ⏳ _(${relativeRemind})_`,
    `🎯 *Deadline Tugas:* ${deadlineText}`,
  ];

  if (reminder.task_description) {
    const desc =
      reminder.task_description.length > 80
        ? reminder.task_description.slice(0, 77) + '...'
        : reminder.task_description;
    lines.push(`📝 *Deskripsi:* ${escapeMarkdown(desc)}`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━━━`);

  return lines.join('\n');
}

/**
 * Build inline keyboard for reminder card view with pagination and quick actions.
 */
export function buildReminderCardKeyboard(
  reminder: ReminderWithTask,
  currentIndex: number,
  total: number
) {
  const keyboard: ReturnType<typeof Markup.button.callback>[][] = [];

  // Pagination buttons (only if total > 1)
  if (total > 1) {
    const prevIndex = (currentIndex - 1 + total) % total;
    const nextIndex = (currentIndex + 1) % total;

    keyboard.push([
      Markup.button.callback('⬅️ Prev', `reminders_page:${prevIndex}`),
      Markup.button.callback(`${currentIndex + 1} / ${total}`, 'noop'),
      Markup.button.callback('Next ➡️', `reminders_page:${nextIndex}`),
    ]);
  }

  // Action buttons: Open Task Detail & Cancel Reminder
  keyboard.push([
    Markup.button.callback('📋 Detail Task', `detail:${reminder.task_id}`),
    Markup.button.callback('❌ Batalkan', `cancel_reminder:${reminder.id}:${currentIndex}`),
  ]);

  // Utility row: Refresh button
  keyboard.push([
    Markup.button.callback('🔄 Refresh', `reminders_page:${currentIndex}`),
  ]);

  return Markup.inlineKeyboard(keyboard);
}

/**
 * Format a reminder item for display.
 */
export function formatReminderItem(reminder: Reminder, index: number, taskTitle?: string): string {
  const title = taskTitle ? escapeMarkdown(taskTitle) : `Task ${reminder.task_id.slice(0, 8)}`;
  return `${index + 1}. 🔔 *${title}*\n   ⏰ Pengingat: ${formatDate(reminder.remind_at)}\n   📊 Status: ${reminder.status}`;
}

/**
 * Resolve user from Telegraf context — upserts and returns the internal user record.
 */
export async function resolveUser(ctx: MyContext) {
  const telegramUserId = ctx.from?.id.toString();
  const displayName = ctx.from?.first_name || 'User';

  if (!telegramUserId) {
    return null;
  }

  return ctx.userService.upsertUser({
    telegram_user_id: telegramUserId,
    display_name: displayName,
    timezone: 'Asia/Makassar',
  });
}

/**
 * Escape special Markdown characters to prevent parse errors.
 * Only escapes characters that conflict with Telegram's Markdown parser.
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
