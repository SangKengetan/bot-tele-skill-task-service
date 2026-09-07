import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { sendSuccess } from '../utils/response';
import { CreateUserDto } from '../schemas/user.schema';

export class UserController {
  constructor(private userService: UserService) {}

  upsertUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateUserDto;
      const user = await this.userService.upsertUser(dto);
      sendSuccess(res, user, 200);
    } catch (err) {
      next(err);
    }
  };
}
