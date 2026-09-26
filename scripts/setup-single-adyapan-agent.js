const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up single Adyapan Edutech Agent ---');

  // 1. Ensure Tenant is Adyapan Edutech Pvt. Ltd.
  let tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: 'adyapan-edutech' },
        { slug: 'acme-corp-demo' },
      ],
    },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Adyapan Edutech Pvt. Ltd.',
        slug: 'adyapan-edutech',
        plan: 'growth',
        isActive: true,
        settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
      },
    });
  } else {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: 'Adyapan Edutech Pvt. Ltd.',
        slug: 'adyapan-edutech',
      },
    });
  }
  console.log(`Tenant ready: ${tenant.name} (${tenant.id})`);

  // 2. Remove all other companies/tenants if any exist
  await prisma.user.deleteMany({
    where: { tenantId: { not: tenant.id } },
  });
  await prisma.tenant.deleteMany({
    where: { id: { not: tenant.id } },
  });
  console.log('Removed any other company tenants.');

  // 3. Ensure Admin User exists under Adyapan Edutech
  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!admin) {
    throw new Error('No admin user found for tenant');
  }

  // 4. Ensure any existing agents are removed
  await prisma.campaignLead.deleteMany({});
  await prisma.campaign.deleteMany({});
  await prisma.callTranscript.deleteMany({});
  await prisma.callRecording.deleteMany({});
  await prisma.callAnalysis.deleteMany({});
  await prisma.call.deleteMany({});
  await prisma.knowledgeSource.deleteMany({});
  await prisma.phoneNumber.updateMany({ data: { assignedAgentId: null } });
  await prisma.lead.updateMany({ data: { assignedAgentId: null } });
  const deletedCount = await prisma.aIAgent.deleteMany({});
  console.log(`Cleared previous agents: ${deletedCount.count}`);

  // 5. Create the single, dedicated Adyapan Edutech AI Agent in English
  const pitchOpening = `Hi, am I speaking with {{name}}?

Hi {{name}}, I’m calling from Adyapan Edutech Pvt. Ltd.

The reason I’m calling is that we’re currently offering career-focused training and internship programs for students and freshers across multiple domains such as Artificial Intelligence & Machine Learning, Data Science, Full Stack Development, Cyber Security, Cloud Computing, and other emerging technologies.

I wanted to quickly understand — are you currently looking for an internship, certification, or a program to improve your technical skills and placement opportunities?`;

  const pitchFollowup = `PITCH FLOW & VALUE PROPOSITION:
1. When the student shares their interest (e.g. internship, certification, skill improvement, or placements):
   Respond with:
   "That's great. Based on your interest, we have a program that could be relevant for you.
   The program combines practical learning, projects, industry-oriented skills, certification, and internship experience, so you can build something meaningful for your resume instead of only completing theoretical courses.
   You'll also get guidance throughout the program and an opportunity to work on real-world projects related to your selected domain.
   For example, if you're interested in AI/ML, you'll work with technologies and concepts used in the industry and build projects that you can showcase during placements and interviews.
   We have different program structures depending on the student's requirements.
   If you're interested, I can explain the duration, curriculum, certification, internship details, and fee structure in just a couple of minutes.
   Would you like me to explain the program?"

2. QUALIFICATION & NEXT STEPS:
   - Target Audience: Students (B.Tech, BCA, BSc, MCA, etc.), fresh graduates, and career transitioners.
   - Domains: AI & ML, Data Science, Full Stack Web Development, Cyber Security, Cloud Computing.
   - Key Value: Real-world projects, verified internship certificate, placement preparation, and 1-on-1 mentorship.
   - Call Goal: Answer questions, verify student enthusiasm, and schedule a Free 1-on-1 Counseling Demo or Faculty Masterclass.`;

  const knowledgeBase = `COMPANY OVERVIEW:
Company: Adyapan Edutech Pvt. Ltd.
Mission: Delivering practical, project-based tech education and verified internship experiences for students and freshers to accelerate campus placements and high-growth tech careers.

PROGRAM DOMAINS:
1. Artificial Intelligence & Machine Learning:
   - Core concepts: Python, Machine Learning, Deep Learning, Generative AI, LLMs, NLP.
   - Practical work: Building industry-grade ML models, chatbot engines, predictive analytics.
2. Data Science:
   - Core concepts: Python, SQL, Pandas, NumPy, Data Visualization, Business Analytics, Power BI.
   - Practical work: Real-world dataset analysis, ETL pipelines, predictive customer modeling.
3. Full Stack Web Development:
   - Core concepts: HTML/CSS, JavaScript, TypeScript, React, Next.js, Node.js, Express, PostgreSQL/MongoDB.
   - Practical work: End-to-end full-stack web applications, REST APIs, authentication and deployment.
4. Cyber Security:
   - Core concepts: Ethical Hacking, Network Defense, Penetration Testing, SOC Analysis, OWASP Top 10.
   - Practical work: Security auditing, vulnerability scanning, secure system architectures.
5. Cloud Computing & DevOps:
   - Core concepts: AWS Cloud Architecture, Docker, Kubernetes, Linux, CI/CD Pipelines.
   - Practical work: Containerized application deployment, automated cloud infrastructure.

PROGRAM HIGHLIGHTS:
- 100% Practical & Project-Oriented: Every student builds tangible projects to showcase on their resume and GitHub.
- Verified Internship Certificate: Official internship completion certificate from Adyapan Edutech Pvt. Ltd.
- Industry-Recognized Certification: Proves domain expertise to recruiters.
- Placement & Interview Support: Resume building, technical mock interviews, and recruiter referrals.
- Flexible Batches: Weekend and evening batches tailored to college semester schedules.

CALL TO ACTION / NEXT STEP:
- Book a Free 1-on-1 Academic Demo / Counseling Session with a faculty mentor.
- Send the complete curriculum roadmap, fee details, and scholarship options over WhatsApp or Email.`;

  const agent = await prisma.aIAgent.create({
    data: {
      name: 'Adyapan AI Admissions Counselor',
      role: 'sales',
      language: 'english',
      voiceId: 'en-IN-NeerjaNeural',
      businessGoal: 'Call students and freshers on behalf of Adyapan Edutech Pvt. Ltd. to present career-oriented training and internship programs across AI/ML, Data Science, Full Stack, Cyber Security, and Cloud Computing. Understand their goals, deliver the structured sales pitch, address questions, and book a free 1-on-1 counseling demo.',
      openingScript: pitchOpening,
      qualificationRules: pitchFollowup,
      knowledgeBase: knowledgeBase,
      status: 'active',
      tenantId: tenant.id,
      createdById: admin.id,
      settings: {
        voiceSpeed: 1.0,
        voicePitch: 1.0,
        temperature: 0.7,
        maxTokens: 160,
      },
    },
  });

  console.log(`\n🎉 SINGLE AI AGENT CREATED SUCCESSFULLY!`);
  console.log(`ID:       ${agent.id}`);
  console.log(`Name:     ${agent.name}`);
  console.log(`Company:  Adyapan Edutech Pvt. Ltd.`);
  console.log(`Language: ${agent.language} (English only)`);
  console.log(`Voice:    ${agent.voiceId}`);
  console.log(`Status:   ${agent.status}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to setup agent:', err);
  process.exit(1);
});
