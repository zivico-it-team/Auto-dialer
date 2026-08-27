# Database Architecture & Entity Models

NexusDial utilizes Prisma ORM with SQLite for zero-dependency local development and direct MySQL compatibility in production.

---

## 1. Entity Relationship Overview

```
User (ADMIN, SUPERVISOR, AGENT)
  └── 1:1 ── AgentProfile (sipExtension, status: AVAILABLE | ON_CALL | PAUSED | OFFLINE)
  └── 1:N ── Assigned Calls
  └── 1:N ── AuditLogs
  └── 1:N ── Callbacks

Campaign (RUNNING, READY, PAUSED, COMPLETED, STOPPED)
  └── 1:N ── Leads
  └── 1:N ── Calls
  └── 1:N ── Callbacks

Lead (NEW, QUEUED, CONTACTED, ANSWERED, NO_ANSWER, BUSY, FAILED, CALLBACK, COMPLETED, DO_NOT_CALL)
  └── 1:N ── Calls
  └── 1:N ── Callbacks
```

---

## 2. Core Tables

### `User`
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `name` | String | User's full name |
| `email` | String | Unique email address |
| `passwordHash` | String | Bcrypt hash |
| `role` | String | `ADMIN`, `SUPERVISOR`, `AGENT` |
| `status` | String | `ACTIVE`, `INACTIVE`, `SUSPENDED` |

### `AgentProfile`
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `userId` | String | Foreign Key to `User` |
| `sipExtension` | String | Unique SIP Extension (e.g. 101, 102) |
| `status` | String | `OFFLINE`, `AVAILABLE`, `RINGING`, `ON_CALL`, `PAUSED`, `BREAK` |
| `lastSeenAt` | DateTime | Last heartbeat timestamp |

### `Campaign`
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `name` | String | Campaign title |
| `status` | String | `DRAFT`, `READY`, `RUNNING`, `PAUSED`, `COMPLETED`, `STOPPED` |
| `maxConcurrentCalls` | Int | Concurrency throttle |
| `retryLimit` | Int | Max retry attempts per lead |
| `retryDelaySeconds` | Int | Delay between retries (seconds) |
| `callingStartTime` | String | e.g. "09:00" |
| `callingEndTime` | String | e.g. "18:00" |
| `timezone` | String | e.g. "America/New_York", "UTC" |
| `recordCalls` | Boolean | Legal recording flag |

### `Lead`
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `campaignId` | String | Foreign Key to `Campaign` |
| `name` | String | Lead contact name |
| `phone` | String | Clean normalized phone number (E.164) |
| `status` | String | Lead state (`NEW`, `QUEUED`, `ANSWERED`, etc.) |
| `attempts` | Int | Current retry attempt count |
| `nextAttemptAt` | DateTime | Schedule for next dial attempt |
| `optedOut` | Boolean | True if opted out or DNC |

### `Call`
| Field | Type | Description |
|---|---|---|
| `id` | String (UUID) | Primary Key |
| `callId` | String | Unique telephony session identifier |
| `leadId` | String | Foreign Key to `Lead` |
| `campaignId` | String | Foreign Key to `Campaign` |
| `agentId` | String | Foreign Key to `User` (Agent) |
| `status` | String | `QUEUED`, `DIALING`, `RINGING`, `ANSWERED`, `NO_ANSWER`, `BUSY`, `FAILED`, `ENDED` |
| `durationSeconds` | Int | Total talk/session duration |
| `disposition` | String | `Interested`, `Callback`, `Do Not Call`, etc. |
| `recordingUrl` | String | Secure audio streaming endpoint |

---

## 3. Migration Instructions

To deploy migrations to production MySQL:
1. Update `backend/.env`:
   ```env
   DATABASE_URL="mysql://callcenter_user:secret_pass@localhost:3306/callcenter_prod"
   ```
2. Update datasource provider in `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "mysql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run safe migration push:
   ```bash
   npx prisma db push
   ```
