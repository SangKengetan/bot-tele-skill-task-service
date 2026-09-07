export type ReminderStatus = 'pending' | 'sent' | 'cancelled' | 'failed';

export interface Reminder {
  id: string;
  task_id: string;
  user_id: string;
  remind_at: Date;
  status: ReminderStatus;
  sent_at: Date | null;
  created_at: Date;
}

export interface CreateReminderInput {
  remind_at: string;
}

export interface ReminderFilters {
  user_id?: string;
  status?: ReminderStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

/** Enriched reminder used by the scheduler — includes task and user context */
export interface ReminderWithContext extends Reminder {
  task_title: string;
  task_description: string | null;
  telegram_user_id: string;
  user_timezone: string;
}
