export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskHistoryAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'cancelled'
  | 'deleted'
  | 'deadline_changed'
  | 'reminder_created';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_at: Date | null;
  deadline_at: Date | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  cancelled_at: Date | null;
}

export interface CreateTaskInput {
  user_id: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  scheduled_at?: string | null;
  deadline_at?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  scheduled_at?: string | null;
  deadline_at?: string | null;
}

export interface TaskFilters {
  user_id?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  date?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface TaskSearchFilters {
  user_id?: string;
  q: string;
  limit?: number;
  offset?: number;
}

export interface TaskHistory {
  id: string;
  task_id: string;
  user_id: string;
  action: TaskHistoryAction;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: Date;
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  cancelled: number;
  overdue: number;
  completion_rate: number;
}
