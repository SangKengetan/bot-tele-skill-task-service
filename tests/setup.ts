import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';
import { db, closeDb } from '../src/config/database';

beforeAll(async () => {
  // In a real test environment, we'd run migrations against a dedicated test database
  // For MVP, we'll just ensure the DB connection is healthy
  try {
    await db.query('SELECT 1');
  } catch (err) {
    console.warn('Database is not available for integration tests. Please run docker compose up postgres');
  }
});

afterAll(async () => {
  await closeDb();
});
