# Production Deployment Guide (Ubuntu Linux + Nginx + PM2 + MySQL)

## 1. Server Prerequisites

- Ubuntu 22.04 LTS or 24.04 LTS
- Node.js v20+ / v22+
- MySQL Server 8.0+
- Nginx
- PM2 (`npm install -g pm2`)
- Asterisk 18+ (if deploying PBX on same host or separate VM)

---

## 2. Database Setup

```bash
sudo mysql -u root -p
```
```sql
CREATE DATABASE callcenter_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dialer_user'@'localhost' IDENTIFIED BY 'STRONG_DATABASE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON callcenter_prod.* TO 'dialer_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Application Deployment & Build

```bash
# Clone repository
git clone <your-repo-url> /var/www/call-center-dialer
cd /var/www/call-center-dialer

# Backend Setup
cd backend
cp .env.example .env
# Edit .env with production MySQL URL, JWT_SECRET, and Asterisk credentials
npm install --production=false
npx prisma db push
npm run build

# Frontend Setup
cd ../frontend
npm install
npm run build
```

---

## 4. PM2 Process Management

Start the backend daemon using PM2:

```bash
cd /var/www/call-center-dialer/backend
pm2 start dist/server.js --name "dialer-api" --instances max --exec-mode cluster
pm2 save
pm2 startup
```

---

## 5. Nginx Reverse Proxy & SSL

Create `/etc/nginx/sites-available/dialer.conf`:

```nginx
server {
    listen 80;
    server_name dialer.yourcompany.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dialer.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/dialer.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dialer.yourcompany.com/privkey.pem;

    # Frontend Static Single Page App
    location / {
        root /var/www/call-center-dialer/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket (Socket.IO) Proxy
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

Enable site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/dialer.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```
