/**
 * AgentCall AI — Production Load Testing Script
 * Executes controlled, safe concurrent load against API endpoints
 * and measures throughput, min, max, p50, p95, p99 latencies.
 *
 * Targets:
 *  - /health/live (Liveness probe under load)
 *  - /health/ready (Readiness probe under load)
 *  - /health/metrics (Prometheus telemetry export under load)
 *
 * Concurrency tiers: 10, 25, 50 concurrent requests.
 * Zero external dependencies (uses native Node.js http module).
 */

const http = require('http');

const TARGET_URL = process.env.LOAD_TARGET_URL || 'http://localhost:3001/api/v1';

function singleRequest(url) {
  return new Promise((resolve) => {
    const started = Date.now();
    http
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            durationMs: Date.now() - started,
          });
        });
      })
      .on('error', (err) => {
        resolve({
          success: false,
          statusCode: 0,
          error: err.message,
          durationMs: Date.now() - started,
        });
      });
  });
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const count = sorted.length;
  const p50 = sorted[Math.floor((count - 1) * 0.5)];
  const p95 = sorted[Math.floor((count - 1) * 0.95)];
  const p99 = sorted[Math.floor((count - 1) * 0.99)];
  const min = sorted[0];
  const max = sorted[count - 1];
  const avg = Math.round(sorted.reduce((sum, v) => sum + v, 0) / count);
  return { min, max, avg, p50, p95, p99 };
}

async function runTier(name, path, totalRequests, concurrency) {
  process.stdout.write(`  [${name}] ${totalRequests} reqs @ concurrency ${concurrency} ... `);
  const url = `${TARGET_URL}${path}`;
  const latencies = [];
  let successes = 0;
  let failures = 0;

  const startedAt = Date.now();
  let completed = 0;

  for (let i = 0; i < totalRequests; i += concurrency) {
    const batchSize = Math.min(concurrency, totalRequests - i);
    const promises = [];
    for (let j = 0; j < batchSize; j++) {
      promises.push(
        singleRequest(url).then((res) => {
          latencies.push(res.durationMs);
          if (res.success) successes++;
          else failures++;
          completed++;
        }),
      );
    }
    await Promise.all(promises);
  }

  const elapsedSec = (Date.now() - startedAt) / 1000;
  const rps = (totalRequests / elapsedSec).toFixed(1);
  const stats = calculatePercentiles(latencies);

  console.log(`✅ Completed in ${elapsedSec.toFixed(2)}s (${rps} req/s)`);
  console.log(`     Success: ${successes} | Failed: ${failures}`);
  console.log(`     Latencies: min=${stats.min}ms | avg=${stats.avg}ms | p50=${stats.p50}ms | p95=${stats.p95}ms | p99=${stats.p99}ms | max=${stats.max}ms`);

  return {
    name,
    path,
    totalRequests,
    concurrency,
    successes,
    failures,
    elapsedSec,
    rps: Number(rps),
    stats,
  };
}

async function main() {
  console.log('\n=============================================================');
  console.log('AgentCall AI — Production Load & Concurrency Benchmark');
  console.log(`Target: ${TARGET_URL}`);
  console.log('=============================================================\n');

  // Verify connectivity first
  const preflight = await singleRequest(`${TARGET_URL}/health/live`);
  if (!preflight.success) {
    console.error(`❌ Pre-flight check failed: Target ${TARGET_URL}/health/live unreachable (${preflight.error || preflight.statusCode})`);
    process.exit(1);
  }

  const results = [];

  console.log('Tier 1 — Concurrency 10 (Light Baseline):');
  results.push(await runTier('health-live-c10', '/health/live', 100, 10));
  results.push(await runTier('health-metrics-c10', '/health/metrics', 50, 10));

  console.log('\nTier 2 — Concurrency 25 (Standard Production Traffic):');
  results.push(await runTier('health-live-c25', '/health/live', 250, 25));
  results.push(await runTier('health-ready-c25', '/health/ready', 100, 25));
  results.push(await runTier('health-metrics-c25', '/health/metrics', 100, 25));

  console.log('\nTier 3 — Concurrency 50 (Peak Traffic Burst):');
  results.push(await runTier('health-live-c50', '/health/live', 500, 50));
  results.push(await runTier('health-ready-c50', '/health/ready', 200, 50));
  results.push(await runTier('health-metrics-c50', '/health/metrics', 200, 50));

  console.log('\n=============================================================');
  console.log('LOAD TEST SUMMARY:');
  const allFailures = results.reduce((acc, r) => acc + r.failures, 0);
  const totalReqs = results.reduce((acc, r) => acc + r.totalRequests, 0);
  console.log(`Total Requests Processed: ${totalReqs}`);
  console.log(`Total Failures:           ${allFailures}`);
  console.log(`Status:                   ${allFailures === 0 ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('=============================================================\n');

  if (process.env.JSON_OUTPUT) {
    console.log(JSON.stringify(results, null, 2));
  }

  process.exit(allFailures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal load test failure:', err);
  process.exit(1);
});
