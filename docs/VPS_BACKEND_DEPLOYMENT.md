# VPS backend deployment: api.talkingwave.tech

The React frontend remains on Hostinger at `https://talk.talkingwave.tech`.
This guide deploys only the Node.js backend to the VPS behind Nginx and PM2.

## 1. DNS and Hostinger MySQL

1. In Hostinger DNS Zone, create an `A` record: host `api`, value **your VPS public IPv4**, TTL `300`.
2. In Hostinger MySQL Remote Access, allow **your VPS public IPv4**.
3. Copy the remote MySQL host shown in hPanel. It is usually `srv....hstgr.io`; it is not `localhost`.
4. Wait for DNS propagation, then confirm from the VPS:

```bash
getent hosts api.talkingwave.tech
```

## 2. Install the backend on the VPS

Run as root (or change `/var/www` ownership/use a non-root deploy user):

```bash
apt update
apt install -y nginx certbot python3-certbot-nginx git
mkdir -p /var/www
cd /var/www
git clone https://github.com/zivico-it-team/Auto-dialer.git talkingwave-api
cd talkingwave-api/backend
cp .env.vps.example .env
chmod 600 .env
```

Edit `.env` and set `DATABASE_URL` using the Hostinger remote DB host and a URL-encoded password. Generate `JWT_SECRET` with:

```bash
openssl rand -hex 48
```

Then install, create/update the schema, bootstrap accounts, and compile:

```bash
npm ci
npm run deploy:prepare
```

`deploy:prepare` is deliberate. It runs database schema sync and account bootstrap once; normal `npm install` does not modify the database.

## 3. PM2

Do not overwrite the existing `a5markets-api` or `zee-talk-backend` processes. Start this API with its own name:

```bash
cd /var/www/talkingwave-api/backend
pm2 start dist/server.js --name talkingwave-api --time
pm2 save
pm2 startup
```

Run the final command printed by `pm2 startup`, then verify:

```bash
pm2 status
pm2 logs talkingwave-api --lines 100
curl http://127.0.0.1:4000/health
```

## 4. Nginx reverse proxy and HTTPS

Create `/etc/nginx/sites-available/api.talkingwave.tech`:

```nginx
server {
    listen 80;
    server_name api.talkingwave.tech;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }
}
```

Enable it and issue the certificate:

```bash
ln -s /etc/nginx/sites-available/api.talkingwave.tech /etc/nginx/sites-enabled/api.talkingwave.tech
nginx -t
systemctl reload nginx
ufw allow 'Nginx Full'
certbot --nginx -d api.talkingwave.tech
```

Verify from a browser or terminal:

```bash
curl https://api.talkingwave.tech/health
curl https://api.talkingwave.tech/api/health
```

## 5. Rebuild the Hostinger frontend

Set these values in `frontend/.env.production`, rebuild, and upload the **contents** of `frontend/dist` to the document root of `talk.talkingwave.tech`:

```env
VITE_API_BASE_URL=https://api.talkingwave.tech/api
VITE_SOCKET_URL=https://api.talkingwave.tech
```

```bash
cd /var/www/talkingwave-api/frontend
npm ci
npm run build
```

Use any local machine to build if preferred; only the generated `dist` contents belong in Hostinger File Manager.

## Updates

```bash
cd /var/www/talkingwave-api
git pull origin main
cd backend
npm ci
npm run deploy:prepare
pm2 reload talkingwave-api --update-env
pm2 logs talkingwave-api --lines 100
```
