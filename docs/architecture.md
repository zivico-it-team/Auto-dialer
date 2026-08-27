# Telephony & Auto-Dialer System Architecture

## 1. High-Level Architecture

The NexusDial Call Center platform is built on an event-driven decoupled architecture designed for high-concurrency outbound campaigns and real-time agent coordination.

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                         │
│   React 18 + Vite + Tailwind CSS + Lucide + Recharts        │
│   - Agent Workspace (Softphone, Live Timer, Dispositions)  │
│   - Supervisor Live Monitor (Real-time agent presence)      │
│   - Campaign & Lead Management, Visual Analytics            │
└──────────────────────────────▲──────────────────────────────┘
                               │ HTTP / WebSocket (Socket.IO)
┌──────────────────────────────▼──────────────────────────────┐
│                    Backend Core Engine                      │
│   Node.js + Express + TypeScript + Prisma ORM               │
│                                                             │
│   ┌───────────────────┐    ┌───────────────────────────┐    │
│   │ REST API & Auth   │    │  Auto-Dialer Engine       │    │
│   │ JWT, RBAC, Zod    │    │  Queue, Back-to-Back      │    │
│   │ Rate Limiting     │    │  Concurrency, Retry Logic │    │
│   └───────────────────┘    └─────────────▲─────────────┘    │
│                                          │                  │
│   ┌──────────────────────────────────────┴─────────────┐    │
│   │           Telephony Abstraction Layer              │    │
│   │            `ITelephonyProvider`                    │    │
│   │       ├── `AsteriskAmiProvider` (Real PBX)         │    │
│   │       └── `MockTelephonyProvider` (Simulated PBX)  │    │
│   └───────────────────────────▲────────────────────────┘    │
└───────────────────────────────┼─────────────────────────────┘
                                │ AMI / SIP
        ┌───────────────────────┴───────────────────────┐
        │                 Telephony PBX                 │
        │               Asterisk 18 / 20                │
        │       ┌───────────────┴───────────────┐       │
        │       │                               │       │
        ▼       ▼                               ▼       ▼
┌──────────────────┐                    ┌──────────────────┐
│ SIP Trunk Carrier│                    │   Agent Zoiper   │
│ Outbound Dials   │                    │   SIP Extensions │
└──────────────────┘                    └──────────────────┘
```

---

## 2. Telephony Abstraction Layer

Telephony operations are decoupled from business logic using the `ITelephonyProvider` interface:

```typescript
export interface ITelephonyProvider extends EventEmitter {
  name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  dial(options: DialOptions): Promise<DialResult>;
  hangup(callId: string): Promise<boolean>;
  getAgentStatus(extension: string): Promise<AgentSIPStatus>;
  getActiveChannels(): Promise<ActiveChannel[]>;
  isConnected(): boolean;
}
```

### Supported Providers:
1. **`AsteriskAmiProvider`**:
   - Communicates directly with Asterisk over TCP port `5038`.
   - Uses `Action: Originate` with `Async: true` to bridge carriers to agent SIP channels.
   - Listens to Asterisk Events (`OriginateResponse`, `DialBegin`, `BridgeEnter`, `Hangup`, `PeerStatus`).
2. **`MockTelephonyProvider`**:
   - Used for zero-dependency local development, staging tests, and automated CI pipelines.
   - Accurately simulates telephony states with realistic timers and configurable call outcome probabilities.

---

## 3. Auto-Dialer Queue & State Machine

### Sequence Flow:
1. **Tick Check**: Dialer loop examines all `RUNNING` campaigns.
2. **Safety Gates**:
   - Checks if local time is within `callingStartTime` and `callingEndTime` (in campaign's timezone).
   - Verifies active calls count < `campaign.maxConcurrentCalls` and < `GLOBAL_MAX_CONCURRENT_CALLS`.
3. **Agent Matching**: Finds available agent (`status == AVAILABLE`).
4. **Lead Acquisition**: Picks highest-priority lead:
   - `optedOut == false`
   - `status != DO_NOT_CALL`
   - `attempts < campaign.retryLimit`
   - `nextAttemptAt <= now`
5. **Call Origination**: Dispatches dial to `TelephonyService`.
6. **Call Progression**:
   - `QUEUED` ➔ `DIALING` ➔ `RINGING` ➔ `ANSWERED` (agent bridged) ➔ `ENDED`
   - Or `RINGING` ➔ `NO_ANSWER` / `BUSY` / `FAILED`
7. **Back-to-Back Rescheduling**: When a call concludes, next eligible lead is immediately scheduled.
8. **Emergency Stop**: Instant halt switch triggers across all campaigns.
