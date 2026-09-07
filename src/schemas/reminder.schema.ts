import { z } from 'zod';

const REMINDER_STATUSES = ['pending', 'sent', 'cancelled', 'failed'] as const;

export const createReminderSchema = z.object({
  remind_at: z
    .string()
    .datetime({ offset: true, message: 'remind_at must be a valid ISO 8601 datetime with timezone offset' }),
});

export const reminderQuerySchema = z.object({
  user_id: z.string().uuid('user_id must be a valid UUID').optional(),
  status: z.enum(REMINDER_STATUSES).optional(),
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

export type CreateReminderDto = z.infer<typeof createReminderSchema>;
export type ReminderQueryDto = z.infer<typeof reminderQuerySchema>;
