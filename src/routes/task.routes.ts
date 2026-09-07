import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { ReminderController } from '../controllers/reminder.controller';
import { validate } from '../middleware/validate.middleware';
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  taskSearchSchema,
} from '../schemas/task.schema';
import { createReminderSchema } from '../schemas/reminder.schema';

export function createTaskRoutes(
  taskController: TaskController,
  reminderController: ReminderController
): Router {
  const router = Router();

  // ─── Special routes MUST come before /:id to avoid route conflicts ───────────

  /**
   * GET /api/v1/tasks/search?q=...
   */
  router.get('/search', validate(taskSearchSchema, 'query'), taskController.searchTasks);

  /**
   * GET /api/v1/tasks/today
   */
  router.get('/today', taskController.getTodayTasks);

  /**
   * GET /api/v1/tasks/upcoming
   */
  router.get('/upcoming', taskController.getUpcomingTasks);

  /**
   * GET /api/v1/tasks/overdue
   */
  router.get('/overdue', taskController.getOverdueTasks);

  /**
   * GET /api/v1/tasks/completed
   */
  router.get('/completed', taskController.getCompletedTasks);

  /**
   * GET /api/v1/tasks/stats
   */
  router.get('/stats', taskController.getStats);

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/tasks
   */
  router.post('/', validate(createTaskSchema), taskController.createTask);

  /**
   * GET /api/v1/tasks
   */
  router.get('/', validate(taskQuerySchema, 'query'), taskController.listTasks);

  /**
   * GET /api/v1/tasks/:id
   */
  router.get('/:id', taskController.getTask);

  /**
   * PATCH /api/v1/tasks/:id
   */
  router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);

  /**
   * DELETE /api/v1/tasks/:id
   */
  router.delete('/:id', taskController.deleteTask);

  // ─── Status transitions ──────────────────────────────────────────────────────

  /**
   * POST /api/v1/tasks/:id/complete
   */
  router.post('/:id/complete', taskController.completeTask);

  /**
   * POST /api/v1/tasks/:id/reopen
   */
  router.post('/:id/reopen', taskController.reopenTask);

  /**
   * POST /api/v1/tasks/:id/cancel
   */
  router.post('/:id/cancel', taskController.cancelTask);

  // ─── Reminders (nested under task) ──────────────────────────────────────────

  /**
   * POST /api/v1/tasks/:id/reminders
   */
  router.post(
    '/:id/reminders',
    validate(createReminderSchema),
    reminderController.createReminder
  );

  return router;
}
