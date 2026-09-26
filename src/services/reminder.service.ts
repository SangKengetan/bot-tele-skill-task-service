import { ReminderRepository } from '../repositories/reminder.repository';
import { TaskRepository } from '../repositories/task.repository';
import { TaskHistoryRepository } from '../repositories/task-history.repository';
import { UserRepository } from '../repositories/user.repository';
import { Reminder, ReminderWithTask, ReminderFilters } from '../types/reminder.types';
import { CreateReminderDto, ReminderQueryDto } from '../schemas/reminder.schema';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PaginationMeta } from '../utils/response';

export class ReminderService {
  constructor(
    private reminderRepo: ReminderRepository,
    private taskRepo: TaskRepository,
    private historyRepo: TaskHistoryRepository,
    private userRepo: UserRepository
  ) {}

  async createReminder(taskId: string, dto: CreateReminderDto): Promise<Reminder> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      throw new NotFoundError('Task');
    }

    const remindAt = new Date(dto.remind_at);

    // Validate: remind_at must be <= deadline_at if deadline exists
    if (task.deadline_at && remindAt > task.deadline_at) {
      throw new ValidationError(
        'remind_at must be before or equal to the task deadline_at'
      );
    }

    // Validate: remind_at should not be in the past (warn, not error)
    if (remindAt < new Date()) {
      throw new ValidationError('remind_at cannot be in the past');
    }

    const reminder = await this.reminderRepo.create(taskId, task.user_id, remindAt);

    // Record in history
    await this.historyRepo.create({
      task_id: taskId,
      user_id: task.user_id,
      action: 'reminder_created',
      new_value: { remind_at: reminder.remind_at, reminder_id: reminder.id },
    });

    return reminder;
  }

  async listReminders(dto: ReminderQueryDto): Promise<{ reminders: ReminderWithTask[]; pagination: PaginationMeta }> {
    const filters: ReminderFilters = {
      user_id: dto.user_id,
      status: dto.status,
      from: dto.from,
      to: dto.to,
      limit: dto.limit,
      offset: dto.offset,
    };

    const { rows, total } = await this.reminderRepo.findMany(filters);

    return {
      reminders: rows,
      pagination: { limit: dto.limit, offset: dto.offset, total },
    };
  }

  async cancelReminder(id: string): Promise<Reminder> {
    const cancelled = await this.reminderRepo.cancel(id);

    if (!cancelled) {
      // Check if it exists at all
      const exists = await this.reminderRepo.findById(id);
      if (!exists) {
        throw new NotFoundError('Reminder');
      }
      throw new ValidationError(
        `Reminder cannot be cancelled — current status is '${exists.status}'`
      );
    }

    return cancelled;
  }
}
