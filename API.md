# AgentCall AI — REST API Reference

> Base URL: `https://api.agentcall.ai/api/v1`
> Auth: `Authorization: Bearer <accessToken>`
> All responses: `{ success, data, timestamp }`

---

## Authentication

### POST /auth/register
Register a new company and admin user.

**Body**
```json
{
  "name":        "John Doe",
  "email":       "john@company.com",
  "password":    "SecurePass123!",
  "companyName": "Acme Corp"
}
```
**Response**
```json
{
  "accessToken":  "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user":   { "id": "...", "name": "John Doe", "email": "...", "role": "company_admin" },
  "tenant": { "id": "...", "name": "Acme Corp", "plan": "starter" }
}
```

### POST /auth/login
```json
{ "email": "john@company.com", "password": "SecurePass123!" }
```

### POST /auth/refresh
```json
{ "refreshToken": "eyJhbGci..." }
```

### GET /auth/me  `🔒`
Returns the authenticated user object.

---

## Agents

Base: `/agents`  Roles required: `company_admin`, `manager` for mutations.

### GET /agents
List all agents in tenant.

**Query Params**
| Param  | Type   | Description                             |
|--------|--------|-----------------------------------------|
| status | string | `draft` \| `active` \| `paused`         |
| role   | string | `telecaller` \| `sales` \| `recruiter`… |

**Response**
```json
[
  {
    "id": "cla1...",
    "name": "Priya AI",
    "role": "telecaller",
    "language": "hinglish",
    "voiceId": "priya-warm-v2",
    "status": "active",
    "_count": { "calls": 4821, "campaigns": 3 }
  }
]
```

### POST /agents
Create a new AI agent.

```json
{
  "name":               "Priya AI",
  "role":               "telecaller",
  "language":           "hinglish",
  "voiceId":            "priya-warm-v2",
  "businessGoal":       "Qualify inbound leads and book appointments",
  "openingScript":      "Hello {{name}}, main Priya bol rahi hoon...",
  "qualificationRules": "Budget > ₹50K, Decision maker",
  "knowledgeBase":      "Product: AgentCall AI SaaS platform..."
}
```

### GET /agents/:id
Get single agent with stats and recent campaigns.

### GET /agents/:id/stats
```json
{
  "totalCalls": 4821,
  "connectedCalls": 3847,
  "qualifiedLeads": 1543,
  "conversionRate": "32.0",
  "avgCallDuration": 184
}
```

### PATCH /agents/:id
Update agent configuration (partial update, any fields).

### POST /agents/:id/activate
Set agent status to `active`.

### POST /agents/:id/pause
Set agent status to `paused`.

### POST /agents/:id/duplicate
Clone agent (creates a `draft` copy with `(Copy)` suffix).

### DELETE /agents/:id  `⚠ company_admin only`
Soft-delete agent.

---

## Leads (CRM)

Base: `/leads`

### GET /leads
List leads with filtering and pagination.

**Query Params**
| Param     | Type    | Default | Description                        |
|-----------|---------|---------|------------------------------------|
| status    | string  | —       | Filter by pipeline stage           |
| search    | string  | —       | Search name, phone, company        |
| agentId   | string  | —       | Filter by assigned agent           |
| page      | number  | 1       | Page number                        |
| limit     | number  | 20      | Items per page (max 100)           |
| sortBy    | string  | createdAt | Sort field                       |
| sortOrder | string  | desc    | `asc` \| `desc`                    |

**Response**
```json
{
  "items": [ { "id": "...", "name": "Rahul Sharma", "status": "qualified", "score": 87, ... } ],
  "total": 247,
  "page": 1,
  "limit": 20,
  "pages": 13
}
```

### POST /leads
Create a single lead.

```json
{
  "name":    "Rahul Sharma",
  "phone":   "+919876543210",
  "email":   "rahul@company.com",
  "company": "Acme Corp",
  "source":  "website",
  "agentId": "cla1..."
}
```

### POST /leads/bulk
Import multiple leads at once.

```json
{
  "leads": [
    { "name": "Lead 1", "phone": "+91..." },
    { "name": "Lead 2", "phone": "+91..." }
  ]
}
```
Returns: `{ "count": 150 }` (number inserted, duplicates skipped)

### GET /leads/pipeline
Pipeline stage counts for kanban view.

