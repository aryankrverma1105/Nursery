# Nursery Platform Deployment & Hosting Guide

This guide describes deploying the Deep Root Farms monorepo:
1. **Frontend (/client):** Hosted as an SPA on Vercel.
2. **Backend & Database (/server):** Containerized on a VPS (Ubuntu, Debian) or Google Cloud Platform (GCP Cloud Run + Cloud SQL PostgreSQL).

---

## Architecture Overview

```
                      +-----------------------------+
                      |   Vercel Edge Network       |
                      |   React 18 SPA (/client)    |
                      +--------------+--------------+
                                     |
                                HTTPS API Calls (/api/*)
                                     v
                      +-----------------------------+
                      |   VPS / GCP Cloud Run       |
                      |   Node.js Express (/server) |
                      +--------------+--------------+
                                     |
                                SQL Queries (Knex)
                                     v
                      +-----------------------------+
                      |   PostgreSQL 16 Engine      |
                      |   Docker / Cloud SQL        |
                      +-----------------------------+
```

---

## 1. Local Development (Docker Compose)

To spin up a local PostgreSQL container alongside development:

```bash
# 1. Start Postgres database in Docker
docker compose up -d

# 2. Run migrations and sample seed data
npm run migrate
npm run seed

# 3. Start local API and Vite client concurrently
npm run dev
```

---

## 2. Deploying Frontend to Vercel

1. Push your repository to GitHub / GitLab.
2. Import the project into your Vercel Dashboard.
3. Configure the Project Settings:
   - **Framework Preset:** Vite
   - **Root Directory:** `client`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Set Environment Variables:
   - `VITE_API_URL`: Your backend API domain (e.g. `https://api.yournursery.com/api`)
5. Deploy. Vercel will honor `client/vercel.json` for SPA HTML5 history routing rewrites.

---

## 3. Deploying Backend to VPS (Ubuntu 22.04 / 24.04 LTS)

### Prerequisites
- Node.js 22 LTS or 24
- PostgreSQL 16
- Nginx (Reverse Proxy & SSL termination)
- Certbot (Let's Encrypt SSL)

### Step 1: Database Setup
```bash
sudo -u postgres psql
CREATE DATABASE nurcery_prod;
CREATE USER nurcery_admin WITH ENCRYPTED PASSWORD 'StrongProductionPassword_123';
GRANT ALL PRIVILEGES ON DATABASE nurcery_prod TO nurcery_admin;
\q
```

### Step 2: Clone & Configure
```bash
git clone https://github.com/your-org/nursery-platform.git /var/www/nurcery
cd /var/www/nurcery/server
cp ../.env.example .env
nano .env # Configure DB_CLIENT=pg, DATABASE_URL, JWT secrets, etc.
```

### Step 3: Install & Build
```bash
npm install --omit=dev
npm run build
npm run migrate
npm run seed:real # Run without sample data flag for live production
```

### Step 4: Process Management (PM2)
```bash
sudo npm install -g pm2
pm2 start dist/index.js --name "nurcery-api"
pm2 save
pm2 startup
```

### Step 5: Nginx Configuration
```nginx
server {
    server_name api.yournursery.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Deploying Backend to Google Cloud Platform (GCP Cloud Run)

1. **Cloud SQL:** Create a PostgreSQL 16 instance. Note the connection name (e.g. `project:region:nurcery-db`).
2. **Secret Manager:** Store `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL`.
3. **Artifact Registry & Cloud Run:**
   ```bash
   gcloud builds submit --tag gcr.io/$PROJECT_ID/nurcery-api ./server
   gcloud run deploy nurcery-api \
     --image gcr.io/$PROJECT_ID/nurcery-api \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --add-cloudsql-instances $INSTANCE_CONNECTION_NAME \
     --set-env-vars NODE_ENV=production,PORT=8080
   ```

---

## 5. Deploying to a Google Cloud Compute Engine VM Instance (Port 1111)

To run the entire Nursery platform (Frontend + Backend + Database) on a single GCP VM on port **1111**:

### STEP 1: Allow Port 1111 in Google Cloud Firewall (MANDATORY)

By default, Google Cloud blocks all incoming traffic on port 1111. You must create an ingress firewall rule:

#### Option A: In the Google Cloud Console UI
1. In GCP Console, open navigation menu -> **VPC network** -> **Firewall**.
2. Click **+ CREATE FIREWALL RULE**.
3. Fill in the following:
   - **Name:** `allow-nursery-1111`
   - **Network:** `default`
   - **Direction of traffic:** `Ingress`
   - **Action on match:** `Allow`
   - **Targets:** `All instances in the network` (or specify your VM's network tag)
   - **Source IPv4 ranges:** `0.0.0.0/0`
   - **Protocols and ports:** Check **Specified protocols and ports** -> check **tcp** -> enter `1111`.
4. Click **Create**.

#### Option B: Using Google Cloud Shell / gcloud CLI
Run this single command in Google Cloud Shell or on your terminal:
```bash
gcloud compute firewall-rules create allow-nursery-1111 \
    --direction=INGRESS \
    --priority=1000 \
    --network=default \
    --action=ALLOW \
    --rules=tcp:1111 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=nursery-server
```

---

### STEP 2: Deploy on the VM (Choose Method A or Method B)

Connect to your GCP VM instance via SSH (click the **SSH** button next to your VM in the GCP Console Compute Engine list).

#### METHOD A: Using Docker (Recommended - Fastest & Cleanest)

1. **Install Docker** (if not already installed on the VM):
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io git
   sudo systemctl enable --now docker
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **Clone Repository & Build Docker Image**:
   ```bash
   git clone https://github.com/aryankrverma1105/Nursery.git
   cd Nursery
   docker build -t nursery-app .
   ```

3. **Run Container on Port 1111**:
   ```bash
   docker run -d \
     --name nursery-prod \
     --restart always \
     -p 1111:1111 \
     -v nursery_uploads:/app/uploads \
     -e PORT=1111 \
     -e NODE_ENV=production \
     nursery-app
   ```

4. **Verify container is running**:
   ```bash
   docker ps
   docker logs nursery-prod
   ```

---

#### METHOD B: Direct Deployment with Node.js & PM2 (Without Docker)

1. **Install Node.js 22 LTS & Git**:
   ```bash
   sudo apt-get update
   sudo apt-get install -y curl git
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone & Install Dependencies**:
   ```bash
   git clone https://github.com/aryankrverma1105/Nursery.git
   cd Nursery
   npm install
   ```

3. **Build Frontend and Backend**:
   ```bash
   npm run build
   ```

4. **Start Application on Port 1111 with PM2**:
   ```bash
   PORT=1111 NODE_ENV=production pm2 start npm --name "nursery-app" -- start
   pm2 save
   pm2 startup
   ```

---

### STEP 3: Access Your Live Website

1. Go to **Google Cloud Console** -> **Compute Engine** -> **VM instances**.
2. Find your instance and copy its **External IP** (e.g. `34.123.45.67`).
3. Open your browser and go to:
   ```
   http://<YOUR_VM_EXTERNAL_IP>:1111
   ```
   Example: `http://34.123.45.67:1111`
4. Both the public catalogue website and the `/app` staff portal are live on port 1111!


