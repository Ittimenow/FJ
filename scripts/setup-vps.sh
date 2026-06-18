#!/usr/bin/env bash
# VPS first-time setup for the FJ project.
# Run as the 'deploy' user on the server:
#   bash setup-vps.sh

set -euo pipefail

SERVER_IP="185.185.142.230"
REPO_URL="git@github.com:Ittimenow/FJ.git"
APP_DIR="/opt/fj"

echo ""
echo "=== [1/6] Swap (2 GB) ==="
if swapon --show | grep -q swapfile; then
  echo "Swap уже настроен, пропускаю."
else
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  echo "Swap 2 GB добавлен."
fi
free -h

echo ""
echo "=== [2/6] Docker ==="
if command -v docker &>/dev/null; then
  echo "Docker уже установлен: $(docker --version)"
else
  sudo apt-get update -q
  sudo apt-get install -y -q ca-certificates curl git
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu \
$(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update -q
  sudo apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  echo "Docker установлен: $(docker --version)"
fi

# Добавить deploy в группу docker (без перезапуска сессии используем sg)
if ! groups | grep -q docker; then
  sudo usermod -aG docker "$USER"
  echo "Пользователь $USER добавлен в группу docker."
  echo "ВАЖНО: после скрипта выйдите и войдите снова (или запустите: newgrp docker)"
fi

echo ""
echo "=== [3/6] GitHub Deploy Key ==="
KEY_FILE="$HOME/.ssh/github_fj"
if [ -f "$KEY_FILE" ]; then
  echo "Deploy key уже есть: $KEY_FILE"
else
  mkdir -p "$HOME/.ssh"
  chmod 700 "$HOME/.ssh"
  ssh-keygen -t ed25519 -C "deploy@gamefj" -f "$KEY_FILE" -N ""
  echo ""
  echo ">>> СКОПИРУЙТЕ этот публичный ключ и добавьте его на GitHub:"
  echo ">>> Репо → Settings → Deploy keys → Add deploy key (только чтение)"
  echo ""
  cat "${KEY_FILE}.pub"
  echo ""
fi

# Настроить SSH config
if ! grep -q "github_fj" "$HOME/.ssh/config" 2>/dev/null; then
  cat >> "$HOME/.ssh/config" << 'EOF'

Host github.com
  IdentityFile ~/.ssh/github_fj
  StrictHostKeyChecking no
EOF
  chmod 600 "$HOME/.ssh/config"
fi

echo ""
echo "Проверка соединения с GitHub..."
echo "Если ключ ещё не добавлен — нажмите Ctrl+C, добавьте и перезапустите скрипт."
ssh -T git@github.com 2>&1 || true

echo ""
echo "=== [4/6] Клонирование репо ==="
if [ -d "$APP_DIR/.git" ]; then
  echo "Репо уже склонировано в $APP_DIR, обновляю..."
  git -C "$APP_DIR" pull
else
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER:$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

echo ""
echo "=== [5/6] Генерация .env.vps ==="
cd "$APP_DIR"

if [ -f ".env.vps" ]; then
  echo ".env.vps уже существует, пропускаю генерацию."
else
  cp .env.vps.example .env.vps

  AUTH_SECRET=$(openssl rand -base64 32)
  JWT_SECRET=$(openssl rand -base64 32)
  POSTGRES_PASSWORD=$(openssl rand -hex 24)

  sed -i "s|replace-with-openssl-rand-base64-32|PLACEHOLDER|" .env.vps
  # AUTH_SECRET — первая замена
  AUTH_LINE_DONE=false
  while IFS= read -r line; do
    if [[ "$line" == *"AUTH_SECRET=PLACEHOLDER"* ]] && ! $AUTH_LINE_DONE; then
      echo "AUTH_SECRET=$AUTH_SECRET"
      AUTH_LINE_DONE=true
    elif [[ "$line" == *"JWT_SECRET=PLACEHOLDER"* ]]; then
      echo "JWT_SECRET=$JWT_SECRET"
    else
      echo "$line"
    fi
  done < .env.vps > .env.vps.tmp && mv .env.vps.tmp .env.vps

  sed -i "s|replace-with-openssl-rand-hex-24|$POSTGRES_PASSWORD|" .env.vps

  # Заменяем URL на IP сервера
  sed -i "s|APP_PUBLIC_HOST=:80|APP_PUBLIC_HOST=:80|" .env.vps
  sed -i "s|APP_PUBLIC_URL=http://127.0.0.1|APP_PUBLIC_URL=http://${SERVER_IP}|" .env.vps
  sed -i "s|NEXTAUTH_URL=http://127.0.0.1|NEXTAUTH_URL=http://${SERVER_IP}|" .env.vps
  sed -i "s|WEB_ORIGIN=http://127.0.0.1|WEB_ORIGIN=http://${SERVER_IP}|" .env.vps

  echo ".env.vps создан."
fi

echo ""
echo "=== [6/6] Firewall ==="
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

echo ""
echo "============================================"
echo "  Подготовка завершена!"
echo ""
echo "  Следующий шаг — запуск Docker Compose:"
echo ""
echo "    cd $APP_DIR"
echo "    docker compose --env-file .env.vps -f docker-compose.vps.yml up -d --build"
echo ""
echo "  Следить за логами:"
echo "    docker compose --env-file .env.vps -f docker-compose.vps.yml logs -f app"
echo ""
echo "  Проверка (после запуска ~5-10 мин):"
echo "    curl http://${SERVER_IP}/healthz"
echo "============================================"
