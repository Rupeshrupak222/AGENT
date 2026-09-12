import { PrismaClient, LeadStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running Live End-to-End Adyapan AI Outbound Admissions Campaign...');

  const tenant = await prisma.tenant.findFirst({ where: { slug: 'acme-corp-demo' } });
  if (!tenant) {
    throw new Error('Tenant acme-corp-demo not found!');
  }

  const adyapanAgent = await prisma.aIAgent.findFirst({
    where: { tenantId: tenant.id, name: 'Adyapan AI' },
  });
  if (!adyapanAgent) {
    throw new Error('Adyapan AI agent not found!');
  }

  let campaign = await prisma.campaign.findFirst({
    where: { tenantId: tenant.id, name: 'Adyapan AI — Q3 Tech & AI Admissions Drive' },
  });

  if (!campaign) {
    campaign = await prisma.campaign.create({
      data: {
        tenantId: tenant.id,
        name: 'Adyapan AI — Q3 Tech & AI Admissions Drive',
        description: 'Autonomous EduTech student counseling and demo class bookings with Adyapan AI',
        status: 'running',
        agentId: adyapanAgent.id,
        maxConcurrentCalls: 5,
        maxAttempts: 3,
        callsPerDay: 150,
      },
    });
  } else {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'running' },
    });
  }

  console.log(`Campaign Active: ${campaign.name} (${campaign.id})`);

  // 1. Student leads
  const studentLeads = [
    {
      name: 'Aditya Sharma',
      phone: '+919876543210',
      email: 'aditya.sharma@example.com',
      company: 'Final Year CS Student (Full Stack AI Inquirer)',
      leadStatus: LeadStatus.qualified,
      transcript: [
        { speaker: 'agent', text: 'Hello Aditya! This is Adyapan AI from the Admissions and Academic Counseling team. I saw your interest in our Full Stack AI Engineering Masterclass. How are you today?', startTime: 0, endTime: 7 },
        { speaker: 'lead', text: 'Hi Adyapan! I am doing well. I wanted to check the curriculum and if there are live weekend classes.', startTime: 8, endTime: 15 },
        { speaker: 'agent', text: 'Yes, absolutely! The program is 100% live interactive on weekends (Saturday and Sunday 10 AM to 1 PM IST) covering React 19, FastAPI, Vector DBs, LangChain, and PyTorch LLM fine-tuning.', startTime: 16, endTime: 27 },
        { speaker: 'lead', text: 'That sounds perfect. What is the fee structure and can I pay in monthly installments?', startTime: 28, endTime: 34 },
        { speaker: 'agent', text: 'The tuition fee is ₹45,000, and with our early-bird scholarship code ADYAPAN15, you get an instant 15% discount making it ₹38,250. We also provide 0% interest EMI options starting at ₹3,999 per month.', startTime: 35, endTime: 48 },
        { speaker: 'lead', text: 'Awesome! Can you book me for the free Saturday trial demo masterclass?', startTime: 49, endTime: 54 },
        { speaker: 'agent', text: 'You are all set! I have reserved your seat for the Saturday 6:00 PM Live Trial Masterclass and sent the Google Meet link to your email. We look forward to seeing you there!', startTime: 55, endTime: 66 },
      ],
      summary: 'Aditya confirmed high interest in the Full Stack AI Masterclass. Inquired about weekend schedule and 0% EMI installments. Successfully registered for Saturday 6 PM Live Trial Masterclass.',
      outcome: 'Trial Demo Booked — Full Stack AI Masterclass',
    },
    {
      name: 'Sneha Patel',
      phone: '+919876543211',
      email: 'sneha.patel@example.com',
      company: 'Junior Software Engineer (Data Science Applicant)',
      leadStatus: LeadStatus.qualified,
      transcript: [
        { speaker: 'agent', text: 'Hello Sneha! This is Adyapan AI calling regarding your application for our 4-month Data Science and Generative AI Bootcamp.', startTime: 0, endTime: 7 },
        { speaker: 'lead', text: 'Hi! Yes, I am working in QA and want to switch to Data Science and Generative AI. Do you have placement support?', startTime: 8, endTime: 16 },
        { speaker: 'agent', text: 'Yes Sneha, we have 150+ hiring partners and offer 100% placement assistance, resume reviews, and direct interview drives. Our average alumni package is 14 LPA.', startTime: 17, endTime: 28 },
        { speaker: 'lead', text: 'Great, please send me the syllabus PDF and book me for the trial class.', startTime: 29, endTime: 34 },
        { speaker: 'agent', text: 'Done! Syllabus dispatched and your demo class is confirmed for this Saturday at 6 PM.', startTime: 35, endTime: 42 },
      ],
      summary: 'Sneha wants to transition from QA to Data Science. Inquired about hiring partners and placement package. Booked for Saturday 6 PM Trial Masterclass.',
      outcome: 'Trial Demo Booked — Data Science & Generative AI',
    },
    {
      name: 'Rahul Verma',
      phone: '+919876543212',
      email: 'rahul.verma@example.com',
      company: 'Systems Engineer (DevOps & Cloud Lead)',
      leadStatus: LeadStatus.contacted,
      transcript: [
        { speaker: 'agent', text: 'Hello Rahul, Adyapan AI here from the Cloud & MLOps Certification Track. Are you planning on Kubernetes and AWS certifications this quarter?', startTime: 0, endTime: 8 },
        { speaker: 'lead', text: 'Yes, looking for hands-on CI/CD and Kubeflow production workflows.', startTime: 9, endTime: 14 },
        { speaker: 'agent', text: 'Our 3-month track includes an official AWS Solutions Architect exam voucher and live ArgoCD GitOps labs. Would you like to review the course guide?', startTime: 15, endTime: 26 },
        { speaker: 'lead', text: 'Yes, please email me the detailed PDF. I will discuss with my manager for corporate sponsorship.', startTime: 27, endTime: 34 },
        { speaker: 'agent', text: 'Sent to rahul.verma@example.com! We will follow up next Tuesday.', startTime: 35, endTime: 40 },
      ],
      summary: 'Rahul is interested in Cloud DevOps & MLOps with corporate sponsorship. Requested official syllabus PDF.',
      outcome: 'Syllabus Dispatched — Corporate Sponsorship Evaluation',
    },
    {
      name: 'Pooja Reddy',
      phone: '+919876543213',
      email: 'pooja.reddy@example.com',
      company: 'Pre-final Year Student (Edutech Admissions)',
      leadStatus: LeadStatus.qualified,
      transcript: [
        { speaker: 'agent', text: 'Namaste Pooja! Adyapan AI speaking. I received your inquiry about college placement preparation in Generative AI.', startTime: 0, endTime: 8 },
        { speaker: 'lead', text: 'Hi! Can complete beginners with only basic C++ join the AI masterclass?', startTime: 9, endTime: 15 },
        { speaker: 'agent', text: 'Yes! Module 0 covers full Python and AI math prerequisites so you will feel confident from Day 1.', startTime: 16, endTime: 25 },
        { speaker: 'lead', text: 'That is wonderful! Please sign me up for the free Saturday counselor session.', startTime: 26, endTime: 31 },
        { speaker: 'agent', text: 'Registered! Confirmation SMS and calendar invite have been sent.', startTime: 32, endTime: 37 },
      ],
      summary: 'Pooja asked about prerequisite support for college students. Enrolled in Module 0 and confirmed for Saturday trial demo.',
      outcome: 'Counseling Session Booked — Beginner AI Track',
    },
  ];

  let totalOffset = 0;

  for (const s of studentLeads) {
    let lead = await prisma.lead.findFirst({
      where: { tenantId: tenant.id, phone: s.phone },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          name: s.name,
          phone: s.phone,
          email: s.email,
          company: s.company,
          status: s.leadStatus,
        },
      });
      console.log(`Created lead: ${lead.name} (${lead.phone})`);
    } else {
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: { name: s.name, email: s.email, company: s.company, status: s.leadStatus },
      });
      console.log(`Updated lead: ${lead.name} (${lead.phone})`);
    }

    // Call duration
    const callDuration = s.transcript[s.transcript.length - 1].endTime;
    totalOffset += callDuration;

    // Create Call Detail Record
    const call = await prisma.call.create({
      data: {
        phone: s.phone,
        direction: 'outbound',
        status: 'completed',
        duration: callDuration,
        sentimentScore: 4.8,
        qualityScore: 96,
        outcome: s.outcome,
        tenantId: tenant.id,
        leadId: lead.id,
        agentId: adyapanAgent.id,
        campaignId: campaign.id,
        startedAt: new Date(Date.now() - (3600 - totalOffset) * 1000),
        endedAt: new Date(Date.now() - (3600 - totalOffset - callDuration) * 1000),
      },
    });

    // Create Call Transcript
    await prisma.callTranscript.create({
      data: {
        callId: call.id,
        summary: s.summary,
        segments: s.transcript as any,
        keywords: ['edutech', 'curriculum', 'admissions', 'fee', 'emi', 'demo'],
      },
    });

    // Link CampaignLead
    const cl = await prisma.campaignLead.findFirst({
      where: { campaignId: campaign.id, leadId: lead.id },
    });

    if (!cl) {
      await prisma.campaignLead.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          status: 'completed',
          attemptCount: 1,
          lastCallId: call.id,
        },
      });
    } else {
      await prisma.campaignLead.update({
        where: { id: cl.id },
        data: {
          status: 'completed',
          attemptCount: 1,
          lastCallId: call.id,
        },
      });
    }

    console.log(`Dialed ${lead.name}: Completed (${callDuration}s) -> ${s.outcome}`);
  }

  // Schedule Appointments for Aditya, Sneha & Pooja
  const saturday = new Date();
  saturday.setDate(saturday.getDate() + ((6 - saturday.getDay() + 7) % 7 || 7));
  saturday.setHours(18, 0, 0, 0);

  const bookings = [
    { name: 'Aditya Sharma', phone: '+919876543210', email: 'aditya.sharma@example.com', topic: 'Full Stack AI Engineering Trial Masterclass' },
    { name: 'Sneha Patel', phone: '+919876543211', email: 'sneha.patel@example.com', topic: 'Data Science & Generative AI Trial Masterclass' },
    { name: 'Pooja Reddy', phone: '+919876543213', email: 'pooja.reddy@example.com', topic: 'Beginner AI Career Counseling & Demo Class' },
  ];

  for (const b of bookings) {
    const existingApt = await prisma.appointment.findFirst({
      where: { tenantId: tenant.id, phone: b.phone, topic: b.topic },
    });

    if (!existingApt) {
      await prisma.appointment.create({
        data: {
          leadName: b.name,
          phone: b.phone,
          email: b.email,
          topic: b.topic,
          date: saturday,
          duration: 60,
          status: 'scheduled',
          tenantId: tenant.id,
          agentId: adyapanAgent.id,
        },
      });
      console.log(`Appointment scheduled for ${b.name}: ${b.topic}`);
    }
  }

  console.log('\n🎉 END-TO-END CAMPAIGN EXECUTION RUN COMPLETED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
