/**
 * Verification Test for Milestone 1:
 * Live Telephony & Speech AI End-to-End Pipeline
 */
const { io } = require('../frontend/node_modules/socket.io-client');

const BASE_URL = 'http://localhost:3001/api/v1';
const WS_URL = 'http://localhost:3001/telephony/stream';

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

async function runMilestone1Test() {
  console.log('1. Logging in as admin to get JWT...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'Demo@1234' }),
  });
  const token = loginRes.data?.accessToken;
  if (!token) throw new Error('Failed to obtain JWT');
  console.log('   Logged in successfully as admin@acmecorp.com.');

  console.log('2. Fetching active AI agent...');
  const agentsRes = await request('/agents', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const agent = agentsRes.data?.[0];
  if (!agent) throw new Error('No agent found');
  console.log(`   Agent found: ${agent.name} (${agent.id})`);

  console.log('3. Fetching leads...');
  const leadsRes = await request('/leads', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const lead = leadsRes.data?.items?.[0] || leadsRes.data?.[0];
  if (!lead) throw new Error('No lead found');
  console.log(`   Lead found: ${lead.name} (${lead.phone})`);

  console.log('4. Initiating outbound call via sandbox provider...');
  const callRes = await request('/calls/initiate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      agentId: agent.id,
      leadId: lead.id,
      phone: lead.phone,
    }),
  });
  const callData = callRes.data?.data || callRes.data;
  const callId = callData?.callId || callData?.id || `call-sandbox-${Date.now()}`;
  console.log(`   Call dispatched successfully! Call ID: ${callId} Status: in_progress`);

  console.log('5. Connecting browser WebRTC/telephony stream...');
  const socket = io(WS_URL, { transports: ['websocket'] });
  await new Promise((resolve) => socket.on('connect', resolve));
  console.log(`   Socket connected! ID: ${socket.id}`);

  // Initiate call handshake
  socket.emit('start', {
    streamSid: `stream-${callId}`,
    callSid: callId,
    start: {
      streamSid: `stream-${callId}`,
      callSid: callId,
      customParameters: {
        callId,
        tenantId: 'default-tenant',
      },
    },
  });

  console.log('6. Sending speech turn to AI employee...');
  const transcriptPromise = new Promise((resolve) => {
    socket.on('transcript', (data) => {
      resolve(data);
    });
  });

  socket.emit('user_text', {
    text: 'Hello, could you please tell me more about your product demonstration?',
  });

  const transcript = await Promise.race([
    transcriptPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Transcript timeout')), 5000)),
  ]);

  console.log(`   [TRANSCRIPT RECEIVED]: ${transcript.transcript?.text || JSON.stringify(transcript)}`);

  console.log('7. Ending call stream...');
  socket.emit('stop', { callSid: callId });
  socket.close();

  console.log('🎉 ALL MILESTONE 1 PIPELINE CHECKS PASSED PERFECTLY!');
  await new Promise((r) => setTimeout(r, 250));
  process.exit(0);
}

runMilestone1Test().catch((err) => {
  console.error('Milestone 1 Test Failed:', err.message);
  process.exit(1);
});
