import { Pool, PoolConfig } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
};

export const db = new Pool(poolConfig);

db.on('error', (err) => {
  logger.error({ err }, 'Unexpected PostgreSQL pool error');
});

/**
 * Test the database connection.
 * Throws if unable to connect.
 */
export async function checkDbConnection(): Promise<void> {
  const client = await db.connect();
  client.release();
}

/**
 * Gracefully close the pool.
 */
export async function closeDb(): Promise<void> {
  await db.end();
  logger.info('PostgreSQL pool closed');
}
