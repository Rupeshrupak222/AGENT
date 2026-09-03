import * as jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-jwt-secret-for-integration-tests';
const JWT_REFRESH_SECRET = 'test-refresh-secret-for-integration-tests';

export interface TestUser {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
}

export function createTestToken(user: TestUser): string {
  return jwt.sign(
    { sub: user.sub, email: user.email, role: user.role, tenantId: user.tenantId },
    JWT_SECRET,
    { expiresIn: '1h' },
  );
}

export function createExpiredToken(user: TestUser): string {
  return jwt.sign(
    { sub: user.sub, email: user.email, role: user.role, tenantId: user.tenantId },
    JWT_SECRET,
    { expiresIn: '0s' },
  );
}

// ── Pre-defined test users ──────────────────────────────────────
export const TENANT_A = 'tenant-a-test-id';
export const TENANT_B = 'tenant-b-test-id';

export const USERS = {
  // Tenant A users
  superAdmin: { sub: 'sa-001', email: 'sa@test.com', role: 'super_admin', tenantId: TENANT_A },
  companyAdminA: { sub: 'ca-a-001', email: 'admin-a@test.com', role: 'company_admin', tenantId: TENANT_A },
  managerA: { sub: 'mg-a-001', email: 'manager-a@test.com', role: 'manager', tenantId: TENANT_A },
  agentA: { sub: 'ag-a-001', email: 'agent-a@test.com', role: 'agent', tenantId: TENANT_A },
  viewerA: { sub: 'vw-a-001', email: 'viewer-a@test.com', role: 'viewer', tenantId: TENANT_A },

  // Tenant B users
  companyAdminB: { sub: 'ca-b-001', email: 'admin-b@test.com', role: 'company_admin', tenantId: TENANT_B },
  managerB: { sub: 'mg-b-001', email: 'manager-b@test.com', role: 'manager', tenantId: TENANT_B },
  agentB: { sub: 'ag-b-001', email: 'agent-b@test.com', role: 'agent', tenantId: TENANT_B },
};

// ── Resource IDs (simulated cross-tenant) ───────────────────────
export const RESOURCES = {
  // Tenant A resources
  leadA1: 'lead-a-001',
  leadA2: 'lead-a-002',
  agentA1: 'agent-a-001',
  callA1: 'call-a-001',

  // Tenant B resources
  leadB1: 'lead-b-001',
  agentB1: 'agent-b-001',
  callB1: 'call-b-001',
};

export { JWT_SECRET, JWT_REFRESH_SECRET };
