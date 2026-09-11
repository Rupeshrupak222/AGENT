# Operations Runbook — Adyapan AI / AgentCall AI

This runbook provides actionable, production-grade operating procedures and incident diagnostics for site reliability engineers (SREs), system operators, and developers maintaining the **AgentCall AI** production platform.

---

## 1. Application Startup

The AgentCall AI platform consists of a NestJS backend (API, WebSockets, Queue Processors) and a Next.js 14 frontend.

### Production Startup Sequence

1. **Pre-flight Check**:
   - Ensure PostgreSQL 15+ is running and healthy.
   - Ensure Redis 7+ is running and accessible (required for BullMQ queue durability).
   - Validate environment variables (see Section 10).
2. **Apply Database Migrations**:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
3. **Start the Backend Application**:
   ```bash
   cd backend
   # In production container or process manager (PM2/systemd)
   node dist/main.js
   ```
   *Expected stdout*: `[NestApplication] Nest application successfully started on port 3001`
4. **Start the Frontend Service**:
   ```bash
   cd frontend
   npm run start # runs next start on port 3000
   ```
5. **Verify Health**:
   ```bash
   curl -i http://localhost:3001/health/live
   curl -i http://localhost:3001/health/ready
   ```

---

## 2. Database Migration

The database schema is managed through Prisma.

### Safe Migration Deployment
- Migrations are strictly forward-only:
  ```bash
  cd backend
  npx prisma migrate deploy
  ```
- **Zero Downtime Rule**:
  - Never alter or drop existing active columns in a single release.
  - Apply new nullable/defaulted columns first, deploy application code, then clean up deprecated columns in a subsequent release.
- **Validation**:
  ```bash
  npx prisma validate
  ```
- **Rollback Consideration**: If a migration fails midway:
  1. Inspect `_prisma_migrations` table for the failing migration row.
  2. If the migration was rolled back by the database engine, resolve the schema conflict and re-apply.
  3. Never run `prisma migrate reset` in staging or production.

---

## 3. Redis Requirements

Redis is critical for background workers, queue durability, and rate-limiting storage:
- **Engine**: Redis 7.0+ (standalone or AWS ElastiCache / Redis Cluster).
- **Queues managed**:
  1. `post-call-analysis` (AI transcript summarization, sentiment, CRM sync trigger)
  2. `crm-sync` (HubSpot, Salesforce, webhook outbound sync)
  3. `outbound-calls` (AI telephonic dialing and agent assignment)
  4. `recording-processing` (audio transcription & S3 audio upload)
  5. `automation-actions` (WhatsApp, Email/Resend, SMS outbound triggers)
  6. `appointment-reminders` (24h and 1h scheduled notifications)
- **Persistence Settings**:
  - Configure `appendonly yes` and `appendfsync everysec` to prevent scheduled reminder loss across Redis restarts.
- **Failover Behavior**:
  - If Redis is disconnected, `HealthService.getReadiness()` marks readiness as `false` with `status: degraded`.
  - In-memory fallbacks exist solely for development/offline testing; production mandates Redis.

---

## 4. Worker Startup & Architecture

All queue workers run as NestJS Bull consumers within the application process (or dedicated worker nodes when deployed separately):
- `PostCallProcessor` (`post-call-analysis`)
- `CrmSyncProcessor` (`crm-sync`)
- `OutboundCallProcessor` (`outbound-calls`)
- `RecordingProcessor` (`recording-processing`)
- `AutomationActionProcessor` (`automation-actions`)
- `AppointmentReminderQueueService` (`appointment-reminders`)

To run dedicated background worker containers without HTTP ingress:
- In production, set `WORKER_MODE=true` or start the application with a dedicated worker module entry point.

---

## 5. Health Checks & Diagnostics

| Endpoint | Method | Auth Required | Purpose | Behavior |
| :--- | :---: | :---: | :--- | :--- |
| `/health/live` | `GET` | No | Process Liveness (Kubernetes liveness probe) | Returns `200 OK` as long as the Node.js event loop responds. Does not fail if downstream DB or Redis is temporarily down. |
| `/health/ready` | `GET` | No | Traffic Readiness (Kubernetes readiness probe) | Returns `200 OK` when PostgreSQL and Redis are connected. Returns `503 Service Unavailable` if core DB/Redis is degraded. External providers (Cal.com, WhatsApp, Resend) are reported separately and do not fail readiness. |
| `/health/diagnostics` | `GET` | Admin JWT | Operational Diagnostics | Reports memory usage, queue depths for all 6 queues, provider status, and aggregate HTTP/business metrics. Zero secrets exposed. |

