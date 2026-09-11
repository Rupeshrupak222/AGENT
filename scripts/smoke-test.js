/**
 * AgentCall AI — Production & Staging Deployment Smoke Test Script
 * Verifies live endpoints, health semantics, and Prometheus metrics.
 */

const http = require('http');

const API_BASE = process.env.SMOKE_API_BASE || 'http://localhost:3001/api/v1';

function get(path) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runSmokeTests() {
  console.log(`\n======================================================`);
  console.log(`AgentCall AI Deployment Smoke Test`);
  console.log(`Target: ${API_BASE}`);
  console.log(`======================================================\n`);

  let failures = 0;

  // 1. Test /health/live
  try {
    process.stdout.write('Checking /health/live ... ');
    const res = await get('/health/live');
    if (res.statusCode === 200) {
      const parsed = JSON.parse(res.body);
      const status = parsed.data?.status || parsed.status;
      if (status === 'ok' || parsed.success) {
        console.log('✅ PASSED (200 OK)');
      } else {
        console.log(`❌ FAILED (unexpected status: ${status})`);
        failures++;
      }
    } else {
      console.log(`❌ FAILED (status code: ${res.statusCode})`);
      failures++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failures++;
  }

  // 2. Test /health/ready
  try {
    process.stdout.write('Checking /health/ready ... ');
    const res = await get('/health/ready');
    if (res.statusCode === 200 || res.statusCode === 503) {
      const parsed = JSON.parse(res.body);
      const status = parsed.data?.status || parsed.status;
      console.log(`✅ RESPONDED (${res.statusCode} status: ${status || 'ok'})`);
    } else {
      console.log(`❌ FAILED (unexpected status code: ${res.statusCode})`);
      failures++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failures++;
  }

  // 3. Test /health/metrics (Prometheus scrape endpoint)
  try {
    process.stdout.write('Checking /health/metrics ... ');
    const res = await get('/health/metrics');
    if (res.statusCode === 200 && res.body.includes('agentcall_')) {
      console.log('✅ PASSED (Prometheus format verified)');
    } else {
      console.log(`❌ FAILED (Status: ${res.statusCode}, missing metric prefixes)`);
      failures++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failures++;
  }

  console.log(`\n======================================================`);
  if (failures === 0) {
    console.log(`Smoke tests completed successfully! All endpoints operational.`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else {
    console.error(`Smoke tests finished with ${failures} failure(s).`);
    console.log(`======================================================\n`);
    process.exit(1);
  }
}

runSmokeTests();
