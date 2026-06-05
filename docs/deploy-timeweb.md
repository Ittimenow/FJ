# Деплой в Timeweb Cloud App Platform

Проект подготовлен для деплоя из GitHub как Dockerfile-приложение Timeweb Cloud App Platform.

## Архитектура

- Timeweb видит один внешний порт контейнера: `3000`.
- Внутри контейнера стартуют два процесса:
  - Nest API: `127.0.0.1:4000`;
  - Next.js web: `127.0.0.1:3001`.
- Встроенный proxy на `3000` отправляет:
  - `/backend/*` в Nest API;
  - `/backend/socket.io` в Socket.IO API;
  - остальные запросы в Next.js.

Это нужно, чтобы браузер работал с одним публичным доменом Timeweb, без отдельного публичного API-порта.

## Что создать в Timeweb

1. Создайте PostgreSQL как отдельный постоянный сервис.
2. Redis можно создать отдельно, если нужны realtime-события между несколькими инстансами. Для одного инстанса переменную `REDIS_URL` можно не задавать.
3. В App Platform создайте приложение:
   - тип: `Dockerfile`;
   - источник: GitHub-репозиторий проекта;
   - ветка: production/main branch;
   - путь к директории проекта: пустой, потому что `Dockerfile` лежит в корне;
   - внутренний порт контейнера, если Timeweb показывает такое поле: `3000`;
   - health check path: `/healthz`.

По документации Timeweb для Dockerfile-деплоя `Dockerfile` должен быть в репозитории, а `EXPOSE` нужен, чтобы платформа определила порт контейнера. В этом проекте указан `EXPOSE 3000`.

## Переменные окружения

В Timeweb App Platform добавьте переменные из `.env.production.example`.

Обязательные значения, которые нужно заменить:

```env
APP_PUBLIC_URL=https://your-app.twc1.net
NEXTAUTH_URL=https://your-app.twc1.net
WEB_ORIGIN=https://your-app.twc1.net
AUTH_SECRET=...
JWT_SECRET=...
DATABASE_URL=postgresql://...
```

Когда привяжете свой домен, замените `APP_PUBLIC_URL`, `NEXTAUTH_URL` и `WEB_ORIGIN` на новый HTTPS-домен.

Секреты можно сгенерировать локально:

```bash
openssl rand -base64 32
```

## Первый запуск

По умолчанию контейнер выполняет:

```bash
npm run db:generate
npm run db:push
```

Затем seed профессий и карточек запускается только если справочники пустые. Это управляется переменной:

```env
DATABASE_AUTO_SETUP=true
```

Если вы будете управлять схемой базы вручную, установите:

```env
DATABASE_AUTO_SETUP=false
```

## Проверка после деплоя

Откройте:

```text
https://your-app-domain/
```

Ожидаемый результат: редирект на `/login`.

Проверка health endpoint:

```text
https://your-app-domain/healthz
```

Ожидаемый ответ:

```json
{"status":"ok"}
```
