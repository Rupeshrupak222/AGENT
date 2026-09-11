/**
 * AgentCall AI — Database Seed
 * Run: npx prisma db seed or npm run seed
 */
import * as path         from 'path';
import * as dotenv       from 'dotenv';
import { PrismaClient }  from '@prisma/client';
import * as bcrypt       from 'bcryptjs';

// Load environment configuration from ../backend/.env, ../.env, or local .env
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres_dev_password@localhost:5432/agentcall_db?schema=public';
}

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
    update: { password: pwd },
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
    update: { password: pwd },
    create: {
      name:     'Sales Manager',
      email:    'manager@acmecorp.com',
      password: pwd,
      role:     'manager',
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Users: ${admin.email}, ${manager.email}`);

  // ── Demo AI Agents (English, Hindi, Telugu Calling Agents) ─
  const agentDefs = [
    // ── English Calling Agents ──────────────────────────────
    {
      name:               'Adyapan AI',
      role:               'sales' as const,
      language:           'english' as const,
      voiceId:            'arjun-confident-v1',
      businessGoal:       'Counsel prospective students on certified Tech and AI career courses (Full Stack, Data Science, Cloud), qualify intent, explain ₹2,999/mo EMI options, and book free live demo trial classes.',
      openingScript:      'Hello {{name}}, this is Adyapan AI from the Admissions and Academic Counseling team. I received your inquiry regarding our certified Tech and AI career programs. Are you looking to transition into a high-paying tech career or preparing for campus placements?',
      qualificationRules: 'Target Domain: Software / AI / Data / Cloud; Student or Working Professional; Commitment: >= 8-10 hrs/week; Fee Budget: ₹2,999/mo EMI or one-time; Next Step: Book Free Saturday Masterclass or 1-on-1 Mentor Demo.',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },
    {
      name:               'Arjun AI',
      role:               'sales' as const,
      language:           'english' as const,
      voiceId:            'arjun-confident-v1',
      businessGoal:       'Convert high-intent enterprise inbound and outbound leads through consultative selling',
      openingScript:      'Hello {{name}}, this is Arjun from Acme Corp. I am reaching out to share our enterprise voice automation framework. Do you have two minutes to discuss your current sales workflow?',
      qualificationRules: 'Budget > $1,000/mo, Sales team > 5 members, Decision maker or VP',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },
    {
      name:               'Sarah AI',
      role:               'receptionist' as const,
      language:           'english' as const,
      voiceId:            'sarah-executive-v1',
      businessGoal:       'Front-desk enterprise calling agent handling inquiries, qualifying callers, and booking appointments',
      openingScript:      'Good day! Thank you for calling Acme Corp. My name is Sarah, your AI executive assistant. How may I direct your call or assist you today?',
      qualificationRules: 'Identify caller intent, categorize inquiry, transfer urgent tickets to tier 2 support',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },
    {
      name:               'David AI',
      role:               'collection' as const,
      language:           'english' as const,
      voiceId:            'david-firm-v1',
      businessGoal:       'Courteous payment recovery, accounts receivable follow-up, and invoice clearing',
      openingScript:      'Hello {{name}}, this is David from Acme Corp Accounts Department. I am calling regarding pending invoice {{invoice_id}}. Can we arrange the settlement today?',
      qualificationRules: 'Outstanding balance > 15 days, negotiate installment or instant UPI/card payment',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },

    // ── Hindi Calling Agents ────────────────────────────────
    {
      name:               'Rohan AI',
      role:               'telecaller' as const,
      language:           'hindi' as const,
      voiceId:            'rohan-warm-v1',
      businessGoal:       'Outbound B2B telesales, lead qualification, and product presentation in fluent Hindi',
      openingScript:      'Namaste {{name}} ji! Main Rohan bol raha hoon Acme Corp se. Hum aapke business ke telesales aur customer calling ko automate karne ke baare mein baat kar rahe hain. Kya main aapke 2 minute le sakta hoon?',
      qualificationRules: 'Monthly budget > ₹50,000, 10+ calling staff, active sales requirements',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },
    {
      name:               'Meera AI',
      role:               'recruiter' as const,
      language:           'hindi' as const,
      voiceId:            'meera-friendly-v1',
      businessGoal:       'Screen candidate job applicants, verify experience, and schedule HR interview rounds in Hindi',
      openingScript:      'Namaste {{name}} ji, main Meera bol rahi hoon Acme HR team se. Aapne hamare sales executive role ke liye apply kiya tha. Kya hum 5 minute ka quick screening call kar sakte hain?',
      qualificationRules: 'Experience > 2 years, Immediate joiner, Location flexibility',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        manager.id,
    },
    {
      name:               'Pooja AI',
      role:               'support' as const,
      language:           'hindi' as const,
      voiceId:            'pooja-friendly-v1',
      businessGoal:       '24/7 Hindi customer support, complaint resolution, and order status updates',
      openingScript:      'Namaste {{name}} ji, Acme Customer Support mein aapka swagat hai. Main Pooja hoon. Aaj main aapki kis prakaar sahayata kar sakti hoon?',
      qualificationRules: 'Resolve tier-1 issues within 3 minutes or escalate to supervisor',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },

    // ── Telugu Calling Agents ───────────────────────────────
    {
      name:               'Kavitha AI',
      role:               'telecaller' as const,
      language:           'telugu' as const,
      voiceId:            'kavitha-telugu-v1',
      businessGoal:       'Pure Telugu outbound telecalling, regional lead qualification, and product demonstration scheduling',
      openingScript:      'Namaskaram {{name}} garu! Nenu Acme Corp nundi Kavitha matladutunnanu. Mee business growth mariyu sales calling operations nu AI tho automate cheyyadaniki call chesamu. 2 nimishalu matladavacha?',
      qualificationRules: 'AP & Telangana businesses, turnover > ₹20 Lakhs, interest in automated calling',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },
    {
      name:               'Suresh AI',
      role:               'sales' as const,
      language:           'telugu' as const,
      voiceId:            'suresh-telugu-v1',
      businessGoal:       'High-touch consultative sales calling for real estate, financial plans, and premium packages in Telugu',
      openingScript:      'Namaskaram {{name}} garu, Suresh matladutunnanu Acme Sales Solutions nundi. Meeku sambandhinchina exclusive product package mariyu pricing details share cheyyadaniki call chesamu. Eeroju mee anukoolamaina samayam cheptara?',
      qualificationRules: 'Verified high intent, decision maker ready to book executive consultation',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        admin.id,
    },
    {
      name:               'Ananya AI',
      role:               'appointment_setter' as const,
      language:           'telugu' as const,
      voiceId:            'ananya-telugu-v1',
      businessGoal:       'Book and confirm clinical, real estate, and financial advisory appointments in Telugu with calendar sync',
      openingScript:      'Namaskaram {{name}} garu, nenu Acme Appointments nundi Ananya matladutunnanu. Mee consultation slot mariyu appointment timing confirm cheyyadaniki call chesamu.',
      qualificationRules: 'Confirm preferred date/time slot, phone number, and send SMS/WhatsApp invite',
      status:             'active' as const,
      tenantId:           tenant.id,
      createdById:        manager.id,
    },
  ];

  const agents = await Promise.all(
    agentDefs.map(async (data) => {
      const existing = await prisma.aIAgent.findFirst({
        where: { tenantId: tenant.id, name: data.name },
      });
      if (existing) {
        return prisma.aIAgent.update({ where: { id: existing.id }, data });
      }
      return prisma.aIAgent.create({ data });
    })
  );
  console.log(`✅ AI Agents: ${agents.map(a => a.name).join(', ')}`);

  // ── Demo Leads (Idempotent upsert via tenantId_phone unique index) ──
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
    leadData.map((l, i) =>
      prisma.lead.upsert({
        where: {
          tenantId_phone: {
            tenantId: tenant.id,
            phone:    l.phone,
          },
        },
        update: {
          ...l,
          assignedAgentId: agents[i % agents.length].id,
          source:          ['website', 'csv', 'crm', 'referral'][i % 4],
        },
        create: {
          ...l,
          tenantId:        tenant.id,
          assignedAgentId: agents[i % agents.length].id,
          source:          ['website', 'csv', 'crm', 'referral'][i % 4],
        },
      })
    )
  );
  console.log(`✅ Leads: ${leads.length} upserted`);

  // ── Demo Campaign (Idempotent check) ──────────────────────
  const existingCampaign = await prisma.campaign.findFirst({
    where: { tenantId: tenant.id, name: 'Q3 Lead Qualification Drive' },
  });

  const campaignData = {
    name:        'Q3 Lead Qualification Drive',
    description: 'Qualify all new leads from August batch',
    status:      'running' as const,
    maxCalls:    500,
    callsPerDay: 100,
    startTime:   '09:00',
    endTime:     '18:00',
    daysOfWeek:  [1, 2, 3, 4, 5],
    tenantId:    tenant.id,
    agentId:     agents[0].id,
  };

  const campaign = existingCampaign
    ? await prisma.campaign.update({ where: { id: existingCampaign.id }, data: campaignData })
    : await prisma.campaign.create({ data: campaignData });

  console.log(`✅ Campaign: ${campaign.name}`);

  // ── Demo Calls (Idempotent check) ─────────────────────────
  const existingCalls = await prisma.call.count({ where: { tenantId: tenant.id } });
  const callData = [
    { leadIdx: 0, agentIdx: 0, status: 'completed' as const, duration: 204, sentimentScore: 4.5, qualityScore: 88, outcome: 'Qualified — appointment booked for Thursday' },
    { leadIdx: 1, agentIdx: 1, status: 'completed' as const, duration: 156, sentimentScore: 3.8, qualityScore: 72, outcome: 'Interested — follow-up scheduled' },
    { leadIdx: 2, agentIdx: 2, status: 'completed' as const, duration: 312, sentimentScore: 4.9, qualityScore: 95, outcome: 'Demo booked — high intent' },
    { leadIdx: 3, agentIdx: 0, status: 'missed'    as const, duration: 0,   sentimentScore: undefined, qualityScore: undefined, outcome: 'No answer' },
    { leadIdx: 4, agentIdx: 1, status: 'completed' as const, duration: 98,  sentimentScore: 3.2, qualityScore: 61, outcome: 'Not interested — budget constraint' },
  ];

  if (existingCalls === 0) {
    await Promise.all(
      callData.map(c => prisma.call.create({
        data: {
          phone:          leads[c.leadIdx].phone,
          direction:      'outbound',
          status:         c.status,
          duration:       c.duration || null,
          sentimentScore: c.sentimentScore ?? null,
          qualityScore:   c.qualityScore ?? null,
          outcome:        c.outcome,
          tenantId:       tenant.id,
          leadId:         leads[c.leadIdx].id,
          agentId:        agents[c.agentIdx].id,
          campaignId:     campaign.id,
          startedAt:      new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000),
          endedAt:        c.duration ? new Date(Date.now() - Math.random() * 7 * 60 * 60 * 1000) : null,
        },
      }))
    );
    console.log(`✅ Calls: ${callData.length} created`);
  } else {
    console.log(`✅ Calls: ${existingCalls} existing demo calls preserved`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('📧 Login: admin@acmecorp.com / Demo@1234');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
