import { Router } from 'express';
import { ReminderController } from '../controllers/reminder.controller';
import { validate } from '../middleware/validate.middleware';
import { reminderQuerySchema } from '../schemas/reminder.schema';

export function createReminderRoutes(controller: ReminderController): Router {
  const router = Router();

  /**
   * GET /api/v1/reminders
   */
  router.get('/', validate(reminderQuerySchema, 'query'), controller.listReminders);

  /**
   * POST /api/v1/reminders/:id/cancel
   */
  router.post('/:id/cancel', controller.cancelReminder);

  return router;
}
