import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('📚 Seeding Adyapan AI Knowledge Base sources via SQL...');

  const tenants: any[] = await prisma.$queryRawUnsafe(`SELECT id, name FROM "Tenant" WHERE slug = 'acme-corp-demo' LIMIT 1`);
  if (!tenants || tenants.length === 0) {
    console.error('Acme tenant not found!');
    return;
  }
  const tenantId = tenants[0].id;

  const agents: any[] = await prisma.$queryRawUnsafe(
    `SELECT id, name FROM "AIAgent" WHERE "tenantId" = $1 AND name = 'Adyapan AI' LIMIT 1`,
    tenantId
  );
  const agentId = agents?.[0]?.id || null;

  const sources = [
    {
      name: 'Adyapan AI — Full Stack AI Engineering Masterclass (Syllabus & Fees)',
      type: 'manual',
      status: 'ready',
      tags: ['edutech', 'curriculum', 'ai', 'fullstack', 'pricing'],
      content: `ADYAPAN AI ACADEMY — FULL STACK AI ENGINEERING MASTERCLASS (2026)
Duration: 6 Months (24 Weeks)
Mode: 100% Live Interactive Weekend Batches (Sat & Sun 10 AM - 1 PM IST)
Tuition Fee: ₹45,000 (One-time) or 6 x ₹7,999/mo (No-cost 0% EMI).
Early Bird Scholarship: Use code ADYAPAN15 for instant 15% discount (Effective fee: ₹38,250).

Curriculum Highlights:
- Module 1: Advanced TypeScript, React 19, Next.js App Router, TailwindCSS.
- Module 2: Python Backend, FastAPI, Microservices Architecture, Async SQLAlchemy.
- Module 3: Vector Databases (Pinecone, Qdrant, Milvus), RAG (Retrieval Augmented Generation).
- Module 4: LangChain, LangGraph, Multi-Agent Autonomous Architectures.
- Module 5: Open-source LLM Fine-tuning (LoRA / QLoRA with PyTorch & HuggingFace).
- Module 6: Real-World Capstone: Build an Autonomous Voice Agent for Telephony.

Career Support:
- 100% Guaranteed Placement Support with 150+ Hiring Partners.
- Resume review, mock system design interviews, and direct referral drives.
- Average starting CTC: ₹12.5 LPA - ₹28 LPA for experienced career switchers.`,
    },
    {
      name: 'Adyapan AI — Data Science & Generative AI Bootcamp',
      type: 'manual',
      status: 'ready',
      tags: ['datascience', 'genai', 'python', 'bootcamp', 'ml'],
      content: `ADYAPAN AI ACADEMY — DATA SCIENCE & GENERATIVE AI BOOTCAMP
Duration: 4 Months (16 Weeks)
Tuition Fee: ₹35,000 (or ₹5,999/mo across 6 months).

Key Curriculum Modules:
1. Python for Data Science (NumPy, Pandas, Polars, Seaborn, Matplotlib).
2. Applied Statistics & Hypothesis Testing for Production Analytics.
3. Machine Learning Foundations (Supervised, Unsupervised, Scikit-learn, XGBoost).
4. Deep Learning & Computer Vision with PyTorch.
5. Large Language Models, Prompt Engineering, RLHF, and AI Agent Swarms.
6. Industry Projects: Algorithmic Trading Model, Medical Image Diagnostics, and Customer Churn Predictor.`,
    },
    {
      name: 'Adyapan AI — Cloud DevOps & MLOps Infrastructure Track',
      type: 'manual',
      status: 'ready',
      tags: ['cloud', 'devops', 'mlops', 'kubernetes', 'aws', 'gcp'],
      content: `ADYAPAN AI ACADEMY — CLOUD DEVOPS & MLOPS INFRASTRUCTURE
Duration: 3 Months (12 Weeks)
Tuition Fee: ₹30,000.
Included: Free official AWS Solutions Architect or GCP Cloud Engineer exam certification voucher!

Core Topics:
- Docker containerization, Multi-stage builds, Container security.
- Kubernetes cluster orchestration, Helm charts, Ingress routing.
- Infrastructure as Code (IaC) with Terraform & Ansible.
- CI/CD Pipelines with GitHub Actions, ArgoCD GitOps.
- MLOps Pipeline Automation with Kubeflow, MLflow, and model registry governance.`,
    },
    {
      name: 'Adyapan AI — Admissions Policy, EMI Financing & Free Demo Booking',
      type: 'faq',
      status: 'ready',
      tags: ['admissions', 'faq', 'emi', 'refund', 'demo-booking'],
      content: `ADYAPAN AI — ADMISSIONS & DEMO CLASS FREQUENTLY ASKED QUESTIONS

Q: Can I attend a free demo counseling session before enrolling?
A: Absolutely! Adyapan AI can schedule a complimentary 1-on-1 counseling and trial masterclass with our lead faculty. Classes run every Wednesday and Saturday at 6:00 PM IST.

Q: What are the payment options?
A: We accept Credit/Debit Cards, UPI, Net Banking, and offer 0% Interest EMI over 3, 6, 9, or 12 months with Bajaj Finserv, ZestMoney, and major credit cards.

Q: What is the refund policy?
A: 100% money-back guarantee if requested within the first 14 days of cohort commencement, no questions asked.

Q: Are there prerequisite qualifications needed?
A: Basic programming familiarity in any language is helpful, but our preparatory bootcamp (Module 0) gets complete beginners up to speed in 2 weeks.`,
    },
  ];

  for (const s of sources) {
    const existing: any[] = await prisma.$queryRawUnsafe(
      `SELECT id FROM "KnowledgeSource" WHERE "tenantId" = $1 AND name = $2 LIMIT 1`,
      tenantId,
      s.name
    );

    if (existing && existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE "KnowledgeSource" SET "content" = $1, "status" = $2, "tags" = $3, "agentId" = $4, "updatedAt" = NOW() WHERE id = $5`,
        s.content,
        s.status,
        s.tags,
        agentId,
        existing[0].id
      );
      console.log(`Updated knowledge source: ${s.name}`);
    } else {
      const newId = `ks_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "KnowledgeSource" (id, name, type, content, status, tags, "agentId", "tenantId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        newId,
        s.name,
        s.type,
        s.content,
        s.status,
        s.tags,
        agentId,
        tenantId
      );
      console.log(`Created knowledge source: ${s.name}`);
    }
  }

  console.log('✅ Adyapan AI Knowledge Base successfully populated!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
