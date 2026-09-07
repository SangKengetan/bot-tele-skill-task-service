import { Request, Response, NextFunction } from 'express';
import { isAppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * Catches all errors thrown/next(err) from routes and middleware.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (isAppError(err)) {
    // Known operational error — log at warn level
    logger.warn({ err, path: req.path, method: req.method }, `Operational error: ${err.message}`);
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // Unknown/unexpected error — log at error level with full stack
  logger.error({ err, path: req.path, method: req.method }, 'Unexpected error');

  const isProduction = process.env['NODE_ENV'] === 'production';
  sendError(
    res,
    500,
    'INTERNAL_SERVER_ERROR',
    isProduction ? 'An unexpected error occurred' : String(err)
  );
}
