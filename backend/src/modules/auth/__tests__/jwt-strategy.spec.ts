import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from '../strategies/jwt.strategy';

function createStrategy(prismaOverrides: any = {}) {
  const config = { get: (key: string) => (key === 'JWT_SECRET' ? 'test-secret' : null) };
  const prisma = {
    isConnected: true,
    user: {
      findUnique: jest.fn(),
    },
    ...prismaOverrides,
  };
  return new JwtStrategy(config as any, prisma as any);
}

describe('JwtStrategy', () => {
  const payload = { sub: 'u1', email: 'a@b.c', tenantId: 't1', role: 'company_admin' };

  describe('offline development fast-path', () => {
    it('should allow company_admin', async () => {
      const strategy = createStrategy({ isConnected: false });
      const user = await strategy.validate(payload);
      expect(user.role).toBe('company_admin');
    });

    it('should allow super_admin', async () => {
      const strategy = createStrategy({ isConnected: false });
      const user = await strategy.validate({ ...payload, role: 'super_admin' });
      expect(user.role).toBe('super_admin');
    });

    it('should allow manager', async () => {
      const strategy = createStrategy({ isConnected: false });
      const user = await strategy.validate({ ...payload, role: 'manager' });
      expect(user.role).toBe('manager');
    });

    it('should reject agent', async () => {
      const strategy = createStrategy({ isConnected: false });
      await expect(strategy.validate({ ...payload, role: 'agent' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject viewer', async () => {
      const strategy = createStrategy({ isConnected: false });
      await expect(strategy.validate({ ...payload, role: 'viewer' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should reject unknown roles', async () => {
      const strategy = createStrategy({ isConnected: false });
      await expect(strategy.validate({ ...payload, role: 'not-a-role' }))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('online database path', () => {
    const onlineUser = (role: string, overrides: any = {}) => ({
      id: 'u1',
      email: 'a@b.c',
      name: 'Test User',
      role,
      tenantId: 't1',
      isActive: true,
      tenant: { id: 't1', name: 'Acme', plan: 'growth', isActive: true },
      ...overrides,
    });

    it('should allow active manager (resolves role from DB)', async () => {
      const strategy = createStrategy({
        user: { findUnique: jest.fn().mockResolvedValue(onlineUser('manager')) },
      });
      const user = await strategy.validate({ ...payload, role: 'company_admin' });
      expect(user.role).toBe('manager');
    });

    it('should reject agent even when token claims company_admin', async () => {
      const strategy = createStrategy({
        user: { findUnique: jest.fn().mockResolvedValue(onlineUser('agent')) },
      });
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject viewer', async () => {
      const strategy = createStrategy({
        user: { findUnique: jest.fn().mockResolvedValue(onlineUser('viewer')) },
      });
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });

    it('should reject inactive users before role check', async () => {
      const strategy = createStrategy({
        user: { findUnique: jest.fn().mockResolvedValue(onlineUser('company_admin', { isActive: false })) },
      });
      await expect(strategy.validate(payload)).rejects.toThrow(UnauthorizedException);
    });
  });
});