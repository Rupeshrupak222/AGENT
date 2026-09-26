/**
 * AgentCall AI — Database Seed
 * Run: npx prisma db seed or npm run seed
 */
import * as path from 'path';
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

function loadEnv(filePath: string) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv(path.resolve(__dirname, '../backend/.env'));
loadEnv(path.resolve(__dirname, '../.env'));
loadEnv(path.resolve(__dirname, '.env'));

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres_dev_password@localhost:5432/agentcall_db?schema=public';
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding AgentCall AI database...');

  // ── Default Tenant (container for seeded accounts) ─────────
  const tenant = await prisma.tenant.upsert({
    where:  { slug: 'acme-corp-demo' },
    update: { name: 'Acme Corp' },
    create: {
      name:     'Acme Corp',
      slug:     'acme-corp-demo',
      plan:     'growth',
      isActive: true,
      settings: { timezone: 'Asia/Kolkata', currency: 'INR' },
    },
  });
  console.log(`✅ Tenant: ${tenant.name} (${tenant.id})`);

  // ── Accounts (rich role-specific profiles) ──────────────────
  const pwd = await bcrypt.hash('Demo@1234', 12);

  const superAdmin = await prisma.user.upsert({
    where:  { email: 'superadmin@agentcall.ai' },
    update: {
      name:     'Vikramaditya Rao',
      password: pwd,
      phone:    '+1 (800) 555-0100',
      settings: {
        title: 'Platform Infrastructure Architect',
        department: 'Core Infrastructure & SecOps',
        clearance: 'Cluster Root Level 5',
        bio: 'Oversees root cluster orchestration, multi-tenant isolation, carrier SIP trunks, and global AI provider routing.',
        timezone: 'Asia/Kolkata',
      },
    },
    create: {
      name:     'Vikramaditya Rao',
      email:    'superadmin@agentcall.ai',
      password: pwd,
      role:     'super_admin',
      phone:    '+1 (800) 555-0100',
      tenantId: tenant.id,
      settings: {
        title: 'Platform Infrastructure Architect',
        department: 'Core Infrastructure & SecOps',
        clearance: 'Cluster Root Level 5',
        bio: 'Oversees root cluster orchestration, multi-tenant isolation, carrier SIP trunks, and global AI provider routing.',
        timezone: 'Asia/Kolkata',
      },
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@acmecorp.com' },
    update: {
      name:     'Ashish Sharma',
      password: pwd,
      phone:    '+91 98765 43210',
      settings: {
        title: 'VP of Operations & Workspace Owner',
        department: 'Executive Leadership',
        clearance: 'Tenant Administrator',
        bio: 'Leads enterprise voice automation, organizational AI workforce deployment, carrier DID provisioning, and team subscriptions.',
        timezone: 'Asia/Kolkata',
      },
    },
    create: {
      name:     'Ashish Sharma',
      email:    'admin@acmecorp.com',
      password: pwd,
      role:     'company_admin',
      phone:    '+91 98765 43210',
      tenantId: tenant.id,
      settings: {
        title: 'VP of Operations & Workspace Owner',
        department: 'Executive Leadership',
        clearance: 'Tenant Administrator',
        bio: 'Leads enterprise voice automation, organizational AI workforce deployment, carrier DID provisioning, and team subscriptions.',
        timezone: 'Asia/Kolkata',
      },
    },
  });

  const manager = await prisma.user.upsert({
    where:  { email: 'manager@acmecorp.com' },
    update: {
      name:     'Neha Patel',
      password: pwd,
      phone:    '+91 98765 12345',
      settings: {
        title: 'Call Center Operations Director',
        department: 'Customer Acquisition & Sales Operations',
        clearance: 'Operational Supervisor',
        bio: 'Manages autonomous outbound SDR campaigns, live agent sentiment coaching, lead disposition pipelines, and QA scorecards.',
        timezone: 'Asia/Kolkata',
      },
    },
    create: {
      name:     'Neha Patel',
      email:    'manager@acmecorp.com',
      password: pwd,
      role:     'manager',
      phone:    '+91 98765 12345',
      tenantId: tenant.id,
      settings: {
        title: 'Call Center Operations Director',
        department: 'Customer Acquisition & Sales Operations',
        clearance: 'Operational Supervisor',
        bio: 'Manages autonomous outbound SDR campaigns, live agent sentiment coaching, lead disposition pipelines, and QA scorecards.',
        timezone: 'Asia/Kolkata',
      },
    },
  });

  const operator = await prisma.user.upsert({
    where:  { email: 'agent@acmecorp.com' },
    update: {
      name:     'Arjun Mehta',
      password: pwd,
      phone:    '+91 98765 67890',
      settings: {
        title: 'Voice AI Operator & Specialist',
        department: 'Operations',
        clearance: 'Agent Specialist',
        bio: 'Oversees daily live call telemetry, human handoff transfers, and contact dispositioning.',
        timezone: 'Asia/Kolkata',
      },
    },
    create: {
      name:     'Arjun Mehta',
      email:    'agent@acmecorp.com',
      password: pwd,
      role:     'manager',
      phone:    '+91 98765 67890',
      tenantId: tenant.id,
      settings: {
        title: 'Voice AI Operator & Specialist',
        department: 'Operations',
        clearance: 'Agent Specialist',
        bio: 'Oversees daily live call telemetry, human handoff transfers, and contact dispositioning.',
        timezone: 'Asia/Kolkata',
      },
    },
  });
  console.log(`✅ Users: ${admin.email}, ${manager.email}, ${operator.email}`);

  console.log('\n🎉 Seed complete!');
  console.log('📧 Super Admin: superadmin@agentcall.ai / Demo@1234 (Platform Super Admin)');
  console.log('📧 Company Admin: admin@acmecorp.com / Demo@1234 (Company Admin)');
  console.log('📧 Manager: manager@acmecorp.com / Demo@1234 (Operations Manager)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());