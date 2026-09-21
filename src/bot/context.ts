import { Context, Scenes } from 'telegraf';
import { TaskService } from '../services/task.service';
import { UserService } from '../services/user.service';
import { ReminderService } from '../services/reminder.service';
import { ReminderRepository } from '../repositories/reminder.repository';

interface WizardSession extends Scenes.WizardSessionData {
  taskData: {
    title?: string;
    deadline_at?: string;
  };
}

export interface MyContext extends Context {
  // Declare session type
  session: Scenes.WizardSession<WizardSession>;
  // Declare scene type
  scene: Scenes.SceneContextScene<MyContext, WizardSession>;
  // Declare wizard type
  wizard: Scenes.WizardContextWizard<MyContext>;
  
  // Dependency Injection
  taskService: TaskService;
  userService: UserService;
  reminderService: ReminderService;
  reminderRepo: ReminderRepository;
}
