export interface User {
  id: string;
  telegram_user_id: string;
  display_name: string;
  timezone: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  telegram_user_id: string;
  display_name: string;
  timezone?: string;
}

export interface UserPublic {
  id: string;
  telegram_user_id: string;
  display_name: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
