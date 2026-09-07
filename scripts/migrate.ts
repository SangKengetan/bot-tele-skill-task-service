/**
 * Migration runner script.
 * Usage: npm run migrate
 *
 * Reads all SQL files from the migrations/ directory in alphabetical order
 * and executes them in a transaction.
 *
 * Uses a migrations_log table to track which migrations have already been applied
 * (idempotent — safe to run multiple times).
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

const DATABASE_URL = process.env['DATABASE_URL'];

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting migrations...\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations_log (
        id         SERIAL      PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM migrations_log ORDER BY id'
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    // Read migration files from migrations/ directory
    const migrationsDir = path.join(process.cwd(), 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.error(`ERROR: migrations/ directory not found at ${migrationsDir}`);
      process.exit(1);
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // Alphabetical order (001_, 002_, etc.)

    let newMigrations = 0;

    for (const filename of files) {
      if (appliedSet.has(filename)) {
        console.log(`  [SKIP] ${filename} (already applied)`);
        continue;
      }

      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`  [RUN]  ${filename}`);

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations_log (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        console.log(`  [OK]   ${filename}`);
        newMigrations++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  [FAIL] ${filename}`);
        console.error(err);
        process.exit(1);
      }
    }

    console.log(`\nMigrations complete. ${newMigrations} new migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
