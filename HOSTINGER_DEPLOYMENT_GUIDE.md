# Talking Wave — Hostinger deployment

The recommended production layout is:

| Service | Public address | Hostinger location |
| --- | --- | --- |
| React frontend | `https://talkingwave.tech` | `public_html/` |
| Node.js API and Socket.IO | `https://api.talkingwave.tech` | a Hostinger Node.js application |
| MySQL | private Hostinger database host | Hostinger MySQL |

Using `api.talkingwave.tech` is intentional. A single hostname cannot normally serve an independent static website and a Node.js application without a reverse-proxy rule. This layout works on Hostinger without depending on custom Apache/Nginx proxy configuration.

## 1. Before deployment

1. Confirm the Hosting plan includes **Node.js applications** and supports WebSockets. If it does not, the React site can stay on Hostinger but the API must be hosted on a Node host or VPS.
2. Point `talkingwave.tech` to the Hostinger website.
3. In hPanel, create a subdomain named `api` for `api.talkingwave.tech` and enable SSL for both domains.
4. In **Databases → MySQL Databases**, create a database and a database user. Copy the *exact* database name, username, password, and host displayed by hPanel. Hostinger commonly prefixes database names and usernames.

## 2. Production environment file

Copy [`backend/.env.production.example`](backend/.env.production.example) to `backend/.env` **on Hostinger**, then fill `DATABASE_URL` using the details from hPanel:

```env
DATABASE_URL="mysql://u123456789_user:URL_ENCODED_PASSWORD@localhost:3306/u123456789_talkingwave"
```

If the password contains `@`, `:`, `/`, `?`, `#`, `[`, or `]`, URL-encode those characters. For example `Pass#2026!` becomes `Pass%232026!`.

Set a new, long `JWT_SECRET`; never upload the local `.env` file. Keep `TELEPHONY_PROVIDER=mock` until the Hostinger server is confirmed to reach the Asterisk AMI endpoint. Shared hosting may block outbound port `5038`, so verify this with Hostinger before switching to `asterisk`.

The included local `backend/.env` continues to work because `FRONTEND_URL` remains supported. New setup should use `FRONTEND_URLS`.

## 3. Build and upload the frontend

On the development computer:

```powershell
Copy-Item frontend/.env.production.example frontend/.env.production
npm run build:frontend
```

Upload the **contents** of `frontend/dist/` to Hostinger `public_html/` for `talkingwave.tech`. The build includes `.htaccess`, which makes direct refreshes of React routes such as `/dashboard` work.

The build-time production values are:

```env
VITE_API_BASE_URL=https://api.talkingwave.tech/api
VITE_SOCKET_URL=https://api.talkingwave.tech
```

For local development, do not create `frontend/.env.production`; start the project normally with `npm run dev`. Vite will continue to proxy `/api` and `/socket.io` to `http://localhost:5000`.

## 4. Deploy the backend Node.js application

1. In hPanel create a Node.js application for `api.talkingwave.tech`.
2. Use Node.js **20 LTS or newer**, production mode, and set the startup file to `app.js`.
3. Upload the `backend/` directory to the Node application's root, including `src/`, `prisma/`, `package.json`, `package-lock.json`, and `app.js`. Put the completed `.env` in that same directory.
4. In Hostinger Terminal, from the backend application root, run:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
```

5. Start or restart the application from hPanel.

Verify it at `https://api.talkingwave.tech/health`. A successful response is JSON with `success: true`. Then open `https://talkingwave.tech` and sign in.

## 5. Local environment

Create `backend/.env` from [`backend/.env.example`](backend/.env.example), enter the local MySQL password, then run:

```powershell
npm run setup
npm run dev
```

Do not set `VITE_API_BASE_URL` or `VITE_SOCKET_URL` for normal local development. The existing Vite proxy handles both the API and Socket.IO connection.

## Deployment checklist

- `https://talkingwave.tech` has a valid SSL certificate.
- `https://api.talkingwave.tech/health` returns HTTP 200.
- Hostinger database details have replaced every `HOSTINGER_*` placeholder.
- `JWT_SECRET` and Asterisk password are unique production values.
- `TELEPHONY_PROVIDER=asterisk` is enabled only after the AMI network connection succeeds.
