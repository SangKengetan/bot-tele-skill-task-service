import { z } from 'zod';

const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
const TASK_STATUSES = ['pending', 'completed', 'cancelled'] as const;

const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be a valid ISO 8601 datetime with timezone offset' });

export const createTaskSchema = z
  .object({
    user_id: z.string().uuid('user_id must be a valid UUID'),
    title: z.string().min(1, 'title is required').max(500, 'title too long'),
    description: z.string().max(5000, 'description too long').nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).default('medium'),
    scheduled_at: isoDateTimeSchema.nullable().optional(),
    deadline_at: isoDateTimeSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.scheduled_at && data.deadline_at) {
        return new Date(data.scheduled_at) <= new Date(data.deadline_at);
      }
      return true;
    },
    {
      message: 'deadline_at must be greater than or equal to scheduled_at',
      path: ['deadline_at'],
    }
  );

export const updateTaskSchema = z
  .object({
    title: z.string().min(1, 'title cannot be empty').max(500, 'title too long').optional(),
    description: z.string().max(5000, 'description too long').nullable().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    scheduled_at: isoDateTimeSchema.nullable().optional(),
    deadline_at: isoDateTimeSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      if (data.scheduled_at && data.deadline_at) {
        return new Date(data.scheduled_at) <= new Date(data.deadline_at);
      }
      return true;
    },
    {
      message: 'deadline_at must be greater than or equal to scheduled_at',
      path: ['deadline_at'],
    }
  );

export const taskQuerySchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID').optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format')
    .optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'from must be in YYYY-MM-DD format')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'to must be in YYYY-MM-DD format')
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const taskSearchSchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID').optional(),
  q: z.string().min(1, 'q (search query) is required').max(200, 'search query too long'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const userIdQuerySchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID').optional(),
});

export type CreateTaskDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskDto = z.infer<typeof updateTaskSchema>;
export type TaskQueryDto = z.infer<typeof taskQuerySchema>;
export type TaskSearchDto = z.infer<typeof taskSearchSchema>;
