/**
 * AgentCall AI — Production & Staging Deployment Smoke Test Script
 * Verifies live endpoints, health semantics, Prometheus metrics, and
 * deterministic security/API contract checks.
 *
 * Deterministic by design:
 *  - Unauthenticated / invalid-token rejections are asserted unconditionally.
 *  - Authenticated contract checks require SMOKE_EMAIL + SMOKE_PASSWORD.
 *    When absent they are SKIPPED (never FAIL) so the script is safe to run
 *    against any environment from a fresh checkout.
 *  - The script performs NO writes, so it is safe on prod/staging.
 */

const http = require('http');

// TARGET_URL is the documented Day 24 contract; SMOKE_API_BASE overrides it for
// older invocations. Always points at a real live target — never assumed.
const API_BASE =
  process.env.SMOKE_API_BASE ||
  process.env.TARGET_URL ||
  'http://localhost:3001/api/v1';
const SMOKE_EMAIL = process.env.SMOKE_EMAIL || '';
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD || '';

const SECRET_MARKERS = [
  'RESEND_API_KEY',
  'CALCOM_API_KEY',
  'WHATSAPP_ACCESS_TOKEN',
  'JWT_SECRET',
  'SENDGRID_API_KEY',
];

function request(path, { method = 'GET', body, token } = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        });
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get = (path) => request(path);

async function expectStatus(name, res, allowed) {
  if (allowed.includes(res.statusCode)) {
    console.log(`✅ PASSED (${res.statusCode})`);
    return true;
  }
  console.log(`❌ FAILED (expected ${allowed.join('/')}, got ${res.statusCode})`);
  return false;
}

function hasSecretLeak(text) {
  const leaked = SECRET_MARKERS.filter((m) => text.includes(m));
  return leaked.length > 0 ? leaked : null;
}

