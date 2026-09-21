import { Telegraf, Scenes, session } from 'telegraf';
import { MyContext } from './context';
import { env } from '../config/env';
import { addTaskWizard } from './scenes/addTask.scene';
import { startCommand } from './commands/start.command';
import { listCommand } from './commands/list.command';
import { UserService } from '../services/user.service';
import { TaskService } from '../services/task.service';

export const setupBot = (bot: Telegraf<MyContext>, userService: UserService, taskService: TaskService): Telegraf<MyContext> => {
  // Inject services into bot context first
  bot.use(async (ctx, next) => {
    ctx.userService = userService;
    ctx.taskService = taskService;
    return next();
  });

  // Initialize stage with scenes
  const stage = new Scenes.Stage<MyContext>([addTaskWizard]);

  // Apply middlewares
  bot.use(session());
  bot.use(stage.middleware());

  // Apply commands
  bot.command('start', startCommand);
  bot.command('tasks', listCommand);
  bot.command('list', listCommand);
  
  // Enter wizard command
  bot.command('addtask', (ctx) => ctx.scene.enter('ADD_TASK_WIZARD'));

  // Help fallback
  bot.help((ctx) => ctx.reply('Ketik /start untuk melihat menu, atau /addtask untuk menambah tugas.'));

  return bot;
};
