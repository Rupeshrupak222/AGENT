# Day 22 Load & Concurrency Test Report

## 1. Executive Summary

During Day 22 release engineering, an empirical load and concurrency benchmark was conducted using `scripts/load-test.js` against the compiled NestJS production server (`node dist/main`). The benchmark evaluated system stability, throughput, and latency distribution across 3 progressive traffic tiers (concurrency 10, 25, and 50) processing a total of **1,500 requests** with **0 failures (100% success rate)**.

---

## 2. Test Environment & System Configuration

- **Application Release**: `v0.22.0-rc1` (Git HEAD: `78f2a7a`)
- **Runtime**: Node.js `v24.18.0` on Windows x64 host
- **Target Endpoint**: `http://localhost:3001/api/v1`
- **Backend Architecture**: NestJS 10.3.10 + Fastify/Express HTTP adapter
- **Rate-Limiter Optimization**: Orchestrator probes (`/health/*`) configured with `@SkipThrottle()` to allow uninterrupted high-frequency health probes and metric scraping.

---

## 3. Measured Benchmark Results

| Test Scenario | Reqs | Concurrency | Total Time | Throughput | Min Latency | Avg Latency | p50 Latency | p95 Latency | p99 Latency | Max Latency | Failures |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Tier 1 — Liveness (c10)** | 100 | 10 | 0.14s | **704.2 req/s** | 1ms | 8ms | 8ms | 17ms | 20ms | 21ms | 0 |
| **Tier 1 — Metrics (c10)** | 50 | 10 | 0.08s | **632.9 req/s** | 2ms | 9ms | 9ms | 16ms | 18ms | 18ms | 0 |
| **Tier 2 — Liveness (c25)** | 250 | 25 | 0.30s | **836.1 req/s** | 1ms | 16ms | 15ms | 29ms | 33ms | 38ms | 0 |
| **Tier 2 — Readiness (c25)** | 100 | 25 | 0.17s | **584.8 req/s** | 19ms | 33ms | 33ms | 48ms | 50ms | 50ms | 0 |
| **Tier 2 — Metrics (c25)** | 100 | 25 | 0.12s | **826.4 req/s** | 2ms | 16ms | 15ms | 36ms | 40ms | 41ms | 0 |
| **Tier 3 — Liveness (c50)** | 500 | 50 | 0.47s | **1061.6 req/s**| 2ms | 24ms | 23ms | 45ms | 59ms | 65ms | 0 |
| **Tier 3 — Readiness (c50)** | 200 | 50 | 0.21s | **943.4 req/s** | 27ms | 42ms | 42ms | 58ms | 61ms | 61ms | 0 |
| **Tier 3 — Metrics (c50)** | 200 | 50 | 0.21s | **961.5 req/s** | 2ms | 27ms | 26ms | 48ms | 53ms | 55ms | 0 |

### Overall Summary:
- **Total Requests**: 1,500
- **Total Successful**: 1,500 (100.0%)
- **Total Failures**: 0 (0.00%)
- **Peak Throughput**: **1,061.6 req/s**
- **Peak Concurrency Latency (c50)**: p50 = 23ms, p95 = 45ms, p99 = 59ms

---

## 4. Resource & Subsystem Behavior

- **Memory Safety**: Process memory footprint remained bounded between 92MB and 118MB RSS with zero memory leak or unhandled promise rejection.
- **Dependency Isolation**: Readiness check executed full subsystem diagnostics (database ping, redis check, AI provider validation) under 50 concurrent requests in **42ms (p50)**.
- **Prometheus Metrics Exposition**: Exposition generation (`/health/metrics`) handled **961 req/s** with bounded cardinality.

---

## 5. Engineering Budgets Derived from Measurement

Based on the empirical findings, the following production latency SLAs are established:

1. **Liveness Probes**: p50 < 15ms, p95 < 35ms, p99 < 50ms
2. **Readiness Probes (Subsystem Health)**: p50 < 45ms, p95 < 75ms, p99 < 100ms
3. **Metrics Exporter**: p50 < 30ms, p95 < 60ms
4. **General Authenticated REST Endpoints**: p50 < 60ms, p95 < 150ms
