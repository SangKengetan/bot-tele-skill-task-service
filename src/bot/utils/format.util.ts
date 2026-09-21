import { Markup } from 'telegraf';
import { MyContext } from '../context';
import { Task } from '../../types/task.types';
import { Reminder } from '../../types/reminder.types';

/**
 * Format a date to Indonesian locale string.
 */
export function formatDate(date: Date | string | null): string {
  if (!date) return 'Tidak ada';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('id-ID', {
    timeZone: 'Asia/Makassar',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  const priority = `\n   ${priorityEmoji(task.priority)} Prioritas: ${task.priority}`;
  const status = `\n   ${statusEmoji(task.status)} Status: ${task.status}`;

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
    `${statusEmoji(task.status)} *Status:* ${task.status}`,
    `${priorityEmoji(task.priority)} *Prioritas:* ${task.priority}`,
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
export function buildReminderOptionsKeyboard(taskId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('⏰ 1 Jam Sebelum', `reminder_opt:${taskId}:1h`),
      Markup.button.callback('📅 1 Hari Sebelum', `reminder_opt:${taskId}:1d`),
    ],
    [
      Markup.button.callback('🔔 Pas Deadline', `reminder_opt:${taskId}:deadline`),
      Markup.button.callback('⏭️ Lewati', `noop`),
    ],
  ]);
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
  ]);
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
