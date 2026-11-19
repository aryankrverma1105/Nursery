#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "🌱 Deep Root Farms Nursery - GCP VM Automated Setup Script"
echo "=========================================================="

# 1. Update system packages
echo "--> Updating system packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx ufw

# 2. Install Node.js 22 LTS
echo "--> Installing Node.js 22 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. Install PM2 globally
echo "--> Installing PM2 process manager..."
sudo npm install -g pm2

# 4. Prepare Environment Configuration
APP_DIR="/var/www/nurcery"
CURRENT_DIR=$(pwd)

if [ "$CURRENT_DIR" != "$APP_DIR" ]; then
    echo "--> Moving application files to $APP_DIR..."
    sudo mkdir -p /var/www/nurcery
    sudo cp -r "$CURRENT_DIR/." "$APP_DIR/"
    sudo chown -R $USER:$USER "$APP_DIR"
    cd "$APP_DIR"
fi

if [ ! -f "server/.env" ]; then
    echo "--> Creating server/.env from template..."
    cp .env.example server/.env
    # Generate random JWT secrets
    sed -i "s/your_super_secret_jwt_access_key_change_in_production/$(openssl rand -hex 32)/g" server/.env
    sed -i "s/your_super_secret_jwt_refresh_key_change_in_production/$(openssl rand -hex 32)/g" server/.env
fi

# 5. Install Dependencies and Build Application
echo "--> Installing monorepo dependencies..."
npm install

echo "--> Building client and server..."
npm run build

# 6. Configure Nginx Reverse Proxy (Port 80)
echo "--> Configuring Nginx for Port 80 without port numbers..."
sudo cp "$APP_DIR/scripts/nginx-nursery.conf" /etc/nginx/sites-available/nursery
sudo ln -sf /etc/nginx/sites-available/nursery /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# 7. Start Backend with PM2
echo "--> Starting backend server with PM2..."
cd "$APP_DIR/server"
pm2 delete nurcery-api 2>/dev/null || true
pm2 start dist/index.js --name "nurcery-api"
pm2 save
pm2 startup | tail -n 1 | bash || true

# 8. Firewall Configuration (Allow Port 80 and 443)
if sudo ufw status | grep -q "active"; then
    echo "--> Configuring UFW firewall rules..."
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 22/tcp
    sudo ufw reload
fi

# 9. Get External IP
EXTERNAL_IP=$(curl -s -4 icanhazip.com || echo "<YOUR-VM-EXTERNAL-IP>")

echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=========================================================="
echo "Your nursery website and admin panel are LIVE without any port number:"
echo "👉 http://$EXTERNAL_IP"
echo ""
echo "To attach a custom domain and free SSL certificate (HTTPS):"
echo "  sudo apt install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d yourdomain.com"
echo "=========================================================="
