# Bitbucket Merge Request Creator

Node.js приложение для автоматического создания merge request в Bitbucket Server/Data Center.

## Возможности

- Создание pull request для списка веток
- Автоматический мерж при отсутствии конфликтов
- Проверка конфликтов через API `canMerge`
- Автоматическое добавление ревьювера (последний коммитер) при конфликтах
- Поддержка webhook для отслеживания статуса
- CLI и HTTP API интерфейсы
- Детальный отчёт о результатах

## Требования

- Node.js 18+
- Bitbucket Server/Data Center с REST API

## Установка

```bash
git clone <repository-url>
cd merge-request
npm install
```

## Настройка

Создайте файл `.env` из примера:

```bash
cp .env.example .env
```

Заполните переменные окружения:

```env
BITBUCKET_URL=https://bitbucket.mycompany.com
BITBUCKET_USERNAME=username
BITBUCKET_PASSWORD=app-password
PORT=3000
WEBHOOK_SECRET=optional-secret
```

### Получение App Password

1. Войдите в Bitbucket
2. Перейдите в Profile → Personal Access Tokens
3. Создайте новый токен с правами на запись pull request
4. Скопируйте токен в `BITBUCKET_PASSWORD`

## Формат входного файла

```yaml
project: MY_PROJECT
repo: my-repository
target: main
branches:
  - feature/login
  - feature/dashboard
  - bugfix/fix-header
pr:
  title_prefix: "Merge"
  description: "Автоматический merge request"
webhook:
  url: https://myserver.com/webhook/bitbucket
  events:
    - pr:merged
    - pr:updated
```

| Поле | Описание | Обязательно |
|------|----------|-------------|
| project | Ключ проекта в Bitbucket | Да |
| repo | Slug репозитория | Да |
| target | Целевая ветка для мержа | Да |
| branches | Список веток для слияния | Да |
| pr.title_prefix | Префикс для заголовка PR | Нет |
| pr.description | Описание PR | Нет |
| webhook.url | URL для webhook | Нет |
| webhook.events | События для webhook | Нет |

## Использование

### CLI

```bash
# Сборка проекта
npm run build

# Запуск (только создание PR)
node dist/cli.js --file examples/input.yaml

# С авто-мержем (merge стратегия)
node dist/cli.js --file examples/input.yaml --auto-merge

# С squash стратегией
node dist/cli.js --file examples/input.yaml --auto-merge --strategy squash

# С указанием project/repo через CLI
node dist/cli.js --file examples/input.yaml --project OTHER_PROJECT --repo other-repo

# Development режим
npm run cli -- --file examples/input.yaml --auto-merge
```

### CLI опции

| Опция | Описание | По умолчанию |
|-------|----------|--------------|
| `-f, --file <path>` | Путь к YAML конфигу | Обязательно |
| `--auto-merge` | Автоматический мерж без конфликтов | false |
| `--strategy <type>` | Стратегия мержа: merge, squash, rebase | merge |
| `--project <key>` | Переопределить проект | Из конфига |
| `--repo <slug>` | Переопределить репозиторий | Из конфига |

### HTTP Сервер

```bash
# Запуск сервера
npm run server
```

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/health` | GET | Health check |
| `/api/merge-requests` | POST | Создание PR |
| `/webhook/bitbucket` | POST | Приём webhook |

#### Пример запроса

```bash
curl -X POST http://localhost:3000/api/merge-requests \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "project": "MY_PROJECT",
      "repo": "my-repo",
      "target": "main",
      "branches": ["feature-1", "feature-2"]
    },
    "autoMerge": true,
    "strategy": "squash"
  }'
```

#### Пример YAML в запросе

```bash
curl -X POST http://localhost:3000/api/merge-requests \
  -H "Content-Type: application/json" \
  -d '{
    "config": "project: MY_PROJECT\nrepo: my-repo\ntarget: main\nbranches:\n  - feature-1",
    "autoMerge": true
  }'
```

## Алгоритм работы

```
Для каждой ветки из списка:
  1. Проверить существование ветки
  2. Проверить существование открытого MR
  3. Получить последнего коммитера из ветки
  4. Создать Pull Request
  5. Проверить конфликты через canMerge
  6. Принять решение:
     ├─ auto-merge ВКЛ И нет конфликтов:
     │  → Автоматический мерж
     └─ Есть конфликты:
        → Добавить коммитера как ревьювера
