import { Telegraf, Scenes, session } from 'telegraf';
import { MyContext } from './context';
import { env } from '../config/env';
import { addTaskWizard } from './scenes/addTask.scene';
import { addHarianWizard } from './scenes/addHarian.scene';
import { startCommand } from './commands/start.command';
import { listCommand } from './commands/list.command';
import { todayCommand } from './commands/today.command';
import { overdueCommand } from './commands/overdue.command';
import { completedCommand } from './commands/completed.command';
import { statsCommand } from './commands/stats.command';
import { searchCommand } from './commands/search.command';
import { remindersCommand } from './commands/reminders.command';
import { handleCallbackQuery } from './handlers/callbacks.handler';
import { UserService } from '../services/user.service';
import { TaskService } from '../services/task.service';
import { ReminderService } from '../services/reminder.service';
import { ReminderRepository } from '../repositories/reminder.repository';

export const setupBot = (
  bot: Telegraf<MyContext>,
  userService: UserService,
  taskService: TaskService,
  reminderService: ReminderService,
  reminderRepo: ReminderRepository
): Telegraf<MyContext> => {
  // Inject services into bot context first
  bot.use(async (ctx, next) => {
    ctx.userService = userService;
    ctx.taskService = taskService;
    ctx.reminderService = reminderService;
    ctx.reminderRepo = reminderRepo;
    return next();
  });

  // Initialize stage with scenes
  const stage = new Scenes.Stage<MyContext>([addTaskWizard, addHarianWizard]);

  // Apply middlewares
  bot.use(session());
  bot.use(stage.middleware());

  // Apply commands
  bot.command('start', startCommand);
  bot.command('tasks', listCommand);
  bot.command('list', listCommand);
  bot.command('today', todayCommand);
  bot.command('overdue', overdueCommand);
  bot.command('completed', completedCommand);
  bot.command('stats', statsCommand);
  bot.command('search', searchCommand);
  bot.command('reminders', remindersCommand);
  
  // Enter wizard command
  bot.command('addtask', (ctx) => ctx.scene.enter('ADD_TASK_WIZARD'));
  bot.command('addharian', (ctx) => ctx.scene.enter('ADD_HARIAN_WIZARD'));

  // Register callback query handler for inline keyboards
  bot.on('callback_query', handleCallbackQuery);

  // Help fallback
  bot.help((ctx) => ctx.reply('Ketik /start untuk melihat menu lengkap perintah yang tersedia.'));

  // Set Telegram Menu Commands
  bot.telegram.setMyCommands([
    { command: 'start', description: 'Lihat menu utama' },
    { command: 'addtask', description: 'Tambah task baru' },
    { command: 'addharian', description: 'Tambah task harian sekaligus' },
    { command: 'tasks', description: 'Daftar semua task aktif' },
    { command: 'today', description: 'Task hari ini' },
    { command: 'overdue', description: 'Task yang telat' },
    { command: 'completed', description: 'Task selesai' },
    { command: 'stats', description: 'Statistik' },
    { command: 'search', description: 'Cari task' },
    { command: 'reminders', description: 'Kelola pengingat' }
  ]).catch(err => console.error('Failed to set commands menu:', err));

  return bot;
};
