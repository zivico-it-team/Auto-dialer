# 🚀 Talking Wave — Hostinger hPanel Deployment Guide (MySQL Edition)

This guide provides step-by-step instructions for deploying the **Talking Wave Auto Dialer & Multilingual QA Platform** to **Hostinger Web Hosting (hPanel)** with **MySQL Database**.

---

## 📁 1. Architecture Overview on Hostinger

| Component | Local Directory | Hostinger Destination | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend (React UI)** | `frontend/dist/` | `/public_html/` | Fast static single-page app with `.htaccess` rewrite rules. |
| **Backend (Node.js API)** | `backend/` | `/home/uXXXXX/backend` or `/home/uXXXXX/api` | Node.js Express server + WebSocket Socket.io server. |
| **Database (MySQL)** | Hostinger MySQL | Hostinger hPanel ➔ Databases | High-performance relational database. |

---

## 🛠️ 2. Step-by-Step Deployment Instructions

### Step 1: Create MySQL Database in Hostinger hPanel
1. Open your [Hostinger hPanel](https://hpanel.hostinger.com/).
2. Go to **Databases ➔ Management ➔ Create a New MySQL Database**:
   - **Database Name**: e.g., `u123456789_dialer`
   - **MySQL Username**: e.g., `u123456789_admin`
   - **Password**: Create a strong password (e.g. `TalkingWave2026!#`)
3. Click **Create**. Note down the Database Name, User, and Password.

---

### Step 2: Upload Frontend Files to `public_html`
1. Go to **Websites ➔ Manage ➔ File Manager**.
2. Navigate into **`public_html/`**.
3. Upload all files from your local `frontend/dist/` directory:
   - `index.html`
   - `.htaccess`
   - `logo.png`
   - `assets/` (Folder containing compiled JS & CSS)

> [!NOTE]
> The included `.htaccess` file automatically configures React Router so refreshing `/qa-portal`, `/campaigns`, or `/agents` works cleanly without 404 errors.

---

### Step 3: Set Up Backend Node.js App on Hostinger
1. In hPanel, search for **Node.js** (Under *Websites* or *Advanced*).
2. Click **Create Application** (or *Setup Node.js*):
   - **Node.js Version**: Select `18.x` or `20.x`.
   - **Application Root**: e.g., `/home/uXXXXX/backend`.
   - **Application Startup File**: `app.js` (or `dist/server.js`).
   - **Application Mode**: `Production`.
3. Upload the contents of your `backend/` folder:
   - `app.js`
   - `dist/` folder
   - `prisma/` folder
   - `package.json`
   - `.env.production`
4. Rename `.env.production` to `.env` inside the backend directory on Hostinger, and update your MySQL connection:
   ```env
   DATABASE_URL="mysql://u123456789_admin:TalkingWave2026!#@localhost:3306/u123456789_dialer"
   ```
5. In Hostinger Terminal / SSH (or via hPanel Node.js manager):
   - Run `npm install --omit=dev`
   - Run `npx prisma db push` (This creates all MySQL tables automatically)
   - Run `npm run seed` (Seeds initial Admin, Supervisor, QA Auditor, and Agent accounts)
6. Click **Start Application** in hPanel.

---

### Step 4: Default Login Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **System Admin** | `admin@callcenter.io` | `Password123!` |
| **Floor Supervisor** | `supervisor@callcenter.io` | `Password123!` |
| **QA Auditor** | `qa@callcenter.io` | `Password123!` |
| **Agent 101** | `alex@callcenter.io` | `Password123!` |
| **Agent 102** | `sarah@callcenter.io` | `Password123!` |

---

## 🌊 3. ImpactPBX Telephony Connection

Once deployed, visit your **Settings (`/settings`)** page in the browser to view the **Talking Wave ImpactPBX Cloud Engine** status.
* Agents can connect their softphones (Zoiper / MicroSIP) using domain: `talkingwave.impactpbx.com`
* SIP Ports: `5060` (UDP/TCP), `7443` (WebRTC WSS).
