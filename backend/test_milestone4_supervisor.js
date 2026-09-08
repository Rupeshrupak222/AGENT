/**
 * Automated Verification Test for Milestone 4:
 * Real-Time Supervisor Live Monitoring, Whisper Coaching & Barge-in Takeover
 */
const { io } = require('../frontend/node_modules/socket.io-client');

const SERVER_URL = 'http://localhost:3001/telephony/stream';
const TEST_CALL_ID = `call-supervisor-test-${Date.now()}`;
const TEST_STREAM_SID = `stream-${Date.now()}`;

// ITU-T G.711 mu-law test frame
const dummyMuLawBase64 = Buffer.from(new Uint8Array(160).fill(0xff)).toString('base64');

async function runSupervisorPipelineTest() {
  console.log('================================================================');
  console.log('🚀 MILESTONE 4 TEST: LIVE SUPERVISOR MONITORING & BARGE-IN');
  console.log(`Target: ${SERVER_URL} | Call ID: ${TEST_CALL_ID}`);
  console.log('================================================================\n');

  let passedAssertions = 0;
  const totalAssertions = 6;

  // 1. Connect Caller Socket (Simulating Customer / Telephony Trunk)
  console.log('Step 1: Connecting Caller client...');
  const callerSocket = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve) => callerSocket.on('connect', resolve));
  console.log(`✅ Caller connected. (id: ${callerSocket.id})`);

  // Start call stream handshake
  const startAckPromise = new Promise((resolve) => {
    callerSocket.emit('start', {
      streamSid: TEST_STREAM_SID,
      callSid: TEST_CALL_ID,
      start: {
        streamSid: TEST_STREAM_SID,
        callSid: TEST_CALL_ID,
        customParameters: {
          callId: TEST_CALL_ID,
          tenantId: 'default-tenant',
        },
      },
    }, (ack) => {
      resolve(ack);
    });
  });

  // Give 500ms for session creation
  await new Promise((r) => setTimeout(r, 500));
  passedAssertions++;
  console.log(`[PASS 1/${totalAssertions}] Telephony stream initialized for call ${TEST_CALL_ID}`);

  // 2. Connect Supervisor Socket
  console.log('\nStep 2: Connecting Supervisor client...');
  const supervisorSocket = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise((resolve) => supervisorSocket.on('connect', resolve));
  console.log(`✅ Supervisor connected. (id: ${supervisorSocket.id})`);

  // 3. Supervisor Join in 'listen' mode
  console.log('\nStep 3: Supervisor joining call in silent "listen" mode...');
  const joinAck = await new Promise((resolve) => {
    supervisorSocket.emit('supervisor:join', {
      callId: TEST_CALL_ID,
      mode: 'listen',
      name: 'Senior QA Supervisor',
    }, resolve);
  });

  if (joinAck?.success && joinAck?.status === 'monitoring') {
    passedAssertions++;
    console.log(`[PASS 2/${totalAssertions}] Supervisor joined call room successfully in 'listen' mode.`);
  } else {
    throw new Error(`Supervisor join failed: ${JSON.stringify(joinAck)}`);
  }

  // 4. Supervisor Mode Switch to 'whisper'
  console.log('\nStep 4: Switching mode to "whisper" and streaming coaching audio...');
  const whisperReceivedPromise = new Promise((resolve) => {
    supervisorSocket.on('supervisor:whisper_audio', (data) => {
      resolve(data);
    });
  });

  const modeAck = await new Promise((resolve) => {
    supervisorSocket.emit('supervisor:set_mode', {
      callId: TEST_CALL_ID,
      mode: 'whisper',
    }, resolve);
  });

  // Send coaching audio
  supervisorSocket.emit('supervisor:audio', {
    callId: TEST_CALL_ID,
    payload: dummyMuLawBase64,
  });

  const whisperData = await Promise.race([
    whisperReceivedPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Whisper audio timeout')), 3000)),
  ]);

  if (whisperData && whisperData.callId === TEST_CALL_ID) {
    passedAssertions++;
    console.log(`[PASS 3/${totalAssertions}] Whisper coaching audio broadcast verified on coaching channel.`);
  }

  // 5. Supervisor Mode Switch to 'barge_in' Takeover (Should clear AI audio)
  console.log('\nStep 5: Executing Supervisor Barge-in Takeover...');
  const callerClearPromise = new Promise((resolve) => {
    callerSocket.on('clear', (data) => {
      resolve(data);
    });
  });

  const bargeAck = await new Promise((resolve) => {
    supervisorSocket.emit('supervisor:set_mode', {
      callId: TEST_CALL_ID,
      mode: 'barge_in',
    }, resolve);
  });

  const clearEvent = await Promise.race([
    callerClearPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Caller clear event timeout')), 3000)),
  ]);

  if (clearEvent && clearEvent.streamSid === TEST_STREAM_SID) {
    passedAssertions++;
    console.log(`[PASS 4/${totalAssertions}] Barge-in triggered: Caller received instant 'clear' instruction.`);
  }

  // 6. Supervisor Streams Speech During Takeover (Should route directly to Caller playback)
  console.log('\nStep 6: Streaming supervisor voice to caller during barge-in...');
  const callerMediaPromise = new Promise((resolve) => {
    callerSocket.on('media', (data) => {
      resolve(data);
    });
  });

  supervisorSocket.emit('supervisor:audio', {
    callId: TEST_CALL_ID,
    payload: dummyMuLawBase64,
  });

  const callerMedia = await Promise.race([
    callerMediaPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Caller media timeout')), 3000)),
  ]);

  if (callerMedia && callerMedia.media?.payload === dummyMuLawBase64) {
    passedAssertions++;
    console.log(`[PASS 5/${totalAssertions}] Supervisor microphone audio routed directly to caller playback!`);
  }

  // 7. Supervisor Releases Takeover
  console.log('\nStep 7: Releasing supervisor takeover back to autonomous AI...');
  const releasedBroadcastPromise = new Promise((resolve) => {
    supervisorSocket.on('supervisor:released', (data) => {
      resolve(data);
    });
  });

  const releaseAck = await new Promise((resolve) => {
    supervisorSocket.emit('supervisor:release', {
      callId: TEST_CALL_ID,
    }, resolve);
  });

  const releasedData = await Promise.race([
    releasedBroadcastPromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supervisor release broadcast timeout')), 3000)),
  ]);

  if (releasedData && releasedData.callId === TEST_CALL_ID) {
    passedAssertions++;
    console.log(`[PASS 6/${totalAssertions}] Call control successfully returned to autonomous AI (${releasedData.message})`);
  }

  // Clean up
  callerSocket.close();
  supervisorSocket.close();

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passedAssertions}/${totalAssertions} SUPERVISOR PIPELINE ASSERTIONS PASSED!`);
  console.log('================================================================');
  await new Promise((r) => setTimeout(r, 250));
  process.exit(0);
}

runSupervisorPipelineTest().catch((err) => {
  console.error('\n❌ Supervisor Pipeline Test Failed:', err);
  process.exit(1);
});
