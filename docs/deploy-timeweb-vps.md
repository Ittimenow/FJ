# Деплой на Timeweb Cloud Server

Инструкция для обычного облачного сервера Timeweb с Ubuntu 24.04.
Для Timeweb App Platform используйте отдельную инструкцию: [deploy-timeweb.md](deploy-timeweb.md).

## Что получится

- Caddy принимает публичный HTTP/HTTPS трафик на `80/443`.
- Приложение FJ работает внутри Docker на `app:3000`.
- PostgreSQL хранит данные в постоянном Docker volume.
- Redis не запускается по умолчанию: для одного инстанса он не нужен.

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
{"status":"ok","error":null}
```

## Обновление проекта

```bash
cd /opt/fj
git pull
docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build
docker image prune -f
docker builder prune -f
```

На диске 15 ГБ очистка Docker-кэша после нескольких сборок важна.

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
REDIS_URL=redis://redis:6379
```

И запускайте compose с профилем:

```bash
docker compose --env-file .env.vps -f docker-compose.vps.yml --profile redis up -d --build
```
