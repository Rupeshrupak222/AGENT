# DAY 2 REPORT — UNIFIED DESIGN SYSTEM + APP SHELL + REAL SIGN-IN + REAL DATA

## DAY
2 of 10

## OBJECTIVE
Unified design-system/app-shell pass (theme consistency, dead-link and dead-affordance removal, responsive/a11y fixes), real sign-in wiring with route protection (middleware + auth store), pricing convergence with backend, and start of converting remaining static/fake dashboard data to real API-backed data.

## COMPLETED
1. **Design-system fixes**: defined the missing `.btn-red` component class (19 buttons across 10 files were rendering unstyled) and a global `:focus-visible` indicator for keyboard accessibility.
2. **Dark-only theme decision (documented)**: the app's "night-only" brand theme is now intentional and coherent. Removed the non-functional `ThemeToggle` affordance from all 3 call sites (it was a no-op because `enableSystem={false}` + hardcoded `class="dark"`; activating it would break overview sub-views that are intrinsically dark-slated). Component file kept for a future light-mode launch after an overview-view color audit.
3. **Auth wiring + route protection**: session marker cookie (`ac_session`) set on login/token-refresh and cleared on logout; new `middleware.ts` redirects unauthenticated users away from `/dashboard/*` (with `?next=` return) and redirects signed-in users away from `/login`/`/signup`.
4. **Signup plan pricing converges with backend `PLANS`**: ₹2,999 / ₹9,999 / ₹29,999 (was ₹4,999 / 11,999 / 29,999). Plan selection is now REAL — sent to backend and persisted on the newly created tenant.
5. **Login page cleaned**: removed do-nothing Google/Microsoft buttons + divider; replaced dead "Forgot password?" (`href="#"`) with an honest hint (no password-reset route exists server-side); demo quick-login panel gated to development; error box tokenized and marked `role="alert"`.
6. **Landing footer dead links removed**: `/changelog /roadmap /solutions/* /docs* /status /about /blog /careers /contact /press` and the `href="#"` legal row are gone; replaced with real in-page anchors + `/login` + `/signup`.
7. **Dead/no-op affordances removed**: fake topbar search box (did nothing), sidebar `/help` link (no such route), quick role switcher on Overview (mutated the client-side session role without backend — a false preview).
8. **This is the ONE place we convert static data to API data on Day 2** (scope was "start converting"):
   - **Topbar notifications** now list REAL recent calls (`callsApi.list({limit:4})`) with status colors/times; "View all" links to the real Calls page.
   - **ManagerView**: fake live-call/eavesdrop/whisper/barge/QA-approval/campaign machinery (no backend exists) replaced with real `in_progress`/`ringing` calls, a real pending-review queue derived from unscored completed calls (`qualityScore/sentimentScore == null`), and an honest CSV export of the real calls feed.
   - **Analytics**: fabricated `intentData`, invented AI insights, and `Math.random()` scatter replaced with the real Sentiment distribution chart (from `analyticsApi.sentiment()`), derived insights computed only from loaded real metrics, and a real per-agent detail table.
   - **SuperAdminView**: fabricated infra telemetry (random ping latency, fake stream counts / port usage / "0 packet drops", invented diagnostic rows) replaced with real timed health probes against `/api/v1/health`, honest "Not exposed" rows for unprobed services, and plan-tier labels aligned to backend PLANS. Provision/quota modal claims corrected to what the code actually does.

## FILES CREATED
- `frontend/src/middleware.ts` — route protection for `/dashboard/*` via `ac_session` marker cookie; redirects authed users off `/login`/`/signup`.
- `frontend/src/lib/session-cookie.ts` — cookie helpers (set/clear).
- `DAY_2_REPORT.md` — this report.

## FILES MODIFIED
- `frontend/src/app/globals.css` — `.btn-red` component class (brand gradient) + global `:focus-visible` outline.
- `frontend/src/store/auth.store.ts` — session cookie set on login/setTokens, cleared on logout.
- `frontend/src/app/dashboard/layout.tsx` — removed no-op ThemeToggle + fake search; bell now shows real recent-calls feed; removed `/help` link; icon-only buttons gain `aria-label`/`aria-expanded`.
- `frontend/src/components/landing/Navbar.tsx` — removed ThemeToggle; removed dead `/docs` nav item.
- `frontend/src/app/dashboard/overview/page.tsx` — removed Quick Role Switcher bar (fake role mutation).
- `frontend/src/app/login/page.tsx` — fake social buttons/divider removed; dead forgot-password link replaced; demo panel dev-gated; error box tokenized.
- `frontend/src/app/signup/page.tsx` — prices aligned to backend; `plan` passed to register.
- `frontend/src/lib/api.ts` — `plan?: string` on `RegisterPayload`.
- `frontend/src/components/landing/Footer.tsx` — dead links removed; real anchors + auth links only.
- `frontend/src/app/dashboard/overview/components/ManagerView.tsx` — real live/review data; honest CSV export.
- `frontend/src/app/dashboard/overview/components/SuperAdminView.tsx` — real health probes; honest telemetry rows; corrected plan labels.
- `frontend/src/app/dashboard/analytics/page.tsx` — real sentiment chart, derived insights, agent table.
- `backend/src/modules/auth/dto/auth.dto.ts` — optional `plan` (`PLAN_KEYS`) on register.
- `backend/src/modules/auth/auth.service.ts` — tenant `plan` from DTO (default `starter`).

