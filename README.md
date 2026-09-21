# Task Service API & Telegram Bot

A combined Node.js REST API backend and interactive Telegram Bot for managing tasks, scheduling, deadlines, and reminders. 

## Key Features

1.  **REST API Backend:** A robust REST API for managing tasks and reminders.
2.  **Integrated Telegram Bot:** A built-in Telegram Bot (using `telegraf`) with interactive commands and inline keyboards for managing tasks directly from chat.
3.  **Background Scheduler:** A `node-cron` job that atomically claims and sends due reminders.
4.  **Interactive Notifications:** Reminder notifications include inline buttons to instantly mark tasks as completed or snooze them.

## Architecture

```
Telegram Bot (Telegraf) ──┐
                          ▼
Routes (Express) ──► Controllers ──► Services ──► Repositories (Raw SQL via pg) ──► PostgreSQL
                          ▲
Background Scheduler ─────┘
```

*   **Language:** Node.js (v22+) + TypeScript
*   **Database:** PostgreSQL (using `pg` driver, no ORM)
*   **Validation:** Zod
*   **Logging:** Pino (structured JSON logging)
*   **Bot Framework:** Telegraf

## Telegram Bot Commands & Features

The integrated Telegram bot provides a rich, interactive experience:

*   `/start` - Show the main menu and available commands.
*   `/addtask` - Interactive wizard to create a new task with a title, deadline, and optional reminder.
*   `/tasks` or `/list` - View all active (pending) tasks.
*   `/today` - View tasks scheduled or due today.
*   `/overdue` - View tasks that have passed their deadline.
*   `/completed` - View recently completed tasks.
*   `/stats` - View a summary of task statistics (total, pending, completed, overdue, completion rate).
*   `/search <keyword>` - Search for tasks by title or description.
*   `/reminders` - View and manage active reminders.

**Interactive Inline Keyboards:**
Most commands return messages with inline buttons, allowing you to take immediate action without typing UUIDs:
*   ✅ Mark tasks as completed
*   🗑️ Delete tasks (with confirmation)
*   ⏰ Set, cancel, or snooze reminders
*   📋 View task details
*   🔄 Reopen completed or cancelled tasks

## Installation & Setup

1.  **Clone / Navigate**
    ```bash
    cd task-service
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Copy the example `.env` file and modify as needed (ensure `TELEGRAM_BOT_TOKEN` is set!):
    ```bash
    cp .env.example .env
    ```

4.  **Start Database (Docker)**
    ```bash
    docker compose up -d postgres
    ```

5.  **Run Migrations**
    Run the custom migration script to build the DB schema:
    ```bash
    npm run migrate
    ```

## Development

Run the development server (uses `tsx watch` for auto-reloading):
```bash
npm run dev
```

Run tests:
```bash
npm run test
```

## Production

1.  **Build**
    ```bash
    npm run build
    ```

2.  **Start**
    ```bash
    npm run start
    ```

Alternatively, run the entire stack via Docker:
```bash
docker compose up -d
```

## API Endpoints

*All endpoints under `/api/v1` require the `X-API-Key` header for authentication.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Check service liveness |
| `GET` | `/health/db` | Check PostgreSQL connection |
| `POST` | `/api/v1/users` | Upsert user |
| `POST` | `/api/v1/tasks` | Create task |
| `GET` | `/api/v1/tasks` | List tasks (pagination, filter) |
| `GET` | `/api/v1/tasks/:id` | Get single task |
| `PATCH` | `/api/v1/tasks/:id` | Update task fields |
| `DELETE`| `/api/v1/tasks/:id` | Hard delete task |
| `POST` | `/api/v1/tasks/:id/complete` | Mark task completed |
| `POST` | `/api/v1/tasks/:id/reopen` | Reopen completed task |
| `POST` | `/api/v1/tasks/:id/cancel` | Cancel task |
| `GET` | `/api/v1/tasks/search` | Search tasks (`?q=`) |
| `GET` | `/api/v1/tasks/today` | Tasks due/scheduled today |
| `GET` | `/api/v1/tasks/upcoming`| Tasks coming up |
| `GET` | `/api/v1/tasks/overdue` | Past due tasks |
| `GET` | `/api/v1/tasks/stats` | Task completion stats |
| `POST` | `/api/v1/tasks/:id/reminders`| Create reminder |
| `GET` | `/api/v1/reminders` | List reminders |
| `POST` | `/api/v1/reminders/:id/cancel`| Cancel reminder |

## Request Examples

### 1. Upsert User
```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: change-this-secret" \
  -d '{
    "telegram_user_id": "123456789",
    "display_name": "John Doe",
    "timezone": "Asia/Makassar"
  }'
```

### 2. Create Task
```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -H "X-API-Key: change-this-secret" \
  -d '{
    "user_id": "USER_UUID_HERE",
    "title": "Revisi Bab 4",
    "description": "Perbaiki bagian hasil pengujian",
    "priority": "high",
    "deadline_at": "2026-09-08T20:00:00+08:00"
  }'
```

### 3. Create Reminder
```bash
curl -X POST http://localhost:3000/api/v1/tasks/TASK_UUID_HERE/reminders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: change-this-secret" \
  -d '{
    "remind_at": "2026-09-08T19:00:00+08:00"
  }'
```
