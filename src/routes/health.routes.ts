import { Router, Request, Response } from 'express';
import { checkDbConnection } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

/**
 * GET /health
 * Basic liveness check — no DB required.
 */
router.get('/', (_req: Request, res: Response) => {
  sendSuccess(res, { status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /health/db
 * Checks PostgreSQL connectivity.
 */
router.get('/db', async (_req: Request, res: Response) => {
  try {
    await checkDbConnection();
    sendSuccess(res, { status: 'ok', database: 'connected' });
  } catch (err) {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Database connection failed');
  }
});

export default router;
