# Staging Environment Configuration Reference

This document catalogs the **variable names** a staging deployment must supply. It deliberately contains **no secret values** — credentials are injected via the hosting platform's secret manager / CI variables and must never be committed.

Truth source for the full inventory: `backend/.env.example` (backend), `frontend/.env.example` (frontend), and the compose files. The release gate (`GATE_STAGING_DEPLOY`) is `BLOCKED` until a staging target is provisioned; this reference unblocks accurate provisioning.

---

## 1. Core / Runtime (Backend)

| Variable | Purpose | Staging Default |
|:---|:---|:---|
| `NODE_ENV` | Runtime mode — MUST be `production` on staging (queue durability contract enforced) | `production` |
| `PORT` | Backend HTTP/WS listener port | `3001` |
| `API_PREFIX` | REST route prefix | `/api/v1` |
| `CORS_ORIGIN` | Allowed frontend origin(s) | staging frontend URL |
| `FRONTEND_URL` | Canonical frontend base URL (links, CORS) | staging frontend URL |

## 2. Database (PostgreSQL 15+)

| Variable | Purpose |
|:---|:---|
| `DATABASE_URL` | Prisma connection string (pooled, SSL in transit) |
| `POSTGRES_DB` | Staging database name |
| `POSTGRES_USER` | Staging database user |
| `POSTGRES_PASSWORD` | Staging database password |
| `POSTGRES_PORT` | Database port |

## 3. Redis / Queues (Redis 7+)

| Variable | Purpose |
|:---|:---|
| `REDIS_HOST` | Broker host |
| `REDIS_PORT` | Broker port |
| `REDIS_PASSWORD` | Broker auth (if any) |

## 4. Authentication & Security

| Variable | Purpose |
|:---|:---|
| `JWT_SECRET` | Access-token signing secret (256-bit) |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret (256-bit) |
| `JWT_EXPIRES_IN` | Access-token TTL |
| `JWT_REFRESH_EXPIRES_IN` | Refresh-token TTL |
| `THROTTLE_TTL` | Rate-limiter window (seconds) |
| `THROTTLE_LIMIT` | Rate-limiter max requests per window |

## 5. AI / LLM / Speech

| Variable | Purpose |
|:---|:---|
| `GROQ_API_KEY` / `GROQ_MODEL` | Primary LLM inference |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Secondary LLM inference |
| `DEEPGRAM_API_KEY` | Real-time transcription |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_BASE_URL` | Text-to-speech |
| `TTS_PROVIDER` | Active TTS provider selector |

## 6. Telephony / Voice (Twilio / Exotel)

| Variable | Purpose |
|:---|:---|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio auth |
| `TWILIO_PHONE_NUMBER` | Verified outbound caller ID |
| `EXOTEL_API_KEY` / `EXOTEL_API_TOKEN` / `EXOTEL_SID` / `EXOTEL_SUBDOMAIN` | Exotel fallback trunk (SIP failover) |

## 7. Messaging & Email

| Variable | Purpose |
|:---|:---|
| `WHATSAPP_ACCESS_TOKEN` | Meta Graph API token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sender phone number ID |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID |
| `WHATSAPP_VERIFY_TOKEN` | Webhook verification token |
| `WHATSAPP_APP_SECRET` | Webhook signature verification |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Email delivery |

## 8. Calendar (Cal.com)

| Variable | Purpose |
|:---|:---|
| `CALCOM_API_KEY` | Cal.com API token |
| `CALCOM_API_URL` | Cal.com base URL |
| `CALCOM_EVENT_TYPE_ID` | Booking event type |
| `CALCOM_TIMEZONE` | Scheduling timezone |
| `CALCOM_DEFAULT_DURATION` | Default booking duration (minutes) |

## 9. Payments

| Variable | Purpose |
|:---|:---|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment processing (use Razorpay staging/test keys) |

## 10. Object Storage (Recordings)

| Variable | Purpose |
|:---|:---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | S3-compatible storage credentials |
| `AWS_REGION` | Storage region |
| `AWS_S3_BUCKET` | Recording bucket |

## 11. Frontend

| Variable | Purpose |
|:---|:---|
| `NEXT_PUBLIC_API_URL` | Backend REST base URL exposed to the browser |
| `NEXT_PUBLIC_WS_URL` | Backend WebSocket base URL exposed to the browser |

---

## Provisioning Rules

1. Copy keys from `backend/.env.example` and `frontend/.env.example`; never copy `.env` values.
2. Generate distinct `JWT_SECRET` / `JWT_REFRESH_SECRET` per environment (256-bit random).
3. `NODE_ENV=production` is mandatory on staging — this activates the Day 24 durable-queue contract (silent in-memory fallback forbidden).
4. Configure the smoke-test variables when a target exists: `SMOKE_API_BASE` (or `TARGET_URL` for `scripts/smoke-test.js`) and optional `TARGET_URL`/`LOAD_TARGET_URL` for `scripts/load-test.js`, plus `SMOKE_EMAIL`/`SMOKE_PASSWORD` for authenticated checks.
5. CI mapping is already wired: `staging-deploy.yml` passes `SMOKE_API_BASE: ${{ vars.STAGING_API_URL }}`.