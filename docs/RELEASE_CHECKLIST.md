# Production Release Checklist — Adyapan AI / AgentCall AI

This checklist must be executed and approved before deploying any release to staging or production.

---

## 1. Pre-Flight Code Quality Gate

- [ ] **Working Tree Clean**: `git status --short` shows no uncommitted files or unmerged conflict markers.
- [ ] **Sequential Migrations**: All Prisma migrations under `db/migrations` are strictly sequential, forward-only, and non-destructive.
- [ ] **Schema Validation**: `npx prisma validate --schema=../db/schema.prisma` passes with exit code 0.
- [ ] **Backend Lint**: `npm run lint` in `backend` passes with 0 errors.
- [ ] **Backend Unit & Integration Tests**: `npm test` passes 100% across all 35+ test suites with 0 failures and 0 skipped tests.
- [ ] **Backend Production Build**: `npm run build` in `backend` compiles cleanly to `dist/`.
- [ ] **Frontend Typecheck**: `npx tsc --noEmit` in `frontend` passes with 0 type errors.
- [ ] **Frontend Lint**: `npm run lint` in `frontend` passes with 0 errors.
- [ ] **Frontend Production Build**: `npm run build` in `frontend` compiles without errors.

---

## 2. Infrastructure & Topology Verification

- [ ] **PostgreSQL 15+ Available**: Connection string verified; connection pool sizing configured appropriately (`pool_timeout: 10s`, maximum connections within server limit).
- [ ] **Redis 7+ Available**:
  - Running with Append-Only File enabled: `--appendonly yes --appendfsync everysec`.
  - Maxmemory policy configured to `noeviction` for BullMQ queue durability.
- [ ] **Worker Separation**: Background queue processors (`post-call-analysis`, `crm-sync`, `outbound-calls`, `recording-processing`, `automation-actions`, `appointment-reminders`) are monitored and configured for graceful shutdown (`SIGTERM` tolerance: 10s).
- [ ] **Container Images Built**:
  - Multi-stage builds completed.
  - Non-root user permissions active (`nestjs` / `nextjs`).
  - No secrets embedded into Docker image layers or `.env` files copied.

---

## 3. Configuration & Secrets Handling

- [ ] **Environment Validation**: `validateEnvironment()` passes on startup.
- [ ] **Mandatory Production Secrets Configured**:
  - `DATABASE_URL`: Production PostgreSQL URI.
  - `REDIS_HOST` / `REDIS_PORT`: Production Redis URI.
  - `JWT_SECRET`: Rotated, cryptographically secure 256-bit string (must NOT contain `change-in-production`).
  - `JWT_REFRESH_SECRET`: Rotated, cryptographically secure secret.
- [ ] **External Provider Keys Configured (if enabled)**:
  - Cal.com: `CALCOM_API_KEY`, `CALCOM_EVENT_TYPE_ID`.
  - Meta WhatsApp: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WEBHOOK_SECRET`.
  - Resend: `RESEND_API_KEY`, verified sender domain.
  - Telephony: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
  - Voice / AI: `DEEPGRAM_API_KEY`, `GROQ_API_KEY`.
- [ ] **Log & Diagnostic Redaction**: Verified that logs, error stacks, queue payloads, and `/health/diagnostics` redact all secrets and bearer tokens.

---

## 4. Staging Deployment Gate

- [ ] **Database Pre-Migration Backup**: `scripts/backup-db.sh` executed successfully and backup file verified.
- [ ] **Deploy Database Migrations**: `npx prisma migrate deploy` completed with 0 errors.
- [ ] **Deploy Services**: Backend and Frontend containers started in staging.
- [ ] **Health Endpoint Verification**:
  - `GET /health/live` returns HTTP 200 `{"status": "ok"}`.
  - `GET /health/ready` returns HTTP 200 with all core checks `ok`.
  - `GET /health/metrics` returns valid Prometheus exposition text without PII.
- [ ] **Deployment Smoke Test**: `node scripts/smoke-test.js` passes with exit code 0.
- [ ] **WebSocket Connectivity**: Socket client successfully connects to `/calls`, authenticates with JWT, and joins tenant-scoped room.

---

## 5. Rollback Plan Ready

- [ ] **Application Rollback**: Previous container image tag recorded (e.g. `agentcall-backend:<previous-sha>`).
- [ ] **Database Rollback Strategy**: Forward-corrective migration prepared in the event of unexpected schema incompatibility.
- [ ] **PostgreSQL Restore Verified**: `scripts/restore-db.sh` tested and verified in staging.
