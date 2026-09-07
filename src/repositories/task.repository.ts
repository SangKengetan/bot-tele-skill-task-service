import { Pool } from 'pg';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilters, TaskStats } from '../types/task.types';

export class TaskRepository {
  constructor(private pool: Pool) {}

  async create(input: CreateTaskInput): Promise<Task> {
    const { user_id, title, description, priority, scheduled_at, deadline_at } = input;

    const result = await this.pool.query<Task>(
      `INSERT INTO tasks (user_id, title, description, priority, scheduled_at, deadline_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        user_id,
        title,
        description ?? null,
        priority ?? 'medium',
        scheduled_at ? new Date(scheduled_at) : null,
        deadline_at ? new Date(deadline_at) : null,
      ]
    );

    return result.rows[0]!;
  }

  async findById(id: string): Promise<Task | null> {
    const result = await this.pool.query<Task>('SELECT * FROM tasks WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Task | null> {
    const result = await this.pool.query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] ?? null;
  }

  async findMany(filters: TaskFilters): Promise<{ rows: Task[]; total: number }> {
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
    if (filters.priority) {
      conditions.push(`priority = $${paramIdx++}`);
      params.push(filters.priority);
    }
    if (filters.date) {
      // Match tasks where the date falls within scheduled_at or deadline_at on the given calendar day
      conditions.push(
        `(DATE(scheduled_at AT TIME ZONE 'UTC') = $${paramIdx} OR DATE(deadline_at AT TIME ZONE 'UTC') = $${paramIdx})`
      );
      params.push(filters.date);
      paramIdx++;
    }
    if (filters.from) {
      conditions.push(`(scheduled_at >= $${paramIdx} OR deadline_at >= $${paramIdx})`);
      params.push(new Date(`${filters.from}T00:00:00.000Z`));
      paramIdx++;
    }
    if (filters.to) {
      conditions.push(`(scheduled_at <= $${paramIdx} OR deadline_at <= $${paramIdx})`);
      params.push(new Date(`${filters.to}T23:59:59.999Z`));
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = `ORDER BY deadline_at ASC NULLS LAST, scheduled_at ASC NULLS LAST, created_at DESC`;

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const rowsResult = await this.pool.query<Task>(
      `SELECT * FROM tasks ${where} ${orderBy} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    return { rows: rowsResult.rows, total };
  }

  async search(
    query: string,
    userId?: string,
    limit = 20,
    offset = 0
  ): Promise<{ rows: Task[]; total: number }> {
    const pattern = `%${query}%`;
    const params: unknown[] = [pattern];
    let userCondition = '';

    if (userId) {
      params.push(userId);
      userCondition = `AND user_id = $2`;
    }

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks WHERE (title ILIKE $1 OR description ILIKE $1) ${userCondition}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const rowsResult = await this.pool.query<Task>(
      `SELECT * FROM tasks 
       WHERE (title ILIKE $1 OR description ILIKE $1) ${userCondition}
       ORDER BY deadline_at ASC NULLS LAST, created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return { rows: rowsResult.rows, total };
  }

  async findToday(userId?: string): Promise<Task[]> {
    const params: unknown[] = [];
    const userCondition = userId ? `AND user_id = $1` : '';
    if (userId) params.push(userId);

    const result = await this.pool.query<Task>(
      `SELECT * FROM tasks
       WHERE (
         DATE(scheduled_at) = CURRENT_DATE OR
         DATE(deadline_at) = CURRENT_DATE
       )
       AND status = 'pending'
       ${userCondition}
       ORDER BY deadline_at ASC NULLS LAST, scheduled_at ASC NULLS LAST`,
      params
    );

    return result.rows;
  }

  async findUpcoming(userId?: string): Promise<Task[]> {
    const params: unknown[] = [];
    const userCondition = userId ? `AND user_id = $1` : '';
    if (userId) params.push(userId);

    const result = await this.pool.query<Task>(
      `SELECT * FROM tasks
       WHERE status = 'pending'
       AND (deadline_at > NOW() OR scheduled_at > NOW())
       ${userCondition}
       ORDER BY deadline_at ASC NULLS LAST, scheduled_at ASC NULLS LAST
       LIMIT 50`,
      params
    );

    return result.rows;
  }

  async findOverdue(userId?: string): Promise<Task[]> {
    const params: unknown[] = [];
    const userCondition = userId ? `AND user_id = $1` : '';
    if (userId) params.push(userId);

    const result = await this.pool.query<Task>(
      `SELECT * FROM tasks
       WHERE status = 'pending'
       AND deadline_at < NOW()
       ${userCondition}
       ORDER BY deadline_at ASC`,
      params
    );

    return result.rows;
  }

  async findCompleted(userId?: string, limit = 20, offset = 0): Promise<{ rows: Task[]; total: number }> {
    const params: unknown[] = [];
    const userCondition = userId ? `AND user_id = $1` : '';
    if (userId) params.push(userId);

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks WHERE status = 'completed' ${userCondition}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const rowsResult = await this.pool.query<Task>(
      `SELECT * FROM tasks
       WHERE status = 'completed'
       ${userCondition}
       ORDER BY completed_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    return { rows: rowsResult.rows, total };
  }

  async getStats(userId?: string): Promise<TaskStats> {
    const params: unknown[] = [];
    const where = userId ? 'WHERE user_id = $1' : '';
    if (userId) params.push(userId);

    const result = await this.pool.query<{
      total: string;
      pending: string;
      completed: string;
      cancelled: string;
      overdue: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
         COUNT(*) FILTER (WHERE status = 'pending' AND deadline_at < NOW()) AS overdue
       FROM tasks ${where}`,
      params
    );

    const row = result.rows[0]!;
    const total = parseInt(row.total, 10);
    const completed = parseInt(row.completed, 10);

    return {
      total,
      pending: parseInt(row.pending, 10),
      completed,
      cancelled: parseInt(row.cancelled, 10),
      overdue: parseInt(row.overdue, 10),
      completion_rate: total > 0 ? parseFloat((completed / total).toFixed(4)) : 0,
    };
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const fields: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (input.title !== undefined) {
      fields.push(`title = $${paramIdx++}`);
      params.push(input.title);
    }
    if (input.description !== undefined) {
      fields.push(`description = $${paramIdx++}`);
      params.push(input.description);
    }
    if (input.priority !== undefined) {
      fields.push(`priority = $${paramIdx++}`);
      params.push(input.priority);
    }
    if (input.scheduled_at !== undefined) {
      fields.push(`scheduled_at = $${paramIdx++}`);
      params.push(input.scheduled_at ? new Date(input.scheduled_at) : null);
    }
    if (input.deadline_at !== undefined) {
      fields.push(`deadline_at = $${paramIdx++}`);
      params.push(input.deadline_at ? new Date(input.deadline_at) : null);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await this.pool.query<Task>(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      params
    );

    return result.rows[0] ?? null;
  }

  async complete(id: string): Promise<Task | null> {
    const result = await this.pool.query<Task>(
      `UPDATE tasks
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async reopen(id: string): Promise<Task | null> {
    const result = await this.pool.query<Task>(
      `UPDATE tasks
       SET status = 'pending', completed_at = NULL, cancelled_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async cancel(id: string): Promise<Task | null> {
    const result = await this.pool.query<Task>(
      `UPDATE tasks
       SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
