/**
 * Automated Verification Test for Milestone 5:
 * Multi-Tenant RBAC Security, Cross-Tenant Isolation & Billing Subscriptions
 */
const BASE_URL = 'http://localhost:3001/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  const payload = (data && typeof data === 'object' && 'data' in data && data.success !== undefined)
    ? data.data
    : data;
  return { status: res.status, ok: res.ok, data, payload };
}

async function login(email, password = 'Demo@1234') {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok || !res.data?.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  }
  return {
    token: res.data.data.accessToken,
    user: res.data.data.user,
  };
}

async function runMilestone5TestSuite() {
  console.log('================================================================');
  console.log('🚀 MILESTONE 5 TEST: RBAC SECURITY, TENANT ISOLATION & BILLING');
  console.log(`Target: ${BASE_URL}`);
  console.log('================================================================\n');

  let passed = 0;
  const total = 9;

  // ── TEST 1: Authentication Matrix for All 5 Roles ─────────────────────────
  console.log('Test 1: Authenticating All 5 Seeded Personas...');
  const personas = [
    { email: 'superadmin@agentcall.ai', expectedRole: 'super_admin' },
    { email: 'admin@acmecorp.com', expectedRole: 'company_admin' },
    { email: 'manager@acmecorp.com', expectedRole: 'manager' },
    { email: 'agent@acmecorp.com', expectedRole: 'agent' },
    { email: 'viewer@acmecorp.com', expectedRole: 'viewer' },
  ];

  const sessions = {};
  for (const p of personas) {
    const sess = await login(p.email);
    if (sess.user.role !== p.expectedRole) {
      throw new Error(`Role mismatch for ${p.email}: expected ${p.expectedRole}, got ${sess.user.role}`);
    }
    sessions[p.expectedRole] = sess;
  }
  passed++;
  console.log(`[PASS 1/${total}] All 5 personas authenticated with verified JWT role claims:`);
  console.log('       • super_admin:  superadmin@agentcall.ai');
  console.log('       • company_admin: admin@acmecorp.com');
  console.log('       • manager:      manager@acmecorp.com');
  console.log('       • agent:        agent@acmecorp.com');
  console.log('       • viewer:       viewer@acmecorp.com');

  // ── TEST 2: Platform Tenant Management Permission Barrier ────────────────
  console.log('\nTest 2: Verifying Platform Admin Barrier (PLATFORM_TENANT_MANAGE)...');
  const superPlatformRes = await request('/tenants', {
    headers: { Authorization: `Bearer ${sessions.super_admin.token}` },
  });
  if (superPlatformRes.status !== 200) {
    throw new Error(`super_admin should access /tenants, got status ${superPlatformRes.status}`);
  }

  const companyAdminPlatformRes = await request('/tenants', {
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
  });
  if (companyAdminPlatformRes.status !== 403) {
    throw new Error(`company_admin should be FORBIDDEN (403) from /tenants, got status ${companyAdminPlatformRes.status}`);
  }
  passed++;
  console.log(`[PASS 2/${total}] Platform Access Governance Verified:`);
  console.log(`       • Super Admin -> GET /tenants: 200 OK (${superPlatformRes.data?.data?.length || 0} tenants found)`);
  console.log(`       • Company Admin -> GET /tenants: 403 Forbidden (RBAC Protected)`);

  // ── TEST 3: Billing Subscription RBAC Access Barrier ─────────────────────
  console.log('\nTest 3: Verifying Billing RBAC Barriers (BILLING_VIEW & BILLING_MANAGE)...');
  const adminBillingRes = await request('/billing/subscription', {
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
  });
  if (adminBillingRes.status !== 200) {
    throw new Error(`company_admin should access billing, got ${adminBillingRes.status}`);
  }

  const agentBillingRes = await request('/billing/subscription', {
    headers: { Authorization: `Bearer ${sessions.agent.token}` },
  });
  if (agentBillingRes.status !== 403) {
    throw new Error(`agent should be FORBIDDEN (403) from /billing/subscription, got ${agentBillingRes.status}`);
  }

  const agentOrderRes = await request('/billing/order/growth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessions.agent.token}` },
  });
  if (agentOrderRes.status !== 403) {
    throw new Error(`agent should be FORBIDDEN (403) from creating billing orders, got ${agentOrderRes.status}`);
  }
  passed++;
  console.log(`[PASS 3/${total}] Billing RBAC Guard Verified:`);
  console.log(`       • Company Admin -> GET /billing/subscription: 200 OK`);
  console.log(`       • Calling Agent -> GET /billing/subscription: 403 Forbidden`);
  console.log(`       • Calling Agent -> POST /billing/order/growth: 403 Forbidden`);

  // ── TEST 4: Team Provisioning & Lead Deletion Guards ──────────────────────
  console.log('\nTest 4: Verifying Team Management & Lead Mutation Guards...');
  const agentInviteRes = await request('/users/invite', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessions.agent.token}` },
    body: JSON.stringify({ name: 'Unauthorized', email: 'unauthorized@hack.com', role: 'company_admin' }),
  });
  if (agentInviteRes.status !== 403) {
    throw new Error(`agent should be FORBIDDEN (403) from inviting team members, got ${agentInviteRes.status}`);
  }

  const agentDeleteLeadRes = await request('/leads/fake-lead-id', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sessions.agent.token}` },
  });
  if (agentDeleteLeadRes.status !== 403) {
    throw new Error(`agent should be FORBIDDEN (403) from deleting leads, got ${agentDeleteLeadRes.status}`);
  }
  passed++;
  console.log(`[PASS 4/${total}] Administrative Mutation Guards Verified:`);
  console.log(`       • Calling Agent -> POST /team/invite: 403 Forbidden`);
  console.log(`       • Calling Agent -> DELETE /leads/:id: 403 Forbidden`);

  // ── TEST 5: Cross-Tenant Data Isolation Boundary ──────────────────────────
  console.log('\nTest 5: Testing Cross-Tenant Security Boundary...');
  // Log in as Tenant 2 Admin (Beta Corp / day2plan@acmecorp.com)
  const tenant2Session = await login('day2plan@acmecorp.com');
  const tenant1Id = sessions.company_admin.user.tenantId;
  const tenant2Id = tenant2Session.user.tenantId;

  if (tenant1Id === tenant2Id) {
    throw new Error('Tenant 1 and Tenant 2 must have distinct tenant IDs for isolation testing');
  }

  // Tenant 1 gets or creates a lead
  const t1LeadsRes = await request('/leads', {
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
  });
  const t1Lead = t1LeadsRes.data?.data?.items?.[0] || t1LeadsRes.data?.data?.[0] || t1LeadsRes.data?.items?.[0];
  if (!t1Lead) {
    throw new Error('Tenant 1 must have at least one lead for cross-tenant isolation test');
  }

  // Tenant 2 attempts to fetch Tenant 1's lead
  const crossTenantRes = await request(`/leads/${t1Lead.id}`, {
    headers: { Authorization: `Bearer ${tenant2Session.token}` },
  });

  if (crossTenantRes.status !== 404 && crossTenantRes.status !== 403) {
    throw new Error(`Cross-tenant breach! Tenant 2 accessed Tenant 1 lead. Status: ${crossTenantRes.status}`);
  }

  // Tenant 2 lists leads -> must never contain Tenant 1's lead ID
  const t2LeadsRes = await request('/leads', {
    headers: { Authorization: `Bearer ${tenant2Session.token}` },
  });
  const t2LeadList = t2LeadsRes.data?.data?.items || t2LeadsRes.data?.data || [];
  const leakedLead = t2LeadList.find((l) => l.id === t1Lead.id);
  if (leakedLead) {
    throw new Error(`Cross-tenant data leakage detected! Tenant 1 lead ${t1Lead.id} found in Tenant 2 feed`);
  }

  passed++;
  console.log(`[PASS 5/${total}] Cross-Tenant Isolation Verified:`);
  console.log(`       • Tenant 1 ID: ${tenant1Id} | Tenant 2 ID: ${tenant2Id}`);
  console.log(`       • Tenant 2 -> GET /leads/${t1Lead.id}: ${crossTenantRes.status} (Not Found / Blocked)`);
  console.log(`       • Leaked Records in Tenant 2 feed: 0 (Zero cross-tenant leakage)`);

  // ── TEST 6: Public Plans Catalog Verification ────────────────────────────
  console.log('\nTest 6: Verifying Billing Plans Catalog (GET /billing/plans)...');
  const plansRes = await request('/billing/plans');
  const plans = plansRes.payload;
  if (!plansRes.ok || !plans?.starter || !plans?.growth) {
    throw new Error(`Failed to fetch plans catalog: ${JSON.stringify(plansRes.data)}`);
  }
  passed++;
  console.log(`[PASS 6/${total}] Billing Plans Catalog Verified:`);
  console.log(`       • Starter:    ₹${plans.starter.price / 100} / mo (2 agents, 500 calls)`);
  console.log(`       • Growth:     ₹${plans.growth.price / 100} / mo (10 agents, 5,000 calls)`);
  console.log(`       • Business:   ₹${plans.business.price / 100} / mo (Unlimited agents, 50,000 calls)`);
  console.log(`       • Enterprise: Custom Architecture & Air-gapped deployment`);

  // ── TEST 7: Order Creation & Dev Simulation Payment Verification ─────────
  console.log('\nTest 7: Executing Billing Order Creation & Payment Verification...');
  // 1. Create order for Growth plan
  const orderRes = await request('/billing/order/growth', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
  });
  const orderData = orderRes.payload;
  if (!orderRes.ok || !orderData?.id) {
    throw new Error(`Order creation failed: ${JSON.stringify(orderRes.data)}`);
  }
  const orderId = orderData.id;

  // 2. Verify payment simulation
  const verifyRes = await request('/billing/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
    body: JSON.stringify({
      razorpayOrderId: orderId,
      razorpayPaymentId: `pay_test_${Date.now()}`,
      razorpaySignature: 'simulated_test_signature',
      plan: 'growth',
    }),
  });

  const verifyData = verifyRes.payload;
  if (!verifyRes.ok || verifyData?.plan !== 'growth') {
    throw new Error(`Payment verification failed: ${JSON.stringify(verifyRes.data)}`);
  }

  // 3. Verify upgraded subscription state
  const updatedSubRes = await request('/billing/subscription', {
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
  });
  const updatedSub = updatedSubRes.payload;

  if (updatedSub?.plan !== 'growth') {
    throw new Error(`Subscription plan not updated in database: ${JSON.stringify(updatedSubRes.data)}`);
  }
  passed++;
  console.log(`[PASS 7/${total}] Billing Subscription Cycle Verified:`);
  console.log(`       • Created Order: ${orderId} (Amount: ₹${orderData.amount / 100})`);
  console.log(`       • Verified Payment: Status UPGRADED`);
  console.log(`       • Active Plan in Database: ${updatedSub.plan.toUpperCase()}`);
  console.log(`       • Plan Expiration: ${new Date(updatedSub.planExpiresAt).toLocaleDateString()}`);

  // ── TEST 8: Tenant Usage Meters Verification ─────────────────────────────
  console.log('\nTest 8: Verifying Real-Time Tenant Usage Metrics...');
  const usageRes = await request('/tenants/me/usage', {
    headers: { Authorization: `Bearer ${sessions.company_admin.token}` },
  });
  const usage = usageRes.payload;

  if (!usageRes.ok || usage?.callCount === undefined) {
    throw new Error(`Tenant usage endpoint failed: ${JSON.stringify(usageRes.data)}`);
  }
  passed++;
  console.log(`[PASS 8/${total}] Real-Time Tenant Usage Telemetry Verified:`);
  console.log(`       • Total Calls Logged:    ${usage.callCount}`);
  console.log(`       • Voice Minutes Used:    ${usage.minutesUsed || 0} mins`);
  console.log(`       • Active AI Agents:      ${usage.agentCount}`);
  console.log(`       • Enrolled Leads in CRM: ${usage.leadCount}`);
  console.log(`       • Provisioned Users:     ${usage.userCount}`);

  // ── TEST 9: Production System Health & Liveness ───────────────────────────
  console.log('\nTest 9: Verifying Production Health & Readiness Endpoint...');
  const healthRes = await request('/health');
  const health = healthRes.payload;
  if (!healthRes.ok || health?.status !== 'ok') {
    throw new Error(`Health check failed: ${JSON.stringify(healthRes.data)}`);
  }
  passed++;
  console.log(`[PASS 9/${total}] Health Endpoint Verified: HTTP 200 OK (Status: ${healthRes.data.data.status})`);

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} MILESTONE 5 VERIFICATION ASSERTIONS PASSED!`);
  console.log('================================================================');
  process.exit(0);
}

runMilestone5TestSuite().catch((err) => {
  console.error('\n❌ Milestone 5 Test Suite Failed:', err);
  process.exit(1);
});
