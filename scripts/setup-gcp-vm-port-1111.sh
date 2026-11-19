#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🌱 Nursery Management System - Deploy on Port 1111 (GCP VM)"
echo "=========================================================="

TARGET_PORT=1111

# 1. Update system packages & install curl, git, ufw
echo "--> [1/6] Updating system packages..."
sudo apt-get update
sudo apt-get install -y curl git ufw

# 2. Install Node.js 22 LTS if not present
echo "--> [2/6] Checking Node.js runtime..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Install PM2 process manager
echo "--> [3/6] Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Install Monorepo Dependencies
echo "--> [4/6] Installing npm dependencies..."
npm install

# 5. Build Frontend SPA & Backend Server
echo "--> [5/6] Building production frontend and backend..."
npm run build

# 6. Configure UFW (VM Internal Firewall)
if sudo ufw status | grep -q "active"; then
    echo "--> Configuring UFW firewall for port $TARGET_PORT..."
    sudo ufw allow 1111/tcp
    sudo ufw allow 22/tcp
    sudo ufw reload
fi

# 7. Start application on Port 1111 via PM2
echo "--> [6/6] Launching Nursery Platform on port $TARGET_PORT..."
pm2 delete nursery-app 2>/dev/null || true
PORT=$TARGET_PORT NODE_ENV=production pm2 start npm --name "nursery-app" -- start
pm2 save
pm2 startup | tail -n 1 | bash || true

# 8. Detect external IP
EXTERNAL_IP=$(curl -s -4 icanhazip.com || echo "<YOUR-VM-EXTERNAL-IP>")

echo "=========================================================="
echo "🎉 SUCCESS: Nursery Platform is LIVE on Port $TARGET_PORT!"
echo "=========================================================="
echo ""
echo "👉 http://$EXTERNAL_IP:$TARGET_PORT"
echo ""
echo "⚠️  CRITICAL GCP FIREWALL STEP:"
echo "Remember to allow port 1111 in Google Cloud Console:"
echo "  VPC network -> Firewall -> Create Firewall Rule"
echo "  Targets: All instances in network"
echo "  Source IP ranges: 0.0.0.0/0"
echo "  TCP: 1111"
echo "=========================================================="

