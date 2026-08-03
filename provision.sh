#!/usr/bin/env bash
set -e

echo "=== 1. Setting up 2GB Swap ==="
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    sysctl -p
fi

echo "=== 2. Updating Packages and Installing Core Tools ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx ca-certificates gnupg build-essential htop

echo "=== 3. Installing Node.js 20, pnpm, and PM2 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pnpm pm2

echo "=== 4. Installing Docker ==="
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker ubuntu
    rm get-docker.sh
fi

echo "=== 5. Starting Meilisearch Docker Container ==="
if ! docker ps -a --format '{{.Names}}' | grep -q "^meilisearch$"; then
    docker run -d \
      --name meilisearch \
      --restart unless-stopped \
      -p 7700:7700 \
      -v /var/lib/meili_data:/meili_data \
      -e MEILI_MASTER_KEY=180workspace_meili_master_key_2026 \
      -e MEILI_ENV=production \
      getmeili/meilisearch:v1.7
fi

echo "=== VERIFYING PROVISIONED ENVIRONMENT ==="
free -h
node -v
pnpm -v
pm2 -v
docker --version
docker ps
nginx -v