## DATABASE CHANGES
- No schema/migration changes (`migrate deploy` still blocked by empty `_prisma_migrations` — carried from Day 1, never destructive).
- Registration now persists the selected plan on `Tenant.plan` at creation (verified end-to-end: register with `plan:"business"` → tenant created with `plan:"business"`).
- Verified a new registration writes real rows (dev-DB test artifact `day2plan@acmecorp.com` remains as a verification row; safe to ignore/clean later).

## API CHANGES
- `POST /api/v1/auth/register` — accepts optional `plan` (`starter | growth | business | enterprise`); stored on the newly created tenant (default `starter` when omitted, validating `PLAN_KEYS`).

## UI-UX CHANGES
- Signup plan cards now match backend billing (Starter ₹2,999 / Growth ₹9,999 / Business ₹29,999).
- `.btn-red` buttons across the app render with the brand gradient instead of unstyled.
- Dashboard shell: real Recent Activity pane; no dead search/toggle/help affordances.
- Login/signup/footer/overview: dead elements removed or made honest.
- Dark-only theme is now an explicit, documented design decision (see COMPLETED #2).

## SECURITY CHANGES
- `middleware.ts` adds a first-line route gate for `/dashboard/*`. The marker cookie is non-HttpOnly by design (client-set); it is an UX redirection aid only — all real authorization remains server-side JWT + guards (NOT trusted client-side). Hardened HttpOnly session cookies + SSR session validation noted for a later hardening pass.
- No new secrets in the browser; `ac_session` carries no identity, only a boolean presence.

## TESTS RUN
Backend:
- `npm test` — full unit suite (15 suites / **150 tests**).
- `npm run test:e2e` — e2e suite (**40 tests**).
- `npm run build` (nest build) + `npx tsc --noEmit`.
- `npm run lint` — 0 errors (45 pre-existing warnings; none introduced by Day 2 changes).
Frontend:
- `npm run lint` — 0 warnings/errors.
- `npx tsc --noEmit` — clean.
- `npm run build` — **8/18 routes + Middleware (ƒ)** (added `/dashboard` route bookkeeping vs Day 1's 17 static; `_not-found` + still-static dashboard routes because middleware redirects client-side on real sessions).
- Smoke tests: `/dashboard/overview` (no cookie) → **307** `/login?next=/dashboard/overview`; `/login` (cookie) → **307** `/dashboard/overview`; landing `/` → 200; backend `/health` → 200; `register({"plan":"business"})` → `{...,"plan":"business"}` persisted.

## TEST RESULTS
| Gate | Result |
| :--- | :--- |
| Backend unit tests | **PASS** 150/150 |
| Backend e2e tests | **PASS** 40/40 |
| Backend `tsc --noEmit` / `nest build` | **PASS** |
| Backend `eslint` | **PASS** (0 errors; 45 pre-existing warnings) |
| Frontend lint | **PASS** 0 warnings/errors |
| Frontend typecheck | **PASS** |
| Frontend build | **PASS** (18 routes + Middleware) |
| Middleware smoke (unauthed → login / authed → dashboard) | **PASS** (307 redirects verified) |
| Register plan persistence | **PASS** (`plan:"business"` stored on tenant) |
| Dev servers | Frontend up on :3000; backend up on :3001 (restarted clean on the new DTO) |

## BUILD
- Frontend production build PASS (18 routes + `ƒ Middleware`).
- Backend Nest build PASS.
- Both dev servers restarted clean after the fresh build/source changes.

## RESPONSIVE QA
- Layout/shell retained and built; no regressions observed in routes. Deeper viewport-by-viewport visual QA is dev-server based and deferred to the Day 3+ UI sweep (no visual redesign was attempted this day; changes were additive/organizational).

## RBAC QA
- **PASS** — all RBAC suites still green. Note: the Overview quick role-switcher was removed because it faked session-role changes; Role/`usePermissions` gating in the shell remains driven by the real server role.

## TENANT ISOLATION
- **PASS** — regression suites green (cross-tenant IDOR e2e still 40/40). No changes to tenant-scoping logic this day.

## REGRESSION
- **PASS** — backend 150 unit / 40 e2e, frontend lint/tsc/build all green after Day 2 edits; prior theme/token work intact; no data loss; no destructive commands run.

## REMAINING ISSUES
1. Dev DB Prisma migration-history baseline still not decided (`P3005/P3017`) — carried from Day 1.
2. Middleware cookie is a presence marker only; recommend HttpOnly session cookie + SSR validation in a later hardening pass (JWT enforcement is unaffected).
3. Remaining static/fake data not yet converted: calls detail modal, voices preview scripts (functional demo — intentionally kept), calendar, automations, CRM, settings, workspace, AgentView/CompanyAdminView/ViewerView internals, voices/agents list internals — scheduled Days 4–8.
4. `ThemeToggle` component now unused but retained intentionally for the future light-mode launch (needs overview-view color audit first).
5. Backend lint warnings (45, pre-existing; unused imports/args) — clean later.
6. Dev-DB verification row `day2plan@acmecorp.com` (Day-2 register smoke test) remains in the dev DB.

## BLOCKERS
None for Day 2 scope. (PSTN live call via Twilio trial + tunnel, and Dev-DB migration baselining, remain operational items — not code blockers.)

## NEXT DAY
**DAY 3** — Tenancy + RBAC deep pass: wire `TenantGuard` across controllers, enforce `@Roles()`/permissions where missing, resolve `RolesGuard` no-op; begin converting the calls/crm/calendar/automations pages to real API data; responsive + a11y sweep of remaining pages.