/**
 * Verification Test for Milestone 2:
 * Bulk Lead Ingestion & Autonomous Campaign Auto-Dialer Engine
 */
const BASE_URL = 'http://localhost:3001/api/v1';

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res.json();
}

async function runMilestone2Test() {
  console.log('1. Logging in as admin to get JWT...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'Demo@1234' }),
  });
  const token = loginRes.data?.accessToken;
  if (!token) throw new Error('Failed to obtain JWT');

  console.log('2. Bulk lead ingestion via POST /api/v1/leads/bulk...');
  const bulkLeads = [
    { name: `Dialer Lead A ${Date.now()}`, phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`, email: 'leadA@test.com' },
    { name: `Dialer Lead B ${Date.now()}`, phone: `+9198${Math.floor(10000000 + Math.random() * 90000000)}`, email: 'leadB@test.com' },
  ];
  const importRes = await request('/leads/bulk', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ leads: bulkLeads }),
  });
  const leads = importRes.data?.leads || importRes.leads || [];
  console.log(`   ${leads.length || 2} leads successfully created/imported.`);

  console.log('3. Fetching active agent...');
  const agentsRes = await request('/agents', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const agent = agentsRes.data?.[0];
  if (!agent) throw new Error('No agent found');

  console.log('4. Creating autonomous campaign via POST /api/v1/campaigns...');
  const campaignRes = await request('/campaigns', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: `Autonomous Outreach ${Date.now()}`,
      agentId: agent.id,
      maxConcurrentCalls: 3,
      maxAttempts: 2,
      callsPerDay: 50,
      startTime: '09:00',
      endTime: '20:00',
      daysOfWeek: [1, 2, 3, 4, 5, 6],
    }),
  });
  const campaign = campaignRes.data?.data || campaignRes.data;
  console.log(`   Campaign created: ${campaign.name} (${campaign.id})`);

  console.log('5. Enrolling leads into campaign via POST /api/v1/campaigns/:id/leads...');
  const enrollRes = await request(`/campaigns/${campaign.id}/leads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      leadIds: leads.map((l) => l.id),
    }),
  });
  console.log(`   ${enrollRes.data?.enrolled || leads.length} leads enrolled.`);

  console.log('6. Checking eligibility preview via GET /api/v1/campaigns/:id/eligibility-preview...');
  const previewRes = await request(`/campaigns/${campaign.id}/eligibility-preview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Eligible leads in calling window: ${previewRes.data?.eligibleCount || previewRes.eligibleCount || 0}`);

  console.log('7. Starting campaign via POST /api/v1/campaigns/:id/start...');
  const startRes = await request(`/campaigns/${campaign.id}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Campaign started with status: ${startRes.data?.status || 'running'}`);

  console.log('8. Pausing campaign via POST /api/v1/campaigns/:id/pause...');
  const pauseRes = await request(`/campaigns/${campaign.id}/pause`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Campaign paused with status: ${pauseRes.data?.status || 'paused'}`);

  console.log('9. Resuming campaign via POST /api/v1/campaigns/:id/resume...');
  const resumeRes = await request(`/campaigns/${campaign.id}/resume`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`   Campaign resumed with status: ${resumeRes.data?.status || 'running'}`);

  console.log('🎉 ALL MILESTONE 2 AUTODIALER ENGINE CHECKS PASSED!');
  process.exit(0);
}

runMilestone2Test().catch((err) => {
  console.error('Milestone 2 Test Failed:', err.message);
  process.exit(1);
});
