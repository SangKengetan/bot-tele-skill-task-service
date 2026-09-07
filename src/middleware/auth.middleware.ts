import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { sendError } from '../utils/response';

/**
 * API key authentication middleware.
 * Expects the header: X-API-Key: <key>
 *
 * Health check endpoints (/health, /health/db) bypass this middleware
 * as they are registered before applying auth.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== env.TASK_SERVICE_API_KEY) {
    sendError(res, 401, 'UNAUTHORIZED', 'Invalid or missing API key');
    return;
  }

  next();
}
