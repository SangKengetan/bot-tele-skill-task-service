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
//# sourceMappingURL=migrate.d.ts.map