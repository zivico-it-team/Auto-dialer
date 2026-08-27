# Talking Wave — SIP Call Center & Intelligent Auto-Dialer Platform

Talking Wave is a complete, production-grade web-based Call Center and SIP Auto-Dialer platform. It connects campaign management, lead sequencing, concurrency-throttled queue dispatching, Asterisk AMI telephony abstraction (with real-time Asterisk AMI and faithful dev/test Mock providers), supervisor telemetry monitoring, and a modern agent softphone workspace.

---

## 🌟 Key Features

- **Sequential Auto-Dialer Engine**: Back-to-back automatic calling pipeline with concurrency gating and duplicate prevention.
- **Asterisk AMI & Zoiper Integration**: Clean `ITelephonyProvider` abstraction supporting live Asterisk PBX AMI originate/bridge controls and Zoiper SIP endpoints.
- **Development Mock Telephony Provider**: Full offline simulation of dialing, ringing, answered, busy, and no-answer states for zero-dependency testing.
- **Supervisor Live Monitor**: Real-time agent status matrix, active call duration timers, and live channel telemetry via Socket.IO.
- **Agent Softphone Workspace**: Real-time call alerts, active call timer, lead contact viewer, disposition dropdown, call notes, and callback scheduler.
- **Campaign Rules & Compliance**: Calling hours enforcement across timezones, max retry limits, retry delay intervals, and automatic Do Not Call (DNC) exclusion.
- **Lead Management**: Advanced lead search, server-side pagination, batch CSV import with duplicate scrubbing, manual creation, and CSV export.
- **Reports & Visual Analytics**: Interactive Recharts graphs showing hourly call distribution, answer rates, agent productivity, and CSV reporting.
- **Secure Call Recordings**: Gated audio streaming endpoint ensuring role-based access control.
- **Emergency STOP Mechanism**: Immediate global halt of all active dialing loops with audit tracking.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts, Axios, Socket.IO Client |
| **Backend** | Node.js, Express, TypeScript, Prisma ORM, Socket.IO, JWT, Bcrypt, Zod, Helmet, Rate Limiter |
| **Database** | SQLite (zero-config local dev) / MySQL 8.0 (production ready) |
| **Telephony** | Asterisk PBX 18/20, AMI Protocol, SIP / PJSIP, Zoiper Softphone |
| **Testing** | Vitest Test Suite |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js v20+ / v22+
- npm v10+

### 2. Setup & Database Seeding
From the root workspace directory:

```bash
# Setup backend dependencies & push database schema
cd backend
npm install
npx prisma db push
npx tsx prisma/seed.ts

# Setup frontend dependencies
cd ../frontend
npm install
```

### 3. Run Development Servers

**Backend (API & Dialer Engine on port 5000):**
```bash
cd backend
npm run dev
```

**Frontend (Vite Dashboard on port 5173):**
```bash
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 🔑 Default Demo Accounts

| Role | Email | Password | Assigned Extension |
|---|---|---|---|
| **Admin** | `admin@callcenter.io` | `Password123!` | Management |
| **Supervisor** | `supervisor@callcenter.io` | `Password123!` | Monitoring |
| **Agent 1** | `agent1@callcenter.io` | `Password123!` | `101` (Zoiper) |
| **Agent 2** | `agent2@callcenter.io` | `Password123!` | `102` (Zoiper) |

---

## 📞 Telephony Modes

Switch telephony modes in `backend/.env`:

```env
# Mode 1: Simulated PBX for local development & testing
TELEPHONY_PROVIDER=mock

# Mode 2: Real Asterisk PBX Server
TELEPHONY_PROVIDER=asterisk
ASTERISK_HOST=127.0.0.1
ASTERISK_PORT=5038
ASTERISK_USERNAME=admin
ASTERISK_PASSWORD=your_ami_password
ASTERISK_CALL_CONTEXT=from-internal
ASTERISK_OUTBOUND_TRUNK=SIP/trunk_provider
```

---

## 🧪 Testing & Build Verification

```bash
# Run backend test suite (13 unit & integration tests)
cd backend
npm test

# Build backend for production
npm run build

# Build frontend for production
cd ../frontend
npm run build
```

---

## 📚 Documentation Index

- [Architecture & Concurrency Design](docs/architecture.md)
- [Database Schema & Models](docs/database.md)
- [REST API Reference](docs/api.md)
- [Asterisk & Zoiper Integration Guide](docs/asterisk.md)
- [Production Deployment (Ubuntu + Nginx + PM2)](docs/deployment.md)
- [Security & Compliance](docs/security.md)
- [Troubleshooting Guide](docs/troubleshooting.md)
