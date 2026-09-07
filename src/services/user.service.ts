import { UserRepository } from '../repositories/user.repository';
import { User } from '../types/user.types';
import { CreateUserDto } from '../schemas/user.schema';
import { env } from '../config/env';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async upsertUser(dto: CreateUserDto): Promise<User> {
    return this.userRepository.upsert({
      telegram_user_id: dto.telegram_user_id,
      display_name: dto.display_name,
      timezone: dto.timezone ?? env.DEFAULT_TIMEZONE,
    });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }
}
