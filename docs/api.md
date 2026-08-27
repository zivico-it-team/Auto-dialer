# REST API Reference

All requests must include `Authorization: Bearer <token>` unless targeting public authentication routes.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
- **Body**: `{ "email": "admin@callcenter.io", "password": "Password123!" }`
- **Response**: `{ "success": true, "data": { "token": "...", "user": { ... } } }`

### `GET /api/auth/me`
- Returns active user profile and assigned SIP extension.

### `POST /api/auth/logout`
- Logs out session and sets agent presence to `OFFLINE`.

---

## 2. Campaigns (`/api/campaigns`)

### `GET /api/campaigns`
- Returns all campaigns with lead counts, active call counters, and progress percentage.

### `POST /api/campaigns`
- **Body**:
  ```json
  {
    "name": "Outbound Lead Gen 2026",
    "description": "High-intent lead qualification",
    "maxConcurrentCalls": 5,
    "retryLimit": 3,
    "retryDelaySeconds": 1800,
    "callingStartTime": "09:00",
    "callingEndTime": "18:00",
    "timezone": "America/New_York",
    "recordCalls": true
  }
  ```

### `POST /api/campaigns/:id/start`
- Starts background auto-dialer for this campaign.

### `POST /api/campaigns/:id/pause`
- Pauses campaign dialing loop.

### `POST /api/campaigns/emergency-stop`
- **Emergency STOP**: Instantly pauses all active campaigns.

---

## 3. Leads (`/api/leads`)

### `GET /api/leads`
- Query Params: `page`, `limit`, `search`, `campaignId`, `status`, `optedOut`.

### `POST /api/leads`
- Validates and creates a new lead with E.164 phone normalization.

### `POST /api/leads/import-csv`
- Multipart form upload (`file` or `csvContent`) + `campaignId`.
- Automatically scrubs duplicates and invalid numbers.

### `POST /api/leads/:id/dnc`
- Marks lead as `DO_NOT_CALL` and permanently sets `optedOut = true`.

---

## 4. Calls & Recordings (`/api/calls`)

### `GET /api/calls`
- Returns paginated call logs with duration, agent, and disposition.

### `GET /api/calls/:id/recording`
- Secure, access-controlled audio streaming endpoint for call playback.

### `PUT /api/calls/:id/disposition`
- **Body**: `{ "disposition": "Interested", "notes": "Customer agreed to demo next Tuesday" }`

---

## 5. Live Monitoring (`/api/monitoring`)

### `GET /api/monitoring/live`
- Returns real-time supervisor snapshot of agent presence, active calls, and channel statuses.

---

## 6. Reports (`/api/reports`)

### `GET /api/reports/summary`
- Returns aggregated metrics (Total calls, Answer Rate %, Avg Duration, Hourly traffic distribution).

### `GET /api/reports/export-csv`
- Streams full downloadable CSV report.
