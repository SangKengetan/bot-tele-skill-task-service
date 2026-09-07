import { Pool } from 'pg';
import { User, CreateUserInput } from '../types/user.types';

export class UserRepository {
  constructor(private pool: Pool) {}

  /**
   * Upsert user by telegram_user_id.
   * If user exists, update display_name and timezone.
   * Always returns the current user record.
   */
  async upsert(input: CreateUserInput): Promise<User> {
    const { telegram_user_id, display_name, timezone } = input;

    const result = await this.pool.query<User>(
      `INSERT INTO users (telegram_user_id, display_name, timezone)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_user_id)
       DO UPDATE SET
         display_name = EXCLUDED.display_name,
         timezone = EXCLUDED.timezone,
         updated_at = NOW()
       RETURNING *`,
      [telegram_user_id, display_name, timezone]
    );

    return result.rows[0]!;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<User>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }

  async findByTelegramId(telegramUserId: string): Promise<User | null> {
    const result = await this.pool.query<User>(
      'SELECT * FROM users WHERE telegram_user_id = $1',
      [telegramUserId]
    );
    return result.rows[0] ?? null;
  }
}
