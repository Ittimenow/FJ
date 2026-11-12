# Деплой на Timeweb Cloud Server

Инструкция для обычного облачного сервера Timeweb с Ubuntu 24.04.
Для Timeweb App Platform используйте отдельную инструкцию: [deploy-timeweb.md](deploy-timeweb.md).

## Что получится

- Caddy принимает публичный HTTP/HTTPS трафик на `80/443`.
- Приложение FJ работает внутри Docker и доступно Caddy только через `127.0.0.1:3000`.
- PostgreSQL хранит данные в постоянном Docker volume.
- Redis не запускается по умолчанию: для одного инстанса он не нужен.

Контейнер приложения использует сеть VPS напрямую, чтобы исходящие интеграции
работали через тот же стабильный маршрут, что и сам сервер. Приложение,
PostgreSQL и Redis привязаны только к loopback-адресу и не открывают свои порты
во внешний интернет.

## 1. Подключиться к серверу

```bash
ssh root@SERVER_IP
```

Дальше команды выполняются на сервере.

## 2. Добавить swap

На сервере с 1 ГБ RAM сборка Docker-образа может упасть без swap.

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## 3. Установить Docker

Команды ниже соответствуют [официальному способу установки Docker Engine через apt-репозиторий Docker для Ubuntu](https://docs.docker.com/engine/install/ubuntu/).

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
docker compose version
```

Если работаете не под `root`, добавьте пользователя в группу `docker` и переподключитесь:

```bash
sudo usermod -aG docker $USER
exit
```

## 4. Открыть firewall

В панели Timeweb и в `ufw`, если он включен, должны быть открыты `22`, `80`, `443`.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

## 5. Загрузить проект

Для публичного репозитория:

```bash
sudo mkdir -p /opt/fj
sudo chown -R $USER:$USER /opt/fj
git clone REPO_URL /opt/fj
cd /opt/fj
```

Для приватного репозитория сначала настройте deploy key или GitHub token, затем выполните `git clone`.

## 6. Настроить переменные

```bash
cp .env.vps.example .env.vps
openssl rand -base64 32
openssl rand -base64 32
openssl rand -hex 24
nano .env.vps
```

Замените:

- `AUTH_SECRET` первым `openssl rand -base64 32`;
- `JWT_SECRET` вторым `openssl rand -base64 32`;
- `POSTGRES_PASSWORD` значением `openssl rand -hex 24`.

Чтобы получать уведомления о новых регистрациях, создайте Telegram-бота через
`@BotFather`, отправьте ему любое сообщение и задайте в `.env.vps`:

```env
TELEGRAM_BOT_TOKEN=токен_бота
TELEGRAM_CHAT_ID=id_вашего_чата
TELEGRAM_API_IPV4=149.154.167.220
```

ID личного чата находится в поле `message.chat.id` ответа
`https://api.telegram.org/bot<токен>/getUpdates`. Без этих переменных уведомления
отключены и не влияют на регистрацию.

`TELEGRAM_API_IPV4` задаёт рабочий IPv4 Telegram только внутри контейнера
приложения. Он нужен, если маршрут хостинга к адресу из публичного DNS Telegram
завершается таймаутом. При изменении адресов Telegram значение можно заменить в
`.env.vps` без изменения Compose-файла.

Для системных уведомлений установленного PWA сгенерируйте постоянную пару ключей
командой `npx web-push generate-vapid-keys --json` и добавьте в `.env.vps`:

```env
WEB_PUSH_PUBLIC_KEY=публичный_ключ
WEB_PUSH_PRIVATE_KEY=приватный_ключ
WEB_PUSH_CONTACT=mailto:admin@your-domain.example
```

Укажите действующий адрес для связи; приватный ключ не сохраняйте в репозитории.
При замене ключевой пары пользователям потребуется повторно включить уведомления.
Для push нужен HTTPS-домен: установка PWA по HTTP-адресу сервера для этого не подходит.

Если домен уже направлен A-записью на сервер:

```env
APP_PUBLIC_HOST=fj.example.com
APP_PUBLIC_URL=https://fj.example.com
NEXTAUTH_URL=https://fj.example.com
WEB_ORIGIN=https://fj.example.com
```

Caddy сам выпустит и будет обновлять HTTPS-сертификат. В compose используется обычный [reverse proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

Если домена пока нет и нужен первый запуск по IP:

```env
APP_PUBLIC_HOST=:80
APP_PUBLIC_URL=http://SERVER_IP
NEXTAUTH_URL=http://SERVER_IP
WEB_ORIGIN=http://SERVER_IP
```

## 7. Запустить

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build
```

Первый запуск делает:

- `prisma generate`;
- `prisma db push`;
- проверку соответствия реальной базы схеме Prisma;
- seed профессий и карточек, если справочники пустые.

Проверка:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml ps
docker compose --env-file .env.vps -f docker-compose.vps.yml logs -f app
curl http://127.0.0.1:3000/healthz
```

Публично:

```bash
curl http://SERVER_IP/healthz
# или
curl https://fj.example.com/healthz
```

Ожидаемый ответ:

```json
{"status":"ok","error":null,"latencyMs":12,"api":{"status":"ok"}}
```

Публичный `/healthz` проверяет не только процесс приложения, но также API и
подключение к базе данных. Для раздельной диагностики доступны:

```bash
curl https://fj.example.com/backend/api/health/live
curl https://fj.example.com/backend/api/health/ready
curl 'https://fj.example.com/backend/socket.io/?EIO=4&transport=polling'
```

Последний запрос проверяет доступность транспорта Socket.IO. Ответ начинается
с параметров сессии, если прокси и игровой канал работают.

## Мониторинг и журнал ошибок

Администратор видит встроенный журнал сгруппированных ошибок и задержки
операций в разделе `Кабинет → Мониторинг`. Метрики хранятся в памяти за
последние 15 минут, а ошибки сохраняются в PostgreSQL и могут быть отмечены как
решённые.

Workflow `Production uptime` каждые пять минут проверяет публичный health-check
и транспорт Socket.IO. Неуспешная проверка отображается как упавший GitHub
Actions run; уведомления о таких запусках настраиваются в GitHub.

Для внешнего error tracking можно дополнительно задать в `.env.vps`:

```env
SENTRY_DSN=https://PUBLIC_KEY@example.ingest.sentry.io/PROJECT_ID
NEXT_PUBLIC_SENTRY_DSN=https://PUBLIC_KEY@example.ingest.sentry.io/PROJECT_ID
SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

`NEXT_PUBLIC_SENTRY_DSN` передаётся в клиентскую сборку и не является секретом.
Для загрузки source maps во время сборки дополнительно используются
`SENTRY_AUTH_TOKEN`, `SENTRY_ORG` и `SENTRY_PROJECT`; эти значения не следует
сохранять в репозитории.

## Обновление проекта

Правило деплоя: деплойте только после успешной локальной проверки, а после деплоя сверяйте номер релиза на экране входа `https://gamefj.ru/login`. Номер релиза собирается автоматически из Git: базовая версия берется из корневого `package.json`, а номер деплоя добавляется из счетчика коммитов и короткого SHA.

При push в `main` GitHub Actions выполняет production-сборку на GitHub runner,
публикует образ с тегом commit SHA в GitHub Container Registry, а VPS только
скачивает готовый образ и перезапускает сервисы. Для публикации и скачивания
используется краткоживущий `GITHUB_TOKEN`; постоянный токен на VPS не хранится.
Кэши сборки и временный компилятор Next.js не включаются в готовый образ.
Скачивание образа на VPS ограничено тридцатью пятью минутами, ожидание запуска
сервисов — тремя минутами, а вся SSH-часть деплоя — сорока пятью минутами.

Build-time параметры клиентского Sentry задаются в GitHub в разделе
`Settings → Secrets and variables → Actions → Variables`:

- `NEXT_PUBLIC_SENTRY_DSN`;
- `NEXT_PUBLIC_SENTRY_ENVIRONMENT`;
- `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`.

Если переменные не заданы, клиентский Sentry остаётся отключённым, окружение
считается `production`, а sampling rate — `0.1`. Серверные параметры Sentry и
остальные runtime-секреты по-прежнему читаются из `.env.vps`.

Команды ниже остаются запасным способом ручной сборки непосредственно на VPS:

```bash
cd /opt/fj
git pull
export GAME_RELEASE_VERSION="$(node scripts/write-release-version.mjs --print)"
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build
docker image prune -f
docker builder prune -f
```

На диске 15 ГБ очистка Docker-кэша после нескольких сборок важна.

## Отдельный импорт набора 202

Релиз кода с поддержкой 202 сам по себе не переносит карточки в базу.
Файл `dist/recognized_202_cards_ru.json` включён в образ, но импорт выполняется
отдельно через существующий CLI. Автоматический повторный импорт при запуске
приложения не выполняется.

Перед импортом убедитесь, что запущен релиз с поддержкой 202 и его схемой БД,
проверьте целевую production-базу и сохраните её [резервную копию](#резервная-копия-базы).
Проверьте существующий набор с именем «202»: режим, активные карточки и связанные
партии. Импорт допускается только в набор `ADVANCED_202`; при совпадении имени
с набором 101 CLI остановится. Не меняйте режим существующего набора 101.

Используйте готовый manifest из проверенной версии репозитория. Сверьте SHA-256
файла на VPS с проверенной копией и с файлом внутри работающего контейнера:

```bash
cd /opt/fj
sha256sum dist/recognized_202_cards_ru.json
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T app \
  sha256sum /app/dist/recognized_202_cards_ru.json
FJ_202_IMPORT_FILE=/app/dist/recognized_202_cards_ru.json
```

В старом образе manifest может отсутствовать. В таком случае скопируйте только
этот файл из проверенного репозитория во временную папку контейнера и повторно
сверьте хеш; пересобирать или перезапускать приложение для импорта не нужно:

```bash
cd /opt/fj
docker compose --env-file .env.vps -f docker-compose.vps.yml cp \
  dist/recognized_202_cards_ru.json app:/tmp/recognized_202_cards_ru.json
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T app \
  sha256sum /tmp/recognized_202_cards_ru.json
FJ_202_IMPORT_FILE=/tmp/recognized_202_cards_ru.json
```

В том же сеансе оболочки сначала получите план импорта. Команда запускается из
корня приложения внутри `app` и использует его настроенную `DATABASE_URL`;
путь к файлу должен быть абсолютным внутри контейнера.

```bash
cd /opt/fj
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T -w /app app \
  npm run db:import-cards -- --set "202" --game-type 202 \
  --file "$FJ_202_IMPORT_FILE" --dry-run
```

Для отсутствующего набора ожидается создание 138 карточек без отклонений.
Если набор уже существует, проверьте список обновляемых карточек и связанные
партии: их названия и тексты могут использоваться в истории этих партий.
CLI работает только с выбранным набором и входящими slug, сохраняет идентификаторы
существующих карточек и не удаляет посторонние записи. Лишние активные карточки
в целевом наборе требуют отдельного разбора: импорт не удаляет их автоматически.

После проверки dry-run и подтверждения записи примените импорт:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T -w /app app \
  npm run db:import-cards -- --set "202" --game-type 202 \
  --file "$FJ_202_IMPORT_FILE" --apply --allow-production
```

Затем повторите dry-run; ожидается `created: 0`, `updated: 0`,
`unchanged: 138`, `rejected: 0`:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T -w /app app \
  npm run db:import-cards -- --set "202" --game-type 202 \
  --file "$FJ_202_IMPORT_FILE" --dry-run
```

Готовый набор должен относиться к режиму 202, содержать ровно 138 активных
карточек с поддерживаемыми slug и четыре колоды: 36 `SMALL_DEAL`, 36 `BIG_DEAL`,
42 `MARKET`, 24 `DOODAD`. Назначать `isDefault` не обязательно: готовый набор
доступен для выбора и без этого флага. После импорта проверьте его наличие
в авторизованном `GET /backend/api/games/card-sets?gameType=202` и при выборе
режима 202 на странице подготовки партии; наборы и существующие игры 101
должны остаться без изменений.

Не запускайте полный `db:seed` для этой операции: он работает с основным набором
101 и заменяет его карточки, а набор 202 не импортирует. После переноса данные
сохраняются в БД независимо от временной копии manifest в контейнере.

## Резервная копия базы

```bash
cd /opt/fj
mkdir -p backups
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T postgres pg_dump -U cashflow cashflow > "backups/fj-$(date +%F-%H%M).sql"
```

Восстановление из backup:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml exec -T postgres psql -U cashflow cashflow < backups/FILE.sql
```

## Redis

Для одного VPS-инстанса Redis можно не включать. Если позже будет несколько инстансов приложения, задайте в `.env.vps`:

```env
REDIS_URL=redis://127.0.0.1:6379
```

И запускайте compose с профилем:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml --profile redis up -d --build
```
