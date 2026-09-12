# Release Manifest — AgentCall AI / Adyapan AI

## Metadata & Build Information

- **Application Release Version**: `v0.23.0-rc1`
- **Release Stage**: Release Candidate — Code Verified (localhost runtime evidence; infra/provider blocked)
- **Git Commit SHA**: `8f09d89`
- **Git Branch**: `main`
- **Build Timestamp**: `2026-09-12T15:30:00.000Z`
- **Node Runtime**: `v24.18.0` (LTS baseline: Node 20+)
- **ORM / Schema**: Prisma 5.22.0 (`db/schema.prisma`)
- **Prisma Client Generation**: Generated to `backend/node_modules/.prisma/client`

---

## Build Artifacts & Verifications

| Component | Technology | Artifact Location | Build Status | Static Audit |
|:---|:---|:---|:---:|:---:|
| **Backend API & Workers** | NestJS 10.3.10 / TypeScript 5.5 | `backend/dist/main.js` | **PASS** (Zero errors) | ESLint: 0 errors (73 pre-existing warnings) |
| **Frontend Web App** | Next.js 14.2.5 / React 18 | `frontend/.next` (45 routes) | **PASS** (Zero errors) | TypeScript: 0 errors, ESLint: 0 errors |
| **Database Schema** | PostgreSQL 15 / Supabase / Neon | `db/schema.prisma` | **PASS** (`prisma validate`) | Validated & Synced |
| **Test Suites** | Jest 29 / ts-jest | `backend/src/**/__tests__` | **PASS** (40 suites, 476 tests, 60.99s) | 100% Passing (0 failures) |
| **Smoke Contract** | Node.js HTTP test harness | `scripts/smoke-test.js` | **PASS** (live localhost) | 6 PASS / 3 SKIPPED (no creds); target env now honored (`TARGET_URL`) |
| **Load Benchmark** | Node.js concurrency runner | `scripts/load-test.js` | **PASS** (1500 reqs, 0 failures) | Peak 109.5 req/s (degraded DB/Redis runtime) |
| **Release Gate** | Operational Readiness Evaluator | `scripts/release-gate.js` | **CODE VERIFIED** | 7 PASS, 0 WARN, 4 BLOCKED, 0 FAIL |
| **CI / Docker Gate** | GitHub Actions + Dockerfile build | `.github/workflows/ci.yml` → `docker-gate` | **AUTHORED (run blocked: no Docker CLI)** | Build + non-root + healthcheck image inspection |

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
