import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS, isUnlimited } from '../../common/plans';

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
    const tenant = await this.findOne(id);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [agentCount, callCount, leadCount, userCount, analysisCount, minutesAgg, apptCount, campaignCount] = await Promise.all([
      this.prisma.aIAgent.count({ where: { tenantId: id, deletedAt: null } }),
      this.prisma.call.count({    where: { tenantId: id, startedAt: { gte: monthStart } } }),
      this.prisma.lead.count({    where: { tenantId: id, deletedAt: null } }),
      this.prisma.user.count({    where: { tenantId: id, isActive: true } }),
      this.prisma.callAnalysis.count({ where: { tenantId: id, processingStatus: 'completed' } }),
      this.prisma.call.aggregate({ where: { tenantId: id, startedAt: { gte: monthStart }, status: 'completed' }, _sum: { duration: true } }),
      this.prisma.appointment.count({ where: { tenantId: id, status: { in: ['scheduled', 'confirmed', 'completed'] } } }),
      this.prisma.campaign.count({ where: { tenantId: id, status: { not: 'cancelled' } } }),
    ]);

    const plan = tenant.plan;
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.growth;

    const minutesUsed = Math.round(((minutesAgg._sum.duration ?? 0) / 60) * 10) / 10;

    const pct = (used: number, limit: number) =>
      limit === -1 ? null : +((used / limit) * 100).toFixed(1);

    return {
      plan,
      planName: limits.name,
      agentCount,
      userCount,
      leadCount,
      campaignCount,
      appointmentCount: apptCount,
      callCount,
      analysisCount,
      minutesUsed,
      limits: {
        agents:  limits.agents,
        members: limits.members,
        calls:   limits.callsPerMonth,
      },
      usage: {
        agents:  { used: agentCount,  limit: limits.agents,  unlimited: isUnlimited(limits.agents),  pct: pct(agentCount, limits.agents) },
        members: { used: userCount,   limit: limits.members, unlimited: isUnlimited(limits.members), pct: pct(userCount, limits.members) },
        calls:   { used: callCount,   limit: limits.callsPerMonth, unlimited: isUnlimited(limits.callsPerMonth), pct: pct(callCount, limits.callsPerMonth) },
      },
    };
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

  async updateStatus(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive },
    });
  }

  async getTenantDetails(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        agents: {
          where: { deletedAt: null },
          select: { id: true, name: true, role: true, language: true, status: true, voiceId: true },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { users: true, agents: true, calls: true, leads: true, campaigns: true },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }
}
