import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service';
import { ReminderRepository } from '../repositories/reminder.repository';
import { sendSuccess, sendList } from '../utils/response';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  TaskSearchDto,
} from '../schemas/task.schema';

export class TaskController {
  constructor(
    private taskService: TaskService,
    private reminderRepo: ReminderRepository
  ) {}

  createTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateTaskDto;
      const task = await this.taskService.createTask(dto);
      sendSuccess(res, task, 201);
    } catch (err) {
      next(err);
    }
  };

  listTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.query as unknown as TaskQueryDto;
      const { tasks, pagination } = await this.taskService.listTasks(dto);
      sendList(res, tasks, pagination);
    } catch (err) {
      next(err);
    }
  };

  getTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.query['user_id'] as string | undefined;
      const task = await this.taskService.getTask(id, userId);
      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  };

  updateTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const dto = req.body as UpdateTaskDto;
      const userId = req.query['user_id'] as string | undefined;
      const task = await this.taskService.updateTask(id, dto, userId);
      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  };

  completeTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.query['user_id'] as string | undefined;
      const task = await this.taskService.completeTask(id, userId);

      // Cancel pending reminders when task is completed
      await this.reminderRepo.cancelByTaskId(id);

      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  };

  reopenTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.query['user_id'] as string | undefined;
      const task = await this.taskService.reopenTask(id, userId);
      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  };

  cancelTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.query['user_id'] as string | undefined;
      const task = await this.taskService.cancelTask(id, this.reminderRepo, userId);
      sendSuccess(res, task);
    } catch (err) {
      next(err);
    }
  };

  deleteTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const userId = req.query['user_id'] as string | undefined;
      await this.taskService.deleteTask(id, userId);
      sendSuccess(res, { id, deleted: true });
    } catch (err) {
      next(err);
    }
  };

  searchTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.query as unknown as TaskSearchDto;
      const { tasks, pagination } = await this.taskService.searchTasks(dto);
      sendList(res, tasks, pagination);
    } catch (err) {
      next(err);
    }
  };

  getTodayTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.query['user_id'] as string | undefined;
      const tasks = await this.taskService.getTodayTasks(userId);
      sendSuccess(res, tasks);
    } catch (err) {
      next(err);
    }
  };

  getUpcomingTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.query['user_id'] as string | undefined;
      const tasks = await this.taskService.getUpcomingTasks(userId);
      sendSuccess(res, tasks);
    } catch (err) {
      next(err);
    }
  };

  getOverdueTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.query['user_id'] as string | undefined;
      const tasks = await this.taskService.getOverdueTasks(userId);
      sendSuccess(res, tasks);
    } catch (err) {
      next(err);
    }
  };

  getCompletedTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.query['user_id'] as string | undefined;
      const limit = parseInt(req.query['limit'] as string ?? '20', 10);
      const offset = parseInt(req.query['offset'] as string ?? '0', 10);
      const { tasks, pagination } = await this.taskService.getCompletedTasks(userId, limit, offset);
      sendList(res, tasks, pagination);
    } catch (err) {
      next(err);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.query['user_id'] as string | undefined;
      const stats = await this.taskService.getStats(userId);
      sendSuccess(res, stats);
    } catch (err) {
      next(err);
    }
  };
}
