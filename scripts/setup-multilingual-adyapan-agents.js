const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  console.log('--- Setting up Multilingual Agents for Adyapan Edutech Pvt. Ltd. ---');

  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'adyapan-edutech' },
  });
  if (!tenant) throw new Error('Tenant Adyapan Edutech not found');

  const admin = await prisma.user.findFirst({
    where: { tenantId: tenant.id },
  });
  if (!admin) throw new Error('Admin user not found');

  // Shared Knowledge Base
  const knowledgeBase = `COMPANY PROFILE:
Company: Adyapan Edutech Pvt. Ltd.
Mission: Delivering practical, project-based tech education and verified internship experiences for students and freshers to accelerate campus placements and high-growth tech careers.

PROGRAM DOMAINS:
1. Artificial Intelligence & Machine Learning (AI & ML):
   - Python, Machine Learning Algorithms, Deep Learning, Generative AI, LLMs, NLP.
   - Practical work: Building industry-grade ML models, chatbot engines, predictive analytics.
2. Data Science:
   - Python, SQL, Pandas, NumPy, Data Visualization, Business Analytics, Power BI.
   - Practical work: Real-world dataset analysis, ETL pipelines, predictive customer modeling.
3. Full Stack Web Development:
   - HTML/CSS, JavaScript, TypeScript, React, Next.js, Node.js, Express, PostgreSQL/MongoDB.
   - Practical work: End-to-end full-stack web applications, REST APIs, authentication and deployment.
4. Cyber Security:
   - Ethical Hacking, Network Defense, Penetration Testing, SOC Analysis, OWASP Top 10.
   - Practical work: Security auditing, vulnerability scanning, secure system architectures.
5. Cloud Computing & DevOps:
   - AWS Cloud Architecture, Docker, Kubernetes, Linux, CI/CD Pipelines.
   - Practical work: Containerized application deployment, automated cloud infrastructure.

KEY ADVANTAGES:
- 100% Practical & Project-Oriented Learning
- Official Verified Internship Certificate from Adyapan Edutech Pvt. Ltd.
- Industry-Recognized Certification
- Placement & Technical Interview Support
- Flexible evening & weekend batches

CALL GOAL:
- Schedule a Free 1-on-1 Academic Demo / Counseling Session with a faculty mentor.`;

  // 1. Hindi Agent
  const hindiOpening = `नमस्ते, क्या मेरी बात {{name}} जी से हो रही है?

नमस्ते {{name}} जी, मैं Adyapan Edutech Pvt. Ltd. से बात कर रही हूँ।

कॉल करने का मुख्य कारण यह है कि हम कॉलेज छात्रों और फ्रेशर्स के लिए आर्टिफिशियल इंटेलिजेंस, मशीन लर्निंग, डेटा साइंस, फुल स्टैक वेब डेवलपमेंट, साइबर सिक्योरिटी और क्लाउड कंप्यूटिंग जैसी उभरती तकनीकों में करियर-ओरिएंटेड ट्रेनिंग और इंटर्नशिप प्रोग्राम्स ऑफर कर रहे हैं।

मैं संक्षेप में जानना चाहती थी — क्या आप अभी किसी इंटर्नशिप, सर्टिफिकेशन, या अपनी टेक्निकल स्किल्स और प्लेसमेंट ऑपर्च्युनिटीज को बेहतर बनाने के लिए कोई प्रोग्राम देख रहे हैं?`;

  const hindiQualification = `PITCH FLOW & VALUE PROPOSITION (HINDI):
1. जब छात्र अपनी रुचि (इंटर्नशिप / सर्टिफिकेशन / स्किल्स / प्लेसमेंट) बताए:
   उत्तर दें:
   "बहुत बढ़िया! आपकी रुचि के आधार पर, हमारे पास एक ऐसा प्रोग्राम है जो आपके लिए काफी मददगार साबित हो सकता है।
   यह प्रोग्राम प्रैक्टिकल लर्निंग, लाइव प्रोजेक्ट्स, इंडस्ट्री-ओरिएंटेड स्किल्स, सर्टिफिकेशन और इंटर्नशिप एक्सपीरियंस को जोड़ता है, ताकि आप सिर्फ थ्योरी सीखने के बजाय अपने रेज़्युमे के लिए कुछ मीनिंगफुल और दमदार बना सकें।
   पूरे प्रोग्राम के दौरान आपको मेंटर्स का गाइडेंस मिलेगा और अपने चुने हुए डोमेन में रियल-वर्ल्ड प्रोजेक्ट्स पर काम करने का मौका मिलेगा।
   उदाहरण के लिए, अगर आप AI/ML में रुचि रखते हैं, तो आप उन तकनीकों और टूल्स पर काम करेंगे जो इंडस्ट्री में इस्तेमाल होते हैं, और ऐसे प्रोजेक्ट्स बनाएंगे जिन्हें आप प्लेसमेंट्स और जॉब इंटरव्यू में दिखा सकें।
   छात्रों की ज़रूरतों के हिसाब से हमारे पास अलग-अलग प्रोग्राम स्ट्रक्चर्स हैं।
   अगर आप इच्छुक हैं, तो मैं सिर्फ दो मिनट में इसकी अवधि, सिलेबस, सर्टिफिकेशन, इंटर्नशिप डिटेल्स और फीस स्ट्रक्चर समझा सकती हूँ।
   क्या मैं आपको प्रोग्राम के बारे में विस्तार से बताऊँ?"

2. QUALIFICATION CHECKLIST:
   - टारगेट ऑडियंस: कॉलेज छात्र (B.Tech, BCA, BSc, MCA), फ्रेशर्स और जॉब सीकर्स।
   - पसंदीदा डोमेन: AI/ML, Data Science, Full Stack, Cyber Security, Cloud Computing।
   - मुख्य उद्देश्य: लाइव प्रोजेक्ट्स, वेरिफाइड इंटर्नशिप सर्टिफिकेट और प्लेसमेंट सपोर्ट।
   - अगला कदम: फैकल्टी मेंटर के साथ फ्री 1-on-1 काउंसलिंग डेमो सेशन बुक करना।`;

  // 2. Telugu Agent
  const teluguOpening = `నమస్కారం, నేను {{name}} గారితో మాట్లాడుతున్నానా?

నమస్కారం {{name}} గారు, నేను Adyapan Edutech Pvt. Ltd. నుండి మాట్లాడుతున్నాను.

మేము ప్రస్తుతం కాలేజ్ విద్యార్థులు మరియు ఫ్రెషర్స్ కోసం ఆర్టిఫిషియల్ ఇంటెలిజెన్స్, మెషిన్ లెర్నింగ్, డేటా సైన్స్, ఫుల్ స్టాక్ డెవలప్‌మెంట్, సైబర్ సెక్యూరిటీ మరియు క్లౌడ్ కంప్యూటింగ్ వంటి రంగాలలో కెరీర్-ఓరియెంటెడ్ ట్రైనింగ్ మరియు ఇంటర్న్‌షిప్ ప్రోగ్రామ్‌లను అందిస్తున్నాము.

ప్రస్తుతం మీరు మీ టెక్నికల్ స్కిల్స్ మరియు ప్లేస్‌మెంట్ అవకాశాలను మెరుగుపరుచుకోవడానికి ఇంటర్న్‌షిప్, సర్టిఫికేషన్ లేదా ఏదైనా ట్రైనింగ్ ప్రోగ్రామ్ కోసం చూస్తున్నారా అని తెలుసుకోవడానికి కాల్ చేశాను.`;

  const teluguQualification = `PITCH FLOW & VALUE PROPOSITION (TELUGU):
1. విద్యార్థి వారి ఆసక్తిని తెలిపినప్పుడు (ఇంటర్న్‌షిప్ / సర్టిఫికేషన్ / స్కిల్స్ / ప్లేస్‌మెంట్స్):
   సమాధానం:
   "చాలా సంతోషం! మీ ఆసక్తికి తగినట్లుగా, మీకు ఎంతో ఉపయోగపడే ఒక అద్భుతమైన ప్రోగ్రామ్ మా వద్ద ఉంది.
   ఈ ప్రోగ్రామ్ కేవలం థియరీ మాత్రమే కాకుండా ప్రాక్టికల్ లెర్నింగ్, లైవ్ ప్రాజెక్ట్స్, ఇండస్ట్రీ స్కిల్స్, సర్టిఫికేషన్ మరియు ఇంటర్న్‌షిప్ అనుభవాన్ని అందిస్తుంది. దీని ద్వారా మీ రెజ్యూమ్‌కి బలమైన గుర్తింపు లభిస్తుంది.
   ప్రోగ్రామ్ మొత్తం మీకు నిపుణుల మార్గదర్శకత్వం లభిస్తుంది మరియు రియల్-వరల్డ్ ప్రాజెక్ట్‌లపై పని చేసే అవకాశం ఉంటుంది.
   ఉదాహరణకు, మీకు AI/ML లో ఆసక్తి ఉంటే, పరిశ్రమలో ప్రస్తుతం వాడుతున్న టెక్నాలజీలపై మీరు ప్రాజెక్ట్‌లు తయారు చేయవచ్చు, వీటిని మీరు జాబ్ ఇంటర్వ్యూలలో ప్రదర్శించవచ్చు.
   విద్యార్థుల అవసరాలను బట్టి మా వద్ద వివిధ ప్రోగ్రామ్ స్ట్రక్చర్స్ ఉన్నాయి.
   మీకు ఆసక్తి ఉంటే, కేవలం రెండు నిమిషాల్లో దీని వ్యవధి, సిలబస్, సర్టిఫికేషన్, ఇంటర్న్‌షిప్ వివరాలు మరియు ఫీజు వివరాలు వివరిస్తాను.
   ప్రోగ్రామ్ గురించి వివరంగా చెప్పమంటారా?"

2. QUALIFICATION CHECKLIST:
   - టార్గెట్ ఆడియన్స్: కాలేజ్ విద్యార్థులు (B.Tech, BCA, BSc, MCA), ఫ్రెషర్స్ మరియు జాబ్ సీకర్స్.
   - కోరుకున్న రంగాలు: AI & ML, Data Science, Full Stack, Cyber Security, Cloud Computing.
   - ప్రధాన లక్ష్యం: లైవ్ ప్రాజెక్ట్ అనుభవం, సర్టిఫైడ్ ఇంటర్న్‌షిప్ మరియు ప్లేస్‌మెంట్ సపోర్ట్.
   - తదుపరి చర్య: ఫ్యాకల్టీ మెంటార్‌తో ఉచిత 1-on-1 కౌన్సెలింగ్ డెమో సెషన్ బుక్ చేయడం.`;

  // Upsert or create Hindi Agent
  const hindiAgent = await prisma.aIAgent.create({
    data: {
      name: 'Adyapan AI Counselor (Hindi)',
      role: 'sales',
      language: 'hindi',
      voiceId: 'hi-IN-SwaraNeural',
      businessGoal: 'Call students and freshers on behalf of Adyapan Edutech Pvt. Ltd. in Hindi to present career-oriented training and internship programs across AI/ML, Data Science, Full Stack, Cyber Security, and Cloud Computing. Deliver the structured Hindi sales pitch, answer questions warmly, and book a free 1-on-1 counseling demo.',
      openingScript: hindiOpening,
      qualificationRules: hindiQualification,
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
  console.log(`✅ Hindi Agent Created: ${hindiAgent.name} (ID: ${hindiAgent.id}, Voice: ${hindiAgent.voiceId})`);

  // Upsert or create Telugu Agent
  const teluguAgent = await prisma.aIAgent.create({
    data: {
      name: 'Adyapan AI Counselor (Telugu)',
      role: 'sales',
      language: 'telugu',
      voiceId: 'te-IN-ShrutiNeural',
      businessGoal: 'Call students and freshers on behalf of Adyapan Edutech Pvt. Ltd. in Telugu to present career-oriented training and internship programs across AI/ML, Data Science, Full Stack, Cyber Security, and Cloud Computing. Deliver the structured Telugu sales pitch, answer questions warmly, and book a free 1-on-1 counseling demo.',
      openingScript: teluguOpening,
      qualificationRules: teluguQualification,
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
  console.log(`✅ Telugu Agent Created: ${teluguAgent.name} (ID: ${teluguAgent.id}, Voice: ${teluguAgent.voiceId})`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
