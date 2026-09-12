# AgentCall AI — Production Deployment & Cloud Hosting Guide

This guide details how to take **AgentCall AI** from local development (`localhost`) to a 24/7 high-availability production cloud deployment.

---

## 1. System Architecture

```
                               ┌────────────────────────────────┐
                               │       Internet Users / SIP     │
                               └───────────────┬────────────────┘
                                               │ HTTPS / WSS
                                               ▼
                         ┌─────────────────────────────────────────────┐
                         │         Reverse Proxy (Nginx / Cloudflare)   │
                         └──────────────┬──────────────────────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │   Next.js 14 Web Frontend   │               │   NestJS 10 Telephony API   │
  │   (Vercel / Docker:3000)    │               │   (Railway / Docker:3001)   │
  └──────────────┬──────────────┘               └──────────────┬──────────────┘
                 │                                             │
                 │      WebSocket Live Stats / REST APIs       │
                 └──────────────────────┬──────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
          ┌─────────────────────────────┐ ┌─────────────────────────────┐
          │   PostgreSQL 15 Database    │ │    Redis 7 Queue / Cache    │
          │  (Neon / Supabase / Port 5432)│ │ (AOF Persistence / Port 6379)│
          └─────────────────────────────┘ └─────────────────────────────┘
```

---

## 2. Deployment Strategies

### Strategy A: Managed Cloud (Recommended for Speed & Scalability)

This approach gives you a fast, zero-maintenance, autoscaling setup with free or low-cost tiers:

#### Step 1: Managed PostgreSQL Database (Neon / Supabase)
1. Create a free project on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy your PostgreSQL connection string:
   ```bash
   DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-1.neon.tech/agentcall_db?sslmode=require"
   ```
3. Run database migrations and seedings from your terminal:
   ```bash
   cd db
   npx prisma migrate deploy
   npx ts-node seed.ts
   npx ts-node seed-adyapan.ts
   npx ts-node seed-knowledge-adyapan.ts
   ```

#### Step 2: Managed Backend & Redis (Railway / Render)
1. Create a new service on [Railway](https://railway.app) or [Render](https://render.com).
2. Connect your GitHub repository: `Rupeshrupak222/AGENT`.
3. Set root directory to `backend`.
4. Add a Redis database plugin/addon inside Railway.
5. Set environment variables (see Section 3 below).
6. Build command: `npm install && npm run build`.
7. Start command: `npm run start:prod`.
8. Copy your live backend URL (e.g. `https://api.agentcall.ai` or `https://backend-production-xxxx.up.railway.app`).

#### Step 3: Frontend Web Application (Vercel)
1. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select your GitHub repository (`Rupeshrupak222/AGENT`).
3. Set **Root Directory** to `frontend`.
4. Framework Preset: **Next.js**.
5. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://<your-railway-backend-url>/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL=https://<your-railway-backend-url>`
6. Click **Deploy**. Vercel will build and assign your production domain (e.g. `https://agentcall-ai.vercel.app`).

---

### Strategy B: Self-Hosted Single VPS (DigitalOcean / AWS EC2 / Hetzner)

If you prefer keeping everything on a single private virtual machine ($12–$24/month Droplet):

#### Step 1: Provision Ubuntu 22.04 / 24.04 Server
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose git nginx certbot python3-certbot-nginx
sudo systemctl enable docker && sudo systemctl start docker
```

#### Step 2: Clone and Configure
```bash
git clone https://github.com/Rupeshrupak222/AGENT.git /opt/agentcall
cd /opt/agentcall
cp .env.example .env
# Edit .env with your production secrets
nano .env
```

#### Step 3: Launch Multi-Container Production Topology
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```
This automatically starts:
- `agentcall-prod-postgres` (PostgreSQL 15 with automated daily backup script)
- `agentcall-prod-redis` (Redis 7 with AOF persistence)
- `agentcall-prod-backend` (NestJS clustering with health checks)
- `agentcall-prod-frontend` (Next.js standalone production build)

#### Step 4: Setup SSL & Domain Routing
```bash
sudo certbot --nginx -d agentcall.ai -d api.agentcall.ai
```

---

## 3. Production Environment Variables Checklist

Ensure these values are configured in your production environment:

| Variable Name | Description | Example / Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Backend listening port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/agentcall_db` |
| `REDIS_HOST` | Redis host | `redis` (Docker) or Railway Redis host |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | 256-bit cryptographically secure secret | Generate via `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | 256-bit refresh token secret | Generate via `openssl rand -hex 32` |
| `CORS_ORIGIN` | Allowed web domain | `https://agentcall.ai,https://app.agentcall.ai` |
| `TWILIO_ACCOUNT_SID` | Twilio SID for global calling | `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Secret Token | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` |
| `EXOTEL_API_KEY` | Exotel API Key for India PSTN | `xxxxxxxxxxxxxxxxxxxx` |
| `EXOTEL_API_TOKEN` | Exotel API Token | `xxxxxxxxxxxxxxxxxxxx` |
| `EXOTEL_ACCOUNT_SID` | Exotel Account SID | `acme123` |

---

## 4. Telephony Webhook URLs to Register with Providers

Once deployed to your domain (`https://api.yourdomain.com`):

### 🇮🇳 Exotel (India Virtual Numbers)
- **Inbound Passthru Applet URL**:
  `https://api.yourdomain.com/api/v1/telephony/webhooks/incoming/exotel`
- **Call Status Callback URL**:
  `https://api.yourdomain.com/api/v1/telephony/webhooks/status/exotel`

### 🌐 Twilio (US & Global DIDs)
- **Voice Inbound Webhook (HTTP POST)**:
  `https://api.yourdomain.com/api/v1/telephony/webhooks/incoming/twilio`
- **Status Callback URL**:
  `https://api.yourdomain.com/api/v1/telephony/webhooks/status/twilio`

---

## 5. System Health & Verification Checks

After deployment, verify that all services are operational:

1. **Backend Health Check**:
   ```bash
   curl -I https://api.yourdomain.com/api/v1/health
   # Expected: HTTP/1.1 200 OK
   ```

2. **Telephony Engine Readiness**:
   ```bash
   curl https://api.yourdomain.com/api/v1/telephony/status
   # Expected: {"status":"READY","providers":{"twilio":true,"exotel":true,"sandbox":true}}
   ```

3. **Frontend Dashboard**:
   - Navigate to `https://yourdomain.com/login`
   - Log in with Demo credentials:
     - Platform Super Admin: `superadmin@agentcall.ai` / `Demo@1234`
     - Company Executive Admin: `admin@acmecorp.com` / `Demo@1234`
     - Operations Manager: `manager@acmecorp.com` / `Demo@1234`
