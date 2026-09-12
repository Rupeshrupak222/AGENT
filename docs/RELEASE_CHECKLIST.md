# Production Release Checklist — Adyapan AI / AgentCall AI

This checklist must be executed and approved before deploying any release to staging or production.

---

## 1. Pre-Flight Code Quality Gate

- [x] **Working Tree Clean**: `git status --short` shows no uncommitted files or unmerged conflict markers.
- [x] **Sequential Migrations**: All Prisma migrations under `db/migrations` are strictly sequential, forward-only, and non-destructive.
- [x] **Schema Validation**: `npx prisma validate --schema=db/schema.prisma` passes with exit code 0.
- [x] **Backend Lint**: `npm run lint` in `backend` passes with 0 errors.
- [x] **Backend Unit & Integration Tests**: `npm test` passes 100% across all 40 test suites (476/476 passing) — see coverage note `NODE_OPTIONS=--max-old-space-size=4096` plus `--runInBand --forceExit` on Windows.
- [x] **Backend Production Build**: `npm run build` in `backend` compiles cleanly to `dist/` with NestJS.
- [x] **Frontend Typecheck**: `npx tsc --noEmit` in `frontend` passes with 0 type errors.
- [x] **Frontend Lint**: `npm run lint` in `frontend` passes with 0 errors.
- [x] **Frontend Production Build**: `npm run build` in `frontend` compiles without errors (45/45 static pages).
- [x] **Stitch MCP UI Refinement**: "Autonomous Voice Telemetry" design system integrated into Call Workspace & Audio Telemetry.

---

## 2. Infrastructure & Topology Verification

- [ ] **PostgreSQL 15+ Available**: Connection string verified; connection pool sizing configured appropriately (`pool_timeout: 10s`, maximum connections within server limit). *(Staging target not provisioned)*
- [ ] **Redis 7+ Available**:
  - Running with Append-Only File enabled: `--appendonly yes --appendfsync everysec`.
  - Maxmemory policy configured to `noeviction` for BullMQ queue durability.
- [ ] **Worker Separation**: Background queue processors (`post-call-analysis`, `crm-sync`, `outbound-calls`, `recording-processing`, `automation-actions`, `appointment-reminders`) monitored and configured for graceful shutdown (`SIGTERM` tolerance: 10s).
- [ ] **Container Images Built**:
  - Multi-stage builds completed.
  - Non-root user permissions active (`nestjs` / `nextjs`).
  - No secrets embedded into Docker image layers or `.env` files copied. *(Host lacks Docker CLI; `docker-gate` CI job authored in `ci.yml` to enforce this on the next push)*

---

## 3. Configuration & Secrets Handling

- [x] **Environment Validation**: `validateEnvironment()` passes on startup.
- [x] **Mandatory Secrets Configured in Backend**:
  - `DATABASE_URL`: Configured in `backend/.env`.
  - `REDIS_HOST` / `REDIS_PORT`: Configured in `backend/.env`.
  - `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secure 256-bit keys configured.
- [ ] **External Provider Keys Configured**:
  - Voice / AI: `GROQ_API_KEY` (Configured), `DEEPGRAM_API_KEY` (Configured).
  - Telephony: `TWILIO_ACCOUNT_SID` (Configured), `TWILIO_PHONE_NUMBER` (Configured). Safe test destination required for live PSTN verification.
  - Calendar / Messaging: Cal.com, WhatsApp, Resend, CRM not provisioned.
- [x] **Log & Diagnostic Redaction**: Verified that logs, error stacks, queue payloads, and `/health/diagnostics` redact all secrets and bearer tokens.

---

## 4. Staging Deployment Gate

- [ ] **Database Pre-Migration Backup**: `scripts/backup-db.sh` or `.ps1` executed successfully and backup file verified.
- [ ] **Deploy Database Migrations**: `npx prisma migrate deploy` completed with 0 errors on staging database.
- [ ] **Deploy Services**: Backend and Frontend containers started in staging environment.
- [ ] **Health Endpoint Verification**:
  - `GET /health/live` returns HTTP 200 `{"status": "ok"}`.
  - `GET /health/ready` returns HTTP 200 with all core checks `ok`.
  - `GET /health/metrics` returns valid Prometheus exposition text without PII.
- [ ] **Deployment Smoke Test**: `node scripts/smoke-test.js` passes against live staging endpoints.
- [ ] **WebSocket Connectivity**: Socket client successfully connects to `/calls`, authenticates with JWT, and joins tenant-scoped room.

---

## 5. Rollback Plan Ready

- [ ] **Application Rollback**: Previous container image tag recorded (e.g. `agentcall-backend:<previous-sha>`).
- [ ] **Database Rollback Strategy**: Forward-corrective migration prepared in the event of unexpected schema incompatibility.
- [ ] **PostgreSQL Restore Verified**: `scripts/restore-db.sh` tested and verified in staging.
