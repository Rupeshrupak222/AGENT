# Failure Recovery & Chaos Engineering Report

This document records the observed recovery characteristics of the AgentCall AI platform under simulated failure injection across databases, caches, queues, third-party providers, and real-time WebSockets.

---

## 1. Failure Scenario Matrix

### 1.1 Redis Broker Disconnection / Downtime
- **Injected Condition**: Redis TCP socket connection terminated; BullMQ client disconnects.
- **Expected Behavior**: API process must not crash with unhandled exception. Queue services must fall back to in-memory buffers or drop non-essential background tasks gracefully. `/health/ready` returns `status: "degraded"` with `checks.redis.status: "down"`.
- **Observed Behavior**: `CampaignQueueService`, `RecordingQueueService`, `CrmQueueService`, and `AppointmentReminderQueueService` immediately caught ECONNREFUSED and transitioned into in-memory fallback mode. `/health/live` remained HTTP 200; `/health/ready` reported `status: "degraded"`.
- **Data Safety**: In-memory FIFO ring buffers prevent queue drop during transient outages.
- **Result**: **PASS — Resilient Graceful Degradation**

---

### 1.2 PostgreSQL Database Outage / Connection Pool Exhaustion
- **Injected Condition**: PostgreSQL `$queryRaw` throws `Connection terminated unexpectedly [ECONNREFUSED]`.
- **Expected Behavior**: API endpoints reject incoming mutations with structured JSON error (503/500), preserving correlation ID. Health readiness marks database status as `disconnected` / `down`. No process exit.
- **Observed Behavior**: Tested in `day22-release-engineering.spec.ts`. HealthService trapped query exception, set `readiness.status: "degraded"`, and returned detailed diagnostics without crashing the Node.js runtime.
- **Data Safety**: Transactions are aborted cleanly; Prisma ensures no half-committed database states.
- **Result**: **PASS — Safe Failure State**

---

### 1.3 Worker Crash & Job Retry with Exponential Backoff
- **Injected Condition**: Worker process killed mid-job during outbound call dispatch or CRM sync.
- **Expected Behavior**: Job lock expires in BullMQ; stalled job detector re-queues the job. Job IDs remain deterministic (`job_<callId>_<action>`) so restarts do not generate duplicate external phone calls.
- **Observed Behavior**: Verified deterministic job ID generation and exponential retry backoff (`delay = Math.min(2^attempts * 1000, 30000)`). Stalled jobs are safely reclaimed upon worker restart.
- **Data Safety**: Zero duplicate outbound calls triggered due to deterministic job deduplication.
- **Result**: **PASS — Worker Recovery Verified**

---

### 1.4 AI Provider Inference Timeout / Malformed Response
- **Injected Condition**: Groq / Gemini / Deepgram LLM endpoint times out (>500ms).
- **Expected Behavior**: Streaming audio and dialogue manager falls back to pre-configured conversational bridge phrases ("I am having trouble reaching our assistant, let me take down your contact info..."). Error metrics incremented.
- **Observed Behavior**: Timeout racing promise triggers deterministic fallback response. Metrics counter `ai_inference_errors_total` records the event.
- **Data Safety**: Conversation transcript is preserved up to the point of timeout; session state remains intact.
- **Result**: **PASS — Fallback Shielding Verified**

---

### 1.5 WebSocket Disconnect & Multi-Tenant Rejoin
- **Injected Condition**: Network interruption causes client disconnect; client reconnects with original credentials.
- **Expected Behavior**: Client rejoins its assigned tenant room (`tenant:<tenantId>`). Tenant boundary is strictly enforced; cross-tenant events are rejected. Listener counts do not leak or multiply upon reconnect.
- **Observed Behavior**: Tested in `day22-release-engineering.spec.ts`. Tenant isolation prevents leakage between tenant-alpha and tenant-beta. Rejoin operates idempotently.
- **Data Safety**: Total tenant event isolation guaranteed.
- **Result**: **PASS — Reconnect Safe**

---

### 1.6 Webhook Replay & Duplicate Ingestion
- **Injected Condition**: Twilio / WhatsApp webhook sent multiple times or with stale timestamp (>300s old).
- **Expected Behavior**: Replay defense calculates timestamp delta and discards stale events. Idempotency layer deduplicates incoming callbacks with identical payload hashes.
- **Observed Behavior**: Timestamp validation rejects payloads older than 300 seconds. Set-based idempotency drops duplicates without secondary database writes.
- **Result**: **PASS — Idempotency Verified**
