# Financial Journey

MVP онлайн-версии финансовой настольной игры: Next.js frontend, NestJS API, PostgreSQL, Prisma, Redis и Socket.IO.

Проект построен вокруг принципа event sourcing: текущее состояние хранится для быстрых запросов, но каждое действие партии записывается в `game_events`, что дает аудит, replay и восстановление состояния.

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev:web
```

API: `http://localhost:4000`

Web: `http://localhost:3000`

## Деплой

Проект подготовлен для Dockerfile-деплоя в Timeweb Cloud App Platform из GitHub. Инструкция и список production-переменных: [docs/deploy-timeweb.md](docs/deploy-timeweb.md).

## Руководство пользователя

Подробная инструкция по типам аккаунтов, ролям в комнате и правилам MVP-партии находится в [docs/user-guide.md](docs/user-guide.md).

## Автозапуск в VS Code

В проект добавлен `.vscode/tasks.json`. При открытии папки VS Code запускает задачу `Cashflow: auto start local dev`, которая выполняет:

- создание `.env` из `.env.example`, если файла ещё нет;
- `docker compose up -d`;
- `npm install`, если нет `node_modules`;
- `npm run db:generate`;
- `npm run db:push`;
- seed профессий и карточек, если справочники пустые;
- запуск API на `http://localhost:4000` и Web на `http://localhost:3000`.

VS Code в первый раз попросит разрешить automatic tasks для этой папки. Нужно выбрать `Allow and Run`.

## Что входит в MVP

- регистрация и логин через JWT, интеграция NextAuth Credentials на frontend;
- личный кабинет с историей партий и агрегированной статистикой;
- комнаты на 2-6 игроков, роли игрока/банкира/наблюдателя;
- авторитетный backend для броска кубика, движения, получения зарплаты, карточек, сделок и кредитов;
- Socket.IO синхронизация комнаты, чата и журнала действий;
- Prisma-схема под PostgreSQL;
- seed-импорт профессий и карточек из `dist/seed_professions.sql` и `dist/seed_cards.sql`.

Seed-файлы остаются внешним источником данных. Приложение не зависит от выполнения MySQL DDL: Prisma seed-скрипт парсит INSERT-операторы и пишет данные в PostgreSQL.

Денежные значения в seed-файлах записываются как прямые игровые суммы. Старые технические имена колонок вида `*_cents` сохранены в схеме, но значение `500` означает `$500`, а не `50000` центов.

## Исходные файлы для ИИ

Папка `distr/` предназначена для входных файлов, которые пользователь передает ИИ в работу. Эти файлы считаются исходниками: их можно читать, но нельзя изменять, перезаписывать, форматировать, удалять или переносить. Все результаты обработки нужно сохранять в рабочие файлы проекта вне `distr/`.
