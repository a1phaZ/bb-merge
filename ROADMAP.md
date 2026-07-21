# Roadmap: Merge Request Manager — Self-Hosted Web Interface

> **Статус:** Активная разработка  
> **Лицензия:** ISC  
> **Цель:** Коробочное решение для автоматизации merge request с веб-интерфейсом, поддержкой множественных Git-провайдеров (Bitbucket, GitLab, GitHub), гибким хранением данных (File / SQLite) и возможностью запуска в Docker или bare-metal.

---

## Legend

| Символ | Значение |
|--------|----------|
| 🟡 План | Запланировано, реализация не начата |
| 🟠 В работе | Активно разрабатывается |
| 🟢 Готово | Реализовано и протестировано |
| ⚪ Отложено | Перенесено на более поздний этап |

---

## Версии

| Версия | Этапы | Описание |
|--------|-------|----------|
| **v1.0** | 0–14 | Core MVP: вся основная функциональность без auth, уведомлений, scheduler'а |
| **v2.0** | 15–21 | Enterprise: auth, уведомления, scheduler, dry-run, i18n, мониторинг, security |
| **v3.0** | 22–25 | Operations: Docker, CI/CD, backup, API docs |
| **v4.0** | 26–28 | Scale: job queue, event-driven, multi-tenant |
| **v5.0** | 29–30 | UX: onboarding, themes, responsive, PWA |

---

## Диаграмма зависимостей этапов

```
0 (Backend refactoring)
├── 1 (Angular scaffold)
├── 2 (GitProvider)
├── 3 (StorageProvider)
│
├── 4 (Core API endpoints) ────────────────────────────┐
├── 5 (Core Frontend) ─────────────────────────────────┤
│                                                       │
├── 6 (Settings) ← 3, 5                                │
├── 7 (Providers) ← 2, 4, 5                            │
├── 8 (New MR) ← 2, 4, 5, 7                            │
├── 9 (Dashboard) ← 4, 5                               │
├── 10 (History) ← 4, 5, 8                             │
├── 11 (Templates) ← 4, 5, 8                           │
├── 12 (Browser) ← 2, 4, 5, 7                          │
├── 13 (Webhooks) ← 2, 4, 5, 7                         │
├── 14 (Logs) ← 4, 5                                   │
│                                                       │
├── 15 (Auth + RBAC) ← 0, 3, 4, 5                      │
├── 16 (Notifications) ← 3, 4, 5, 15, 27              │
├── 17 (Scheduler) ← 4, 5, 8, 15, 26                  │
├── 18 (Dry-Run) ← 2, 8                                │
├── 19 (i18n) ← 1                                      │
├── 20 (Monitoring) ← 0, 4                             │
├── 21 (Security) ← 0, 3, 4, 15                        │
│                                                       │
├── 22 (Docker) ← 0..21                                │
├── 23 (CI/CD) ← 22                                    │
├── 24 (Backup) ← 3, 4, 17                             │
├── 25 (API docs) ← 4                                  │
├── 26 (Job Queue) ← 8, 17                             │
├── 27 (Event Core) ← 0                                │
├── 28 (Multi-tenant) ← 3, 15                          │
├── 29 (Onboarding) ← 1, 6, 7, 15                      │
└── 30 (Theme) ← 1                                     │
```

---

## Этап 0 — Foundation: Backend рефакторинг

**Цель:** Подготовить архитектуру бэкенда к расширению.

| Задача | Статус |
|--------|--------|
| Разделить `server.ts` на модули: routes, middleware, controllers | 🟢 Готово |
| Создать DI-контейнер (awilix или ручной) для сервисов | ⚪ Отложено |
| Внедрить express-async-errors или обёртку для async route handlers | 🟢 Готово |
| Добавить централизованный обработчик ошибок | 🟢 Готово |
| Настроить structured logging (Winston) | 🟢 Готово |
| Добавить Helmet, CORS, rate limiting | 🟢 Готово |
| Настроить `.env` схему с валидацией (Zod/Joi) | 🟢 Готово |
| Подготовить health endpoint с детальной информацией | 🟢 Готово |

