import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService }  from '../prisma/prisma.service';
import { CreateAgentDto, UpdateAgentDto, DeployAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(private prisma: PrismaService) {}

  // ── CRUD ─────────────────────────────────────────────────────
  async create(tenantId: string, userId: string, dto: CreateAgentDto) {
    return this.prisma.aIAgent.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        status: 'draft',
      },
    });
  }

  async findAll(tenantId: string, filters?: { status?: string; role?: string }) {
    return this.prisma.aIAgent.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters?.status && { status: filters.status as any }),
        ...(filters?.role   && { role:   filters.role   as any }),
      },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { calls: true, campaigns: true } } },
    });
  }

  async findOne(tenantId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count:    { select: { calls: true } },
        campaigns: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto) {
    await this.findOne(tenantId, id);
    return this.prisma.aIAgent.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.aIAgent.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });
  }

  // ── Status transitions ────────────────────────────────────────
  async activate(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.aIAgent.update({ where: { id }, data: { status: 'active' } });
  }

  async pause(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.aIAgent.update({ where: { id }, data: { status: 'paused' } });
  }

  // ── Stats ─────────────────────────────────────────────────────
  async getStats(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const [totalCalls, connectedCalls, qualifiedLeads] = await Promise.all([
      this.prisma.call.count({ where: { agentId: id, tenantId } }),
      this.prisma.call.count({ where: { agentId: id, tenantId, status: 'completed' } }),
      this.prisma.lead.count({ where: { tenantId, status: 'qualified' } }),
    ]);

    const avgDuration = await this.prisma.call.aggregate({
      where:   { agentId: id, tenantId, status: 'completed' },
      _avg:    { duration: true },
    });

    return {
      totalCalls,
      connectedCalls,
      qualifiedLeads,
      conversionRate:  totalCalls ? ((qualifiedLeads / totalCalls) * 100).toFixed(1) : '0',
      avgCallDuration: Math.round(avgDuration._avg.duration ?? 0),
    };
  }

  // ── Duplicate ─────────────────────────────────────────────────
  async duplicate(tenantId: string, id: string, userId: string) {
    const agent = await this.findOne(tenantId, id);
    const { id: _, createdAt, updatedAt, _count, campaigns, ...rest } = agent as any;
    return this.prisma.aIAgent.create({
      data: {
        ...rest,
        name:        `${agent.name} (Copy)`,
        status:      'draft',
        tenantId,
        createdById: userId,
      },
    });
  }
}
