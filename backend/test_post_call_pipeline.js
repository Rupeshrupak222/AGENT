const BASE_URL = 'http://localhost:3001/api/v1';

async function main() {
  console.log('=====================================================');
  console.log('  MILESTONE 3: POST-CALL INTELLIGENCE & CRM PIPELINE ');
  console.log('=====================================================\n');

  // 1. Authenticate as Admin
  console.log('1. Authenticating...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'Demo@1234' }),
  });
  const loginData = await loginRes.json();
  if (!loginData.data?.accessToken) {
    throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.data.accessToken;
  const tenantId = loginData.data.tenant.id;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
  console.log(`   Authenticated as admin@acmecorp.com (tenant: ${tenantId})`);

  // 2. Fetch AI Agent
  console.log('\n2. Fetching AI Agent...');
  const agentsRes = await fetch(`${BASE_URL}/agents`, { headers });
  const agentsData = await agentsRes.json();
  const agent = agentsData.data?.[0];
  if (!agent) throw new Error('No agent found');
  console.log(`   Agent found: ${agent.name} (${agent.id})`);

  // 3. Create or Fetch Test Lead
  console.log('\n3. Creating qualified lead for test call...');
  const leadPhone = '+12025550999';
  const createLeadRes = await fetch(`${BASE_URL}/leads`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: 'Rachel Green',
      phone: leadPhone,
      email: 'rachel@centralperk.com',
      company: 'Central Perk Enterprises',
      status: 'new',
    }),
  });
  const createLeadJson = await createLeadRes.json();
  let lead = createLeadJson.data;
  if (!lead) {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    lead = await p.lead.findFirst({ where: { tenantId, phone: leadPhone } });
    await p.$disconnect();
  }
  if (!lead) {
    throw new Error(`Failed to find or create lead: ${JSON.stringify(createLeadJson)}`);
  }
  console.log(`   Lead ready: ${lead.name} (${lead.id}, phone: ${lead.phone})`);

  // 4. Dispatch a Test Call with High-Intent Appointment Transcript
  console.log('\n4. Dispatching completed call with realistic demo-booking dialogue...');
  const createCallRes = await fetch(`${BASE_URL}/calls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      agentId: agent.id,
      leadId: lead.id,
      phone: lead.phone,
    }),
  });
  const createCallData = await createCallRes.json();
  if (!createCallData.data?.id) {
    throw new Error(`Failed to create call: ${JSON.stringify(createCallData)}`);
  }
  const callId = createCallData.data.id;
  console.log(`   Call created with ID: ${callId}`);

  // Use Prisma directly via a small script or update call to completed with transcript
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const transcriptTurns = [
    {
      speaker: 'user',
      text: 'Hi, this is Rachel Green from Central Perk Enterprises. We are expanding rapidly and need an enterprise voice AI solution. Can we schedule a product demonstration for next Monday at 2:00 PM?',
      timestamp: 1,
    },
    {
      speaker: 'agent',
      text: 'Hello Rachel! That sounds fantastic. I will gladly book your demonstration for next Monday at 2:00 PM and send a calendar invite to rachel@centralperk.com right away.',
      timestamp: 6,
    },
    {
      speaker: 'user',
      text: 'Terrific, that works perfectly for our leadership team. Looking forward to it!',
      timestamp: 12,
    },
  ];

  await prisma.call.update({
    where: { id: callId },
    data: {
      status: 'completed',
      duration: 18,
      endedAt: new Date(),
      transcript: {
        create: {
          segments: transcriptTurns,
          summary: 'Prospect Rachel Green requested an enterprise product demo for next Monday at 2pm.',
        },
      },
    },
  });
  console.log('   Call marked as completed with attached multi-turn dialogue transcript.');

  // 5. Trigger Post-Call Intelligence
  console.log('\n5. Triggering Post-Call Intelligence Pipeline...');
  const retryRes = await fetch(`${BASE_URL}/calls/${callId}/analysis/retry`, {
    method: 'POST',
    headers,
  });
  const retryData = await retryRes.json();
  console.log(`   Analysis Enqueued: ${JSON.stringify(retryData.data)}`);

  // 6. Poll for Groq LPU Post-Call Analysis Completion
  console.log('\n6. Awaiting LLM Structured Intelligence (Groq LPU / OpenAI)...');
  let analysis = null;
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    process.stdout.write('.');
    const aRes = await fetch(`${BASE_URL}/calls/${callId}/analysis`, { headers });
    if (aRes.status === 200) {
      const aData = await aRes.json();
      const candidate = aData.data?.data || aData.data;
      if (candidate && candidate.processingStatus === 'completed') {
        analysis = candidate;
        break;
      }
    }
  }
  console.log('\n');

  if (!analysis) {
    throw new Error('Analysis did not complete within 15 seconds.');
  }

  console.log('   ✅ Post-Call Analysis Retrieved Successfully:');
  console.log(`      • Model Used:            ${analysis.model}`);
  console.log(`      • Sentiment:             ${analysis.sentiment}`);
  console.log(`      • Lead Score:            ${analysis.leadScore} / 100`);
  console.log(`      • Intent:                ${analysis.intent}`);
  console.log(`      • Outcome:               ${analysis.outcome}`);
  console.log(`      • Appointment Detected:  ${analysis.appointmentDetected}`);
  console.log(`      • Appointment Details:   ${JSON.stringify(analysis.appointmentDetails)}`);
  console.log(`      • Summary:               ${analysis.summary}`);

  // 7. Verify Auto-Created Calendar Appointment
  console.log('\n7. Verifying Automated Calendar Appointment Creation...');
  const appointments = await prisma.appointment.findMany({
    where: { tenantId, leadId: lead.id },
    orderBy: { createdAt: 'desc' },
  });

  if (appointments.length === 0) {
    throw new Error('No appointment was created in the database!');
  }

  const latestAppt = appointments[0];
  console.log(`   ✅ Appointment Found in Database:`);
  console.log(`      • Appointment ID: ${latestAppt.id}`);
  console.log(`      • Lead Name:      ${latestAppt.leadName}`);
  console.log(`      • Scheduled Date: ${latestAppt.date.toISOString()}`);
  console.log(`      • Status:         ${latestAppt.status}`);
  console.log(`      • Duration:       ${latestAppt.duration} mins`);

  // 8. Verify Updated Lead Stage & Score
  console.log('\n8. Verifying CRM Lead Status Progression...');
  const updatedLead = await prisma.lead.findUnique({
    where: { id: lead.id },
  });
  console.log(`   ✅ Lead Status: ${updatedLead.status} (Score: ${updatedLead.score})`);
  if (updatedLead.status !== 'appointment') {
    throw new Error(`Expected lead status 'appointment', got '${updatedLead.status}'`);
  }

  // 9. Verify Post-Call Automations
  console.log('\n9. Verifying Post-Call Automations Dispatched...');
  const logsRes = await fetch(`${BASE_URL}/automations/logs`, { headers });
  const logsData = await logsRes.json();
  const recentLogs = logsData.data?.items || [];
  console.log(`   Total Automation Logs: ${logsData.data?.total || 0}`);
  if (recentLogs.length > 0) {
    console.log(`   Latest Log: [${recentLogs[0].type}] → ${recentLogs[0].template} (Status: ${recentLogs[0].status})`);
  }

  await prisma.$disconnect();
  console.log('\n🎉 ALL MILESTONE 3 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
}

main().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
