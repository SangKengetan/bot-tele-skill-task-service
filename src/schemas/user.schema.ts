import { z } from 'zod';
import { env } from '../config/env';

export const createUserSchema = z.object({
  telegram_user_id: z
    .string()
    .min(1, 'telegram_user_id is required')
    .max(50, 'telegram_user_id too long'),
  display_name: z.string().min(1, 'display_name is required').max(255, 'display_name too long'),
  timezone: z.string().default(env.DEFAULT_TIMEZONE),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