**Ключевые файлы:**
- `src/app.ts` — создание и конфигурация Express app
- `src/server.ts` — только запуск сервера
- `src/logger.ts` — Winston конфигурация
- `src/config.ts` — единый доступ к .env с валидацией
- `src/middleware/error-handler.ts`
- `src/middleware/cors.ts`
- `src/middleware/rate-limiter.ts`
- `src/routes/index.ts` — объединение всех роутов
- `src/routes/health.ts`

---

## Этап 1 — Angular Scaffold + Layout

**Цель:** Базовое SPA с навигацией.

| Задача | Статус |
|--------|--------|
| Инициализировать Angular standalone (v19+) в `client/` | 🟢 Готово |
| Установить Angular Material с кастомной темой | 🟢 Готово |
| Настроить `proxy.conf.json` (прокси `/api/*` → localhost:3000) | 🟢 Готово |
| Создать Layout: sidebar (sidenav) + header + router-outlet | 🟢 Готово |
| Настроить маршрутизацию всех страниц (заглушки) | 🟢 Готово |
| Добавить empty states для пустых страниц | 🟢 Готово |
| Настроить `@angular/localize` для будущей i18n | 🟢 Готово |

**Ключевые файлы:**
- `client/angular.json`
- `client/proxy.conf.json`
- `client/src/index.html`
- `client/src/main.ts`
- `client/src/app/app.component.ts`
- `client/src/app/app.routes.ts`
- `client/src/app/app.config.ts`
- `client/src/app/core/cache/cache.service.ts`
- `client/src/app/core/interceptors/error.interceptor.ts`
- `client/src/app/shared/components/empty-state/empty-state.component.ts`

---

## Этап 2 — Система провайдеров (GitProvider)

**Цель:** Абстракция Git-провайдеров для поддержки Bitbucket, GitLab, GitHub.

| Задача | Статус |
|--------|--------|
| Создать интерфейс `GitProvider` в `src/providers/interfaces.ts` | 🟢 Готово |
| Создать базовые типы: `ProviderConfig`, `GitBranch`, `GitPullRequest`, `GitMergeStatus` | 🟢 Готово |
| Рефакторинг `BitbucketClient` → `BitbucketProvider implements GitProvider` | 🟢 Готово |
| Реализовать `GitLabProvider implements GitProvider` | 🟢 Готово |
| Реализовать `GitHubProvider implements GitProvider` (REST v3) | 🟢 Готово |
| Создать `ProviderFactory` для регистрации и создания провайдеров | 🟢 Готово |
| Написать unit-тесты для каждого провайдера | 🟢 Готово |

**Провайдер-специфичные адаптации:**

| Аспект | Bitbucket | GitLab | GitHub |
|--------|-----------|--------|--------|
| Auth header | Basic (username:token) | `PRIVATE-TOKEN` header | `Authorization: Bearer token` |
| Project ID | `project/repo` key | Project ID (число) или URL-encoded path | `owner/repo` |
| PR ID reference | `id` (число) | `iid` (число, internal) | `number` (число) |
| Conflict detection | `/merge` endpoint | `merge_status` field | `mergeable` field (polling-based) |
| User lookup | Commit author | Commit author | Commit author / GitHub login |
| Webhook events | `pr:opened, pr:merged` etc. | `Merge Request Events` | `pull_request` events |

**Ключевые файлы:**
- `src/providers/interfaces.ts`
- `src/providers/factory.ts`
- `src/providers/bitbucket.ts`
- `src/providers/gitlab.ts`
- `src/providers/github.ts`

---

## Этап 3 — Система хранения (StorageProvider)

**Цель:** Абстракция хранения данных с поддержкой FileSystem и SQLite.

