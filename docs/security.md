# Security Hardening & Regulatory Compliance

NexusDial is engineered strictly for legitimate consented outbound communications and enterprise call center operations.

---

## 1. Do Not Call (DNC) & Opt-Out Compliance

- **Permanent Opt-Out**: When a lead requests not to be contacted or is flagged as DNC, their record is tagged `optedOut = true` and `status = 'DO_NOT_CALL'`.
- **Pre-Dial Safety Guard**: The `SafetyGuard` module checks every lead record before initiating an AMI call. DNC numbers cannot be dialed by any automated loop.
- **CSV Scrubbing**: Batch CSV import processes check each incoming phone number against existing database DNC lists and skips duplicates.

---

## 2. Calling Hours & Schedule Protection

- Every campaign specifies `callingStartTime`, `callingEndTime`, and a target `timezone` (e.g. 09:00 - 18:00 EST).
- The dialer engine continuously evaluates the local clock in the campaign's timezone.
- Calls outside permitted hours are skipped until the next business window.

---

## 3. Concurrency Limits & DDoS Prevention

- **Campaign Concurrency**: Throttles concurrent calls per campaign to prevent carrier over-saturation.
- **Global Concurrency Gate**: Hard global limit on simultaneous active telephony sessions.
- **API Rate Limiting**: Express rate limiting protects auth endpoints against brute force attacks.
- **Helmet**: Secures HTTP response headers.

---

## 4. Call Recording Access Control

- Audio recordings are saved in a protected filesystem directory (`RECORDING_STORAGE_PATH`) and never directly exposed through static public URLs.
- Streaming is gated by the authenticated endpoint `/api/calls/:id/recording`, which validates user session tokens and role permissions before serving audio streams.
- Campaigns include a configurable `recordCalls` flag to comply with two-party consent laws.

---

## 5. Security Audit Logging

All administrative and supervisor actions are permanently recorded in the `AuditLog` table with user identity, timestamp, IP address, and payload details.