---

## 6. Incident Diagnostics: Tracing Failures End-to-End

When a customer or monitoring alert reports an incident, trace it using the standardized correlation pipeline:

```text
Customer Report (Email / Phone / Appointment ID)
      │
      ▼
1. Query Database for Appointment / Lead / Call:
   SELECT * FROM "Appointment" WHERE id = '<appointmentId>' OR "externalBookingId" = '<calcomId>';
      │
      ▼
2. Extract Correlation ID:
   x-request-id / correlationId in logs or Appointment metadata
      │
      ▼
3. Query Structured Logs (Datadog / CloudWatch / Kibana):
   filter: correlationId = "<correlationId>" OR tenantId = "<tenantId>"
      │
      ▼
4. Inspect Automation Execution:
   SELECT * FROM "AutomationLog" WHERE "entityId" = '<appointmentId>' ORDER BY "createdAt" DESC;
   - Status: pending | sent | failed | skipped
   - Check errorMessage for normalized codes (e.g. WHATSAPP_RATE_LIMITED, CALENDAR_UNAVAILABLE)
      │
      ▼
5. Inspect BullMQ Queue Job:
   - Check failed queue jobs in BullMQ dashboard / Redis keys:
     bull:automation-actions:failed
     bull:appointment-reminders:failed
      │
      ▼
6. Examine Provider Response:
   - Provider HTTP status, normalized internal error code, retry count
```

---

## 7. Troubleshooting Failed Automations

### Symptom: WhatsApp or Email not received by customer
1. **Check Automation Rule Status**:
   - Verify that the automation rule is `active: true` for the tenant.
   - Verify trigger matches the event (e.g., `appointment.booked`, `appointment.rescheduled`).
2. **Check DND / Opt-Out Status**:
   - If lead has `isOptedOut: true` or `dnd: true`, the automation engine intentionally drops outbound marketing/reminder messages.
3. **Inspect `AutomationLog`**:
   - Look up logs for the tenant and entity:
     ```sql
     SELECT id, status, "errorMessage", "executionTimeMs", "createdAt" 
     FROM "AutomationLog" 
     WHERE "tenantId" = '<tenantId>' 
     ORDER BY "createdAt" DESC LIMIT 20;
     ```
4. **Normalized Error Codes**:
   - `WHATSAPP_AUTH_FAILED`: Meta system user token expired or lacks `whatsapp_business_messaging` permission.
   - `WHATSAPP_RATE_LIMITED`: Meta 24-hour service messaging tier limit reached. Worker will automatically retry with exponential backoff.
   - `EMAIL_AUTH_FAILED`: Resend API key revoked or domain unverified.
   - `EMAIL_RATE_LIMITED`: Resend requests/sec exceeded.

---

## 8. Troubleshooting Failed Appointments & Cal.com

### Symptom: Booking fails or slot conflict
1. **Error Code `409 Conflict` (`SLOT_UNAVAILABLE`)**:
   - Cal.com slot has already been reserved by another attendee. UI prompts user to choose another time slot.
2. **Timeout during Provider Booking (`createBooking`)**:
   - If Cal.com API times out after accepting booking, the system does not blindly retry `createBooking` (which causes double-booking).
   - Recovery procedure: Check Cal.com booking list for the tenant/attendee email to verify if `externalBookingId` was assigned before re-attempting.
3. **SSRF Rejection**:
   - If an integration apiUrl is configured with localhost, private subnet (`10.x.x.x`, `192.168.x.x`, `169.254.169.254`), or non-allowlisted host, the request is immediately rejected with `400 Bad Request: Invalid or disallowed calendar API URL`.
   - Allowed hosts: `api.cal.com`, `app.cal.com`, or approved custom enterprise domains.

---

## 9. Provider Setup & Configuration

