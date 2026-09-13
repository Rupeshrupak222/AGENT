# Release Manifest — AgentCall AI / Adyapan AI

## Metadata & Build Information

- **Application Release Version**: `v0.25.0-rc1` (worker separation hot-added 2026-09-13)
- **Release Stage**: Release Candidate — Code Verified (localhost runtime evidence; infra/provider blocked)
- **Git Commit SHA**: `9d588f8` (+ Day 26 worker-separation commit, pushed same day)
- **Git Branch**: `main`
- **Build Timestamp**: `2026-09-13T17:35:00.000Z`
- **Node Runtime**: `v24.18.0` (LTS baseline: Node 20+)
- **ORM / Schema**: Prisma 5.22.0 (`db/schema.prisma`)
- **Prisma Client Generation**: Generated to `backend/node_modules/.prisma/client`

---

## Build Artifacts & Verifications

| Component | Technology | Artifact Location | Build Status | Static Audit |
|:---|:---|:---|:---:|:---:|
| **Backend API & Workers** | NestJS 10.3.10 / TypeScript 5.5 | `backend/dist/main.js` | **PASS** (Zero errors; Worker Mode enabled) | ESLint: 0 errors (72 pre-existing warnings) |
| **Worker node** | `WORKER_MODE=true node dist/main.js` | `backend/src/common/utils/worker-mode.ts` | **PASS** (boots worker context, no HTTP listener, graceful SIGTERM/SIGINT) | 8 unit tests — `worker-mode.spec.ts` |
| **Frontend Web App** | Next.js 14.2.5 / React 18 | `frontend/.next` (45 routes) | **PASS** (Zero errors) | TypeScript: 0 errors, ESLint: 0 errors |
| **Database Schema** | PostgreSQL 15 / Supabase / Neon | `db/schema.prisma` | **PASS** (`prisma validate`) | Validated & Synced |
| **Test Suites** | Jest 29 / ts-jest | `backend/src/**/__tests__` | **PASS** (43 suites, 501 tests) | 100% Passing (0 failures) — includes Day 25 staging-release-candidate + Day 26 worker-mode suites |
| **Smoke Contract** | Node.js HTTP test harness | `scripts/smoke-test.js` | **PASS** (live localhost, re-executed 2026-09-13) | 6 PASS / 3 SKIPPED (no creds); target env honored (`TARGET_URL`) |
| **Load Benchmark** | Node.js concurrency runner | `scripts/load-test.js` | **PASS** (1500 reqs, 0 failures; 8 tiers) | Re-executed 2026-09-13 against degraded DB/Redis runtime; artifact stored as `LOAD_RESULT_FILE` evidence |
| **Release Gate** | Operational Readiness Evaluator | `scripts/release-gate.js` (v0.25.0-rc1) | **CODE VERIFIED** | 7 PASS, 0 WARN, 4 BLOCKED, 0 FAIL (real smoke + load evidence); staging/load/smoke cannot PASS from config alone (Day 25 honesty tests) |
| **CI / Docker Gate** | GitHub Actions + Dockerfile build | `.github/workflows/ci.yml` → `docker-gate` | **PENDING — will run on Day 26 push** | Build + non-root + healthcheck image inspection; backend-gate runs with real Postgres 15 + Redis 7 service containers |

---

## Provider Operating Modes (Staging & Local Safe Mode)

All external third-party providers are configured with safe, zero-side-effect offline/mock fallback adapters:

| Provider Subsystem | Configured Adapter | Operational Safety | Fallback Behavior |
|:---|:---|:---|:---|
| **Telephony / Voice** | `SandboxProvider` / `MockTelephony` | SAFE | No live PSTN dials; simulated WebRTC/Twilio events |
| **AI Post-Call / LLM** | `GeminiPostCallProvider` | SAFE | Mock offline intelligence when API keys omitted |
| **Calendar / Bookings** | `MockCalendar` / `CalComProvider` | SAFE | In-memory slots; no external booking pollution |
| **Messaging / WhatsApp**| `MockWhatsAppAdapter` | SAFE | Mock message delivery; no external SMS/WhatsApp cost |
| **Email / Dispatch** | `MockEmailAdapter` / `ResendAdapter` | SAFE | Simulated send; zero live outbound emails |
| **CRM Sync** | `MockCrmAdapter` | SAFE | Local mock records; no production CRM side effects |
| **Storage / Recordings**| In-memory / Cloudflare R2 Mock | SAFE | Pre-signed URL generation mocked locally |

---

## Zero Secrets Guarantee

This manifest, the repository, and all generated logs comply with strict zero-secrets disclosure:
- No API keys, JWT secrets, database connection passwords, or customer tokens are embedded in build manifests or Docker artifacts.
- Diagnostics endpoints require `super_admin` / `company_admin` JWT authentication and strip credentials via `IntegrationsService` data masking (`••••••••`).