```json
{
  "new": 45,
  "contacted": 38,
  "interested": 27,
  "qualified": 19,
  "appointment": 8,
  "closed_won": 12,
  "closed_lost": 21
}
```

### GET /leads/:id
Full lead detail with call history, activities, assigned agent.

### PATCH /leads/:id
Update lead fields.

### PATCH /leads/:id/status
Update pipeline stage.
```json
{ "status": "qualified" }
```

### DELETE /leads/:id
Soft-delete lead.

---

## Calls

Base: `/calls`

### GET /calls
List calls with filtering.

**Query Params**
| Param     | Type   | Description                               |
|-----------|--------|-------------------------------------------|
| status    | string | `queued` \| `in_progress` \| `completed`… |
| agentId   | string | Filter by agent                           |
| leadId    | string | Filter by lead                            |
| page      | number | Pagination                                |
| limit     | number | Page size                                 |

### POST /calls
Initiate a new AI call.

```json
{
  "leadId":    "clb2...",
  "agentId":   "cla1...",
  "direction": "outbound"
}
```

**Response**
```json
{
  "id":        "clc3...",
  "status":    "queued",
  "phone":     "+919876543210",
  "leadId":    "clb2...",
  "agentId":   "cla1...",
  "startedAt": "2026-08-30T10:00:00.000Z"
}
```

### GET /calls/metrics
Dashboard call KPIs.

**Query Params:** `range=today|week|month`

```json
{
  "total": 2847,
  "completed": 2134,
  "missed": 713,
  "failed": 48,
  "connectRate": "75.0",
  "avgDuration": 184
}
```

### GET /calls/:id
Full call detail with transcript and lead/agent references.

---

## Analytics

Base: `/analytics`

### GET /analytics/dashboard
Top-level KPIs.

**Query:** `range=today|week|month`

```json
{
  "totalCalls":      2847,
  "connected":       2134,
  "qualified":        847,
  "appointments":    134,
  "closedWon":        67,
  "connectRate":     "75.0",
  "conversionRate":  "29.7",
  "avgDuration":     184,
  "avgSentiment":    4.6
}
```

### GET /analytics/call-trend
Daily call volume over N days.

**Query:** `days=7`

```json
[
  { "day": "2026-08-24T00:00:00.000Z", "total_calls": 320, "connected": 241, "avg_sentiment": 4.3 },
  ...
]
```

### GET /analytics/agent-performance
Per-agent stats array.

```json
[
  {
    "id": "cla1...",
    "name": "Priya AI",
    "role": "telecaller",
    "totalCalls": 4821,
    "completedCalls": 3847,
    "avgDuration": 184,
    "avgSentiment": 4.7,
    "avgQuality": 88.3
  }
]
```

### GET /analytics/conversion-funnel
Lead pipeline conversion data.

```json
[
  { "stage": "new",        "count": 2847, "pct": 100 },
  { "stage": "contacted",  "count": 2134, "pct": 75.0 },
  { "stage": "interested", "count": 987,  "pct": 34.7 },
  { "stage": "qualified",  "count": 580,  "pct": 20.4 },
  { "stage": "appointment","count": 268,  "pct": 9.4 },
  { "stage": "closed_won", "count": 134,  "pct": 4.7 }
]
```

### GET /analytics/sentiment
Call sentiment distribution.

```json
[
  { "bucket": "very_positive", "count": 1082 },
  { "bucket": "positive",      "count": 827 },
  { "bucket": "neutral",       "count": 513 },
  { "bucket": "negative",      "count": 314 },
  { "bucket": "very_negative", "count": 111 }
]
```

### GET /analytics/lead-priority
Lead score distribution.

---

## Billing

Base: `/billing`

### GET /billing/plans  `🌐 public`
All available plans with pricing.

```json
{
  "starter":  { "name": "Starter",  "price": 299900, "agents": 2,   "callsPerMonth": 500   },
  "growth":   { "name": "Growth",   "price": 999900, "agents": 10,  "callsPerMonth": 5000  },
  "business": { "name": "Business", "price": 2999900,"agents": -1,  "callsPerMonth": 50000 }
}
```
*(prices in paise: 299900 = ₹2,999)*

### GET /billing/subscription  `🔒`
Current tenant subscription.

```json
{
  "plan": "growth",
  "subscriptionId": "pay_xxx",
  "planExpiresAt": "2026-09-30T00:00:00.000Z",
  "isActive": true
}
```

