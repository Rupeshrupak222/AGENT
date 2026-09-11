# Production Alerting Specifications & Operations Runbook

This document defines the production alerting policy for AgentCall AI based on empirical thresholds established during Day 22 load testing and failure recovery validation.

---

## 1. Alert Severity Levels & Notification Routes

| Severity | Definition | Response SLA | Target Channels |
|:---|:---|:---:|:---|
| **CRITICAL (P1)** | Complete service outage, data loss risk, or core dependency down | **< 15 minutes** | PagerDuty, Ops Phone Call, Slack `#alerts-critical` |
| **HIGH (P2)** | Customer-facing degradation, provider failure rate surge, queue stall | **< 30 minutes** | Slack `#alerts-high`, Ops Email |
| **MEDIUM (P3)** | Latency budget breach, non-critical queue accumulation, resource warning | **< 4 hours** | Slack `#alerts-warnings`, Daily Dashboard |

---

## 2. Alert Definitions Matrix

### 2.1 Critical Alerts (P1)

```yaml
- alert: ApiInstanceDown
  expr: up{job="agentcall-backend"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "AgentCall AI backend instance is unreachable"
    action: "Inspect container restart logs; check host memory and OOM killer."

- alert: PostgresConnectionFailure
  expr: agentcall_health_check_status{subsystem="database"} == 0
  for: 30s
  labels:
    severity: critical
  annotations:
    summary: "PostgreSQL database ping failed"
    action: "Verify connection pool limits; inspect database instance connectivity in Supabase/Neon."

- alert: RedisClusterDown
  expr: agentcall_health_check_status{subsystem="redis"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Redis broker offline; queues running in in-memory degraded mode"
    action: "Restart Redis container or check Upstash/managed Redis credentials."

- alert: QueueStalledOrDeadlocked
  expr: sum(bullmq_queue_waiting_jobs{queue=~"outbound-calls|post-call-analysis"}) > 500
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Critical queue backlog exceeds 500 jobs with zero active processing"
    action: "Inspect worker process logs; verify concurrency lock release."
```

### 2.2 High Alerts (P2)

```yaml
- alert: TelephonyFailureRateHigh
  expr: rate(agentcall_calls_failed_total[5m]) / rate(agentcall_calls_started_total[5m]) > 0.05
  for: 3m
  labels:
    severity: high
  annotations:
    summary: "Call failure rate exceeds 5% of all started outbound/inbound calls"
    action: "Inspect Twilio/Exotel webhook logs for error code 30008, 11200, or carrier rejection."

- alert: AiProviderTimeoutSpike
  expr: rate(agentcall_ai_inference_errors_total[5m]) > 10
  for: 2m
  labels:
    severity: high
  annotations:
    summary: "AI provider inference timeouts exceeding 10 per minute"
    action: "Check Groq/Gemini/Deepgram rate limits; fallback to secondary LLM model."

- alert: AppointmentBookingFailureSurge
  expr: rate(agentcall_appointment_booking_errors_total[10m]) > 5
  for: 5m
  labels:
    severity: high
  annotations:
    summary: "Cal.com or internal calendar booking failures elevated"
    action: "Verify API token expiration, slot conflict handling, and webhook synchronization."

- alert: CrmSyncFailureRateHigh
  expr: rate(agentcall_crm_sync_failed_total[10m]) / rate(agentcall_crm_sync_total[10m]) > 0.10
  for: 5m
  labels:
    severity: high
  annotations:
    summary: "CRM synchronization failure rate exceeds 10%"
    action: "Inspect CRM OAuth tokens for expired refresh tokens in Hubspot/Salesforce/Zoho."
```

### 2.3 Medium Alerts (P3)

```yaml
- alert: ApiLatencyP95BudgetBreach
  expr: histogram_quantile(0.95, sum(rate(http_request_duration_ms_bucket[5m])) by (le)) > 250
  for: 5m
  labels:
    severity: medium
  annotations:
    summary: "P95 API latency exceeds measured Day 22 budget (250ms threshold; normal load is <50ms)"
    action: "Review slow query logs and high-concurrency endpoints (/analytics/dashboard)."

- alert: RedisMemoryUtilizationHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.80
  for: 10m
  labels:
    severity: medium
  annotations:
    summary: "Redis memory exceeds 80% of capacity"
    action: "Trigger BullMQ completed job cleanup; verify retention policies."
```

---

## 3. Incident Escalation & Triaging Procedures

1. **Acknowledge**: Triage engineer acknowledges P1 alert within 15 minutes.
2. **Health Probe Verification**: Run `curl -s http://<instance>/api/v1/health/ready` to evaluate component degradation map.
3. **Log Correlation**: Search CloudWatch / Grafana Loki using `x-correlation-id` from the failing request.
4. **Degraded Mode Verification**: Confirm in-memory fallback queues are shielding incoming customer webhooks.
5. **Mitigation**: Failover or rolling restart without state loss.