| Задача | Статус |
|--------|--------|
| Создать интерфейс `StorageProvider` в `src/storage/interfaces.ts` | 🟢 Готово |
| Реализовать `FileStorageProvider` | 🟢 Готово |
| Реализовать `SQLiteStorageProvider` (better-sqlite3) | 🟢 Готово |
| Создать `StorageFactory` — выбор драйвера через env `STORAGE_TYPE` | 🟢 Готово |
| Добавить шифрование токенов (AES-256-GCM) для обоих storage | 🟢 Готово |
| Написать unit-тесты для обоих storage | 🟢 Готово |

**Схема SQLite:**

```sql
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bitbucket','gitlab','github')),
  api_url TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  default_target TEXT DEFAULT 'main',
  default_title_prefix TEXT DEFAULT 'Merge',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE history (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_type TEXT NOT NULL,
  project TEXT NOT NULL,
  repo TEXT NOT NULL,
  target TEXT NOT NULL,
  auto_merge INTEGER NOT NULL DEFAULT 0,
  strategy TEXT NOT NULL DEFAULT 'merge',
  results_json TEXT NOT NULL,
  total_branches INTEGER NOT NULL,
  merged_count INTEGER NOT NULL DEFAULT 0,
  conflicts_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  errors_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_id TEXT,
  project TEXT,
  repo TEXT,
  target TEXT NOT NULL,
  branches_json TEXT,
  title_prefix TEXT DEFAULT 'Merge',
  description TEXT DEFAULT '',
  auto_merge INTEGER NOT NULL DEFAULT 0,
  strategy TEXT NOT NULL DEFAULT 'merge',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Файловая структура (FileStorage):**

```
data/
├── providers.json         # ProviderConfig[]
├── history.json           # HistoryRecord[]
├── templates.json         # Template[]
├── webhook-events.json    # WebhookEvent[]
└── settings.json          # Record<string, string>
```

**Ключевые файлы:**
- `src/storage/interfaces.ts`
- `src/storage/factory.ts`
- `src/storage/file.ts`
- `src/storage/sqlite.ts`
- `src/storage/crypto.ts`

---

## Этап 4 — Core API Endpoints

**Цель:** Полный набор REST API endpoint'ов.

| Метод | Endpoint | Назначение | Статус |
|-------|----------|------------|--------|
| `GET` | `/api/v1/providers` | Список провайдеров | 🟢 Готово |
| `POST` | `/api/v1/providers` | Создать провайдер | 🟢 Готово |
| `PUT` | `/api/v1/providers/:id` | Обновить провайдер | 🟢 Готово |
| `DELETE` | `/api/v1/providers/:id` | Удалить провайдер | 🟢 Готово |
| `POST` | `/api/v1/providers/:id/test` | Тест подключения | 🟢 Готово |
| `GET` | `/api/v1/providers/:id/branches` | Список веток | 🟢 Готово |
| `POST` | `/api/v1/merge-requests` | Создать MR (v2 async) | 🟢 Готово |
| `GET` | `/api/v1/progress/:sessionId` | SSE прогресс | 🟢 Готово |
| `GET` | `/api/v1/history` | История запусков | 🟢 Готово |
| `GET` | `/api/v1/history/:id` | Детали запуска | 🟢 Готово |
| `DELETE` | `/api/v1/history` | Очистить историю | 🟢 Готово |
| `GET` | `/api/v1/templates` | Список шаблонов | 🟢 Готово |
| `POST` | `/api/v1/templates` | Создать шаблон | 🟢 Готово |
| `PUT` | `/api/v1/templates/:id` | Обновить шаблон | 🟢 Готово |
| `DELETE` | `/api/v1/templates/:id` | Удалить шаблон | 🟢 Готово |
| `GET` | `/api/v1/logs` | Список лог-файлов | 🟢 Готово |
| `GET` | `/api/v1/logs/:filename` | Содержимое лога | 🟢 Готово |
| `DELETE` | `/api/v1/logs` | Очистить логи | 🟢 Готово |
| `GET` | `/api/v1/webhooks/events` | Webhook-события | 🟡 План |
| `DELETE` | `/api/v1/webhooks/events` | Очистить события | 🟡 План |
| `POST` | `/api/v1/webhooks/:providerId` | Зарегистрировать webhook | 🟡 План |
| `GET` | `/api/v1/settings/storage-type` | Тип storage | 🟢 Готово |
| `PUT` | `/api/v1/settings` | Сохранить настройки | 🟢 Готово |
| `POST` | `/webhook/:providerId` | Webhook receiver | 🟡 План |
| `GET` | `/health` | Health check | 🟢 Готово |
| `GET` | `/metrics` | Prometheus metrics | 🟡 План |
| `GET` | `/api/docs` | Swagger UI | 🟡 План |

**Ключевые файлы:**
- `src/routes/index.ts`
- `src/routes/providers.ts`
- `src/routes/merge-requests.ts`
- `src/routes/history.ts`
- `src/routes/templates.ts`
- `src/routes/logs.ts`
- `src/routes/webhooks.ts`
- `src/routes/health.ts`
- `src/routes/metrics.ts`
- `src/routes/settings.ts`

---

## Этап 5 — Core Frontend (ApiService, Cache, Signals)

**Цель:** Мощный HTTP-слой с кешированием и реактивностью.

| Задача | Статус |
|--------|--------|
| `CacheService` — in-memory кеш с TTL 10 минут | 🟢 Готово |
| `ApiService` — базовый сервис на rxResource | 🟢 Готово |
| `ErrorInterceptor` — глобальная обработка ошибок HTTP | 🟢 Готово |
| Сервисы для каждой сущности: Providers, MergeRequest, History, Templates, Logs, Webhooks, Settings | 🟢 Готово |

**Ключевые файлы:**
- `client/src/app/core/cache/cache.service.ts`
- `client/src/app/core/services/api.service.ts`
- `client/src/app/core/interceptors/error.interceptor.ts`
- `client/src/app/core/services/providers.service.ts`
- `client/src/app/core/services/merge-request.service.ts`
- `client/src/app/core/services/history.service.ts`
- `client/src/app/core/services/templates.service.ts`
- `client/src/app/core/services/logs.service.ts`
- `client/src/app/core/services/webhooks.service.ts`
- `client/src/app/core/services/settings.service.ts`
- `client/src/app/shared/pipes/time-ago.pipe.ts`

---

## Этап 6 — Settings: настройки приложения

**Страница:** `/settings`

| Задача | Статус |
|--------|--------|
| Вкладка "Application": просмотр/редактирование настроек | 🟢 Готово |
| Вкладка "Storage": отображение типа storage | 🟢 Готово |
| Вкладка "Notifications": заглушка (v2.0) | 🟢 Готово |

---

## Этап 7 — Providers: CRUD Git-провайдеров

**Страница:** `/providers`

| Задача | Статус |
|--------|--------|
| Список провайдеров с типом (иконка), названием, URL, статусом | 🟢 Готово |
| Форма создания: тип, название, API URL, токен, default target, title prefix | 🟢 Готово |
| Кнопка "Test Connection" с индикацией успеха/ошибки | 🟢 Готово |
| Редактирование и удаление с подтверждением | 🟢 Готово |
| Маска токена (`••••••••`) | 🟢 Готово |

---

## Этап 8 — New Merge Request: форма создания

**Страница:** `/merge-request/new`

| Задача | Статус |
|--------|--------|
| Шаг 1 — выбор провайдера (dropdown) | 🟢 Готово |
| Шаг 2 — проект и репозиторий | 🟢 Готово |
| Шаг 3 — target branch | 🟢 Готово |
| Шаг 4 — source branches (textarea) | 🟢 Готово |
| Шаг 5 — PR options (title_prefix, description) | 🟢 Готово |
| Шаг 6 — Merge options (auto-merge toggle, strategy dropdown) | 🟢 Готово |
| Шаг 7 — Webhook (toggle, URL, события чекбоксы) | 🟡 План |
| Dry-Run toggle — preview только | 🟡 План |
| SSE прогресс для каждой ветки (timeline с иконками) | 🟢 Готово |
| Отчёт после завершения: timeline событий | 🟢 Готово |
| Кнопки: "Copy report", "Save to history", "Save as template" | 🟡 План |
| Load branches from repository | 🟡 План |

---

## Этап 9 — Dashboard: главная панель

**Страница:** `/dashboard`

| Задача | Статус |
|--------|--------|
| Stats cards: всего PR, merged, conflicts, errors | 🟢 Готово |
| Chart: PR по дням/неделям (ngx-charts) | 🟡 План |
| Recent operations: последние 5 записей истории | 🟢 Готово |
| Providers status: список провайдеров с индикатором | 🟢 Готово |
| Quick actions: "New MR", "Browse Branches", "View History" | 🟢 Готово |
| Empty state: нет провайдеров → кнопка "Add Provider" | 🟢 Готово |

---

## Этап 10 — History: история запусков

**Страница:** `/history`

| Задача | Статус |
|--------|--------|
| Таблица: дата, провайдер, проект/repo, target, ветки, merged/conflicts/skipped/errors | 🟢 Готово |
| Фильтры: по провайдеру | 🟢 Готово |
| Поиск: по project/repo/branch (debounced) | 🟢 Готово |
| Пагинация (Angular Material paginator) | 🟢 Готово |
| Детальный просмотр: результаты по веткам, дата, ID | 🟢 Готово |
| Кнопка "Rerun" → копировать конфигурацию в `/merge-request/new` | 🟡 План |
| Кнопка "Clear History" с confirm dialog | 🟢 Готово |

---

## Этап 11 — Templates: шаблоны конфигураций

**Страница:** `/templates`

| Задача | Статус |
|--------|--------|
| Cards view: название, провайдер, project/repo, target, кол-во branches | 🟢 Готово |
| CRUD: создание, редактирование, удаление с подтверждением | 🟢 Готово |
| Кнопка "Use Template" → ссылка на New MR с queryParams | 🟢 Готово |
| Export template → JSON файл | 🟢 Готово |
| Import template → загрузка JSON | 🟢 Готово |

---

## Этап 12 — Branches Browser: обзор веток

**Страница:** `/browser`

| Задача | Статус |
|--------|--------|
| Выбор провайдера + поля project/repo | 🟡 План |
| Фильтр: debounced search по имени ветки | 🟡 План |
| Таблица: branch name, latest commit, author, date | 🟡 План |
| Select all / Deselect all | 🟡 План |
| Sort: по имени, дате, автору | 🟡 План |
| Кнопка "Create MR for selected" → редирект на New MR | 🟡 План |
| Кеширование списка на 10 минут | 🟡 План |

---

## Этап 13 — Webhooks: регистрация и события

**Страница:** `/webhooks`

| Задача | Статус |
|--------|--------|
| Вкладка "Registered": таблица webhook'ов, кнопка регистрации | 🟡 План |
| Форма регистрации: провайдер, URL, события (чекбоксы) | 🟡 План |
| Кнопка "Unregister" — удаление через API провайдера | 🟡 План |
| Вкладка "Events History": таблица событий с фильтрами | 🟡 План |
| Expandable row с сырым payload (formatted JSON) | 🟡 План |
| Кнопка "Clear Events" с подтверждением | 🟡 План |

---

## Этап 14 — Logs: просмотр логов

**Страница:** `/logs`

| Задача | Статус |
|--------|--------|
| Список лог-файлов: имя, размер, дата | 🟢 Готово |
| Просмотр содержимого (monospace) | 🟢 Готово |
| Кнопки: "Download", "Delete" | 🟢 Готово |
| Кнопка "Clear All Logs" с confirm dialog | 🟢 Готово |
| Live tail — кнопка "Follow" (SSE для новых записей) | 🟡 План |

---

## Этап 15 — Аутентификация и RBAC

| Задача | Статус |
|--------|--------|
| Local auth: логин/пароль, bcrypt/argon2 | 🟡 План |
| Инвайт-код при первом запуске для регистрации admin | 🟡 План |
| OAuth2 / OIDC провайдеры (Keycloak, Google, GitHub) | 🟡 План |
| Роли: admin / operator / viewer | 🟡 План |
| Auth middleware на `/api/*` | 🟡 План |
| Login page (+ OAuth2 redirect) | 🟡 План |
| Protected routes в Angular (canActivate guard) | 🟡 План |
| User management: `/admin/users` (только admin) | 🟡 План |
| Session management: активные сессии, принудительный logout | 🟡 План |

**Таблица users (SQLite):**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK(role IN ('admin','operator','viewer')),
  auth_provider TEXT DEFAULT 'local' CHECK(auth_provider IN ('local','oauth2','oidc')),
  auth_provider_id TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);
```

---

## Этап 16 — Уведомления (Notifications)

| Задача | Статус |
|--------|--------|
| NotificationProvider interface | 🟡 План |
| EmailProvider — Nodemailer + SMTP | 🟡 План |
| TelegramProvider — Bot API | 🟡 План |
| SlackProvider — Incoming Webhook | 🟡 План |
| DiscordProvider — Discord Webhook | 🟡 План |
| События: created, merged, conflicts, error, batch.completed | 🟡 План |
| Настройка каналов в UI (вкладка Settings → Notifications) | 🟡 План |
| In-app notifications: колокольчик, список, mark as read | 🟡 План |
| SSE для real-time новых уведомлений | 🟡 План |

---

## Этап 17 — Планировщик (Scheduler / Cron)

| Задача | Статус |
|--------|--------|
| Установка node-cron с поддержкой Bull (опционально Redis) | 🟡 План |
| CRUD задач: /api/scheduler | 🟡 План |
| Типы задач: merge_request, cleanup_logs, cleanup_history, cleanup_webhook_events, health_check, auto_merge_approved | 🟡 План |
| UI: таблица задач + cron editor с пресетами | 🟡 План |
| Кнопка "Execute now" — ручной запуск | 🟡 План |
| Job logs: логирование каждого запуска | 🟡 План |

---

## Этап 18 — Dry-Run / Preview Mode

| Задача | Статус |
|--------|--------|
| Backend: query-параметр `?dryRun=true` | 🟡 План |
| В dry-run: все проверки выполняются, мутации — нет | 🟡 План |
| UI: toggle "Preview mode (dry-run)" перед отправкой | 🟡 План |
| Баннер "🔍 DRY RUN MODE" в отчёте | 🟡 План |
| Impact summary: кол-во коммитов, строк, файлов (если провайдер поддерживает) | 🟡 План |

---

## Этап 19 — i18n (Локализация)

| Задача | Статус |
|--------|--------|
| Установка @angular/localize + @ngx-translate/transloco | 🟡 План |
| Файлы переводов: `ru.json`, `en.json` | 🟡 План |
| Backend: локализованный generateReport (параметр `?lang=`) | 🟡 План |
| Переключатель языка в header (🇷🇺 / 🇬🇧) | 🟡 План |
| Авто-определение через Accept-Language | 🟡 План |

---

## Этап 20 — Мониторинг и Метрики (Prometheus)

| Задача | Статус |
|--------|--------|
| Установка prom-client | 🟡 План |
| Метрики: операции по статусам, длительность, активные провайдеры | 🟡 План |
| Endpoint: `GET /metrics` | 🟡 План |
| Health dashboard: uptime, версия, статусы, storage info | 🟡 План |

---

## Этап 21 — Security Hardening

| Задача | Статус |
|--------|--------|
| Helmet middleware — security headers | 🟡 План |
| Rate limiting (express-rate-limit) | 🟡 План |
| CSP Headers — strict Content-Security-Policy | 🟡 План |
| Input validation на всех API (Zod/Joi) | 🟡 План |
| Secrets masking в API (`••••••••`) | 🟡 План |
| Encryption at rest: AES-256-GCM для токенов | 🟡 План |
| CORS строгая настройка | 🟡 План |
| Логирование безопасности (входы, ошибки auth, admin действия) | 🟡 План |

---

## Этап 22 — Docker + Docker Compose

| Задача | Статус |
|--------|--------|
| Multi-stage Dockerfile (Angular build → Backend build → Production) | 🟢 Готово |
| .dockerignore | 🟢 Готово |
| docker-compose.yml с volumes, healthcheck | 🟢 Готово |
| README — раздел Docker | 🟡 План |
| GitHub Actions — авто-сборка Docker образа | 🟡 План |

---

## Этап 23 — CI/CD Pipeline Integration

| Задача | Статус |
|--------|--------|
| GitLab CI шаблон (`.gitlab-ci-template.yml`) | 🟡 План |
| GitHub Actions шаблон (`.github/actions/create-mr/action.yml`) | 🟡 План |
| API Token management: страница `/settings/api-tokens` | 🟡 План |

---

## Этап 24 — Export / Import / Backup

| Задача | Статус |
|--------|--------|
| `GET /api/v1/export` — полный дамп (токены зашифрованы) | 🟡 План |
| `POST /api/v1/import` — загрузка дампа с preview | 🟡 План |
| UI: вкладка "Backup" в Settings | 🟡 План |
| Auto-backup через scheduler (cron) | 🟡 План |
| Ротация бэкапов (хранить последние N) | 🟡 План |

---

## Этап 25 — API Versioning + OpenAPI / Swagger

| Задача | Статус |
|--------|--------|
| Префикс `/api/v1/` для всех endpoint'ов | 🟡 План |
| Установка swagger-jsdoc + swagger-ui-express | 🟡 План |
| JSDoc-аннотации в роутах | 🟡 План |
| `GET /api/docs` — Swagger UI | 🟡 План |
| Postman collection (autogenerated) | 🟡 План |

---

## Этап 26 — Job Queue (Bull + Redis)

| Задача | Статус |
|--------|--------|
| Установка bull + Redis | 🟡 План |
| Очереди: merge-requests, notifications, scheduler, cleanup | 🟡 План |
| Bull Board: `/admin/queues` — мониторинг | 🟡 План |
| Graceful fallback: если Redis недоступен → синхронно | 🟡 План |
| Progress tracking → SSE для UI | 🟡 План |
| Retry: 3 попытки с exponential backoff | 🟡 План |

---

## Этап 27 — Event-Driven Core

| Задача | Статус |
|--------|--------|
| EventBus на EventEmitter (back-end) | 🟡 План |
| Типы событий: merge_request.*, provider.*, webhook.*, user.* | 🟡 План |
| Подписчики: HistoryService, NotificationService, MetricsService, LogService | 🟡 План |

---

## Этап 28 — Multi-tenant / Workspaces

| Задача | Статус |
|--------|--------|
| Workspace model: id, name, slug | 🟡 План |
| Изоляция данных по workspaceId | 🟡 План |
| /admin/workspaces — CRUD workspace'ов | 🟡 План |
| Назначение пользователей, приглашения | 🟡 План |
| Переключатель workspace'ов в header | 🟡 План |

---

## Этап 29 — Onboarding Wizard

| Задача | Статус |
|--------|--------|
| Проверка: есть ли провайдер? → нет → редирект на `/wizard` | 🟡 План |
| Шаг 1: Welcome | 🟡 План |
| Шаг 2: Create admin user | 🟡 План |
| Шаг 3: Choose storage (File / SQLite) | 🟡 План |
| Шаг 4: Add provider + test connection | 🟡 План |
| Шаг 5: Create first template | 🟡 План |
| Шаг 6: Done! | 🟡 План |
| Кнопка "Skip" → закрыть wizard | 🟡 План |

---

## Этап 30 — Dark Theme + Responsive

| Задача | Статус |
|--------|--------|
| Angular Material theming: light / dark / auto | 🟡 План |
| Toggle в header ☀️/🌙 | 🟡 План |
| Сохранение в localStorage | 🟡 План |
| Responsive: sidebar → bottom nav < 768px | 🟡 План |
| Datatable → card view на мобильных | 🟡 План |
| Forms → single column на мобильных | 🟡 План |

---

## Технический долг / Оптимизации

- [ ] Code coverage: 80%+ unit tests, 60%+ integration
- [ ] Bundle size: мониторинг Angular бандла, lazy loading всех страниц
- [ ] API pagination: cursor-based пагинация на всех list endpoint'ах
- [ ] API sorting/filtering: унифицированный `?sort=name&filter[status]=active`
- [ ] Angular SSR: Angular Universal для SEO и быстрого initial load (v3.0+)
- [ ] E2E тесты: Playwright для критических flow (v2.0+)
- [ ] Load testing: k6 скрипты для `/api/merge-requests` (v3.0+)

---

## Структура проекта (целевая)

```
merge-request/
├── src/                              # Backend (TypeScript)
│   ├── app.ts                        # Express app configuration
│   ├── server.ts                     # Server entry point
│   ├── config.ts                     # Env config with validation
│   ├── logger.ts                     # Winston logger
│   ├── types.ts                      # Shared types
│   ├── middleware/                    # Express middleware
│   │   ├── error-handler.ts
│   │   ├── auth.ts
│   │   └── rate-limiter.ts
│   ├── routes/                       # API routes
│   │   ├── index.ts
│   │   ├── health.ts
│   │   ├── providers.ts
│   │   ├── merge-requests.ts
│   │   ├── history.ts
│   │   ├── templates.ts
│   │   ├── logs.ts
│   │   ├── webhooks.ts
│   │   ├── settings.ts
│   │   └── metrics.ts
│   ├── controllers/                  # Business logic
│   ├── providers/                    # Git providers
│   │   ├── interfaces.ts
│   │   ├── factory.ts
│   │   ├── bitbucket.ts
│   │   ├── gitlab.ts
│   │   └── github.ts
│   ├── storage/                      # Storage providers
│   │   ├── interfaces.ts
│   │   ├── factory.ts
│   │   ├── file.ts
│   │   ├── sqlite.ts
│   │   └── crypto.ts
│   ├── services/                     # Business services
│   │   ├── merge-request.service.ts
│   │   ├── notification.service.ts
│   │   ├── scheduler.service.ts
│   │   └── event-bus.ts
│   ├── parser.ts                     # YAML parser
│   ├── validator.ts                  # Config validator
│   └── reporter.ts                   # Report generator
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
│   │   │   ├── core/                 # Core module
│   │   │   │   ├── cache/
│   │   │   │   ├── services/
│   │   │   │   └── interceptors/
│   │   │   ├── shared/               # Shared module
│   │   │   │   ├── components/
│   │   │   │   ├── models/
│   │   │   │   └── pipes/
│   │   │   └── pages/                # Feature pages
│   │   │       ├── dashboard/
│   │   │       ├── merge-request-new/
│   │   │       ├── history/
│   │   │       ├── templates/
│   │   │       ├── browser/
│   │   │       ├── webhooks/
│   │   │       ├── providers/
│   │   │       ├── settings/
│   │   │       ├── logs/
│   │   │       ├── admin/
│   │   │       ├── scheduler/
│   │   │       └── wizard/
│   │   └── assets/
│   │       └── i18n/
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
