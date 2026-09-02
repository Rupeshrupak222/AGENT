# AgentCall AI — System Architecture

> Enterprise AI Calling Agent OS · Version 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Repository Structure](#repository-structure)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Architecture](#database-architecture)
7. [Authentication & Authorization](#authentication--authorization)
8. [AI & Voice Pipeline](#ai--voice-pipeline)
9. [Real-time Architecture](#real-time-architecture)
10. [Queue & Background Jobs](#queue--background-jobs)
11. [Multi-Tenant Architecture](#multi-tenant-architecture)
12. [Integrations](#integrations)
13. [Deployment Architecture](#deployment-architecture)
14. [Security](#security)
15. [Performance & Scaling](#performance--scaling)

---

## Overview

AgentCall AI is a multi-tenant SaaS platform that lets businesses deploy AI-powered voice employees. Each AI Agent can make/receive phone calls, qualify leads, book appointments, handle collections, and run recruitment workflows — fully automated, 24/7.

### Core Technology Choices

| Layer        | Technology                           | Reason                                              |
|--------------|--------------------------------------|-----------------------------------------------------|
| Frontend     | Next.js 14 + Tailwind CSS            | SSR/ISR, file-based routing, best-in-class DX       |
| Backend      | NestJS (Node.js)                     | Modular, decorator-driven, first-class TypeScript   |
| Database     | PostgreSQL via Supabase              | ACID, JSON support, full-text search, scalable      |
| ORM          | Prisma 5                             | Type-safe queries, migrations, relation resolution  |
| Auth         | JWT + Passport + RBAC                | Stateless, scalable, role-granular                  |
| Storage      | AWS S3                               | Recordings, KB uploads, attachments                 |
| Queue        | Redis + BullMQ                       | Reliable job processing, retries, priorities        |
| Realtime     | Socket.io (WebSockets)               | Live call feed, dashboard metrics push              |
| AI           | OpenAI Realtime API (GPT-4o)         | Conversation intelligence, intent detection         |
| Voice        | ElevenLabs                           | Hyper-realistic multi-lingual voice synthesis       |
| Calling      | Twilio / Exotel                      | Programmatic phone calls, PSTN connectivity         |
| Payments     | Razorpay                             | INR payments, subscription management               |
| Deployment   | AWS EKS (Kubernetes)                 | Auto-scaling, HA, zero-downtime deploys             |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  Browser (Next.js SPA)  │  Mobile Web  │  API Consumers             │
└──────────────┬──────────────────────────────────────────────────────┘
               │ HTTPS / WSS
┌──────────────▼──────────────────────────────────────────────────────┐
│                     EDGE / CDN LAYER                                 │
│              Cloudfront CDN  │  AWS WAF  │  Route53                 │
└──────────────┬──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (K8s)                            │
│                                                                      │
│  ┌──────────────────┐   ┌─────────────────────────────────────┐     │
│  │  Next.js Frontend│   │         NestJS API (REST)           │     │
│  │  Port 3000        │   │         Port 3001                   │     │
│  │  (Vercel / ECS)  │   │  Auth │ Agents │ Leads │ Calls ...  │     │
│  └──────────────────┘   └──────────────┬────────────────────┘     │
│                                          │                           │
│  ┌───────────────────────────────────────▼──────────────────────┐   │
│  │              WebSocket Gateway (Socket.io)                    │   │
│  │  Events: call.started, call.ended, lead.updated, metrics.*   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                     SERVICES LAYER                                   │
│                                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  BullMQ     │  │  OpenAI    │  │ ElevenLabs │  │Twilio/Exotel│  │
│  │  Workers    │  │ Realtime   │  │ Voice TTS  │  │ Call Engine │  │
│  └─────────────┘  └────────────┘  └────────────┘  └─────────────┘  │
│                                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │  Razorpay   │  │  SendGrid  │  │  Twilio    │  │  AWS S3     │  │
│  │  Payments   │  │  Email     │  │  SMS/WA    │  │  Storage    │  │
│  └─────────────┘  └────────────┘  └────────────┘  └─────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      DATA LAYER                                      │
│                                                                      │
│  ┌──────────────────────┐    ┌──────────────────────────────────┐   │
│  │  PostgreSQL          │    │  Redis                           │   │
│  │  (Supabase)          │    │  - Session cache                 │   │
│  │  Primary DB          │    │  - BullMQ queues                 │   │
│  │  Read replicas       │    │  - Rate limiting counters        │   │
│  └──────────────────────┘    └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
agentcall-ai/
├── frontend/                    # Next.js 14 App
│   ├── src/
│   │   ├── app/
│   │   │   ├── (landing)/       # Public marketing pages
│   │   │   │   └── page.tsx
│   │   │   ├── (dashboard)/     # Authenticated app
│   │   │   │   ├── layout.tsx   # Dashboard shell (sidebar + topbar)
│   │   │   │   ├── dashboard/   # Overview page
│   │   │   │   ├── agents/      # AI Agent Builder
│   │   │   │   ├── crm/         # Lead Management
│   │   │   │   ├── calls/       # Call Center
│   │   │   │   ├── analytics/   # AI Analytics
│   │   │   │   ├── calendar/    # Appointment Booking
│   │   │   │   ├── automations/ # WhatsApp/SMS/Email
│   │   │   │   ├── billing/     # Subscription
│   │   │   │   ├── settings/    # Workspace Settings
│   │   │   │   └── workspace/   # Team Management
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── components/
│   │   │   ├── ui/              # Reusable primitives
│   │   │   ├── landing/         # Marketing page components
│   │   │   └── dashboard/       # App shell components
│   │   ├── lib/
│   │   │   ├── utils.ts         # cn(), formatters
│   │   │   ├── api.ts           # Axios instance + interceptors
│   │   │   └── socket.ts        # Socket.io client
│   │   ├── hooks/               # Custom React hooks
│   │   ├── store/               # Zustand global state
│   │   └── types/               # Shared TypeScript types
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
│
├── backend/                     # NestJS API
│   ├── src/
│   │   ├── main.ts              # Bootstrap, Swagger, CORS
│   │   ├── app.module.ts        # Root module
│   │   ├── modules/
│   │   │   ├── prisma/          # Global PrismaService
│   │   │   ├── auth/            # JWT, strategies, guards
│   │   │   ├── tenants/         # Workspace management
│   │   │   ├── users/           # RBAC user management
│   │   │   ├── agents/          # AI agent CRUD + deployment
│   │   │   ├── leads/           # CRM lead management
│   │   │   ├── calls/           # Call session lifecycle
│   │   │   ├── analytics/       # Metrics + AI insights
│   │   │   ├── billing/         # Razorpay + plan management
│   │   │   └── automations/     # WhatsApp / SMS / Email
│   │   └── common/
│   │       ├── decorators/      # @CurrentUser, @Roles, @Public
│   │       ├── guards/          # JwtAuthGuard, RolesGuard
│   │       ├── filters/         # HttpExceptionFilter
│   │       ├── interceptors/    # Transform, Logging
│   │       └── pipes/           # Validation
│   └── package.json
│
└── db/                          # Database layer
    ├── schema.prisma            # Full Prisma schema (16 models)
    ├── seed.ts                  # Demo data seed
    ├── package.json
    └── migrations/              # Auto-generated by prisma migrate
```

---

## Frontend Architecture

### Route Groups

| Route Group    | Path Pattern                    | Auth Required |
|----------------|---------------------------------|---------------|
| `(landing)`    | `/`                             | No            |
| `(dashboard)`  | `/dashboard/*`                  | Yes (JWT)     |
| Auth pages     | `/login`, `/signup`             | No            |

### State Management

```
Zustand Stores:
├── useAuthStore     → user, token, tenant
├── useAgentStore    → agents list, active agent
├── useLeadStore     → leads, filters, pagination
├── useCallStore     → active calls, call feed
└── useUIStore       → sidebar collapsed, theme
```

### Component Hierarchy

```
app/
└── (dashboard)/layout.tsx        ← Shell
    ├── Sidebar                   ← Collapsible nav
    └── TopBar                    ← Search, notifs, user
        └── [page].tsx
            ├── StatCard[]        ← KPI widgets
            ├── Charts (Recharts) ← Area, Bar, Pie, Radar
            ├── DataTable         ← Sortable, filterable
            └── SlidePanels       ← Detail drawers
```

### Design System Tokens

```
Colors:   brand (indigo-500), accent (green-400), surface (#0a0a14)
Glass:    backdrop-blur-xl, bg-white/5, border-white/10
Shadow:   shadow-glass, shadow-brand, shadow-glow
Font:     Inter (UI), JetBrains Mono (code/metrics)
Radius:   rounded-xl (cards), rounded-2xl (modals), rounded-full (badges)
Motion:   framer-motion — slide-up, fade-in, scale-in
```

---

## Backend Architecture

### Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── ThrottlerModule
├── BullModule (Redis)
├── ScheduleModule
├── PrismaModule (global)     ← injected into all modules
├── AuthModule
│   ├── JwtModule
│   ├── PassportModule
│   └── JwtStrategy
├── TenantsModule
├── UsersModule
├── AgentsModule
├── LeadsModule
├── CallsModule
├── AnalyticsModule
├── BillingModule
└── AutomationsModule
```

### Request Lifecycle

```
HTTP Request
    │
    ▼
ThrottlerGuard        ← rate limiting (100 req/60s per IP)
    │
    ▼
JwtAuthGuard          ← verify Bearer token, attach req.user
    │
    ▼
RolesGuard            ← check role against @Roles() decorator
    │
    ▼
ValidationPipe        ← class-validator DTO validation
    │
    ▼
Controller Method     ← extract @CurrentUser(), @Body(), @Query()
    │
    ▼
Service Layer         ← business logic, Prisma queries
    │
    ▼
TransformInterceptor  ← wrap response: { success, data, timestamp }
    │
    ▼
HTTP Response
```

### Error Response Format

```json
{
  "success": false,
  "statusCode": 400,
  "timestamp": "2026-08-30T10:00:00.000Z",
  "path": "/api/v1/agents",
  "method": "POST",
  "message": ["name should not be empty", "role must be a valid enum value"]
}
```

### Success Response Format

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-08-30T10:00:00.000Z"
}
```

---

## Database Architecture

### Entity Relationship Summary

```
Tenant (1) ──< User (*)
Tenant (1) ──< AIAgent (*)
Tenant (1) ──< Lead (*)
Tenant (1) ──< Call (*)
Tenant (1) ──< Campaign (*)
Tenant (1) ──< AutomationLog (*)
Tenant (1) ──< Integration (*)
Tenant (1) ──< Invoice (*)
Tenant (1) ──< ApiKey (*)
Tenant (1) ──< Webhook (*)
Tenant (1) ──< AuditLog (*)

AIAgent (1) ──< Call (*)
AIAgent (1) ──< Campaign (*)
AIAgent (1) ──< Lead (*)    [assignedAgent]

Lead (1) ──< Call (*)
Lead (1) ──< Activity (*)
Lead (1) ──< AutomationLog (*)

Call (1) ──1 CallTranscript
Call (1) ──< AutomationLog (*)

Campaign (1) ──< Call (*)
```

### Key Indexes

| Table     | Index Columns                        | Purpose                      |
|-----------|--------------------------------------|------------------------------|
| User      | email, tenantId                      | Login, tenant isolation      |
| AIAgent   | tenantId, status                     | Agent list filtering         |
| Lead      | tenantId, status, phone, score       | Pipeline + search            |
| Call      | tenantId, agentId, leadId, startedAt | Dashboard metrics, history   |
| AuditLog  | tenantId, userId, action             | Compliance queries           |

### Multi-Tenant Isolation

Every model carries a `tenantId` foreign key. All service methods receive `tenantId` from the authenticated JWT and add it to every `WHERE` clause — ensuring **zero data leakage** between tenants.

```typescript
// Example: all queries scoped by tenantId
findAll(tenantId: string) {
  return this.prisma.lead.findMany({
    where: { tenantId, deletedAt: null }
  });
}
```

---

## Authentication & Authorization

### JWT Token Structure

```json
// Access Token payload (expires: 7d)
{
  "sub":      "clx1234...",
  "email":    "admin@company.com",
  "role":     "company_admin",
  "tenantId": "cly5678...",
  "iat":      1722000000,
  "exp":      1722604800
}
```

### Role Hierarchy

```
super_admin     → Full platform access (AgentCall AI staff only)
company_admin   → Full tenant access (CRUD all resources, billing)
manager         → Create/edit agents, manage team, view all data
agent           → View assigned leads, initiate calls
viewer          → Read-only access to dashboards
```

### RBAC Decorator Usage

```typescript
@Roles('company_admin', 'manager')   // restrict endpoint
@UseGuards(JwtAuthGuard, RolesGuard) // apply guards
@Delete(':id')
remove(@CurrentUser() user, @Param('id') id) { ... }
```

### Token Refresh Flow

```
Client                          Server
  │── POST /auth/login ────────────▶
  │◀─ { accessToken, refreshToken }─
  │
  │ (7 days later, access token expires)
  │
  │── POST /auth/refresh ──────────▶
  │   { refreshToken }
  │◀─ { accessToken, refreshToken }─ (new tokens)
```

---

## AI & Voice Pipeline

### Outbound Call Flow

```
1. API: POST /calls  { leadId, agentId }
         │
2. BullMQ: enqueue CallJob
         │
3. Worker: fetch agent config + lead data
         │
4. Twilio/Exotel: dial lead phone number
         │
5. On answer: stream audio ─────────────────────────────┐
         │                                               │
6. ElevenLabs TTS: agent opening script ◄───── GPT-4o   │
         │                              (conversation    │
7. STT (Deepgram): transcribe speech    engine)         │
         │                                               │
8. GPT-4o: analyse intent, generate response            │
         │                                               │
9. ElevenLabs: synthesise response audio ───────────────┘
         │
10. Repeat until call ends
         │
11. On hangup:
    - Save CallTranscript
    - Calculate sentimentScore, qualityScore
    - Update Lead status
    - Trigger post-call automations (WhatsApp, SMS, email)
    - Emit WebSocket event: call.completed
    - Update dashboard metrics cache
```

### AI Conversation State Machine

```
States:  greeting → qualification → pitch → objection_handling
         → closing → follow_up_booking → goodbye

Transitions triggered by: intent detection (GPT-4o), keyword rules,
                           qualification score threshold
```

### Intent Detection Labels

| Label          | Trigger                              | Action               |
|----------------|--------------------------------------|----------------------|
| `high_intent`  | "interested", "yes", "tell me more"  | Move to pitch stage  |
| `objection`    | "too expensive", "not now"           | Objection handler    |
| `request_human`| "speak to someone", "real person"    | Transfer call        |
| `callback`     | "call me later"                      | Schedule follow-up   |
| `not_interested`| "no thanks", "remove me"            | Mark closed_lost     |

---

## Real-time Architecture

### WebSocket Events

```typescript
// Server → Client (push)
'call.started'      { callId, leadName, agentName, timestamp }
'call.ended'        { callId, duration, outcome, sentimentScore }
'call.transferred'  { callId, transferTo }
'lead.updated'      { leadId, status, score }
'metrics.update'    { totalCalls, connected, qualified, ... }
'agent.status'      { agentId, status }
'notification'      { type, message, timestamp }

// Client → Server (subscribe)
'subscribe:tenant'  { tenantId }
'subscribe:calls'   { tenantId }
```

### Socket.io Rooms

```
Room naming:  tenant:{tenantId}       ← all users of a tenant
              agent:{agentId}         ← agent-specific events
              call:{callId}           ← live call events
```

---

## Queue & Background Jobs

### BullMQ Queues

| Queue              | Jobs                                    | Concurrency |
|--------------------|-----------------------------------------|-------------|
| `calls`            | InitiateCall, EndCall, TransferCall     | 50          |
| `ai-processing`    | GenerateResponse, AnalyseTranscript     | 20          |
| `automations`      | SendWhatsApp, SendSMS, SendEmail        | 30          |
| `analytics`        | UpdateMetrics, ComputeInsights          | 5           |
| `integrations`     | SyncCRM, PushToSheets                   | 10          |
| `billing`          | ProcessWebhook, SendInvoice             | 5           |

### Job Retry Policy

```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,  // keep last 100 completed
  removeOnFail: 200       // keep last 200 failed for debug
}
```

---

## Multi-Tenant Architecture

### Tenant Isolation Strategy

**Database Level** — every table has `tenantId` column + index. All Prisma queries include `WHERE tenantId = ?` enforced at service layer.

**Application Level** — `JwtStrategy` validates tenant is active on every request. Tenant suspended = all requests 401.

**Plan Limits** — `TenantGuard` (future) checks usage vs plan limits before expensive operations.

```
Plan Limits:
Starter:    2 agents,  500 calls/mo,  3 team members
Growth:     10 agents, 5000 calls/mo, 10 team members
Business:   unlimited, 50K calls/mo,  50 team members
Enterprise: unlimited, unlimited,     unlimited
```

### White Label Support

Enterprise tenants can set `whitelabelDomain` on their Tenant record. The frontend reads `x-tenant-domain` header and loads custom branding from tenant settings.

---

## Integrations

### CRM Sync Architecture

```
Lead Created/Updated
        │
        ▼
Integration Worker (BullMQ)
        │
        ├── Salesforce API → upsert Contact + Opportunity
        ├── HubSpot API    → upsert Contact + Deal
        ├── Zoho CRM API   → upsert Lead + Deal
        └── Google Sheets  → append row to spreadsheet
```

### Webhook Delivery

```
Event occurs (call.completed, lead.qualified, etc.)
        │
        ▼
Find tenant webhooks matching event
        │
        ▼
HTTP POST to webhook.url
Headers: X-AgentCall-Signature: sha256(secret + body)
Body: { event, data, timestamp, tenantId }
        │
        ├── 2xx → mark delivered
        └── error → retry 3× with exponential backoff
                  → failCount++ → auto-disable at 10 failures
```

### Calendar Booking Flow

```
AI detects appointment intent
        │
        ▼
Check agent's connected calendar (Google / Outlook)
        │
        ▼
Find next available slot (business hours)
        │
        ▼
Book slot via Calendar API
        │
        ▼
Send confirmation:
  - WhatsApp: "Your appointment is booked for {date} at {time}"
  - Email: HTML confirmation with calendar invite (.ics)
  - SMS: Short confirmation code
```

---

## Deployment Architecture

### Kubernetes Setup (AWS EKS)

```yaml
Deployments:
  frontend:    2 replicas  (Next.js)  → HPA: scale to 10
  backend-api: 3 replicas  (NestJS)   → HPA: scale to 20
  workers:     2 replicas  (BullMQ)   → HPA: scale to 10

Services:
  frontend-svc:   ClusterIP → Ingress (ALB)
  backend-svc:    ClusterIP → Ingress (ALB)
  redis:          ClusterIP (internal)

Storage:
  postgresql:     Supabase (managed)
  redis:          AWS ElastiCache
  files:          AWS S3

Ingress (ALB):
  /            → frontend-svc:3000
  /api/*       → backend-svc:3001
  /socket.io/* → backend-svc:3001 (sticky sessions)
```

### CI/CD Pipeline

```
GitHub Push → main
    │
    ├── Run Tests (jest)
    ├── Run Linting (eslint)
    ├── Build Docker Images
    │     ├── frontend:sha-xxxxx
    │     └── backend:sha-xxxxx
    ├── Push to ECR
    ├── Run Prisma migrations (staging)
    ├── Deploy to Staging (kubectl set image)
    ├── Run E2E smoke tests
    └── Deploy to Production (blue/green)
```

### Docker Configuration

```dockerfile
# Frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]

# Backend (similar multi-stage)
# Final image ~180MB
```

---

## Security

### Security Controls

| Control                  | Implementation                                      |
|--------------------------|-----------------------------------------------------|
| Authentication           | JWT RS256, 7-day expiry, refresh token rotation     |
| Authorization            | RBAC with 5 roles, checked on every endpoint        |
| Rate Limiting            | 100 req/60s per IP (ThrottlerGuard)                 |
| Input Validation         | class-validator whitelist + forbidNonWhitelisted    |
| SQL Injection            | Prisma parameterised queries (no raw SQL in apps)   |
| XSS                      | Next.js default escaping, Content-Security-Policy   |
| Secrets                  | AWS Secrets Manager / .env (never in code)          |
| Webhook Verification     | HMAC-SHA256 signature on all incoming webhooks      |
| API Keys                 | Bcrypt-hashed, prefix shown in UI                   |
| Audit Logs               | All mutations logged with user + IP                 |
| TLS                      | TLS 1.3 enforced at ALB, HSTS header                |
| CORS                     | Explicit allowlist, credentials: true               |
| Call Recordings          | S3 server-side encryption (AES-256), signed URLs    |

### Data Privacy

- Call recordings deleted after 90 days (configurable per tenant)
- PII masked in logs
- GDPR right-to-erasure: `DELETE /tenants/me` cascades all data
- Supabase Row Level Security as additional DB-level guard

---

## Performance & Scaling

### Caching Strategy

```
Redis Cache Keys:
  dashboard:{tenantId}:{range}     TTL: 60s   (live metrics)
  agent:stats:{agentId}            TTL: 300s  (agent performance)
  tenant:plan:{tenantId}           TTL: 3600s (plan/limits check)
  lead:score:{leadId}              TTL: 600s  (AI score cache)
```

### Database Query Optimisation

- Composite indexes on all common filter combinations
- Read replicas for analytics queries (heavy aggregations)
- `$queryRaw` for complex GROUP BY / window functions
- Pagination on all list endpoints (default page size: 20)
- `select` only needed columns in list queries

### Expected Throughput (per node)

| Metric                     | Value                    |
|----------------------------|--------------------------|
| API requests/sec           | 1,000 rps (single pod)   |
| Concurrent WebSocket conns | 10,000 (single pod)      |
| Concurrent AI calls        | 50 (worker pod)          |
| DB connections (pool)      | 10 per API pod           |
| Redis ops/sec              | 100,000                  |

---

*Document version: 1.0 · Last updated: August 2026*
