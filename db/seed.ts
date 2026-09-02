/**
 * AgentCall AI — Database Seed
 * Run: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt      from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AgentCall AI database...');

  // ── Demo Tenant ────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where:  { slug: 'acme-corp-demo' },
    update: {},
    create: {
      name:     'Acme Corp (Demo)',
      slug:     'acme-corp-demo',
      plan:     'growth',
      isActive: true,
      settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ── Demo Users ─────────────────────────────────────────────
  const pwd = await bcrypt.hash('Demo@1234', 12);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@acmecorp.com' },
    update: {},
    create: {
      name:     'Admin User',
      email:    'admin@acmecorp.com',
      password: pwd,
      role:     'company_admin',
      tenantId: tenant.id,
    },
  });

  const manager = await prisma.user.upsert({
    where:  { email: 'manager@acmecorp.com' },
    update: {},
    create: {
      name:     'Sales Manager',
      email:    'manager@acmecorp.com',
      password: pwd,
      role:     'manager',
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Users: ${admin.email}, ${manager.email}`);

  // ── Demo AI Agents ─────────────────────────────────────────
  const agents = await Promise.all([
    prisma.aIAgent.create({
      data: {
        name:            'Priya AI',
        role:            'telecaller',
        language:        'hinglish',
        voiceId:         'priya-warm-v2',
        businessGoal:    'Qualify inbound leads and book product demos for the sales team',
        openingScript:   'Hello {{name}}, main Priya bol rahi hoon Acme Corp se. Kya aap 2 minute baat kar sakte hain?',
        qualificationRules: 'Budget > ₹50K, Decision maker, B2B company > 10 employees',
        status:          'active',
        tenantId:        tenant.id,
        createdById:     admin.id,
      },
    }),
    prisma.aIAgent.create({
      data: {
        name:         'Arjun AI',
        role:         'sales',
        language:     'english',
        voiceId:      'arjun-confident-v1',
        businessGoal: 'Convert warm leads into paying customers through consultative selling',
        status:       'active',
        tenantId:     tenant.id,
        createdById:  admin.id,
      },
    }),
    prisma.aIAgent.create({
      data: {
        name:         'Meera AI',
        role:         'recruiter',
        language:     'hindi',
        voiceId:      'meera-friendly-v1',
        businessGoal: 'Screen candidates for open positions and schedule interviews with HR',
        status:       'active',
        tenantId:     tenant.id,
        createdById:  manager.id,
      },
    }),
  ]);
  console.log(`✅ AI Agents: ${agents.map(a => a.name).join(', ')}`);

  // ── Demo Leads ─────────────────────────────────────────────
  const leadData = [
    { name:'Rahul Sharma',  phone:'+919876543210', email:'rahul@techcorp.in',  company:'TechCorp India',  status:'qualified'   as const, score:87 },
    { name:'Anita Patel',   phone:'+918765432109', email:'anita@startup.io',   company:'Startup XYZ',    status:'interested'  as const, score:72 },
    { name:'Vikram Singh',  phone:'+917654321098', email:'vikram@infosys.com', company:'Infosys',         status:'appointment' as const, score:91 },
    { name:'Sunita Gupta',  phone:'+916543210987', email:'sunita@tcs.com',     company:'TCS',             status:'contacted'   as const, score:58 },
    { name:'Manish Kumar',  phone:'+915432109876', email:'manish@wipro.com',   company:'Wipro',           status:'new'         as const, score:45 },
    { name:'Priya Nair',    phone:'+914321098765', email:'priya@hcl.com',      company:'HCL',             status:'closed_won'  as const, score:95 },
    { name:'Amit Joshi',    phone:'+913210987654', email:'amit@bajaj.com',     company:'Bajaj Finance',   status:'qualified'   as const, score:80 },
    { name:'Deepa Reddy',   phone:'+912109876543', email:'deepa@hdfc.com',     company:'HDFC Bank',       status:'closed_lost' as const, score:30 },
    { name:'Rajesh Verma',  phone:'+911098765432', email:'rajesh@icici.com',   company:'ICICI Bank',      status:'new'         as const, score:55 },
    { name:'Kavya Menon',   phone:'+910987654321', email:'kavya@flipkart.com', company:'Flipkart',        status:'interested'  as const, score:68 },
  ];

  const leads = await Promise.all(
    leadData.map((l, i) => prisma.lead.create({
      data: {
        ...l,
        tenantId:        tenant.id,
        assignedAgentId: agents[i % agents.length].id,
        source:          ['website', 'csv', 'crm', 'referral'][i % 4],
      },
    }))
  );
  console.log(`✅ Leads: ${leads.length} created`);

  // ── Demo Campaign ──────────────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      name:        'Q3 Lead Qualification Drive',
      description: 'Qualify all new leads from August batch',
      status:      'running',
      maxCalls:    500,
      callsPerDay: 100,
      startTime:   '09:00',
      endTime:     '18:00',
      daysOfWeek:  [1, 2, 3, 4, 5],
      tenantId:    tenant.id,
      agentId:     agents[0].id,
    },
  });
  console.log(`✅ Campaign: ${campaign.name}`);

  // ── Demo Calls ─────────────────────────────────────────────
  const callData = [
    { leadIdx: 0, agentIdx: 0, status: 'completed' as const, duration: 204, sentimentScore: 4.5, qualityScore: 88, outcome: 'Qualified — appointment booked for Thursday' },
    { leadIdx: 1, agentIdx: 1, status: 'completed' as const, duration: 156, sentimentScore: 3.8, qualityScore: 72, outcome: 'Interested — follow-up scheduled' },
    { leadIdx: 2, agentIdx: 2, status: 'completed' as const, duration: 312, sentimentScore: 4.9, qualityScore: 95, outcome: 'Demo booked — high intent' },
    { leadIdx: 3, agentIdx: 0, status: 'missed'    as const, duration: 0,   sentimentScore: undefined, qualityScore: undefined, outcome: 'No answer' },
    { leadIdx: 4, agentIdx: 1, status: 'completed' as const, duration: 98,  sentimentScore: 3.2, qualityScore: 61, outcome: 'Not interested — budget constraint' },
  ];

  await Promise.all(
    callData.map(c => prisma.call.create({
      data: {
        phone:         leads[c.leadIdx].phone,
        direction:     'outbound',
        status:        c.status,
        duration:      c.duration || null,
        sentimentScore: c.sentimentScore ?? null,
        qualityScore:   c.qualityScore ?? null,
        outcome:       c.outcome,
        tenantId:      tenant.id,
        leadId:        leads[c.leadIdx].id,
        agentId:       agents[c.agentIdx].id,
        campaignId:    campaign.id,
        startedAt:     new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000),
        endedAt:       c.duration ? new Date(Date.now() - Math.random() * 7 * 60 * 60 * 1000) : null,
      },
    }))
  );
  console.log(`✅ Calls: ${callData.length} created`);

  console.log('\n🎉 Seed complete!');
  console.log('📧 Login: admin@acmecorp.com / Demo@1234');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
