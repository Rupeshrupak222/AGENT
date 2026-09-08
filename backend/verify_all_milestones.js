/**
 * AgentCall AI Master Platform Verification Suite
 * Executes End-to-End Regression Across All 5 Milestones
 */
const { execSync } = require('child_process');

console.log('========================================================================');
console.log('🌟 AGENTCALL AI — COMPREHENSIVE END-TO-END MASTER REGRESSION SUITE 🌟');
console.log('========================================================================\n');

const milestones = [
  {
    name: 'Milestone 1: Live Voice Pipeline & Sandbox Provider',
    cmd: 'node test_live_voice_pipeline.js',
  },
  {
    name: 'Milestone 2: Bulk CSV Ingestion & Autonomous Campaign Auto-Dialer',
    cmd: 'node test_campaign_autodialer.js',
  },
  {
    name: 'Milestone 3: Groq LPU Post-Call Intelligence & Automated Calendar Booking',
    cmd: 'node test_post_call_pipeline.js',
  },
  {
    name: 'Milestone 4: Real-Time Live Supervisor Monitoring, Whisper & Barge-in Takeover',
    cmd: 'node test_milestone4_supervisor.js',
  },
  {
    name: 'Milestone 5: Multi-Tenant RBAC Security, Cross-Tenant Isolation & Billing Engine',
    cmd: 'node test_milestone5_security_and_billing.js',
  },
];

let allPassed = true;

for (let i = 0; i < milestones.length; i++) {
  const m = milestones[i];
  console.log(`\n------------------------------------------------------------------------`);
  console.log(`RUNNING [${i + 1}/${milestones.length}]: ${m.name}`);
  console.log(`------------------------------------------------------------------------`);
  try {
    const output = execSync(m.cmd, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(output);
    console.log(`✅ [${i + 1}/${milestones.length}] ${m.name}: PASSED`);
  } catch (err) {
    console.error(`❌ [${i + 1}/${milestones.length}] ${m.name}: FAILED`);
    console.error(err.stdout || err.message);
    allPassed = false;
    break;
  }
}

console.log('\n========================================================================');
if (allPassed) {
  console.log('🏆 ALL 5 MILESTONES VERIFIED WITH 100% SUCCESS — READY FOR PRODUCTION 🏆');
} else {
  console.log('❌ REGRESSION SUITE ENCOUNTERED FAILURES');
}
console.log('========================================================================\n');

process.exit(allPassed ? 0 : 1);
