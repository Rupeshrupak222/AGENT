import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres_dev_password@localhost:5432/agentcall_db?schema=public';
}

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding All 4 Flows: Campaigns, Calls, Appointments & Knowledge Base...');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'acme-corp-demo' },
  });

  if (!tenant) {
    throw new Error('Tenant acme-corp-demo not found. Run base seed first.');
  }

  const agents = await prisma.aIAgent.findMany({
    where: { tenantId: tenant.id },
  });

  const arjunAgent = agents.find(a => a.name.includes('Arjun')) || agents[0];
  const rohanAgent = agents.find(a => a.name.includes('Rohan')) || agents[1];
  const kavithaAgent = agents.find(a => a.name.includes('Kavitha')) || agents[2];
  const ananyaAgent = agents.find(a => a.name.includes('Ananya')) || agents[3];
  const sarahAgent = agents.find(a => a.name.includes('Sarah')) || agents[4];

  // ── 1. Update Knowledge Base on Agents ────────────────────────
  console.log('1️⃣ Seeding Knowledge Base Context on Multilingual Agents...');
  await prisma.aIAgent.update({
    where: { id: arjunAgent.id },
    data: {
      knowledgeBase: 'Acme Enterprise Calling Platform. Pricing: Starter Plan ₹4,999/mo (1,000 mins), Growth Plan ₹14,999/mo (5,000 mins + 10 agents), Enterprise Plan ₹49,999/mo (unlimited agents, priority SLA, 0.4s conversational latency). Integrations: Salesforce, HubSpot, Zoho, Twilio, Exotel. BANT Criteria: Budget > ₹50,000/mo, Authority: VP/Director, Need: Automate telesales, Timeline: Q3/Q4.',
    },
  });

  await prisma.aIAgent.update({
    where: { id: rohanAgent.id },
    data: {
      knowledgeBase: 'एक्मे रिटेल और एसएमई कॉलिंग सॉफ़्टवेयर। मुख्य विशेषताएँ: 24/7 ऑटोमैटिक हिंदी कॉलिंग, आर्डर कन्फर्मेशन, पेमेंट रिमाइंडर, और कस्टमर सपोर्ट। कॉलिंग रेट: ₹1.20 प्रति मिनट। सीआरएम और व्हाट्सएप ऑटोमेशन सपोर्ट उपलब्ध है। हमेशा ग्राहक से सम्मानपूर्वक बात करें और कॉल के अंत में व्हाट्सएप पर विवरण भेजने का प्रस्ताव दें।',
    },
  });

  await prisma.aIAgent.update({
    where: { id: kavithaAgent.id },
    data: {
      knowledgeBase: 'ఆక్మే రియల్ ఎస్టేట్ & హెల్త్‌కేర్ టెలికాలింగ్ ప్లాట్‌ఫాం. మాదాపూర్ & గచ్చిబౌలి ప్రీమియం గేటెడ్ కమ్యూనిటీ ప్రాజెక్టులు: 3 & 4 BHK లగ్జరీ విల్లాస్ (ధర ₹2.5 Cr నుండి ₹4.8 Cr). క్లినికల్ అపాయింట్‌మెంట్స్: డాక్టర్ కన్సల్టేషన్ బుకింగ్ మరియు టెస్ట్ రిపోర్ట్స్ ఫాలో-అప్. కాల్ ముగింపులో శనివారం లేదా ఆదివారం సైట్ విజిట్ లేదా అపాయింట్‌మెంట్ బుక్ చేయాలి.',
    },
  });
  console.log(`✅ Knowledge base successfully synced to agents!`);

  // ── 2. Multilingual Outbound Calling Campaigns ────────────────
  console.log('2️⃣ Seeding Multilingual Campaigns...');
  const campaignData = [
    {
      name: 'Enterprise Q3 SaaS Sales (English)',
      description: 'Consultative outbound calling targeting high-value enterprise accounts with Arjun AI',
      status: 'running' as const,
      maxCalls: 500,
      callsPerDay: 120,
      startTime: '09:00',
      endTime: '18:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      tenantId: tenant.id,
      agentId: arjunAgent.id,
    },
    {
      name: 'North India Retail Telesales (Hindi)',
      description: 'Automated Hindi qualification and telesales for SME merchants with Rohan AI',
      status: 'running' as const,
      maxCalls: 400,
      callsPerDay: 100,
      startTime: '09:30',
      endTime: '18:30',
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      tenantId: tenant.id,
      agentId: rohanAgent.id,
    },
    {
      name: 'Hyderabad & Vizag Real Estate Outbound (Telugu)',
      description: 'High-intent Telugu real estate qualification and site visit scheduling with Kavitha AI',
      status: 'running' as const,
      maxCalls: 350,
      callsPerDay: 80,
      startTime: '10:00',
      endTime: '19:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      tenantId: tenant.id,
      agentId: kavithaAgent.id,
    },
  ];

  const campaigns = [];
  for (const c of campaignData) {
    const existing = await prisma.campaign.findFirst({
      where: { tenantId: tenant.id, name: c.name },
    });
    if (existing) {
      campaigns.push(await prisma.campaign.update({ where: { id: existing.id }, data: c }));
    } else {
      campaigns.push(await prisma.campaign.create({ data: c }));
    }
  }
  console.log(`✅ Campaigns created: ${campaigns.length}`);

  // ── 3. Leads ──────────────────────────────────────────────────
  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    take: 8,
  });

  // ── 4. Calls with Full Transcripts & Sentiment ────────────────
  console.log('3️⃣ Seeding Rich Calls & Transcripts (English, Hindi, Telugu)...');
  
  const callPayloads = [
    {
      lead: leads[0] || { id: 'lead-1', phone: '+919876543210', name: 'Rahul Sharma' },
      agent: arjunAgent,
      campaign: campaigns[0],
      language: 'english',
      phone: '+919876543210',
      status: 'completed' as const,
      duration: 185,
      sentimentScore: 4.8,
      qualityScore: 92,
      outcome: 'Qualified — Enterprise Demo Booked',
      summary: 'Lead expressed strong interest in replacing manual outbound telecalling with autonomous AI agents. Budget approved for Q3. Demo confirmed for Friday 3 PM.',
      segments: [
        { speaker: 'agent', text: 'Hello Rahul, this is Arjun from Acme Corp. I noticed you recently registered for our enterprise voice AI whitepaper. Do you have two minutes?', startTime: 0, endTime: 7 },
        { speaker: 'lead', text: 'Hi Arjun, yes, we are actually looking to automate our outbound telesales qualification. What kind of latency do your agents have?', startTime: 8, endTime: 15 },
        { speaker: 'agent', text: 'Our neural voice pipeline operates at sub-500ms conversational latency, supporting English, Hindi, and Telugu natively with CRM sync. How many telecallers are on your team right now?', startTime: 16, endTime: 27 },
        { speaker: 'lead', text: 'We have around 25 calling reps across Delhi and Bangalore. Can we set up a live demonstration for our VP of Sales this Friday at 3 PM?', startTime: 28, endTime: 37 },
        { speaker: 'agent', text: 'Absolutely Rahul! I have scheduled that demo for Friday at 3 PM and dispatched the calendar invite to your email. Thank you for your time!', startTime: 38, endTime: 48 },
      ],
    },
    {
      lead: leads[1] || { id: 'lead-2', phone: '+918765432109', name: 'Amit Verma' },
      agent: rohanAgent,
      campaign: campaigns[1],
      language: 'hindi',
      phone: '+918765432109',
      status: 'completed' as const,
      duration: 142,
      sentimentScore: 4.5,
      qualityScore: 88,
      outcome: 'Interested — Follow-up Scheduled',
      summary: 'अमित जी ने नए रिटेल आउटलेट के लिए वॉयस कॉलिंग बॉट में रुचि दिखाई। उन्होंने शनिवार को 4 बजे दोबारा बात करने का समय दिया है।',
      segments: [
        { speaker: 'agent', text: 'नमस्ते अमित जी! मैं रोहन बोल रहा हूँ एक्मे कॉर्प से। क्या यह सही समय है आपसे 2 मिनट बात करने का?', startTime: 0, endTime: 6 },
        { speaker: 'lead', text: 'हाँ रोहन जी बोलिए, किस बारे में बात करनी थी?', startTime: 7, endTime: 11 },
        { speaker: 'agent', text: 'सर, हम रिटेल स्टोर्स के लिए 24/7 ऑटोमैटिक हिंदी कॉलिंग सर्विस देते हैं जो ग्राहकों के ऑर्डर कन्फर्म और सपोर्ट संभालती है।', startTime: 12, endTime: 22 },
        { speaker: 'lead', text: 'बहुत बढ़िया! क्या यह हमारे CRM सॉफ्टवेयर के साथ जुड़ जाएगा? हमें रेट कार्ड देखना है।', startTime: 23, endTime: 31 },
        { speaker: 'agent', text: 'जी हाँ, बिल्कुल! मैंने व्हाट्सएप और ईमेल पर पूरी जानकारी भेज दी है। मैं शनिवार को शाम 4 बजे आपको दोबारा कनेक्ट करूँगा।', startTime: 32, endTime: 42 },
      ],
    },
    {
      lead: leads[2] || { id: 'lead-3', phone: '+917654321098', name: 'Srinivas Rao' },
      agent: kavithaAgent,
      campaign: campaigns[2],
      language: 'telugu',
      phone: '+917654321098',
      status: 'completed' as const,
      duration: 215,
      sentimentScore: 4.9,
      qualityScore: 96,
      outcome: 'Demo Booked — Site Visit Scheduled',
      summary: 'శ్రీనివాస్ గారు మాదాపూర్ ప్రాజెక్ట్ వివరాలపై చాలా ఆసక్తి కనబరిచారు. శనివారం ఉదయం 11 గంటలకు సైట్ విజిట్ కన్ఫర్మ్ చేశారు.',
      segments: [
        { speaker: 'agent', text: 'నమస్కారం శ్రీనివాస్ గారు! నేను కవిత మాట్లాడుతున్నాను, ఆక్మే రియల్ ఎస్టేట్ నుండి. మాదాపూర్ లో మా కొత్త గేటెడ్ కమ్యూనిటీ వివరాలు తెలుసుకోవడానికి మీకు 2 నిమిషాలు వీలవుతుందా?', startTime: 0, endTime: 10 },
        { speaker: 'lead', text: 'నమస్కారం అండి, అవును నేను 3 BHK విల్లాస్ కోసం చూస్తున్నాను. ప్రైసింగ్ ఎలా ఉంది?', startTime: 11, endTime: 18 },
        { speaker: 'agent', text: 'సార్, మా ప్రాజెక్ట్ లో 3 BHK అల్ట్రా-లగ్జరీ విల్లాస్ అందుబాటులో ఉన్నాయి, ప్రపంచ స్థాయి సౌకర్యాలతో. మీరు ప్రత్యక్షంగా సైట్ చూడాలనుకుంటున్నారా?', startTime: 19, endTime: 30 },
        { speaker: 'lead', text: 'తప్పకుండా! ఈ శనివారం ఉదయం 11 గంటలకు సైట్ విజిట్ ప్లాన్ చేయగలరా?', startTime: 31, endTime: 38 },
        { speaker: 'agent', text: 'తప్పకుండా శ్రీనివాస్ గారు! శనివారం ఉదయం 11 గంటలకు సైట్ విజిట్ బుక్ చేసాను. వివరాలు మీ వాట్సాప్ కు పంపాను. ధన్యవాదాలు!', startTime: 39, endTime: 50 },
      ],
    },
  ];

  for (const cp of callPayloads) {
    const call = await prisma.call.create({
      data: {
        phone: cp.phone,
        direction: 'outbound',
        status: cp.status,
        duration: cp.duration,
        sentimentScore: cp.sentimentScore,
        qualityScore: cp.qualityScore,
        outcome: cp.outcome,
        tenantId: tenant.id,
        leadId: cp.lead.id,
        agentId: cp.agent.id,
        campaignId: cp.campaign.id,
        startedAt: new Date(Date.now() - 30 * 60 * 1000),
        endedAt: new Date(Date.now() - (30 * 60 - cp.duration) * 1000),
      },
    });

    await prisma.callTranscript.create({
      data: {
        callId: call.id,
        summary: cp.summary,
        segments: cp.segments,
        keywords: ['enterprise', 'pricing', 'demo', cp.language, 'qualification'],
      },
    });
  }
  console.log(`✅ Calls & Transcripts seeded in English, Hindi, and Telugu!`);

  // ── 5. Calendar Appointments ──────────────────────────────────
  console.log('4️⃣ Seeding Calendar Appointments...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(11, 0, 0, 0);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(15, 0, 0, 0);

  const weekend = new Date();
  weekend.setDate(weekend.getDate() + 3);
  weekend.setHours(16, 30, 0, 0);

  const appointmentsData = [
    {
      leadName: 'Srinivas Rao',
      phone: '+917654321098',
      email: 'srinivas.rao@gmail.com',
      topic: 'Telugu Real Estate Site Visit Demo — Madhapur 3BHK Villa Consultation',
      date: tomorrow,
      duration: 45,
      status: 'scheduled' as const,
      tenantId: tenant.id,
      agentId: kavithaAgent.id,
    },
    {
      leadName: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul.sharma@infosys.com',
      topic: 'Enterprise AI Calling Architecture Review & Telesales Latency Demo',
      date: dayAfter,
      duration: 30,
      status: 'confirmed' as const,
      tenantId: tenant.id,
      agentId: arjunAgent.id,
    },
    {
      leadName: 'Amit Verma',
      phone: '+918765432109',
      email: 'amit.verma@retailindia.com',
      topic: 'North India SME Hindi Telecalling Demo — Order Verification Bot',
      date: weekend,
      duration: 30,
      status: 'scheduled' as const,
      tenantId: tenant.id,
      agentId: rohanAgent.id,
    },
  ];

  for (const appt of appointmentsData) {
    await prisma.appointment.create({ data: appt });
  }
  console.log(`✅ Calendar Appointments seeded: ${appointmentsData.length}`);

  console.log('\n🎉 ALL 4 FLOWS FULLY POPULATED & READY TO EXPLORE!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
