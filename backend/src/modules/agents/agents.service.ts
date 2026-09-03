import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateAgentDto) {
    const agent = await this.prisma.aIAgent.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        status: 'draft',
      },
    });

    this.auditService.log({
      action: 'AI_AGENT_CREATED',
      resource: 'ai_agent',
      resourceId: agent.id,
      details: { name: agent.name, role: agent.role },
      tenantId,
      userId,
    });

    return agent;
  }

  async findAll(tenantId: string, filters?: { status?: string; role?: string }) {
    try {
      return await this.prisma.aIAgent.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...(filters?.status && { status: filters.status as any }),
          ...(filters?.role && { role: filters.role as any }),
        },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { calls: true, campaigns: true } } },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to query agents: ${err.message}`);
      return [];
    }
  }

  async findOne(tenantId: string, id: string) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        _count: { select: { calls: true } },
        campaigns: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto) {
    const result = await this.prisma.tenantUpdate(
      this.prisma.aIAgent,
      tenantId,
      id,
      dto as any,
    );

    this.auditService.log({
      action: 'AI_AGENT_UPDATED',
      resource: 'ai_agent',
      resourceId: id,
      details: { changes: Object.keys(dto) },
      tenantId,
    });

    return result;
  }

  async remove(tenantId: string, id: string) {
    const result = await this.prisma.tenantSoftDelete(
      this.prisma.aIAgent,
      tenantId,
      id,
    );

    this.auditService.log({
      action: 'AI_AGENT_DELETED',
      resource: 'ai_agent',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async activate(tenantId: string, id: string) {
    const result = await this.prisma.tenantUpdate(
      this.prisma.aIAgent,
      tenantId,
      id,
      { status: 'active' },
    );

    this.auditService.log({
      action: 'AI_AGENT_ACTIVATED',
      resource: 'ai_agent',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async pause(tenantId: string, id: string) {
    const result = await this.prisma.tenantUpdate(
      this.prisma.aIAgent,
      tenantId,
      id,
      { status: 'paused' },
    );

    this.auditService.log({
      action: 'AI_AGENT_PAUSED',
      resource: 'ai_agent',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async getStats(tenantId: string, id: string) {
    try {
      await this.findOne(tenantId, id);
      const [totalCalls, connectedCalls, qualifiedLeads] = await Promise.all([
        this.prisma.call.count({ where: { agentId: id, tenantId } }),
        this.prisma.call.count({ where: { agentId: id, tenantId, status: 'completed' } }),
        this.prisma.lead.count({ where: { tenantId, assignedAgentId: id, status: 'qualified' } }),
      ]);

    try {
      const avgDuration = await this.prisma.call.aggregate({
        where: { agentId: id, tenantId, status: 'completed' },
        _avg: { duration: true },
      });

      return {
        totalCalls,
        connectedCalls,
        qualifiedLeads,
        conversionRate: totalCalls ? ((qualifiedLeads / totalCalls) * 100).toFixed(1) : '0',
        avgCallDuration: Math.round(avgDuration._avg.duration ?? 0),
      };
    } catch (err: any) {
      this.logger.warn(`Failed to query agent stats: ${err.message}`);
      return {
        totalCalls: 0,
        connectedCalls: 0,
        qualifiedLeads: 0,
        conversionRate: '0',
        avgCallDuration: 0,
      };
    }
  }

  async duplicate(tenantId: string, id: string, userId: string) {
    const agent = await this.findOne(tenantId, id);
    const { id: _, createdAt, updatedAt, _count, campaigns, ...rest } = agent as any;
    const newAgent = await this.prisma.aIAgent.create({
      data: {
        ...rest,
        name: `${agent.name} (Copy)`,
        status: 'draft',
        tenantId,
        createdById: userId,
      },
    });

    this.auditService.log({
      action: 'AI_AGENT_DUPLICATED',
      resource: 'ai_agent',
      resourceId: newAgent.id,
      details: { sourceId: id, name: newAgent.name },
      tenantId,
      userId,
    });

    return newAgent;
  }
}
