import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres_dev_password@localhost:5432/agentcall_db?schema=public';
}

const prisma = new PrismaClient();

async function main() {
  console.log('🎓 Seeding Adyapan AI for EduTech Courses...');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'acme-corp-demo' },
  });

  if (!tenant) {
    throw new Error('Tenant acme-corp-demo not found.');
  }

  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id, role: 'super_admin' },
  });

  // ── 1. Create / Upsert Adyapan AI Agent ──────────────────────────
  const adyapanData = {
    name: 'Adyapan AI',
    role: 'sales' as const, // Course Admissions & Career Counselor
    language: 'english' as const,
    voiceId: 'arjun-confident-v1', // Maps to en-IN-NeerjaNeural (fluent Indian English educational counselor)
    businessGoal: 'Counsel prospective students and working professionals on certified Tech & AI courses (Full Stack Web Dev, Data Science, AI/ML, Cloud DevOps), qualify career intent, explain EMI options, and book free 1-on-1 trial demo classes with faculty.',
    openingScript: 'Hello {{name}}, this is Adyapan AI from the Admissions and Academic Counseling team. I received your inquiry regarding our certified Tech and AI career programs. Are you looking to transition into a high-paying tech career or preparing for campus placements?',
    qualificationRules: 'Target Domain: Software / AI / Data / Cloud; Student or Working Professional; Commitment: >= 8-10 hrs/week; Fee Budget: ₹2,999/mo EMI or one-time; Next Step: Book Free Saturday Masterclass or 1-on-1 Mentor Demo.',
    knowledgeBase: `ADYAPAN EDUTECH ACADEMY — COURSE CATALOG & ADMISSIONS GUIDE 2026:
1. Full Stack Web Development (MERN + Next.js + System Design):
   - Duration: 6 Months (Live Weekend Batches + 24/7 Doubt Support)
   - Fee: ₹34,999 (No-cost EMI starting ₹2,999/month)
   - Key Modules: TypeScript, React, Next.js, Node.js, PostgreSQL, Docker, Microservices
   - Outcome: 100% Placement Guarantee Assistance with 250+ Hiring Partners (TCS, Wipro, Infosys, Swiggy, Razorpay)

2. Data Science, Machine Learning & Generative AI:
   - Duration: 8 Months (Live Projects on AWS & HuggingFace)
   - Fee: ₹48,000 (EMI ₹3,999/month)
   - Key Modules: Python, Pandas, SQL, Scikit-Learn, PyTorch, LangChain, RAG Systems, Vector DBs
   - Capstone: Build enterprise AI conversational voice agents and recommendation systems

3. Cloud Engineering & DevOps:
   - Duration: 5 Months
   - Fee: ₹29,999 (EMI ₹2,500/month)
   - Key Modules: Linux, AWS Cloud Practitioner, Docker, Kubernetes, Terraform, CI/CD GitHub Actions

4. Admissions & Scholarship Process:
   - Early Bird Scholarship: 20% fee waiver for top 50 applicants this month
   - Flexible Batches: Saturday & Sunday (6:00 PM - 9:00 PM IST) or Weekday Evenings (8:00 PM - 10:00 PM IST)
   - Next Free Live Trial Masterclass: Every Saturday at 5:00 PM IST
   - Refund Policy: 14-day 100% money-back guarantee if not satisfied`,
    status: 'active' as const,
    tenantId: tenant.id,
    createdById: admin?.id,
  };

  const existing = await prisma.aIAgent.findFirst({
    where: { tenantId: tenant.id, name: 'Adyapan AI' },
  });

  const adyapanAgent = existing
    ? await prisma.aIAgent.update({ where: { id: existing.id }, data: adyapanData })
    : await prisma.aIAgent.create({ data: adyapanData });

  console.log(`✅ Adyapan AI agent ready: ID ${adyapanAgent.id}`);

  // ── 2. Create EduTech Lead ──────────────────────────────────────
  const edutechLead = await prisma.lead.upsert({
    where: {
      tenantId_phone: {
        tenantId: tenant.id,
        phone: '+919988776655',
      },
    },
    update: {
      name: 'Aditya Kulkarni',
      email: 'aditya.k@gmail.com',
      company: '3rd Year B.Tech (CS)',
      status: 'appointment' as const,
      score: 94,
      assignedAgentId: adyapanAgent.id,
      source: 'website',
    },
    create: {
      name: 'Aditya Kulkarni',
      phone: '+919988776655',
      email: 'aditya.k@gmail.com',
      company: '3rd Year B.Tech (CS)',
      status: 'appointment' as const,
      score: 94,
      tenantId: tenant.id,
      assignedAgentId: adyapanAgent.id,
      source: 'website',
    },
  });
  console.log(`✅ EduTech Lead: ${edutechLead.name}`);

  // ── 3. Create EduTech Admissions Campaign ───────────────────────
  const campaignData = {
    name: 'Adyapan AI — Q3 Tech & AI Admissions Drive',
    description: 'Autonomous EduTech student counseling, syllabus walk-through, and trial class bookings with Adyapan AI',
    status: 'running' as const,
    maxCalls: 600,
    callsPerDay: 150,
    startTime: '10:00',
    endTime: '20:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    tenantId: tenant.id,
    agentId: adyapanAgent.id,
  };

  const existingCampaign = await prisma.campaign.findFirst({
    where: { tenantId: tenant.id, name: campaignData.name },
  });

  const campaign = existingCampaign
    ? await prisma.campaign.update({ where: { id: existingCampaign.id }, data: campaignData })
    : await prisma.campaign.create({ data: campaignData });

  console.log(`✅ EduTech Campaign: ${campaign.name}`);

  // ── 4. Create Simulated Counseling Call & Transcript ────────────
  const call = await prisma.call.create({
    data: {
      phone: edutechLead.phone,
      direction: 'outbound',
      status: 'completed',
      duration: 210,
      sentimentScore: 4.9,
      qualityScore: 98,
      outcome: 'Trial Demo Booked — Data Science & Generative AI Program',
      tenantId: tenant.id,
      leadId: edutechLead.id,
      agentId: adyapanAgent.id,
      campaignId: campaign.id,
      startedAt: new Date(Date.now() - 15 * 60 * 1000),
      endedAt: new Date(Date.now() - (15 * 60 - 210) * 1000),
    },
  });

  await prisma.callTranscript.create({
    data: {
      callId: call.id,
      summary: 'Aditya is a 3rd-year CS student looking to specialize in Generative AI and LLMs for upcoming campus placements. Adyapan AI explained the 8-month curriculum, live industry projects, and ₹3,999/mo EMI options. Aditya confirmed registration for the Saturday 5 PM Live Trial Masterclass.',
      segments: [
        { speaker: 'agent', text: 'Hello Aditya, this is Adyapan AI from the Academic Admissions team. I saw your inquiry about our certified Data Science & AI career program. How are you today?', startTime: 0, endTime: 9 },
        { speaker: 'lead', text: 'Hi Adyapan, I am good! I am in my 6th semester of B.Tech and wanted to know if this course covers practical Generative AI and LangChain projects.', startTime: 10, endTime: 18 },
        { speaker: 'agent', text: 'Yes Aditya, absolutely! Our 8-month program includes 6 live capstone projects where you build production RAG systems, AI voice agents, and fine-tune models using PyTorch on AWS GPU clusters. It also includes 100% placement support with top tech firms.', startTime: 19, endTime: 34 },
        { speaker: 'lead', text: 'That sounds really comprehensive. What is the fee structure and do you offer EMI options?', startTime: 35, endTime: 41 },
        { speaker: 'agent', text: 'The program fee is ₹48,000, with no-cost EMI starting at ₹3,999 per month. We also have a 20% early-bird scholarship for this batch. Would you like to attend our free live masterclass this Saturday at 5 PM to experience a live session?', startTime: 42, endTime: 57 },
        { speaker: 'lead', text: 'Yes definitely, please book my slot for the Saturday 5 PM masterclass.', startTime: 58, endTime: 63 },
        { speaker: 'agent', text: 'Done Aditya! I have registered your slot for the Saturday 5 PM Live Masterclass and sent the access link and syllabus PDF to your WhatsApp and email. We look forward to seeing you there!', startTime: 64, endTime: 76 },
      ],
      keywords: ['edutech', 'data science', 'generative ai', 'placements', 'emi', 'masterclass'],
    },
  });
  console.log(`✅ EduTech Counseling Call & Transcript logged!`);

  // ── 5. Create Calendar Appointment for Trial Masterclass ────────
  const saturday = new Date();
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
  saturday.setHours(17, 0, 0, 0);

  await prisma.appointment.create({
    data: {
      leadName: edutechLead.name,
      phone: edutechLead.phone,
      email: edutechLead.email,
      topic: 'Adyapan AI — Data Science & Generative AI Live Trial Masterclass',
      date: saturday,
      duration: 60,
      status: 'scheduled',
      tenantId: tenant.id,
      agentId: adyapanAgent.id,
    },
  });
  console.log(`✅ EduTech Masterclass Appointment scheduled for Saturday 5:00 PM!`);

  console.log('\n🎉 ADYAPAN AI FOR EDUTECH SUCCESSFULLY INTEGRATED!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