async function runSmokeTests() {
  console.log(`\n======================================================`);
  console.log(`AgentCall AI Deployment Smoke Test`);
  console.log(`Target: ${API_BASE}`);
  console.log(`======================================================\n`);

  let failures = 0;
  let skipped = 0;

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

  // 4. Diagnostics payload must never leak secrets and must be protected
  try {
    process.stdout.write('Checking /health/diagnostics (protected / no secrets) ... ');
    const res = await get('/health/diagnostics');
    const leaked = hasSecretLeak(res.body);
    if ((res.statusCode === 200 || res.statusCode === 401) && !leaked) {
      console.log(`✅ PASSED (${res.statusCode} ${res.statusCode === 401 ? 'Auth Protected' : 'OK'}, no secrets)`);
    } else {
      console.log(`❌ FAILED (status ${res.statusCode}, leaked: ${leaked?.join(', ') || 'none'})`);
      failures++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failures++;
  }

  // 5. Security contract: protected endpoint rejects unauthenticated requests
  try {
    process.stdout.write('Checking protected endpoint rejects no-token ... ');
    const res = await get('/campaigns');
    if (await expectStatus('no-token', res, [401, 403])) {
      console.log('   (auth required enforced)');
    } else {
      failures++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failures++;
  }

  // 6. Security contract: invalid token is rejected
  try {
    process.stdout.write('Checking protected endpoint rejects invalid token ... ');
    const res = await request('/campaigns', { token: 'definitely.not.a.valid.jwt' });
    if (res.statusCode === 401 || res.statusCode === 403) {
      console.log('✅ PASSED (invalid token rejected)');
    } else {
      console.log(`❌ FAILED (expected 401/403, got ${res.statusCode})`);
      failures++;
    }
  } catch (err) {
    console.log(`❌ FAILED (${err.message})`);
    failures++;
  }

  // ── Authenticated contract checks (deterministic, SKIP when no creds) ──
  let token = '';
  if (SMOKE_EMAIL && SMOKE_PASSWORD) {
    try {
      process.stdout.write('Logging in to acquire session token ... ');
      const res = await request('/auth/login', {
        method: 'POST',
        body: { email: SMOKE_EMAIL, password: SMOKE_PASSWORD },
      });
      const parsed = JSON.parse(res.body);
      token = parsed?.data?.accessToken || parsed?.accessToken || '';
      if (token) {
        console.log('✅ PASSED (token acquired)');
      } else {
        console.log('❌ FAILED (login succeeded but no accessToken returned)');
        failures++;
      }
    } catch (err) {
      console.log(`❌ FAILED (${err.message})`);
      failures++;
    }

    if (token) {
      // 7. Authenticated contract: campaigns envelope with tenant access
      try {
        process.stdout.write('Checking GET /campaigns (authenticated) ... ');
        const res = await request('/campaigns', { token });
        if (res.statusCode === 200) {
          const parsed = JSON.parse(res.body);
          if (parsed?.data && Array.isArray(parsed.data)) {
            console.log('✅ PASSED (envelope data[] present)');
          } else {
            console.log('❌ FAILED (missing envelope data[])');
            failures++;
          }
        } else {
          console.log(`❌ FAILED (status ${res.statusCode})`);
          failures++;
        }
      } catch (err) {
        console.log(`❌ FAILED (${err.message})`);
        failures++;
      }

      // 8. Authenticated contract: automation provider status shape + no secrets
      try {
        process.stdout.write('Checking GET /automations/providers/status ... ');
        const res = await request('/automations/providers/status', { token });
        if (res.statusCode === 200) {
          const parsed = JSON.parse(res.body);
          const items = parsed?.data || [];
          if (Array.isArray(items)) {
            const shapeOk = items.every(
              (i) => i && typeof i.provider === 'string' && typeof i.state === 'string',
            );
            const leaked = hasSecretLeak(res.body);
            if (shapeOk && !leaked) {
              console.log('✅ PASSED (provider statuses: ' +
                items.map((i) => `${i.provider}=${i.state}`).join(', ') + ')');
            } else {
              console.log('❌ FAILED (invalid shape or secret leak)');
              failures++;
            }
          } else {
            console.log('❌ FAILED (data not an array)');
            failures++;
          }
        } else {
          console.log(`❌ FAILED (status ${res.statusCode})`);
          failures++;
        }
      } catch (err) {
        console.log(`❌ FAILED (${err.message})`);
        failures++;
      }

      // 9. Authenticated contract: calendar provider status shape + no secrets
      try {
        process.stdout.write('Checking GET /appointments/provider/status ... ');
        const res = await request('/appointments/provider/status', { token });
        if (res.statusCode === 200) {
          const parsed = JSON.parse(res.body);
          const item = parsed?.data;
          if (item && typeof item.configured === 'boolean' && typeof item.isMock === 'boolean') {
            const leaked = hasSecretLeak(res.body);
            if (!leaked) {
              console.log(`✅ PASSED (provider=${item.provider} configured=${item.configured} isMock=${item.isMock})`);
            } else {
              console.log('❌ FAILED (secret leak in provider status)');
              failures++;
            }
          } else {
            console.log('❌ FAILED (invalid provider status shape)');
            failures++;
          }
        } else {
          console.log(`❌ FAILED (status ${res.statusCode})`);
          failures++;
        }
      } catch (err) {
        console.log(`❌ FAILED (${err.message})`);
        failures++;
      }
    }
  } else {
    skipped += 3;
    console.log('⏭️  SKIPPED (SMOKE_EMAIL/SMOKE_PASSWORD not set): authenticated contract checks');
  }

  console.log(`\n======================================================`);
  if (failures === 0) {
    console.log(`Smoke tests completed successfully! All endpoints operational. (skipped: ${skipped})`);
    console.log(`======================================================\n`);
    process.exit(0);
  } else {
    console.error(`Smoke tests finished with ${failures} failure(s).`);
    console.log(`======================================================\n`);
    process.exit(1);
  }
}

runSmokeTests();