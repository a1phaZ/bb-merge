# Plan: Merge Request Manager — Self-Hosted Web Interface

> **Детальный план реализации**  
> Основание: ROADMAP.md (30 этапов)  
> Технологии: Express (backend), Angular 22+ (frontend), Angular Material (UI), SQLite/File (storage)

---

## Содержание

1. [Архитектура системы](#1-архитектура-системы)
2. [Технологический стек](#2-технологический-стек)
3. [Структура проекта](#3-структура-проекта)
4. [GitProvider — абстракция провайдеров](#4-gitprovider--абстракция-провайдеров)
5. [StorageProvider — абстракция хранения](#5-storageprovider--абстракция-хранения)
6. [Backend API Endpoints](#6-backend-api-endpoints)
7. [Angular Frontend — Core](#7-angular-frontend--core)
8. [Аутентификация и RBAC](#8-аутентификация-и-rbac)
9. [Уведомления](#9-уведомления)
10. [Планировщик](#10-планировщик)
11. [Event-Driven Core](#11-event-driven-core)
12. [Docker](#12-docker)
13. [Этапы реализации (v1.0)](#13-этапы-реализации-v10)

---

## 1. Архитектура системы

```
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Container                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Express Backend (port 3000)              │  │
│  │                                                           │  │
│  │  ┌──────────────────┐  ┌──────────────────┐              │  │
│  │  │   GitProvider     │  │  StorageProvider  │              │  │
│  │  │   (abstract)      │  │  (abstract)       │              │  │
│  │  ├──────────────────┤  ├──────────────────┤              │  │
│  │  │  BitbucketProvider │  │  FileStorage      │              │  │
│  │  │  GitLabProvider    │  │  SQLiteStorage    │              │  │
│  │  │  GitHubProvider    │  │                   │              │  │
│  │  └──────────────────┘  └──────────────────┘              │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │           Services Layer                         │   │  │
│  │  │  MergeRequestService | AuthService | Notification │   │  │
│  │  │  SchedulerService | EventBus                     │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │              REST API (Express routes)              │  │  │
│  │  │  /api/v1/* + /webhook/* + /health + /metrics      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │         Static Files (Angular SPA build)           │  │  │
│  │  │         client/dist/browser/*                      │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Angular SPA (Angular 22+)                    │  │
│  │                                                           │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │  │
│  │  │  Signals  │  │  rxResource  │  │  CacheService     │  │  │
│  │  │  (state)  │  │  (API calls) │  │  (TTL 10 min)     │  │  │
│  │  └──────────┘  └──────────────┘  └──────────────────┘  │  │
│  │                                                           │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  Pages: Dashboard | New MR | History | Templates  │   │  │
│  │  │  Browser | Webhooks | Settings | Logs | Admin     │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Принципы архитектуры

1. **Абстракция через интерфейсы** — GitProvider, StorageProvider, AuthProvider, NotificationProvider
2. **Factory pattern** — регистрация и создание реализаций по типу
3. **Dependency Injection** — ручной DI-контейнер (или awilix) для сервисов
4. **Event-Driven** — EventBus для слабой связанности между модулями
5. **Stateless API** — всё состояние в storage, сервер без сохранения состояния (кроме кеша)

---

## 2. Технологический стек

### Backend

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| Runtime | Node.js 20+ | Сервер |
| Framework | Express 4.x | HTTP сервер |
| Language | TypeScript 5.x | Типизация |
| Logging | Winston | Structured logging |
| Validation | Joi / Zod | Валидация .env и API |
| Security | Helmet, express-rate-limit | Security headers, rate limiting |
| Auth | bcrypt, jsonwebtoken | Хеширование паролей, JWT |
| Email | Nodemailer | SMTP уведомления |
| Scheduling | node-cron | Планировщик задач |
| Queue | Bull (опционально) | Job queue |
| Metrics | prom-client | Prometheus метрики |
| API Docs | swagger-jsdoc + swagger-ui-express | OpenAPI документация |
| SQLite | better-sqlite3 | Embedded database |

### Frontend

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| Framework | Angular 22+ (standalone, zoneless) | SPA |
| UI Kit | Angular Material | Компоненты |
| State | Signals + rxResource | Реактивность |
| HTTP | HttpClient + interceptors | API calls |
| Cache | CacheService (in-memory) | Кеширование с TTL 10 мин |
| Charts | CSS/SVG (ngx-charts не используется) | Графики |
| i18n | @angular/localize + ngx-translate | Локализация |

---

## 3. Структура проекта (целевая)

```
merge-request/
├── src/                              # Backend
│   ├── app.ts                        # Express app creation
│   ├── server.ts                     # Server start
│   ├── config.ts                     # Env config
│   ├── logger.ts                     # Winston
│   ├── types.ts                      # Shared types
│   ├── di.ts                         # DI container
│   ├── middleware/
│   │   ├── error-handler.ts
│   │   ├── auth.ts
│   │   └── rate-limiter.ts
│   ├── routes/
│   │   ├── index.ts
│   │   ├── health.ts
│   │   ├── providers.ts
│   │   ├── merge-requests.ts
│   │   ├── history.ts
│   │   ├── templates.ts
│   │   ├── logs.ts
│   │   ├── webhooks.ts
│   │   ├── settings.ts
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── scheduler.ts
│   │   ├── export.ts
│   │   └── metrics.ts
│   ├── controllers/
│   │   ├── providers.controller.ts
│   │   ├── merge-requests.controller.ts
│   │   ├── history.controller.ts
│   │   ├── templates.controller.ts
│   │   ├── logs.controller.ts
│   │   ├── webhooks.controller.ts
│   │   ├── auth.controller.ts
│   │   ├── users.controller.ts
│   │   ├── scheduler.controller.ts
│   │   └── settings.controller.ts
│   ├── providers/
│   │   ├── interfaces.ts
│   │   ├── factory.ts
│   │   ├── bitbucket.ts
│   │   ├── gitlab.ts
│   │   └── github.ts
│   ├── storage/
│   │   ├── interfaces.ts
│   │   ├── factory.ts
│   │   ├── file.ts
│   │   ├── sqlite.ts
│   │   └── crypto.ts
│   ├── services/
│   │   ├── merge-request.service.ts
│   │   ├── notification.service.ts
│   │   ├── scheduler.service.ts
│   │   ├── auth.service.ts
│   │   └── event-bus.ts
│   ├── parser.ts
│   ├── validator.ts
│   └── reporter.ts
│
├── client/                           # Angular frontend
│   ├── src/
│   │   ├── index.html
│   │   ├── main.ts
│   │   ├── styles.scss
│   │   ├── app/
│   │   │   ├── app.component.ts|html|scss
│   │   │   ├── app.routes.ts
│   │   │   ├── app.config.ts
│   │   │   ├── core/
│   │   │   │   ├── cache/
│   │   │   │   │   └── cache.service.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── api.service.ts
│   │   │   │   │   ├── providers.service.ts
│   │   │   │   │   ├── merge-request.service.ts
│   │   │   │   │   ├── history.service.ts
│   │   │   │   │   ├── templates.service.ts
│   │   │   │   │   ├── logs.service.ts
│   │   │   │   │   ├── webhooks.service.ts
│   │   │   │   │   ├── settings.service.ts
│   │   │   │   │   └── auth.service.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── error.interceptor.ts
│   │   │   │   │   └── auth.interceptor.ts
│   │   │   │   └── guards/
│   │   │   │       ├── auth.guard.ts
│   │   │   │       └── role.guard.ts
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   │   ├── sidebar/
│   │   │   │   │   ├── header/
│   │   │   │   │   ├── status-badge/
│   │   │   │   │   ├── report-card/
│   │   │   │   │   ├── confirm-dialog/
│   │   │   │   │   └── empty-state/
│   │   │   │   ├── models/
│   │   │   │   │   ├── provider.model.ts
│   │   │   │   │   ├── history.model.ts
│   │   │   │   │   ├── template.model.ts
│   │   │   │   │   └── merge-result.model.ts
│   │   │   │   └── pipes/
│   │   │   │       └── time-ago.pipe.ts
│   │   │   └── pages/
│   │   │       ├── dashboard/
│   │   │       ├── merge-request-new/
│   │   │       ├── history/
│   │   │       ├── templates/
│   │   │       ├── browser/
│   │   │       ├── webhooks/
│   │   │       ├── providers/
│   │   │       ├── settings/
│   │   │       ├── logs/
│   │   │       ├── login/
│   │   │       ├── admin/
│   │   │       │   └── users/
│   │   │       ├── scheduler/
│   │   │       └── wizard/
│   │   └── assets/
│   │       └── i18n/
│   │           ├── ru.json
│   │           └── en.json
│   ├── angular.json
│   ├── package.json
│   ├── tsconfig.json
│   └── proxy.conf.json
│
├── data/                             # Runtime data (file storage)
├── logs/                             # Error logs
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
├── ROADMAP.md
└── PLAN.md
```

---

## 4. GitProvider — абстракция провайдеров

### Интерфейс

```typescript
// src/providers/interfaces.ts

export interface ProviderConfig {
  id: string;
  name: string;
  type: 'bitbucket' | 'gitlab' | 'github';
  apiUrl: string;
  token: string;          // зашифрован при хранении
  defaultTarget?: string;
  defaultTitlePrefix?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GitBranch {
  displayId: string;
  latestCommit: string;
  author?: { displayName: string };
  commitDate?: string;
}

export interface GitPullRequest {
  id: number;
  version: number;
  title: string;
  state: string;
  links?: { self?: Array<{ href: string }> };
}

export interface GitMergeStatus {
  canMerge: boolean;
  conflicted: boolean;
  vetoes?: Array<{ summary: string }>;
}

export interface CommitterInfo {
  name: string;
  displayName: string;
}

export interface CreatePRParams {
  title: string;
  description: string;
  branch: string;
  target: string;
}

export interface WebhookInfo {
  id: number;
  name: string;
  url: string;
  active: boolean;
  events: string[];
}

export interface GitProvider {
  readonly type: string;

  testConnection(): Promise<{ ok: boolean; message: string }>;
  listBranches(filter?: string): Promise<GitBranch[]>;
  checkBranchExists(branch: string): Promise<boolean>;
  findExistingPR(branch: string, target: string): Promise<GitPullRequest | null>;
  createPR(params: CreatePRParams): Promise<GitPullRequest>;
  checkMergeConflicts(prId: number): Promise<GitMergeStatus>;
  mergePR(prId: number, version: number, strategy: string): Promise<void>;
  getLastCommitter(branch: string): Promise<CommitterInfo | null>;
  addReviewer(prId: number, version: number, reviewerName: string): Promise<void>;
  registerWebhook(url: string, events: string[]): Promise<WebhookInfo>;
  getRepositoryInfo(project: string, repo: string): Promise<any>;
}
```

### ProviderFactory

```typescript
// src/providers/factory.ts

export class ProviderFactory {
  private static registry = new Map<string, new (config: ProviderConfig) => GitProvider>();

  static register(type: string, ctor: new (config: ProviderConfig) => GitProvider): void {
    this.registry.set(type, ctor);
  }

  static create(config: ProviderConfig): GitProvider {
    const ctor = this.registry.get(config.type);
    if (!ctor) throw new Error(`Unknown provider type: ${config.type}`);
    return new ctor(config);
  }
}

// Регистрация при старте приложения
ProviderFactory.register('bitbucket', BitbucketProvider);
ProviderFactory.register('gitlab', GitLabProvider);
ProviderFactory.register('github', GitHubProvider);
```

### Провайдер-специфичные адаптации

| Аспект | Bitbucket | GitLab | GitHub |
|--------|-----------|--------|--------|
| Auth header | Basic (username:token) | `PRIVATE-TOKEN` | `Authorization: Bearer token` |
| Project ID | `{project}/{repo}` | Path encoded: `owner%2Frepo` | `{owner}/{repo}` |
| PR ID field | `id` (number) | `iid` (number) | `number` (number) |
| Conflict API | `GET /merge` | `merge_status` in MR | `GET /pulls/{n}` → `mergeable` |
| Committer API | `GET /commits?limit=1` | `GET /repository/commits?per_page=1` | `GET /pulls/{n}/commits?per_page=1` |
| Reviewer API | `PUT /pull-requests/{id}` | `POST /merge_requests/{iid}/notes` | `POST /pulls/{n}/requested_reviewers` |
| Webhook events | `pr:opened,pr:merged,...` | `merge_requests_events` | `pull_request` events |

---

## 5. StorageProvider — абстракция хранения

### Интерфейс

```typescript
// src/storage/interfaces.ts

export interface StorageProvider {
  // Providers
  getProviders(): Promise<ProviderConfig[]>;
  getProvider(id: string): Promise<ProviderConfig | null>;
  saveProvider(config: ProviderConfig): Promise<void>;
  deleteProvider(id: string): Promise<void>;

  // History
  getHistory(filter?: HistoryFilter): Promise<PaginatedResult<HistoryRecord>>;
  getHistoryItem(id: string): Promise<HistoryRecord | null>;
  saveHistory(record: HistoryRecord): Promise<void>;
  deleteHistory(): Promise<void>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: string): Promise<Template | null>;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(id: string): Promise<void>;

  // Webhook events
  getWebhookEvents(limit?: number): Promise<WebhookEvent[]>;
  saveWebhookEvent(event: WebhookEvent): Promise<void>;
  deleteWebhookEvents(): Promise<void>;

  // Settings
  getSetting(key: string): Promise<string | null>;
  getSettings(): Promise<Record<string, string>>;
  saveSetting(key: string, value: string): Promise<void>;
  saveSettings(settings: Record<string, string>): Promise<void>;
}
```

### FileStorageProvider

```typescript
// src/storage/file.ts
// Хранит данные в JSON-файлах в директории data/
// Каждая сущность — отдельный файл
// Используется read/write с блокировкой через sync

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');

// providers.json → ProviderConfig[]
// history.json → HistoryRecord[]
// templates.json → Template[]
// webhook-events.json → WebhookEvent[]
// settings.json → Record<string, string>
```

### SQLiteStorageProvider

```typescript
// src/storage/sqlite.ts
// Использует better-sqlite3 (синхронный, embedded)
// При старте создаёт таблицы через миграции

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'app.db');

// Таблицы: providers, history, templates, webhook_events, settings
```

### Crypto Service

```typescript
// src/storage/crypto.ts
// AES-256-GCM шифрование токенов провайдеров
// Ключ из ENCRYPTION_KEY env (или генерируется при первом запуске)

export class CryptoService {
  encrypt(plaintext: string): string { /* AES-256-GCM → base64 */ }
  decrypt(ciphertext: string): string { /* base64 → AES-256-GCM decrypt */ }
}
```

---

## 6. Backend API Endpoints

### Providers

| Метод | Path | Тело | Ответ |
|-------|------|------|-------|
| `GET` | `/api/v1/providers` | — | `ProviderConfig[]` |
| `POST` | `/api/v1/providers` | `{ name, type, apiUrl, token, defaultTarget, defaultTitlePrefix }` | `ProviderConfig` |
| `PUT` | `/api/v1/providers/:id` | `{ name?, apiUrl?, token?, defaultTarget?, defaultTitlePrefix? }` | `ProviderConfig` |
| `DELETE` | `/api/v1/providers/:id` | — | `{ ok: true }` |
| `POST` | `/api/v1/providers/:id/test` | — | `{ ok: boolean, message: string }` |
| `GET` | `/api/v1/providers/:id/branches` | query: `?filter=` | `GitBranch[]` |

### Merge Requests

| Метод | Path | Тело | Ответ |
|-------|------|------|-------|
| `POST` | `/api/v1/merge-requests` | `{ providerId, project, repo, target, branches[], pr?, autoMerge?, strategy?, webhook?, dryRun? }` | `{ report, reportText, operationId }` |
| `GET` | `/api/v1/merge-requests/progress/:operationId` | — | SSE stream |

### SSE Progress Format

```
event: progress
data: {"branch": "feature/new", "step": "checking_branch", "status": "ok"}

event: progress
data: {"branch": "feature/new", "step": "creating_pr", "status": "in_progress"}

event: progress
data: {"branch": "feature/new", "step": "merge", "status": "done", "prId": 123}

event: complete
data: {"operationId": "uuid", "total": 5, "done": 5}
```

### History

| Метод | Path | Параметры | Ответ |
|-------|------|-----------|-------|
| `GET` | `/api/v1/history` | `?page=&limit=&providerId=&status=&search=` | `{ items: HistoryRecord[], total, page, limit }` |
| `GET` | `/api/v1/history/:id` | — | `HistoryRecord` |
| `DELETE` | `/api/v1/history` | — | `{ ok: true }` |

### Templates

| Метод | Path | Тело | Ответ |
|-------|------|------|-------|
| `GET` | `/api/v1/templates` | — | `Template[]` |
| `POST` | `/api/v1/templates` | `{ name, providerId?, project?, repo?, target, branches?, pr?, autoMerge?, strategy? }` | `Template` |
| `PUT` | `/api/v1/templates/:id` | partial fields | `Template` |
| `DELETE` | `/api/v1/templates/:id` | — | `{ ok: true }` |

### Logs

| Метод | Path | Ответ |
|-------|------|-------|
| `GET` | `/api/v1/logs` | `{ files: [{ name, size, createdAt }] }` |
| `GET` | `/api/v1/logs/:filename` | file content (text) |
| `DELETE` | `/api/v1/logs` | `{ ok: true }` |

### Webhooks

| Метод | Path | Описание |
|-------|------|---------|
| `GET` | `/api/v1/webhooks/events` | `?limit=50` — последние события |
| `DELETE` | `/api/v1/webhooks/events` | Очистить |
| `POST` | `/api/v1/webhooks/:providerId` | Зарегистрировать webhook |
| `POST` | `/webhook/:providerId` | Receiver (определяет провайдер из URL) |

### Auth

| Метод | Path | Описание |
|-------|------|---------|
| `POST` | `/api/v1/auth/login` | `{ email, password }` → `{ token, user }` |
| `POST` | `/api/v1/auth/register` | `{ email, password, displayName, inviteCode }` |
| `POST` | `/api/v1/auth/refresh` | `{ refreshToken }` → `{ token }` |
| `GET` | `/api/v1/auth/me` | current user info |
| `GET` | `/api/v1/auth/invite-code` | получить invite code (admin only) |

### Settings

| Метод | Path | Описание |
|-------|------|---------|
| `GET` | `/api/v1/settings` | все настройки |
| `PUT` | `/api/v1/settings` | `{ key: value }` |
| `GET` | `/api/v1/storage/type` | current storage type |
| `PUT` | `/api/v1/storage/type` | `{ type: 'file' | 'sqlite' }` |

---

## 7. Angular Frontend — Core

### CacheService

```typescript
@Injectable({ providedIn: 'root' })
export class CacheService {
  readonly #store = new Map<string, { value: unknown; expiresAt: number }>();
  readonly #TTL = 10 * 60 * 1000; // 10 minutes

  get<T>(key: string): T | undefined {
    const entry = this.#store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.#store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs = this.#TTL): void {
    this.#store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidate(pattern?: string): void {
    if (!pattern) { this.#store.clear(); return; }
    for (const key of this.#store.keys()) {
      if (key.startsWith(pattern)) this.#store.delete(key);
    }
  }
}
```

### ApiService

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly #http = inject(HttpClient);
  readonly #cache = inject(CacheService);

  get<T>(path: string, params?: Record<string, string | Signal<string>>): ResourceRef<T> {
    return rxResource<T, { path: string; params: Record<string, string> }>({
      request: () => ({ path, params: resolveSignals(params) }),
      loader: ({ request }) => {
        const cacheKey = buildCacheKey(request);
        const cached = this.#cache.get<T>(cacheKey);
        if (cached) return of(cached);
        return this.#http.get<T>(request.path, { params: request.params })
          .pipe(tap(data => this.#cache.set(cacheKey, data)));
      },
    });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    this.#cache.invalidate(pathPattern(path));
    return this.#http.post<T>(path, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    this.#cache.invalidate(pathPattern(path));
    return this.#http.put<T>(path, body);
  }

  delete<T>(path: string): Observable<T> {
    this.#cache.invalidate(pathPattern(path));
    return this.#http.delete<T>(path);
  }
}
```

### Пример компонента с Signals

```typescript
@Component({
  selector: 'app-browser',
  template: `
    <mat-form-field>
      <mat-label>Provider</mat-label>
      <mat-select [formControl]="providerControl">
        <mat-option *ngFor="let p of providers.value()" [value]="p.id">
          {{ p.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>

    <mat-form-field>
      <mat-label>Filter branches</mat-label>
      <input matInput [formControl]="filterControl">
    </mat-form-field>

    @if (branches.isLoading()) {
      <mat-spinner />
    }

    <table mat-table [dataSource]="branches.value() ?? []">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Branch</th>
        <td mat-cell *matCellDef="let b">{{ b.displayId }}</td>
      </ng-container>
      <!-- ... -->
    </table>
  `
})
export class BrowserComponent {
  readonly #api = inject(ApiService);

  providerControl = new FormControl('');
  filterControl = new FormControl('');

  providers = this.#api.get<ProviderConfig[]>('/api/v1/providers');

  branches = this.#api.get<GitBranch[]>('/api/v1/providers/branches', {
    provider: toSignal(this.providerControl.valueChanges),
    filter: toSignal(this.filterControl.valueChanges.pipe(debounceTime(300))),
  });
}
```

---

## 8. Аутентификация и RBAC

### Модель User

```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'operator' | 'viewer';
  authProvider: 'local' | 'oauth2' | 'oidc';
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}
```

### Middleware

```typescript
// src/middleware/auth.ts

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { sub, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Маршруты

```typescript
// Public
router.post('/api/v1/auth/login', authController.login);
router.post('/api/v1/auth/register', authController.register);
router.post('/api/v1/auth/refresh', authController.refresh);

// Protected — все роли
router.get('/api/v1/auth/me', authenticate, authController.me);
router.get('/api/v1/providers', authenticate, providersController.list);
router.get('/api/v1/history', authenticate, historyController.list);
router.get('/api/v1/history/:id', authenticate, historyController.detail);

// Protected — operator+
router.post('/api/v1/merge-requests', authenticate, authorize('admin','operator'), mrController.create);
router.post('/api/v1/templates', authenticate, authorize('admin','operator'), templatesController.create);

// Protected — admin only
router.get('/admin/users', authenticate, authorize('admin'), usersController.list);
router.post('/api/v1/providers', authenticate, authorize('admin'), providersController.create);
router.put('/api/v1/settings', authenticate, authorize('admin'), settingsController.update);
```

---

## 9. Уведомления

### Интерфейс

```typescript
interface NotificationEvent {
  type: 'merge_request.created'
      | 'merge_request.merged'
      | 'merge_request.conflicted'
      | 'merge_request.error'
      | 'merge_request.batch.completed';
  data: Record<string, any>;
  timestamp: string;
}

interface NotificationProvider {
  readonly type: string;
  send(event: NotificationEvent): Promise<void>;
}
```

### Реализации

```typescript
class EmailProvider implements NotificationProvider {
  // Nodemailer + SMTP
  // Шаблоны через EJS
}

class TelegramProvider implements NotificationProvider {
  // Bot API: https://api.telegram.org/bot{token}/sendMessage
}

class SlackProvider implements NotificationProvider {
  // Incoming Webhook: POST с payload
}

class DiscordProvider implements NotificationProvider {
  // Discord Webhook: POST с payload
}

class InAppProvider implements NotificationProvider {
  // Сохраняет в storage, отдаёт через SSE
}
```

### UI настройки

```
Settings → Notifications:
┌─────────────────────────────────────┐
│ Email (SMTP)                 [Edit] │
│   Host: smtp.example.com           │
│   Port: 587                        │
│   User: user@example.com          │
│   Password: ********               │
│   From: mrm@example.com            │
│   [Test Email]                     │
├─────────────────────────────────────┤
│ Telegram                    [Edit]  │
│   Bot Token: 123456:ABC-DEF        │
│   Chat ID: -100123456              │
│   [Test Message]                   │
├─────────────────────────────────────┤
│ Events to notify:                   │
│ ☑ MR created                       │
│ ☑ MR merged                        │
│ ☑ MR conflicts                     │
│ ☑ MR error                         │
│ ☑ Batch completed                  │
└─────────────────────────────────────┘
```

---

## 10. Планировщик

### Cron-задачи

```typescript
interface ScheduledTask {
  id: string;
  name: string;
  type: 'merge_request'
      | 'cleanup_logs'
      | 'cleanup_history'
      | 'cleanup_webhook_events'
      | 'health_check'
      | 'auto_merge_approved';
  cron: string;               // cron expression
  enabled: boolean;
  config: Record<string, any>;
  notifyOn: string[];          // 'completed' | 'errors'
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error';
  createdAt: string;
}
```

### Список пресетов cron

| Описание | Cron |
|----------|------|
| Каждый час | `0 * * * *` |
| Каждый день в 00:00 | `0 0 * * *` |
| Каждый день в 02:00 | `0 2 * * *` |
| Каждый понедельник в 09:00 | `0 9 * * 1` |
| Каждую неделю в воскресенье 03:00 | `0 3 * * 0` |
| 1-е число каждого месяца | `0 0 1 * *` |

### UI Scheduler

```
/scheduler
┌──────────────────────────────────────────────────────────┐
│ [+] Add Task                                             │
├──────────────────────────────────────────────────────────┤
│ Name           │ Type           │ Cron    │ Enabled │ ... │
│──────────────────────────────────────────────────────────│
│ Nightly merge  │ merge_request  │ 0 2 * * │ ✅      │ ⚙️ │
│ Weekly cleanup │ cleanup_logs   │ 0 0 * * │ ✅      │ ⚙️ │
│ Health check   │ health_check   │ */30 *  │ ❌      │ ⚙️ │
└──────────────────────────────────────────────────────────┘
```

---

## 11. Event-Driven Core

### EventBus

```typescript
// src/services/event-bus.ts

export class EventBus {
  private emitter = new EventEmitter();

  emit(event: AppEvent): void {
    this.emitter.emit(event.type, event);
  }

  on<T extends AppEvent>(type: string, handler: (event: T) => void): void {
    this.emitter.on(type, handler);
  }

  off(type: string, handler: Function): void {
    this.emitter.off(type, handler);
  }
}

export type AppEvent =
  | { type: 'merge_request.created'; data: { branch: string; prId: number; providerId: string } }
  | { type: 'merge_request.merged'; data: { branch: string; prId: number; providerId: string } }
  | { type: 'merge_request.conflicted'; data: { branch: string; prId: number; providerId: string } }
  | { type: 'merge_request.error'; data: { branch: string; error: string; providerId: string } }
  | { type: 'merge_request.batch.completed'; data: { operationId: string; results: MergeResult[] } }
  | { type: 'provider.connected'; data: { providerId: string } }
  | { type: 'provider.disconnected'; data: { providerId: string } }
  | { type: 'webhook.received'; data: { providerId: string; eventType: string; payload: any } }
  | { type: 'user.login'; data: { userId: string } };
```

### Подписчики

```typescript
// Регистрация при старте приложения

eventBus.on('merge_request.batch.completed', (event) => {
  historyService.save(event.data);
});

eventBus.on('merge_request.created', (event) => {
  notificationService.send({ type: 'mr.created', data: event.data });
  metricsService.increment('mr.created');
});

eventBus.on('merge_request.error', (event) => {
  notificationService.send({ type: 'mr.error', data: event.data });
  metricsService.increment('mr.error');
  logger.error(`MR error: ${event.data.error}`, event.data);
});

eventBus.on('webhook.received', (event) => {
  storageService.saveWebhookEvent(event.data);
});
```

---

## 12. Docker

### Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build Angular
FROM node:20-alpine AS ng-build
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS api-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 3: Production
FROM node:20-alpine
RUN apk add --no-cache sqlite-libs tzdata
WORKDIR /app
COPY --from=api-build /app/dist ./dist
COPY --from=ng-build /app/client/dist/browser ./public
COPY --from=api-build /app/node_modules ./node_modules
COPY package*.json ./

ENV NODE_ENV=production
ENV PORT=3000
ENV STORAGE_TYPE=sqlite
ENV DATA_DIR=/app/data

EXPOSE 3000
VOLUME ["/app/data", "/app/logs"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - STORAGE_TYPE=${STORAGE_TYPE:-sqlite}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - DATA_DIR=/app/data
      - TZ=${TZ:-UTC}
    volumes:
      - app-data:/app/data
      - app-logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  app-data:
  app-logs:
```

### .env.example (Docker)

```bash
# Application
PORT=3000
NODE_ENV=production
TZ=UTC

# Storage
STORAGE_TYPE=sqlite          # sqlite | file
DATA_DIR=/app/data

# Security (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-256-bit-hex-key-here

# Bitbucket Provider
BITBUCKET_URL=
BITBUCKET_USERNAME=
BITBUCKET_PASSWORD=

# Webhook
WEBHOOK_SECRET=

# SMTP (notifications)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@example.com

# Telegram (notifications)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Slack (notifications)
SLACK_WEBHOOK_URL=
```

---

## 13. Этапы реализации (v1.0)

Для первой версии (v1.0) фокус на базовой функциональности без auth, уведомлений и scheduler'а.

### Этап 0 — Backend refactoring

**Примерный объём:** 2-3 дня

1. Разделить `server.ts` на `app.ts` + `server.ts`
2. Создать `src/config.ts` — чтение и валидация .env
3. Создать `src/logger.ts` — Winston с JSON-форматом
4. Создать `src/middleware/error-handler.ts`
5. Создать `src/middleware/cors.ts`
6. Обновить `src/routes/health.ts`

### Этап 1 — Angular scaffold

**Примерный объём:** 1 день

```bash
cd client
npx @angular/cli new merge-request-ui --standalone --routing --style=scss
ng add @angular/material
```

1. Создать proxy.conf.json
2. Создать Layout: sidebar + header + router-outlet
3. Настроить маршруты (все страницы-заглушки)
4. Angular Material theme

### Этап 2 — GitProvider

**Примерный объём:** 2-3 дня

1. `src/providers/interfaces.ts`
2. `src/providers/base.ts` (abstract class с общими методами)
3. `src/providers/factory.ts`
4. Рефакторинг `BitbucketClient` → `BitbucketProvider` (1 день)
5. `GitLabProvider` (1 день)
6. `GitHubProvider` (1 день)
7. Unit-тесты

### Этап 3 — StorageProvider

**Примерный объём:** 2 дня

1. `src/storage/interfaces.ts`
2. `src/storage/factory.ts`
3. `src/storage/file.ts` (0.5 дня)
4. `src/storage/sqlite.ts` (1 день)
5. `src/storage/crypto.ts` (0.5 дня)

### Этап 4 — API Endpoints

**Примерный объём:** 3-4 дня

1. `src/routes/providers.ts`
2. `src/routes/merge-requests.ts` (рефакторинг существующего)
3. `src/routes/history.ts`
4. `src/routes/templates.ts`
5. `src/routes/logs.ts`
6. `src/routes/webhooks.ts`
7. `src/routes/settings.ts`
8. SSE для прогресса

### Этап 5 — Core Frontend

**Примерный объём:** 2 дня

1. `CacheService`
2. `ApiService` (rxResource-based)
3. `ErrorInterceptor`
4. Все сервисы: Providers, MergeRequest, History, Templates, Logs, Webhooks, Settings

### Этап 6 — Settings page

**Примерный объём:** 1 день

1. Вкладка Application
2. Вкладка Storage
3. Тест connection

### Этап 7 — Providers page

**Примерный объём:** 1-2 дня

1. Список провайдеров
2. Форма создания/редактирования
3. Test Connection

### Этап 8 — New MR page

**Примерный объём:** 3-4 дня

1. Все шаги формы
2. Dry-run toggle
3. SSE прогресс
4. Отчёт

### Этап 9 — Dashboard

**Примерный объём:** 1-2 дня

1. Stats cards
2. Chart (CSS, без внешних зависимостей)
3. Recent operations
4. Quick actions

### Этап 10 — History page

**Примерный объём:** 1-2 дня

1. Таблица с фильтрами
2. Пагинация
3. Детальный просмотр

### Этап 11 — Templates page

**Примерный объём:** 1 день

1. Cards view
2. CRUD
3. Use Template
4. Export/Import

### Этап 12 — Browser page ✅ Готово

**Примерный объём:** 1 день

1. Выбор провайдера + поля project/repo
2. Таблица веток (branch name, latest commit, author, date)
3. Загрузка/ошибка/пустые состояния
4. Тесты: 9 unit + 4 API

### Этап 13 — Webhooks page ✅ Готово

**Примерный объём:** 1 день

1. Backend: GET/DELETE /api/v1/webhooks/events
2. Backend: сохранение входящих webhook событий
3. Events History: таблица с expandable payload
4. Кнопка "Clear Events" с подтверждением
5. Тесты: 7 API + 10 unit + 3 service

### Этап 14 — Logs page

**Примерный объём:** 0.5 дня

1. List files
2. View content
3. Download/Delete

---

## Итого по v1.0

| Этап | Дней |
|------|------|
| 0 — Backend refactoring | 2-3 |
| 1 — Angular scaffold | 1 |
| 2 — GitProvider | 2-3 |
| 3 — StorageProvider | 2 |
| 4 — API Endpoints | 3-4 |
| 5 — Core Frontend | 2 |
| 6 — Settings | 1 |
| 7 — Providers | 1-2 |
| 8 — New MR | 3-4 |
| 9 — Dashboard | 1-2 |
| 10 — History | 1-2 |
| 11 — Templates | 1 |
| 12 — Browser ✅ | 1 |
| 13 — Webhooks ✅ | 1 |
| 14 — Logs | 0.5 |
| **Total v1.0** | **~22-28 дней** |

### Зависимости по этапам для v1.0

```
Этап 0 (backend refactoring)
  ↓
Этап 1 (angular scaffold)  →  Этап 5 (core frontend)
  ↓                              ↓
Этап 2 (git provider)   →  Этап 4 (API endpoints)
Этап 3 (storage)        →  Этап 4 (API endpoints)
  ↓                              ↓
Этап 4 (API endpoints) →  Этап 5 (core frontend)
  ↓                              ↓
Этап 6 (settings)  ←  зависимость от 3, 5
Этап 7 (providers) ←  зависимость от 2, 4, 5
Этап 8 (new mr)    ←  зависимость от 2, 4, 5, 7
Этап 9 (dashboard) ←  зависимость от 4, 5
Этап 10 (history)  ←  зависимость от 4, 5, 8
Этап 11 (templates)←  зависимость от 4, 5, 8
Этап 12 (browser ✅) ←  зависимость от 2, 4, 5, 7
Этап 13 (webhooks ✅) ←  зависимость от 2, 4, 5, 7
Этап 14 (logs)     ←  зависимость от 4, 5
```

### Критический путь

```
0 → 1 → 2 → 4 → 5 → 7 → 8 → 10, 11
    ↓         ↓         ↓
    3 ────────┘         9, 12, 13, 14
```

Минимальный путь для получения работающего функционала: **0 → 1 → 2 → 3 → 4 → 5 → 7 → 8** (примерно 14-18 дней).

---

## После v1.0

| Версия | Этапы | Примерный объём |
|--------|-------|----------------|
| v2.0 | 15-21 (Auth, Notifications, Scheduler, Dry-Run, i18n, Monitoring, Security) | 20-30 дней |
| v3.0 | 22-25 (Docker, CI/CD, Backup, API Docs) | 5-7 дней |
| v4.0 | 26-28 (Job Queue, Event-Driven, Multi-tenant) | 10-15 дней |
| v5.0 | 29-30 (Onboarding, Theme, Responsive, PWA) | 5-7 дней |

---

**Конец PLAN.md**
