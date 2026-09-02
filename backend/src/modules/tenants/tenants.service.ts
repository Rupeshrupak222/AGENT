import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string) {
    const t = await this.prisma.tenant.findUnique({
      where:   { id },
      include: { _count: { select: { users: true, agents: true } } },
    });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }

  async update(id: string, data: { name?: string; logo?: string; settings?: any }) {
    await this.findOne(id);
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async getUsage(id: string) {
    await this.findOne(id);
    const [agentCount, callCount, leadCount, userCount] = await Promise.all([
      this.prisma.aIAgent.count({ where: { tenantId: id, deletedAt: null } }),
      this.prisma.call.count({    where: { tenantId: id, startedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } } }),
      this.prisma.lead.count({    where: { tenantId: id, deletedAt: null } }),
      this.prisma.user.count({    where: { tenantId: id, isActive: true } }),
    ]);
    return { agentCount, callCount, leadCount, userCount };
  }
}
