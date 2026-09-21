import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import pinoHttp from 'pino-http';

import { db } from './config/database';
import { env } from './config/env';
import { logger } from './utils/logger';

// Repositories
import { UserRepository } from './repositories/user.repository';
import { TaskRepository } from './repositories/task.repository';
import { TaskHistoryRepository } from './repositories/task-history.repository';
import { ReminderRepository } from './repositories/reminder.repository';

// Services
import { UserService } from './services/user.service';
import { TaskService } from './services/task.service';
import { ReminderService } from './services/reminder.service';
import { NotificationService } from './services/notification.service';

// Controllers
import { UserController } from './controllers/user.controller';
import { TaskController } from './controllers/task.controller';
import { ReminderController } from './controllers/reminder.controller';

// Routes
import healthRoutes from './routes/health.routes';
import { createUserRoutes } from './routes/user.routes';
import { createTaskRoutes } from './routes/task.routes';
import { createReminderRoutes } from './routes/reminder.routes';

// Middleware
import { authMiddleware } from './middleware/auth.middleware';
import { errorMiddleware } from './middleware/error.middleware';

export function createApp(notificationService: NotificationService): {
  app: Application;
  userService: UserService;
  taskService: TaskService;
  reminderRepo: ReminderRepository;
} {
  const app = express();

  // ─── Security middleware ──────────────────────────────────────────────────────
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS
        ? env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-API-Key', 'Idempotency-Key'],
    })
  );

  // ─── Rate limiting ────────────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX_REQUESTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
    })
  );

  // ─── Request logging ──────────────────────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (_req, res) => (res.statusCode >= 500 ? 'error' : 'info'),
    })
  );

  // ─── Body parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Health routes (no auth required) ────────────────────────────────────────
  app.use('/health', healthRoutes);

  // ─── Dependency injection — wire repositories → services → controllers ────────
  const userRepo = new UserRepository(db);
  const taskRepo = new TaskRepository(db);
  const historyRepo = new TaskHistoryRepository(db);
  const reminderRepo = new ReminderRepository(db);

  const userService = new UserService(userRepo);
  const taskService = new TaskService(taskRepo, historyRepo, userRepo);
  const reminderService = new ReminderService(reminderRepo, taskRepo, historyRepo, userRepo);

  const userController = new UserController(userService);
  const taskController = new TaskController(taskService, reminderRepo);
  const reminderController = new ReminderController(reminderService);

  // Export repos/services for use by the scheduler
  app.locals['reminderRepo'] = reminderRepo;
  app.locals['notificationService'] = notificationService;

  // ─── API routes (auth required) ───────────────────────────────────────────────
  app.use('/api/v1', authMiddleware);
  app.use('/api/v1/users', createUserRoutes(userController));
  app.use('/api/v1/tasks', createTaskRoutes(taskController, reminderController));
  app.use('/api/v1/reminders', createReminderRoutes(reminderController));

  // ─── 404 handler ──────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
    });
  });

  // ─── Global error handler (must be last) ─────────────────────────────────────
  app.use(errorMiddleware);

  return { app, userService, taskService, reminderRepo };
}
