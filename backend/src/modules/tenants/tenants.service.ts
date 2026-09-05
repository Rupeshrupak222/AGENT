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

  async findAll() {
    return this.prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            agents: true,
            calls: true,
            leads: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { name: string; plan?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.prisma.tenant.create({
      data: {
        name: data.name,
        slug: `${slug}-${Date.now()}`,
        plan: (data.plan as any) || 'starter',
      },
      include: {
        _count: {
          select: { users: true, agents: true, calls: true, leads: true },
        },
      },
    });
  }

  async updatePlan(id: string, plan: string) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { plan: plan as any },
    });
  }
}