```

## Пример отчёта

```
=== Merge Request Report ===
Repo: MY_PROJECT/my-repository
Target: main
Auto-merge: Вкл (squash)
Date: 2026-07-08 14:32:15

┌─────────────────────────────────────────────────────┐
│ Успешно смержено                                    │
├─────────────────────────────────────────────────────┤
│ ✓ feature/login → main                              │
│   PR: #142 | Мерж: Автоматический ✓                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Требует внимания (конфликты)                        │
├─────────────────────────────────────────────────────┤
│ ⚠ feature/dashboard → main                          │
│   PR: #143 | Конфликты: ДА                          │
│   Ревьювер: john.doe (последний коммитер)           │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Пропущено                                          │
├─────────────────────────────────────────────────────┤
│ ✗ bugfix/fix-header → main                          │
│   Причина: Ветка не найдена                         │
└─────────────────────────────────────────────────────┘

Webhook: Зарегистрирован

Итого:
  Создано PR: 2
  Автоматически смержено: 1
  С конфликтами: 1
  Пропущено: 1
  Ошибок: 0
```

## Merge стратегии

| Стратегия | Описание |
|-----------|----------|
| `merge` | Стандартный merge commit (по умолчанию) |
| `squash` | Сquash всех коммитов в один |
| `rebase` | Rebase без merge commit |

## Обработка ошибок

| Ситуация | Действие |
|----------|----------|
| Ветка не найдена | Пропустить + предупреждение |
| MR уже существует | Пропустить + info |
| Конфликты обнаружены | Создать PR + добавить ревьювера |
| Ошибка API | Лог ошибки + продолжить |
| Webhook не зарегистрирован | Warning + продолжить |

## Webhook

Приложение может регистрировать webhook в Bitbucket для отслеживания событий:

```yaml
webhook:
  url: https://myserver.com/webhook/bitbucket
  events:
    - pr:merged
    - pr:updated
```

### Поддерживаемые события

- `pr:opened` - PR создан
- `pr:updated` - PR обновлён
- `pr:merged` - PR смержен
- `pr:declined` - PR отклонён
- `pr:deleted` - PR удалён

### Приём webhook

Сервер автоматически принимает webhook на `/webhook/bitbucket` и логирует события:

```
[2026-07-08T14:32:15.000Z] Webhook received: pr:merged
  PR #142: Merge feature/login into main
  State: MERGED
  Author: John Doe
```

## Структура проекта

```
merge-request/
├── package.json          # Зависимости и скрипты
├── tsconfig.json         # Конфигурация TypeScript
├── .env.example          # Пример переменных окружения
├── src/
│   ├── types.ts          # TypeScript интерфейсы
│   ├── parser.ts         # YAML парсер
│   ├── validator.ts      # Joi валидация
│   ├── bitbucket.ts      # API клиент Bitbucket
│   ├── reporter.ts       # Формирование отчёта
│   ├── cli.ts            # CLI интерфейс
│   ├── server.ts         # Express сервер
│   └── index.ts          # Entry point
├── dist/                 # Скомпилированные файлы
└── examples/
    └── input.yaml        # Пример конфигурации
```

## API Bitbucket Server

Приложение использует следующие endpoints:

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/rest/api/1.0/projects/{project}/repos/{repo}/branches` | GET | Проверка существования ветки |
| `/rest/api/1.0/projects/{project}/repos/{repo}/pull-requests` | GET | Поиск существующего PR |
| `/rest/api/1.0/projects/{project}/repos/{repo}/pull-requests` | POST | Создание PR |
| `/rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}/merge` | GET | Проверка конфликтов |
| `/rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}/merge` | POST | Мерж PR |
| `/rest/api/1.0/projects/{project}/repos/{repo}/pull-requests/{id}` | PUT | Добавление ревьювера |
| `/rest/api/1.0/projects/{project}/repos/{repo}/commits` | GET | Получение коммитов |
| `/rest/api/1.0/projects/{project}/repos/{repo}/webhooks` | POST | Регистрация webhook |

## License

ISC
