import { z } from 'zod';
import { logger } from '../utils/logger';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  TASK_SERVICE_API_KEY: z.string().min(16, 'API key must be at least 16 characters'),
  DEFAULT_TIMEZONE: z.string().default('Asia/Makassar'),
  REMINDER_INTERVAL_SECONDS: z.coerce.number().int().min(10).max(3600).default(60),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().default(100),
  CORS_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function loadEnv() {
  // dotenv is loaded in server.ts before this module is imported
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    logger.error(
      { errors: result.error.flatten().fieldErrors },
      'Invalid environment variables — application cannot start'
    );
    process.exit(1);
  }

  return result.data;
}

export const env = loadEnv();
export type Env = typeof env;
