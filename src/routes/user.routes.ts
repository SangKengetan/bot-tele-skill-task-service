import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { createUserSchema } from '../schemas/user.schema';

export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  /**
   * POST /api/v1/users
   * Upsert user by telegram_user_id.
   */
  router.post('/', validate(createUserSchema), controller.upsertUser);

  return router;
}
