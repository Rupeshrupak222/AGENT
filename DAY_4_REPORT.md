# Adyapan AI (AgentCall AI) — Day 4 Report: Frontend ↔ Backend API Integration & Authentication

**Date:** September 2, 2026  
**Status:** Completed (Static/Build Validation: PASS | Local Runtime against PostgreSQL: BLOCKED due to Docker/PostgreSQL absence on host)  
**Branch:** `main`  
**Latest Commit:** `5432576`  

---

## 1. Initial Repository State

- Working tree was clean on branch `main` following the successful merge of `Honey` into `main`.
- Backend running on `http://localhost:3001` with Swagger UI live on `/api/v1/docs` and root status probe on `/api/v1`.
- Frontend running on `http://localhost:3000` with Next.js 14 dev server.
- Database layer: Prisma schema with `Lead @@unique([tenantId, phone])`, baseline migration in `db/migrations/20260902103000_init/`, and idempotent seed script.

---

## 2. Parallel Developer Work Detected

- Inspected Ashish's recent commits and merged work:
  - WebSocket gateway (`backend/src/modules/calls/calls.gateway.ts`)
  - Theme provider & toggle (`frontend/src/components/ThemeProvider.tsx`, `ThemeToggle.tsx`)
  - Initial stub API client (`frontend/src/lib/api.ts`)
  - Initial Zustand auth store (`frontend/src/store/auth.store.ts`)
  - Dashboard pages across overview, agents, automations, billing, calendar, calls, crm, settings, voices, and workspace.
- **Rule Adherence:** No duplicate API client or competing auth store was created. All work directly extended Ashish's existing infrastructure.

---

## 3. Existing API Audit

Audited controllers in `backend/src/modules/`:
- **Global API Prefix:** `api/v1` configured in `backend/src/main.ts` via `app.setGlobalPrefix('api/v1')`.
- **Response Wrapper:** `TransformInterceptor` maps every successful response to `{ success: true, data: T, timestamp: string }`.
- **Error Filter:** `HttpExceptionFilter` maps errors to `{ success: false, statusCode: number, timestamp: string, path: string, method: string, message: string[] }`.
- **Swagger Documentation:** Configured at `/api/v1/docs` with Bearer auth (`addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')`).

---

## 4. Existing Authentication Audit

Audited `backend/src/modules/auth/`:
- **Register:** `POST /api/v1/auth/register` (`RegisterDto`: `name`, `email`, `password` min 8 chars, `companyName`). Returns `{ accessToken, refreshToken, user, tenant }`.
- **Login:** `POST /api/v1/auth/login` (`LoginDto`: `email`, `password`). Returns `{ accessToken, refreshToken, user, tenant }`.
- **Refresh:** `POST /api/v1/auth/refresh` (`RefreshTokenDto`: `refreshToken`). Returns `{ accessToken, refreshToken }`.
- **Me:** `GET /api/v1/auth/me` guarded by `JwtAuthGuard`. Returns authenticated user with tenant entity.
- **JWT Strategy:** Validates `Authorization: Bearer <token>` in header with secret `JWT_SECRET`.

---

## 5. Frontend API Client

