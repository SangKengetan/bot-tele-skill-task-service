# Task Service API

A standalone Node.js REST API backend for managing tasks, scheduling, deadlines, and reminders. Designed to be consumed by external applications (like the Hermes AI Assistant via Telegram) over HTTP.

## Architecture

```
Routes (Express) 
  → Middleware (Auth/Validation via Zod) 
  → Controllers (Thin) 
  → Services (Business Logic) 
  → Repositories (Raw SQL via `pg`) 
  → PostgreSQL Database
```

*   **Language:** Node.js (v22+) + TypeScript
*   **Database:** PostgreSQL (using `pg` driver, no ORM)
*   **Validation:** Zod
*   **Logging:** Pino (structured JSON logging)
*   **Scheduler:** `node-cron` with atomic database claiming

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
    Copy the example `.env` file and modify as needed:
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

## Hermes Integration

Task Service is entirely unaware of Telegram or AI logic. Hermes (the AI assistant) acts as the client.

**Workflow Example:**

1.  **User (Telegram):** "Besok jam 8 saya harus revisi Bab 4"
2.  **Hermes AI:** Parses natural language into a structured JSON payload identifying intent `create_task`.
3.  **Hermes Backend:** Makes an HTTP `POST /api/v1/tasks` call to the Task Service with `X-API-Key`.
4.  **Task Service:** Validates the input, inserts the task into PostgreSQL, records history, and returns a JSON response.
5.  **Hermes AI:** Translates the JSON response ("success: true", Task details) into natural language ("Baik, revisi Bab 4 sudah dicatat...").

### Reminder Scheduler

The Task Service contains a `node-cron` background job running every minute (configurable via `REMINDER_INTERVAL_SECONDS`).

1. It queries PostgreSQL for due reminders (`remind_at <= NOW() AND status = 'pending'`).
2. It atomically marks them as `sent`.
3. It passes the reminder data to the `NotificationService` interface.
4. *For MVP:* A mock logger implementation is used.
5. *Future Integration:* Hermes will implement `NotificationService` to push the payload directly via the Telegram API, or the Task Service will fire a webhook back to Hermes.
