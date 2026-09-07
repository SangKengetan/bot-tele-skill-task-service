import { Request, Response, NextFunction } from 'express';
import { ReminderService } from '../services/reminder.service';
import { sendSuccess, sendList } from '../utils/response';
import { CreateReminderDto, ReminderQueryDto } from '../schemas/reminder.schema';

export class ReminderController {
  constructor(private reminderService: ReminderService) {}

  createReminder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id: taskId } = req.params as { id: string };
      const dto = req.body as CreateReminderDto;
      const reminder = await this.reminderService.createReminder(taskId, dto);
      sendSuccess(res, reminder, 201);
    } catch (err) {
      next(err);
    }
  };

  listReminders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.query as unknown as ReminderQueryDto;
      const { reminders, pagination } = await this.reminderService.listReminders(dto);
      sendList(res, reminders, pagination);
    } catch (err) {
      next(err);
    }
  };

  cancelReminder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      const reminder = await this.reminderService.cancelReminder(id);
      sendSuccess(res, reminder);
    } catch (err) {
      next(err);
    }
  };
}
