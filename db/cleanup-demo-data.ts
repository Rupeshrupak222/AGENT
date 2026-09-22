/**
 * Cleanup demo data previously seeded for the default tenant.
 * Deletes all demo AI agents, leads, campaigns, calls and related child rows.
 * Keeps the tenant record and all user accounts (logins).
 * Run: npx ts-node cleanup-demo-data.ts
 */
import * as path from 'path';
import * as dotenv from '../backend/node_modules/dotenv';
import { PrismaClient } from '../backend/node_modules/.prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres_dev_password@localhost:5432/agentcall_db?schema=public';
}

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'acme-corp-demo' } });
  if (!tenant) {
    console.log('No default tenant found — nothing to clean.');
    return;
  }
  console.log(`Cleaning demo data for tenant: ${tenant.name} (${tenant.id})`);

  // Delete child rows first to satisfy foreign keys.
  const analysis = await prisma.callAnalysis.deleteMany({ where: { tenantId: tenant.id } });
  const recordings = await prisma.callRecording.deleteMany({ where: { tenantId: tenant.id } });
  const transcripts = await prisma.callTranscript.deleteMany({
    where: { call: { tenantId: tenant.id } },
  });
  const automations = await prisma.automationLog.deleteMany({ where: { tenantId: tenant.id } });
  const campaignLeads = await prisma.campaignLead.deleteMany({
    where: { campaign: { tenantId: tenant.id } },
  });
  const activities = await prisma.activity.deleteMany({ where: { tenantId: tenant.id } });
  const appts = await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });
  const integrations = await prisma.integration.deleteMany({ where: { tenantId: tenant.id } });
  const phones = await prisma.phoneNumber.deleteMany({ where: { tenantId: tenant.id } });
  const knowledge = await prisma.knowledgeSource.deleteMany({ where: { tenantId: tenant.id } });
  const calls = await prisma.call.deleteMany({ where: { tenantId: tenant.id } });
  const campaigns = await prisma.campaign.deleteMany({ where: { tenantId: tenant.id } });
  const leads = await prisma.lead.deleteMany({ where: { tenantId: tenant.id } });
  const agents = await prisma.aIAgent.deleteMany({ where: { tenantId: tenant.id } });

  console.log('Deleted:', {
    agents, leads, calls, campaigns, campaignLeads, activities,
    analysis, recordings, transcripts, automations, appts, integrations, phones, knowledge,
  });

  const users = await prisma.user.count({ where: { tenantId: tenant.id } });
  console.log(`✅ Done. Tenant "${tenant.name}" kept with ${users} user account(s).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());