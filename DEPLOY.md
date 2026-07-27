# Deploy — Merge Request Manager

## Требования

- VPS с Ubuntu 22.04+ (или любым Linux)
- Docker + Docker Compose (>= v2)
- Домен `app.yourdomain.com`, A-запись → IP сервера
- Порты 80 и 443 открыты

## 1. Подготовка сервера

```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Docker Compose (обычно уже встроен в docker)
docker compose version
```

## 2. Клонировать репозиторий

```bash
git clone <repo-url> /opt/merge-request
cd /opt/merge-request
```

## 3. Настроить окружение

```bash
cat > .env << EOF
DOMAIN=app.yourdomain.com
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)
STORAGE_TYPE=sqlite
TZ=Europe/Moscow
EOF
```

Параметры:

| Переменная | Описание |
|---|---|
| `DOMAIN` | Домен приложения (Caddy TLS) |
| `JWT_SECRET` | Секрет для подписи JWT (сгенерирован выше) |
| `ENCRYPTION_KEY` | Ключ шифрования токенов провайдеров |
| `STORAGE_TYPE` | `sqlite` (рекомендуется) или `file` |
| `TZ` | Часовой пояс |

## 4. Запустить

```bash
docker compose up -d --build
```

Первый запуск собирает образы (~2-5 мин). Последующие — секунды.

## 5. Проверить

```bash
# Статус контейнеров
docker compose ps

# Логи
docker compose logs -f

# Healthcheck
curl -I https://app.yourdomain.com/api/v1/auth/me

# Приложение
curl -I https://app.yourdomain.com
```

## 6. Регистрация первого пользователя

Открой `https://app.yourdomain.com/register` → создай аккаунт → Free plan (1 провайдер, 3 MR/мес).

## Обслуживание

```bash
# Обновить версию
git pull
docker compose up -d --build

# Логи Caddy
docker compose logs caddy

# Бэкап данных
docker compose exec app tar czf /tmp/data-backup.tar.gz -C /app data
docker cp $(docker compose ps -q app):/tmp/data-backup.tar.gz .

# Сброс пароля (через SQLite)
docker compose exec app node -e "
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('newpass123', 10);
  console.log(hash);
"
```

## Архитектура

```
Пользователь → app.yourdomain.com:443
  ↓
Caddy (TLS termination, HTTPS redirect)
  ├── /api/* → reverse_proxy app:3000
  └── /*     → file_server /srv/public (SPA)
        ↓
Express (порт 3000, наружу не торчит)
  ├── /api/v1/auth/* — регистрация, логин
  ├── /api/v1/providers — провайдеры
  ├── /api/v1/merge-requests-v2 — MR
  └── /health — healthcheck
```