### Cal.com Configuration
- **Global / Tenant Settings**:
  - `CALCOM_API_KEY`: API Key generated from Cal.com Settings -> Developer -> API Keys.
  - `CALCOM_EVENT_TYPE_ID`: Numeric ID of the event type used for scheduling.
  - `CALCOM_API_URL`: Default `https://api.cal.com/v1`.
  - `CALCOM_TIMEZONE`: Default business timezone (e.g., `UTC`, `America/New_York`).
- **Webhook Configuration**:
  - URL: `https://<api-domain>/calendar/webhook`
  - Events: `BOOKING_CREATED`, `BOOKING_RESCHEDULED`, `BOOKING_CANCELLED`
  - Secret: Set `CALCOM_WEBHOOK_SECRET` for HMAC signature verification.

### WhatsApp (Meta Cloud API) Configuration
- `WHATSAPP_ACCESS_TOKEN`: Permanent System User access token.
- `WHATSAPP_PHONE_NUMBER_ID`: 15-digit Phone Number ID from Meta Developer Console.
- `WHATSAPP_WEBHOOK_SECRET`: Verify token for inbound webhook handshake.

### Email (Resend) Configuration
- `RESEND_API_KEY`: API Key starting with `re_`.
- `FROM_EMAIL`: Must be sent from a verified domain in Resend (e.g., `notifications@agentcall.ai`).

---

## 10. Environment Variables Audit & Classification

| Variable | Classification | Description | Secret? |
| :--- | :---: | :--- | :---: |
| `DATABASE_URL` | **Required** | PostgreSQL connection string | Yes |
| `REDIS_HOST` / `REDIS_PORT` | **Required** | Redis connectivity for queues | No |
| `JWT_SECRET` | **Required** | Symmetric signing key for auth tokens | **CRITICAL** |
| `PORT` | Optional (default: 3001) | HTTP listener port | No |
| `FRONTEND_URL` | Optional (default: localhost:3000) | Allowed CORS origin | No |
| `CALCOM_API_KEY` | Provider-Specific | Cal.com API Key | Yes |
| `CALCOM_EVENT_TYPE_ID` | Provider-Specific | Cal.com Event Type ID | No |
| `CALCOM_API_URL` | Provider-Specific | Default https://api.cal.com/v1 | No |
| `RESEND_API_KEY` | Provider-Specific | Email provider API Key | Yes |
| `WHATSAPP_ACCESS_TOKEN` | Provider-Specific | Meta WhatsApp API token | Yes |
| `WHATSAPP_PHONE_NUMBER_ID` | Provider-Specific | Meta Phone Number ID | No |
| `TWILIO_ACCOUNT_SID` | Provider-Specific | Telephony SID | No |
| `TWILIO_AUTH_TOKEN` | Provider-Specific | Telephony Auth Token | Yes |
| `DEEPGRAM_API_KEY` | Provider-Specific | Speech-to-Text STT key | Yes |
| `GROQ_API_KEY` | Provider-Specific | LLM conversation inference key | Yes |

*Note: In development and test environments, missing provider credentials trigger graceful degradation and offline mock fallbacks.*

---

## 11. Queue Failure Recovery & Restart Procedure

### Graceful Restart
1. Send `SIGTERM` to the process.
2. NestJS lifecycle hooks (`onApplicationShutdown`) complete currently active BullMQ jobs (timeout: 10s) before terminating the process.
3. Upon restart, BullMQ scans for delayed jobs and stalled jobs, automatically restoring them.

### Stalled Job Handling
- BullMQ automatically re-queues stalled jobs up to `attempts: 3` with exponential backoff (`delay: 1000 * 2^attempt`).
- If a job exhausts all retries, it moves to the `failed` set.
- To retry failed jobs programmatically:
  ```typescript
  const failedJobs = await queue.getFailed();
  for (const job of failedJobs) {
    await job.retry();
  }
  ```

---

## 12. Secret Rotation Guidance

1. **JWT Secret (`JWT_SECRET`)**:
   - Rotate during maintenance window or implement dual-key validation. Rotating will invalidate existing user sessions, requiring re-login.
2. **Provider Keys (`CALCOM_API_KEY`, `RESEND_API_KEY`, `WHATSAPP_ACCESS_TOKEN`)**:
   - Update in AWS Secrets Manager / Vault / `.env`.
   - Update tenant-level integrations via `/api/integrations` with encrypted storage.
   - Run `/health/diagnostics` to confirm provider connectivity.
   - Logs automatically redact all rotated keys; verify no plain keys appear in logs.