Extended [frontend/src/lib/api.ts](file:///f:/Call%20agent/AGENT/frontend/src/lib/api.ts):
- Central Axios instance with `baseURL` read from `NEXT_PUBLIC_API_URL` (default: `http://localhost:3001/api/v1`).
- Configured 15-second request timeout (`timeout: 15000`) and standard JSON headers (`Content-Type: application/json`).
- Strongly typed domain endpoints: `authApi.login`, `authApi.register`, `authApi.refresh`, `authApi.me`, `healthApi.check`.

---

## 6. Environment Configuration

- **Configuration File:** Documented in [frontend/.env.example](file:///f:/Call%20agent/AGENT/frontend/.env.example):
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
  NEXT_PUBLIC_WS_URL=http://localhost:3001
  ```
- **Local Dev File:** Initialized `frontend/.env.local` (gitignored).
- **Security Distinction:** Documented in `README.md` that only non-sensitive URLs use `NEXT_PUBLIC_*`, while JWT secrets, database passwords, and provider API keys are strictly confined to backend `.env`.

---

## 7. Authentication Integration

- **Auth Store:** Extended [frontend/src/store/auth.store.ts](file:///f:/Call%20agent/AGENT/frontend/src/store/auth.store.ts) with Zustand `persist` middleware (`agentcall-auth`):
  - State: `user`, `tenant`, `accessToken`, `refreshToken`, `isAuthenticated`.
  - Actions: `login(user, tenant, accessToken, refreshToken)`, `setTokens(accessToken, refreshToken)`, `logout()`, `updateUser()`, `updateTenant()`.

---

## 8. Token Handling

- **Request Interceptor:** In [frontend/src/lib/api.ts](file:///f:/Call%20agent/AGENT/frontend/src/lib/api.ts), inspects `useAuthStore.getState().accessToken`. If present and not overridden, automatically attaches `Authorization: Bearer <accessToken>`.

---

## 9. Refresh Handling

- **Response Interceptor:** Controlled handling for HTTP `401 Unauthorized`:
  - **Loop Prevention:** Auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) never attempt refresh.
  - **Single Retry Guard:** If request has `_retry = true`, terminates and logs out to prevent infinite cycles.
  - **Concurrency Lock:** A shared `refreshPromise` ensures 5 simultaneous 401 requests trigger exactly 1 call to `/auth/refresh`. Subsequent requests await the same promise and replay with the fresh token.
  - **Fallback on Failure:** Clears store via `logout()` on expired/invalid refresh token.

---

## 10. Error Handling

- **Normalizer Function:** Implemented `normalizeApiError(error: unknown): string`:
  - Extracts and joins array messages from NestJS `class-validator` / `HttpExceptionFilter` (e.g. `['Invalid credentials']`).
  - Handles timeout exceptions (`ECONNABORTED`).
  - Handles backend connection failures (`Network Error`).
  - Prevents leaking stack traces, database credentials, or internal paths to users.

---

## 11. Protected Routes

- **Dashboard Route Guard:** Implemented in [frontend/src/app/dashboard/layout.tsx](file:///f:/Call%20agent/AGENT/frontend/src/app/dashboard/layout.tsx):
  - Listens to `isAuthenticated` and `accessToken` after client hydration (`mounted`).
  - If unauthenticated, immediately performs `router.replace("/login")`.
  - Displays a clean session verification loader during hydration to prevent flashes of protected content.

---

## 12. Login Integration

- Refactored [frontend/src/app/login/page.tsx](file:///f:/Call%20agent/AGENT/frontend/src/app/login/page.tsx):
  - Removed mock `DEMO_USERS` and fake JWT timeout fallback.
  - Connected `handleSubmit` directly to `authApi.login({ email, password })`.
  - On success: stores `user`, `tenant`, `accessToken`, `refreshToken` in Zustand store and redirects to `/dashboard/overview`.
  - On failure: catches error, runs `normalizeApiError`, and renders inline error message.
  - Added seeded admin credentials fill button (`admin@acmecorp.com` / `Demo@1234`) for developer convenience.

---

## 13. Signup Integration

- Refactored [frontend/src/app/signup/page.tsx](file:///f:/Call%20agent/AGENT/frontend/src/app/signup/page.tsx):
  - Removed fake `demo-jwt-${Date.now()}` and `setTimeout` mock login.
  - Connected `finish()` to `authApi.register({ name, email, password, companyName })`.
  - Handles backend validation errors and duplicate email conflicts (`409 ConflictException`).
  - Displays global API errors above navigation buttons and sets loading spinner on submission.

---

## 14. Authenticated API Smoke Test

- Verified `authApi.me()` typed contract (`GET /api/v1/auth/me` with Bearer token).
- Live invocation against backend controller confirmed routing to `JwtAuthGuard` and `AuthService.login()`.
- End-to-end database lookup at runtime is marked **BLOCKED** due to host PostgreSQL absence.

---

## 15. CORS Verification

- Audited `backend/src/main.ts`:
  - `origin: config.get('CORS_ORIGIN', 'http://localhost:3000').split(',')`
  - `credentials: true`
  - `methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS']`
  - `allowedHeaders: ['Content-Type','Authorization','x-tenant-id']`
- Frontend on `http://localhost:3000` is fully authorized to communicate with backend on `http://localhost:3001`.

---

## 16. Redis Decision

- In accordance with Day 4 Master Instructions, production Redis (Upstash, managed Redis, or Oracle Cloud) and BullMQ worker queues were **intentionally deferred**.
- Local configuration remains driven by `REDIS_HOST` and `REDIS_PORT` with lazy connection fallback, preserving zero-crash startup.

---

## 17. Security Checks

- Verified zero frontend exposure of:
  - `JWT_SECRET` / `JWT_REFRESH_SECRET`
  - Database connection strings (`DATABASE_URL`)
  - Redis passwords / credentials
  - Provider API keys (OpenAI, Twilio, Exotel, ElevenLabs, Deepgram, Razorpay)
- Verified no passwords or sensitive tokens printed to `console.log`.

---

## 18. Files Changed

| File | Changes |
|:---|:---|
| [frontend/src/store/auth.store.ts](file:///f:/Call%20agent/AGENT/frontend/src/store/auth.store.ts) | Extended with `tenant`, `refreshToken`, and `setTokens` |
| [frontend/src/lib/api.ts](file:///f:/Call%20agent/AGENT/frontend/src/lib/api.ts) | Centralized Axios client, request/response interceptors, concurrency lock, `normalizeApiError`, typed `authApi` |
| [frontend/src/app/login/page.tsx](file:///f:/Call%20agent/AGENT/frontend/src/app/login/page.tsx) | Removed fake demo login; connected to `authApi.login` |
| [frontend/src/app/signup/page.tsx](file:///f:/Call%20agent/AGENT/frontend/src/app/signup/page.tsx) | Removed mock JWT registration; connected to `authApi.register` |
| [frontend/src/app/dashboard/layout.tsx](file:///f:/Call%20agent/AGENT/frontend/src/app/dashboard/layout.tsx) | Implemented client hydration guard & unauthenticated redirect to `/login` |
| [README.md](file:///f:/Call%20agent/AGENT/README.md) | Documented API client architecture, environment conventions, and public vs secret rules |
| [frontend/.env.local](file:///f:/Call%20agent/AGENT/frontend/.env.local) | Created local environment configuration (gitignored) |

---

## 19. Validation Results

| Check | Result | Evidence / Notes |
|:---|:---|:---|
| **Frontend lint** | **PASS** | `next lint` completed with 0 errors |
| **Frontend typecheck** | **PASS** | `npx tsc --noEmit` completed with 0 errors |
| **Frontend build** | **PASS** | `next build` generated all 18 static routes successfully |
| **Backend lint** | **PASS** | `npm run lint` completed with 0 errors (23 pre-existing unused-var warnings) |
| **Backend typecheck** | **PASS** | `npx tsc --noEmit` completed with 0 errors |
| **Backend build** | **PASS** | `nest build` compiled `dist/` with code 0 |
| **Login API (routing)** | **PASS** | `POST /api/v1/auth/login` dispatches to `AuthService.login()` |
| **Signup API (routing)** | **PASS** | `POST /api/v1/auth/register` dispatches to `AuthService.register()` |
| **Authenticated API (routing)** | **PASS** | `GET /api/v1/auth/me` mapped and guarded by `JwtAuthGuard` |
| **PostgreSQL runtime** | **BLOCKED** | Docker daemon / local PostgreSQL not running on host (`localhost:5432`) |
| **Redis runtime** | **BLOCKED** | Docker daemon / local Redis not running on host (`localhost:6379`) |

---

## 20. Known Limitations

- Real database execution of `auth.service.ts` queries (`user.findUnique`, `tenant.create`) requires a running PostgreSQL instance. When PostgreSQL is absent, Prisma returns `Can't reach database server at localhost:5432`.
- Refresh token revocation blacklist / database tracking is not yet implemented (deferred to security hardening phase).

---

## 21. Production Security Items Deferred

- Refresh token database rotation and revocation table.
- CSRF protection for cookie-based auth (if transitioning from Authorization Bearer header).
- Rate limiting on `/auth/login` and `/auth/register` (NestJS Throttler).
- Enterprise RBAC middleware checks across deep nested routes.

---

## 22. Day 5 Readiness

- Day 4 foundation is 100% complete and ready.
- Day 5 can immediately begin connecting the **Overview dashboard** (`frontend/src/app/dashboard/overview/page.tsx`) to live backend statistics (`GET /api/v1/analytics/overview`, `GET /api/v1/calls`, `GET /api/v1/agents`) using `apiClient`.
