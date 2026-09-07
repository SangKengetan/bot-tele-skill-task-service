import { TaskRepository } from '../repositories/task.repository';
import { TaskHistoryRepository } from '../repositories/task-history.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  Task,
  TaskFilters,
  TaskStats,
  TaskSearchFilters,
} from '../types/task.types';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  TaskSearchDto,
} from '../schemas/task.schema';
import { NotFoundError, ValidationError } from '../utils/errors';
import { PaginationMeta } from '../utils/response';

export class TaskService {
  constructor(
    private taskRepo: TaskRepository,
    private historyRepo: TaskHistoryRepository,
    private userRepo: UserRepository
  ) {}

  // ─── Create ─────────────────────────────────────────────────────────────────

  async createTask(dto: CreateTaskDto): Promise<Task> {
    // Verify user exists
    const user = await this.userRepo.findById(dto.user_id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Cross-field validation (also done by Zod schema, but defense in depth)
    if (dto.scheduled_at && dto.deadline_at) {
      if (new Date(dto.scheduled_at) > new Date(dto.deadline_at)) {
        throw new ValidationError('deadline_at must be greater than or equal to scheduled_at');
      }
    }

    const task = await this.taskRepo.create({
      user_id: dto.user_id,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      scheduled_at: dto.scheduled_at ?? null,
      deadline_at: dto.deadline_at ?? null,
    });

    // Record history
    await this.historyRepo.create({
      task_id: task.id,
      user_id: task.user_id,
      action: 'created',
      new_value: {
        title: task.title,
        description: task.description,
        priority: task.priority,
        scheduled_at: task.scheduled_at,
        deadline_at: task.deadline_at,
      },
    });

    return task;
  }

  // ─── Read ────────────────────────────────────────────────────────────────────

  async getTask(id: string, userId?: string): Promise<Task> {
    let task: Task | null;

    if (userId) {
      task = await this.taskRepo.findByIdAndUserId(id, userId);
    } else {
      task = await this.taskRepo.findById(id);
    }

    if (!task) {
      throw new NotFoundError('Task');
    }

    return task;
  }

  async listTasks(dto: TaskQueryDto): Promise<{ tasks: Task[]; pagination: PaginationMeta }> {
    const filters: TaskFilters = {
      user_id: dto.user_id,
      status: dto.status,
      priority: dto.priority,
      date: dto.date,
      from: dto.from,
      to: dto.to,
      limit: dto.limit,
      offset: dto.offset,
    };

    const { rows, total } = await this.taskRepo.findMany(filters);

    return {
      tasks: rows,
      pagination: { limit: dto.limit, offset: dto.offset, total },
    };
  }

  async searchTasks(dto: TaskSearchDto): Promise<{ tasks: Task[]; pagination: PaginationMeta }> {
    const filters: TaskSearchFilters = {
      user_id: dto.user_id,
      q: dto.q,
      limit: dto.limit,
      offset: dto.offset,
    };

    const { rows, total } = await this.taskRepo.search(
      filters.q,
      filters.user_id,
      filters.limit,
      filters.offset
    );

    return {
      tasks: rows,
      pagination: { limit: dto.limit, offset: dto.offset, total },
    };
  }

  async getTodayTasks(userId?: string): Promise<Task[]> {
    return this.taskRepo.findToday(userId);
  }

  async getUpcomingTasks(userId?: string): Promise<Task[]> {
    return this.taskRepo.findUpcoming(userId);
  }

  async getOverdueTasks(userId?: string): Promise<Task[]> {
    return this.taskRepo.findOverdue(userId);
  }

  async getCompletedTasks(
    userId?: string,
    limit = 20,
    offset = 0
  ): Promise<{ tasks: Task[]; pagination: PaginationMeta }> {
    const { rows, total } = await this.taskRepo.findCompleted(userId, limit, offset);
    return { tasks: rows, pagination: { limit, offset, total } };
  }

  async getStats(userId?: string): Promise<TaskStats> {
    return this.taskRepo.getStats(userId);
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async updateTask(id: string, dto: UpdateTaskDto, userId?: string): Promise<Task> {
    const existing = await this.getTask(id, userId);

    // Validate date combination after merge
    const newScheduledAt = dto.scheduled_at !== undefined ? dto.scheduled_at : existing.scheduled_at?.toISOString() ?? null;
    const newDeadlineAt = dto.deadline_at !== undefined ? dto.deadline_at : existing.deadline_at?.toISOString() ?? null;

    if (newScheduledAt && newDeadlineAt) {
      if (new Date(newScheduledAt) > new Date(newDeadlineAt)) {
        throw new ValidationError('deadline_at must be greater than or equal to scheduled_at');
      }
    }

    const updated = await this.taskRepo.update(id, dto);
    if (!updated) {
      throw new NotFoundError('Task');
    }

    // Build change record for history
    const changes: Record<string, unknown> = {};
    const oldValues: Record<string, unknown> = {};

    for (const key of Object.keys(dto) as Array<keyof UpdateTaskDto>) {
      if (dto[key] !== undefined) {
        oldValues[key] = existing[key as keyof Task];
        changes[key] = dto[key];
      }
    }

    const action = dto.deadline_at !== undefined ? 'deadline_changed' : 'updated';

    await this.historyRepo.create({
      task_id: id,
      user_id: existing.user_id,
      action,
      old_value: oldValues,
      new_value: changes,
    });

    return updated;
  }

  // ─── Status Changes ──────────────────────────────────────────────────────────

  async completeTask(id: string, userId?: string): Promise<Task> {
    const existing = await this.getTask(id, userId);

    // Idempotent — if already completed, return current state
    if (existing.status === 'completed') {
      return existing;
    }

    const updated = await this.taskRepo.complete(id);
    if (!updated) {
      throw new NotFoundError('Task');
    }

    await this.historyRepo.create({
      task_id: id,
      user_id: existing.user_id,
      action: 'completed',
      old_value: { status: existing.status },
      new_value: { status: 'completed', completed_at: updated.completed_at },
    });

    return updated;
  }

  async reopenTask(id: string, userId?: string): Promise<Task> {
    const existing = await this.getTask(id, userId);

    const updated = await this.taskRepo.reopen(id);
    if (!updated) {
      throw new NotFoundError('Task');
    }

    await this.historyRepo.create({
      task_id: id,
      user_id: existing.user_id,
      action: 'reopened',
      old_value: { status: existing.status },
      new_value: { status: 'pending' },
    });

    return updated;
  }

  async cancelTask(
    id: string,
    reminderRepo: { cancelByTaskId: (taskId: string) => Promise<number> },
    userId?: string
  ): Promise<Task> {
    const existing = await this.getTask(id, userId);

    // Idempotent — if already cancelled, return current state
    if (existing.status === 'cancelled') {
      return existing;
    }

    const updated = await this.taskRepo.cancel(id);
    if (!updated) {
      throw new NotFoundError('Task');
    }

    // Cancel associated pending reminders
    await reminderRepo.cancelByTaskId(id);

    await this.historyRepo.create({
      task_id: id,
      user_id: existing.user_id,
      action: 'cancelled',
      old_value: { status: existing.status },
      new_value: { status: 'cancelled', cancelled_at: updated.cancelled_at },
    });

    return updated;
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async deleteTask(id: string, userId?: string): Promise<void> {
    const existing = await this.getTask(id, userId);

    // Record history before deletion (will be cascade deleted with task)
    // We store it here for audit purposes before the cascade removes it
    await this.historyRepo.create({
      task_id: id,
      user_id: existing.user_id,
      action: 'deleted',
      old_value: {
        title: existing.title,
        status: existing.status,
        priority: existing.priority,
      },
    });

    const deleted = await this.taskRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError('Task');
    }
  }
}
