# Talking Wave — Hostinger deployment

The recommended production layout is:

| Service | Public address | Hostinger location |
| --- | --- | --- |
| Node.js API and Socket.IO | `https://talkingwave.tech` | a Hostinger Node.js application |
| React frontend | `https://talk.talkingwave.tech` | Hostinger Web App or `public_html/` |
| MySQL | private Hostinger database host | Hostinger MySQL |

The frontend and backend use separate hostnames, which avoids requiring custom Apache/Nginx reverse-proxy rules on Hostinger.

## 1. Before deployment

1. Confirm the Hosting plan includes **Node.js applications** and supports WebSockets. If it does not, the React site can stay on Hostinger but the API must be hosted on a Node host or VPS.
2. Point `talkingwave.tech` to the Hostinger website.
3. In hPanel, attach `talk.talkingwave.tech` to the frontend Web App and enable SSL for both domains.
4. In **Databases → MySQL Databases**, create a database and a database user. Copy the *exact* database name, username, password, and host displayed by hPanel. Hostinger commonly prefixes database names and usernames.

## 2. Production environment file

Copy [`backend/.env.production.example`](backend/.env.production.example) to `backend/.env` **on Hostinger**, then fill `DATABASE_URL` using the details from hPanel:

```env
DATABASE_URL="mysql://u123456789_user:URL_ENCODED_PASSWORD@localhost:3306/u123456789_talkingwave"
```

If the password contains `@`, `:`, `/`, `?`, `#`, `[`, or `]`, URL-encode those characters. For example `Pass#2026!` becomes `Pass%232026!`.

Set a new, long `JWT_SECRET`; never upload the local `.env` file. Keep `TELEPHONY_PROVIDER=mock` until the Hostinger server is confirmed to reach the Asterisk AMI endpoint. Shared hosting may block outbound port `5038`, so verify this with Hostinger before switching to `asterisk`.

Set `PORT=3000` for the Hostinger Node.js Web App; its proxy expects the application on that port.

The included local `backend/.env` continues to work because `FRONTEND_URL` remains supported. New setup should use `FRONTEND_URLS`.

## 3. Build and upload the frontend

On the development computer:

```powershell
Copy-Item frontend/.env.production.example frontend/.env.production
npm run build:frontend
```

Upload the **contents** of `frontend/dist/` to Hostinger `public_html/` for `talk.talkingwave.tech`, or deploy it as a Vite Web App with root directory `frontend` and output directory `dist`. The build includes `.htaccess`, which makes direct refreshes of React routes such as `/dashboard` work.

The build-time production values are:

```env
VITE_API_BASE_URL=https://talkingwave.tech/api
VITE_SOCKET_URL=https://talkingwave.tech
```

For local development, do not create `frontend/.env.production`; start the project normally with `npm run dev`. Vite will continue to proxy `/api` and `/socket.io` to `http://localhost:5000`.

## 4. Deploy the backend Node.js application

1. In hPanel create a Node.js application for `talkingwave.tech` with root directory `backend`.
2. Use Node.js **20 LTS or newer**, production mode, and set the entry file to `app.js`. The backend `postinstall` script generates Prisma client code and compiles `src/server.ts` to `dist/server.js` automatically during Hostinger's dependency installation.
3. Upload the `backend/` directory to the Node application's root, including `src/`, `prisma/`, `package.json`, `package-lock.json`, and `app.js`. Put the completed `.env` in that same directory.
4. In Hostinger Terminal, from the backend application root, run:

```bash
npm ci
npx prisma generate
npx prisma db push
npm run build
```

5. Start or restart the application from hPanel.

Verify it at `https://talkingwave.tech/health`. A successful response is JSON with `success: true`. Then open `https://talk.talkingwave.tech` and sign in.

## 5. Local environment

Create `backend/.env` from [`backend/.env.example`](backend/.env.example), enter the local MySQL password, then run:

```powershell
npm run setup
npm run dev
```

Do not set `VITE_API_BASE_URL` or `VITE_SOCKET_URL` for normal local development. The existing Vite proxy handles both the API and Socket.IO connection.

## Deployment checklist

- `https://talkingwave.tech` and `https://talk.talkingwave.tech` have valid SSL certificates.
- `https://talkingwave.tech/health` returns HTTP 200.
- Hostinger database details have replaced every `HOSTINGER_*` placeholder.
- `JWT_SECRET` and Asterisk password are unique production values.
- `TELEPHONY_PROVIDER=asterisk` is enabled only after the AMI network connection succeeds.
