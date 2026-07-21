# Merge Request Manager

Multi-provider Merge Request Manager with Angular 19 frontend, Express backend, and multi-provider Git support (Bitbucket/GitLab/GitHub).

## Features

- **Multi-Provider**: Bitbucket Server, GitLab, GitHub
- **Bulk Merge Requests**: Create PRs/MRs for multiple branches at once
- **Auto-merge**: Automatically merge when no conflicts (merge/squash/fast-forward)
- **Dry Run**: Validate configuration before creating real PRs
- **Webhook Registration**: Register and receive webhooks per provider
- **Dashboard**: Stats cards + trend chart (MRs per day)
- **History**: Full operation history with detail expansion and rerun
- **Templates**: Save and reuse merge request configurations
- **Branch Browser**: Browse repository branches
- **Live Log Tail**: Real-time log following via SSE
- **Flexible Storage**: JSON file or SQLite (AES-256-GCM encrypted tokens)
- **Docker**: Ready-to-deploy with docker-compose

## Requirements

- Node.js 18+
- Docker (optional, for containerized deployment)
- Git provider (Bitbucket Server/Data Center, GitLab, or GitHub)

## Quick Start

### Without Docker

```bash
# Backend
npm install
cp .env.example .env
npm run dev

# Frontend (separate terminal)
cd client
npm install
npm start
```

Frontend available at `http://localhost:4200`, API at `http://localhost:3000/api/v1`.

### With Docker

```bash
docker compose up --build
```

Frontend and API available at `http://localhost:3000`.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (`development`, `production`, `test`) | `development` |
| `PORT` | Server port | `3000` |
| `STORAGE_TYPE` | Storage backend (`file` or `sqlite`) | `file` |
| `DATA_DIR` | Data directory | `./data` |
| `ENCRYPTION_KEY` | AES-256-GCM key for token encryption — **required in Docker**, auto-generated on first run otherwise | — |
| `WEBHOOK_SECRET` | Secret for webhook signature verification | — |

### Adding Git Providers

1. Open the web UI at `/providers`
2. Click "Add Provider"
3. Choose type (Bitbucket/GitLab/GitHub)
4. Enter API URL, project, repo, and authentication token
5. Test the connection

## API Endpoints

All API endpoints are under `/api/v1/`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/v1/providers` | List providers |
| POST | `/api/v1/providers` | Create provider |
| GET | `/api/v1/providers/:id` | Get provider |
| PUT | `/api/v1/providers/:id` | Update provider |
| DELETE | `/api/v1/providers/:id` | Delete provider |
| POST | `/api/v1/providers/:id/test` | Test connection |
| GET | `/api/v1/providers/:id/branches` | List branches |
| POST | `/api/v1/merge-requests` | Create merge requests |
| GET | `/api/v1/history` | List history |
| GET | `/api/v1/history/stats` | History stats for chart |
| GET | `/api/v1/history/:id` | Get history item |
| DELETE | `/api/v1/history` | Clear history |
| GET | `/api/v1/templates` | List templates |
| POST | `/api/v1/templates` | Create template |
| GET | `/api/v1/templates/:id` | Get template |
| PUT | `/api/v1/templates/:id` | Update template |
| DELETE | `/api/v1/templates/:id` | Delete template |
| GET | `/api/v1/logs` | List log files |
| GET | `/api/v1/logs/:file` | Get log content |
| GET | `/api/v1/logs/tail` | SSE log tail stream |
| DELETE | `/api/v1/logs` | Clear logs |
| GET | `/api/v1/webhooks/events` | List webhook events |
| DELETE | `/api/v1/webhooks/events` | Clear webhook events |
| POST | `/api/v1/webhooks/register/:providerId` | Register webhook |
| POST | `/api/v1/webhooks/receive/:providerId` | Receive webhook |
| POST | `/api/v1/progress/:sessionId` | SSE progress stream |

## Project Structure

```
merge-request/
├── package.json              # Backend dependencies
├── tsconfig.json             # TypeScript config
├── .env.example              # Environment variables template
├── docker-compose.yml        # Docker Compose config
├── Dockerfile                # Multi-stage Docker build
├── src/
│   ├── config.ts             # Zod env validation
│   ├── logger.ts             # Winston logger
│   ├── index.ts              # Express server entry
│   ├── routes/               # Express route handlers
│   │   ├── index.ts          # Route mounting
│   │   ├── health.ts         # Health endpoint
│   │   ├── providers.ts      # Provider CRUD
│   │   ├── merge-requests.ts # Legacy v1
│   │   ├── merge-requests-v2.ts # Async v2 with SSE
│   │   ├── history.ts        # History + stats
│   │   ├── templates.ts      # Template CRUD
│   │   ├── logs.ts           # Log files + SSE tail
│   │   ├── settings.ts       # Settings CRUD
│   │   ├── progress.ts       # SSE progress sessions
│   │   └── webhooks.ts       # Webhook registration/receive
│   ├── providers/            # Git provider implementations
│   │   ├── interfaces.ts     # Provider interface + types
│   │   ├── factory.ts        # Provider registry
│   │   ├── bitbucket.ts      # Bitbucket provider
│   │   ├── gitlab.ts         # GitLab provider
│   │   └── github.ts         # GitHub provider
│   ├── storage/              # Storage implementations
│   │   ├── interfaces.ts     # Storage interface + types
│   │   ├── factory.ts        # Storage factory
│   │   ├── file.ts           # JSON file storage
│   │   ├── sqlite.ts         # SQLite storage
│   │   └── crypto.ts         # AES-256-GCM encryption
│   ├── middleware/
│   │   └── error-handler.ts  # AppError + error middleware
│   └── __tests__/            # Test files (vitest + supertest)
├── client/                   # Angular 19 frontend
│   ├── package.json
│   ├── angular.json
│   └── src/app/
│       ├── app.routes.ts     # Route config (lazy-loaded)
│       ├── app.config.ts     # App providers
│       ├── core/services/    # Angular services
│       ├── pages/            # Page components
│       │   ├── dashboard/    # Dashboard (stats + chart)
│       │   ├── providers/    # Provider management
│       │   ├── merge-request-new/ # New MR form
│       │   ├── history/      # History list + detail
│       │   ├── templates/    # Template CRUD
│       │   ├── browser/      # Branch browser
│       │   ├── webhooks/     # Webhook management
│       │   ├── logs/         # Log viewer + live tail
│       │   └── settings/     # Settings page
│       └── shared/           # Shared components/pipes/models
├── public/                   # Built frontend (served by Express)
└── logs/                     # Application log files
```

## Testing

```bash
# Backend tests (vitest)
npm test

# Frontend tests (via Angular CLI)
cd client && npm test
```

## Docker

```bash
# Build and start
docker compose up --build

# Stop
docker compose down

# Run in background
docker compose up -d
```

The Docker image uses a multi-stage build:
1. **Stage 1**: Build Angular frontend
2. **Stage 2**: Compile TypeScript backend
3. **Final**: Run Express server serving both API and frontend

> **Important**: Always set `ENCRYPTION_KEY` in production / Docker. If omitted, a key is auto-generated on first run and saved to `data/.encryption-key`. Without a persistent volume, the key is lost on container restart, making stored provider tokens unreadable. Generate one with: `openssl rand -hex 32`

## License

ISC
