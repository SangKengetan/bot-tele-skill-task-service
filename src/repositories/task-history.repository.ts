import { Pool } from 'pg';
import { TaskHistory, TaskHistoryAction } from '../types/task.types';

export interface CreateHistoryInput {
  task_id: string;
  user_id: string;
  action: TaskHistoryAction;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
}

export class TaskHistoryRepository {
  constructor(private pool: Pool) {}

  async create(input: CreateHistoryInput): Promise<TaskHistory> {
    const { task_id, user_id, action, old_value, new_value } = input;

    const result = await this.pool.query<TaskHistory>(
      `INSERT INTO task_history (task_id, user_id, action, old_value, new_value)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        task_id,
        user_id,
        action,
        old_value ? JSON.stringify(old_value) : null,
        new_value ? JSON.stringify(new_value) : null,
      ]
    );

    return result.rows[0]!;
  }

  async findByTaskId(taskId: string): Promise<TaskHistory[]> {
    const result = await this.pool.query<TaskHistory>(
      'SELECT * FROM task_history WHERE task_id = $1 ORDER BY created_at DESC',
      [taskId]
    );
    return result.rows;
  }
}
