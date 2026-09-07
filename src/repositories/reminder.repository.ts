import { Pool } from 'pg';
import { Reminder, ReminderStatus, ReminderWithContext, ReminderFilters } from '../types/reminder.types';

export class ReminderRepository {
  constructor(private pool: Pool) {}

  async create(taskId: string, userId: string, remindAt: Date): Promise<Reminder> {
    const result = await this.pool.query<Reminder>(
      `INSERT INTO reminders (task_id, user_id, remind_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [taskId, userId, remindAt]
    );
    return result.rows[0]!;
  }

  async findById(id: string): Promise<Reminder | null> {
    const result = await this.pool.query<Reminder>(
      'SELECT * FROM reminders WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findMany(filters: ReminderFilters): Promise<{ rows: Reminder[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.user_id) {
      conditions.push(`user_id = $${paramIdx++}`);
      params.push(filters.user_id);
    }
    if (filters.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.from) {
      conditions.push(`remind_at >= $${paramIdx++}`);
      params.push(new Date(`${filters.from}T00:00:00.000Z`));
    }
    if (filters.to) {
      conditions.push(`remind_at <= $${paramIdx++}`);
      params.push(new Date(`${filters.to}T23:59:59.999Z`));
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM reminders ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const rowsResult = await this.pool.query<Reminder>(
      `SELECT * FROM reminders ${where}
       ORDER BY remind_at ASC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return { rows: rowsResult.rows, total };
  }

  async findByTaskId(taskId: string): Promise<Reminder[]> {
    const result = await this.pool.query<Reminder>(
      'SELECT * FROM reminders WHERE task_id = $1 ORDER BY remind_at ASC',
      [taskId]
    );
    return result.rows;
  }

  /**
   * Atomically claim due reminders by updating their status to 'sent' and returning them.
   * Using UPDATE ... RETURNING prevents double-processing in case of concurrent scheduler runs.
   */
  async claimDueReminders(): Promise<ReminderWithContext[]> {
    const result = await this.pool.query<ReminderWithContext>(
      `UPDATE reminders r
       SET status = 'sent', sent_at = NOW()
       FROM tasks t, users u
       WHERE r.task_id = t.id
         AND r.user_id = u.id
         AND r.status = 'pending'
         AND r.remind_at <= NOW()
       RETURNING
         r.*,
         t.title AS task_title,
         t.description AS task_description,
         u.telegram_user_id,
         u.timezone AS user_timezone`
    );
    return result.rows;
  }

  /**
   * Mark a single reminder as failed (for use when notification delivery fails).
   */
  async markFailed(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE reminders SET status = 'failed', sent_at = NULL WHERE id = $1`,
      [id]
    );
  }

  async cancelByTaskId(taskId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE reminders SET status = 'cancelled'
       WHERE task_id = $1 AND status = 'pending'`,
      [taskId]
    );
    return result.rowCount ?? 0;
  }

  async cancel(id: string): Promise<Reminder | null> {
    const result = await this.pool.query<Reminder>(
      `UPDATE reminders SET status = 'cancelled'
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(id: string, status: ReminderStatus): Promise<void> {
    await this.pool.query(
      'UPDATE reminders SET status = $1 WHERE id = $2',
      [status, id]
    );
  }
}
