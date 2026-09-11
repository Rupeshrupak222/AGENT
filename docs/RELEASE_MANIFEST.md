# Release Manifest — AgentCall AI / Adyapan AI

## Metadata & Build Information

- **Application Release Version**: `v0.22.0-rc1`
- **Release Stage**: Release Candidate — Operationally & Code Verified
- **Git Commit SHA**: `78f2a7a`
- **Git Branch**: `main`
- **Build Timestamp**: `2026-09-11T12:45:00.000Z`
- **Node Runtime**: `v24.18.0` (LTS baseline: Node 20+)
- **ORM / Schema**: Prisma 5.22.0 (`db/schema.prisma`)
- **Prisma Client Generation**: Generated to `backend/node_modules/.prisma/client`

---

## Build Artifacts & Verifications

| Component | Technology | Artifact Location | Build Status | Static Audit |
|:---|:---|:---|:---:|:---:|
| **Backend API & Workers** | NestJS 10.3.10 / TypeScript 5.5 | `backend/dist/main.js` | **PASS** (Zero errors) | ESLint: 0 errors |
| **Frontend Web App** | Next.js 14.2.5 / React 18 | `frontend/.next` (45 routes) | **PASS** (Zero errors) | TypeScript: 0 errors, ESLint: 0 errors |
| **Database Schema** | PostgreSQL 15 / Supabase / Neon | `db/schema.prisma` | **PASS** (`prisma validate`) | Validated & Synced |
| **Test Suites** | Jest 29 / ts-jest | `backend/src/**/__tests__` | **PASS** (38 suites, 450 tests) | 100% Passing (0 failures) |
| **Smoke Contract** | Node.js HTTP test harness | `scripts/smoke-test.js` | **PASS** | HTTP 200/401/Prometheus OK |
| **Load Benchmark** | Node.js concurrency runner | `scripts/load-test.js` | **PASS** (1500 reqs, c50) | 1061 req/s, p50=15-23ms |
| **Release Gate** | Operational Readiness Evaluator | `scripts/release-gate.js` | **CODE VERIFIED** | 7 PASS, 0 FAIL, 4 BLOCKED |

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
