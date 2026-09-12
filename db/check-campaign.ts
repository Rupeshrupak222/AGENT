import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: {
      leads: {
        include: {
          lead: true,
        },
      },
      agent: true,
    },
  });

  console.log(`Found ${campaigns.length} campaigns:`);
  for (const c of campaigns) {
    console.log(`- Campaign: ${c.name} (ID: ${c.id})`);
    console.log(`  Status: ${c.status}, Agent: ${c.agent?.name || 'None'}`);
    console.log(`  Enrolled Leads (${c.leads.length}):`);
    for (const cl of c.leads) {
      console.log(`    * Lead: ${cl.lead?.name} (${cl.lead?.phone}) -> Status: ${cl.status}, Attempts: ${cl.attemptCount}`);
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
