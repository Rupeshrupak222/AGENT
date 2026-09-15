import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AgentsService } from '../agents.service';

describe('AgentsService Operator & Scoping Suite', () => {
  let service: AgentsService;
  let mockPrisma: any;
  let mockAudit: any;
  let mockBrain: any;
  let mockTts: any;

  beforeEach(() => {
    mockPrisma = {
      aIAgent: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
      },
      tenantUpdate: jest.fn(),
    };
    mockAudit = { log: jest.fn() };
    mockBrain = {};
    mockTts = {};
    service = new AgentsService(mockPrisma, mockAudit, mockBrain, mockTts);
  });

  describe('operator assignment validation', () => {
    it('throws ForbiddenException if actor is a manager attempting to assign an operator', async () => {
      await expect(
        service.create(
          'tenant-1',
          'user-1',
          { name: 'Agent Priya', role: 'telecaller', language: 'english', voiceId: 'v1', businessGoal: 'Goal test', operatorUserId: 'op-1' } as any,
          { id: 'mgr-1', role: 'manager', tenantId: 'tenant-1' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException if operatorUserId is not an active agent-role user in the tenant', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          'tenant-1',
          'user-1',
          { name: 'Agent Priya', role: 'telecaller', language: 'english', voiceId: 'v1', businessGoal: 'Goal test', operatorUserId: 'op-invalid' } as any,
          { id: 'admin-1', role: 'company_admin', tenantId: 'tenant-1' },
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: 'op-invalid', tenantId: 'tenant-1', role: 'agent', isActive: true },
        select: { id: true },
      });
    });

    it('allows company_admin to assign an active agent-role operator', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'op-valid' });
      mockPrisma.aIAgent.create.mockResolvedValue({
        id: 'agent-1',
        name: 'Agent Priya',
        operatorUserId: 'op-valid',
        operatorUser: { id: 'op-valid', name: 'Operator Bob', email: 'bob@example.com' },
      });

      const result = await service.create(
        'tenant-1',
        'admin-1',
        { name: 'Agent Priya', role: 'telecaller', language: 'english', voiceId: 'v1', businessGoal: 'Goal test', operatorUserId: 'op-valid' } as any,
        { id: 'admin-1', role: 'company_admin', tenantId: 'tenant-1' },
      );

      expect(result.operatorUserId).toBe('op-valid');
      expect(mockPrisma.aIAgent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ operatorUserId: 'op-valid' }),
          include: expect.objectContaining({ operatorUser: expect.any(Object) }),
        }),
      );
    });
  });

  describe('scoping in findAll and findOne', () => {
    it('applies agentScope for agent-role actor in findAll', async () => {
      mockPrisma.aIAgent.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', undefined, { id: 'agent-user-1', role: 'agent', tenantId: 'tenant-1' });

      expect(mockPrisma.aIAgent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            operatorUser: { id: 'agent-user-1' },
          }),
        }),
      );
    });

    it('applies agentScope for manager actor in findAll', async () => {
      mockPrisma.aIAgent.findMany.mockResolvedValue([]);

      await service.findAll('tenant-1', undefined, { id: 'mgr-1', role: 'manager', tenantId: 'tenant-1' });

      expect(mockPrisma.aIAgent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            manager: { id: 'mgr-1' },
          }),
        }),
      );
    });

    it('throws NotFoundException when findOne agent does not match scope', async () => {
      mockPrisma.aIAgent.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('tenant-1', 'agent-99', { id: 'agent-user-1', role: 'agent', tenantId: 'tenant-1' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