---

## 13. Database Backup & Disaster Recovery Procedures

### Automated Backup Execution
Automated backups are scheduled daily and triggered automatically before each schema migration:
- **Linux / Container Environment**:
  ```bash
  ./scripts/backup-db.sh
  ```
- **Windows PowerShell Environment**:
  ```powershell
  .\scripts\backup-db.ps1 -BackupDir ./backups
  ```
- **Retention Policy**: Retains dumps for 14 days; older dumps are automatically purged.

### Database Restore Execution
To restore the database in a recovery or staging environment:
1. Confirm the target database is ready:
   ```bash
   ./scripts/restore-db.sh /backups/agentcall_backup_YYYYMMDD_HHMMSS.dump
   ```
2. Validate database schema integrity:
   ```bash
   npx prisma validate --schema=../db/schema.prisma
   ```
3. Verify core database tables:
   - `Tenant`, `User`, `AIAgent`, `Lead`, `Call`, `CallTranscript`, `Campaign`, `AutomationLog`, `Appointment`, `Integration`, `AuditLog`.
4. Execute smoke tests:
   ```bash
   node scripts/smoke-test.js
   ```

---

## 14. Redis Durability & AOF Recovery

- **Production Configuration**:
  Redis must be started with:
  ```bash
  redis-server --appendonly yes --appendfsync everysec --maxmemory 512mb --maxmemory-policy noeviction
  ```
- **Why this matters**:
  Without `appendonly yes`, delayed reminder jobs (`24h` and `1h` appointment notifications) stored in Redis BullMQ queues would be lost during an ungraceful Redis restart or crash.
- **Recovery on Redis Failover**:
  1. When Redis reconnects, BullMQ listeners automatically reconnect without process restart.
  2. In-flight jobs are recovered from the AOF persistence log.
  3. `HealthService.getReadiness()` automatically transitions from `degraded` back to `healthy`.

---

## 15. Prometheus Metrics Scraping & Monitoring

The platform exposes standard Prometheus exposition format metrics at:
```text
GET http://<host>:3001/health/metrics
Content-Type: text/plain; version=0.0.4; charset=utf-8
```

### Recommended Prometheus Scrape Config
```yaml
scrape_configs:
  - job_name: 'agentcall-backend'
    scrape_interval: 15s
    metrics_path: '/health/metrics'
    static_configs:
      - targets: ['backend:3001']
```

### Key Alerting Rules
1. **High HTTP 5xx Rate**: `rate(agentcall_http_requests_status_5xx[5m]) > 0.05`
2. **Calendar Booking Failures**: `increase(agentcall_calendar_booking_failed[15m]) > 5`
3. **WhatsApp Rate Limiting**: `rate(agentcall_whatsapp_rate_limited[10m]) > 0`
4. **Queue Growth**: `agentcall_queue_waiting > 100`

---

## 16. WebSocket Operations & Reconnection

- **Namespace**: `/calls`
- **Authentication**: Handshake bearer JWT or `query.token`.
- **Tenant Isolation**: Every socket automatically joins `tenant:<tenantId>`. Broadcasts across campaigns, calls, and appointments are strictly scoped by tenant. Cross-tenant join attempts trigger immediate rejection and an `AuditLog` entry.
- **Reconnect Behavior**: The frontend singleton `realtimeSocket` maintains active room state and automatically emits `join:campaign`, `join:call`, and `join:appointments` upon reconnection without requiring page reload.

---

## 17. Incident Escalation Protocol

| Severity | Condition | Immediate Action | Escalation Target |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | Core DB or Redis offline; 100% API failure | 1. Check container health<br>2. Failover to standby DB/Redis<br>3. Inspect `/health/ready` | Platform SRE On-Call (immediate) |
| **SEV-2 (Major)** | Cal.com, Meta WhatsApp, or Twilio down; bookings/calls degraded | 1. Verify provider status<br>2. Ensure mock/fallback mode active<br>3. Check rate limits | Integration Lead (15 min) |
| **SEV-3 (Minor)** | Isolated worker job failure or queue delay | 1. Inspect BullMQ failed jobs<br>2. Trigger retry of failed jobs | Application Engineer (1 hour) |