### POST /billing/order/:plan  `🔒 company_admin`
Create Razorpay order.

```json
{
  "id":       "order_xxx",
  "amount":   999900,
  "currency": "INR",
  "receipt":  "tenantId-growth-1722000000"
}
```

### POST /billing/verify  `🔒 company_admin`
Verify Razorpay payment and upgrade plan.

```json
{
  "razorpayOrderId":   "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "sha256sig...",
  "plan": "growth"
}
```

---

## Automations

Base: `/automations`

### POST /automations/send
Send a WhatsApp, SMS or Email message to a lead.

```json
{
  "leadId":   "clb2...",
  "type":     "whatsapp",
  "template": "Hello {{name}}, your appointment is confirmed for {{date}}.",
  "variables": { "date": "Monday 2 Sep at 11:00 AM" }
}
```

### POST /automations/post-call/:callId
Trigger all post-call automations for a call (brochure, confirmation, etc).

### GET /automations/logs
Automation send history.

**Query Params:** `type=whatsapp|sms|email`, `page`, `limit`

---

## Tenants (Workspace)

### GET /tenants/me
Current tenant details + user/agent counts.

### GET /tenants/me/usage
Usage vs plan limits.

```json
{
  "agentCount": 4,
  "callCount":  1823,
  "leadCount":  342,
  "userCount":  6
}
```

### PATCH /tenants/me  `🔒 company_admin`
Update workspace name, logo, settings.

---

## Users (Team)

### GET /users
All active users in tenant.

### POST /users/invite  `🔒 company_admin, manager`
Invite a team member.

```json
{
  "name":  "Sales Manager",
  "email": "manager@company.com",
  "role":  "manager"
}
```

### PATCH /users/:id/role  `🔒 company_admin`
```json
{ "role": "manager" }
```

### DELETE /users/:id  `🔒 company_admin`
Deactivate user.

---

## WebSocket Events

Connect: `wss://api.agentcall.ai` with `Authorization: Bearer <token>`

```javascript
// Subscribe to tenant events
socket.emit('subscribe:tenant', { tenantId: 'cly5678...' });

// Listen to live call feed
socket.on('call.started',   (data) => { /* { callId, leadName, agentName } */ });
socket.on('call.ended',     (data) => { /* { callId, duration, outcome, sentimentScore } */ });
socket.on('metrics.update', (data) => { /* { totalCalls, connected, qualified } */ });
socket.on('lead.updated',   (data) => { /* { leadId, status, score } */ });
socket.on('notification',   (data) => { /* { type, message, timestamp } */ });
```

---

## Error Codes

| HTTP Status | Code                   | Meaning                              |
|-------------|------------------------|--------------------------------------|
| 400         | BAD_REQUEST            | Validation failed, invalid input     |
| 401         | UNAUTHORIZED           | Missing or invalid JWT               |
| 403         | FORBIDDEN              | Insufficient role permissions        |
| 404         | NOT_FOUND              | Resource not found in tenant         |
| 409         | CONFLICT               | Email already registered             |
| 429         | TOO_MANY_REQUESTS      | Rate limit exceeded (100 req/60s)    |
| 500         | INTERNAL_SERVER_ERROR  | Unexpected server error              |

---

## Rate Limits

| Endpoint             | Limit              |
|----------------------|--------------------|
| All endpoints        | 100 req / 60s / IP |
| POST /auth/login     | 10 req / 60s / IP  |
| POST /auth/register  | 5 req / 60s / IP   |
| POST /calls          | 50 req / 60s       |

---

## SDK (Coming Soon)

```typescript
// JavaScript / TypeScript SDK
import { AgentCallClient } from '@agentcall/sdk';

const client = new AgentCallClient({ apiKey: 'ac_live_xxx' });

// Create a lead and immediately call them
const lead  = await client.leads.create({ name: 'Rahul', phone: '+91...' });
const call  = await client.calls.initiate({ leadId: lead.id, agentId: 'priya-ai' });

// Listen to real-time events
client.on('call.completed', (event) => {
  console.log(`Outcome: ${event.outcome}, Sentiment: ${event.sentimentScore}`);
});
```

---

*API Version: 1.0 · Base URL: https://api.agentcall.ai/api/v1*
*Swagger UI (dev): http://localhost:3001/api/v1/docs*
