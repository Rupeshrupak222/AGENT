import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLeadDto, UpdateLeadDto, BulkImportLeadsDto, UpdateLeadStatusDto } from './dto/lead.dto';
import { LeadStatus } from '@prisma/client';
import { ScopedActor, leadScope } from '../../common/scope';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateLeadDto) {
    const lead = await this.prisma.lead.create({ data: { ...dto, tenantId } });

    this.auditService.log({
      action: 'LEAD_CREATED',
      resource: 'lead',
      resourceId: lead.id,
      details: { name: lead.name, phone: lead.phone },
      tenantId,
    });

    return lead;
  }

  async bulkImport(tenantId: string, dto: BulkImportLeadsDto) {
    if (!this.prisma.isConnected) {
      const mockLeads = dto.leads.map((l, i) => ({
        id: `mock-imported-lead-${i + 1}`,
        name: l.name,
        phone: l.phone,
        email: l.email || null,
        company: l.company || null,
        status: 'new',
      }));
      return {
        total: dto.leads.length,
        created: dto.leads.length,
        duplicates: 0,
        invalid: 0,
        leads: mockLeads,
      };
    }

    const data = dto.leads.map(l => ({
      name: l.name,
      phone: l.phone,
      email: l.email || null,
      company: l.company || null,
      source: l.source || 'csv_import',
      status: (l.status as LeadStatus) || LeadStatus.new,
      tenantId,
    }));

    const result = await this.prisma.lead.createMany({ data, skipDuplicates: true });

    // Fetch the leads matching these phones in this tenant so we can return their IDs
    const phones = dto.leads.map(l => l.phone);
    const resolvedLeads = await this.prisma.lead.findMany({
      where: { tenantId, phone: { in: phones }, deletedAt: null },
      select: { id: true, name: true, phone: true, email: true, company: true, status: true },
    });

    this.auditService.log({
      action: 'LEAD_IMPORTED',
      resource: 'lead',
      details: { count: result.count, total: dto.leads.length },
      tenantId,
    });

    return {
      total: dto.leads.length,
      created: result.count,
      duplicates: Math.max(0, dto.leads.length - result.count),
      invalid: 0,
      leads: resolvedLeads,
    };
  }

  async findAll(tenantId: string, query: {
    status?: string; search?: string; agentId?: string; assignedTo?: string;
    page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }, actor?: ScopedActor) {
    try {
      const pageNum = Math.max(1, Number(query?.page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(query?.limit) || 20));
      const skip = (pageNum - 1) * limitNum;
      const { status, search, agentId, assignedTo, sortBy = 'createdAt', sortOrder = 'desc' } = query;

      const where: any = {
        tenantId,
        deletedAt: null,
        ...leadScope(actor),
        ...(status && { status }),
        ...(agentId && { assignedAgentId: agentId }),
        ...(assignedTo && { assignedToId: assignedTo }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { company: { contains: search, mode: 'insensitive' } },
          ],
        }),
      };

      const [items, total] = await Promise.all([
        this.prisma.lead.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { [sortBy]: sortOrder },
          include: { assignedAgent: { select: { id: true, name: true } } },
        }),
        this.prisma.lead.count({ where }),
      ]);

      return { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
    } catch (err: any) {
      this.logger.warn(`Failed to query leads: ${err.message}`);
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20, pages: 0 };
    }
  }

  async findOne(tenantId: string, id: string, actor?: ScopedActor) {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id, tenantId, deletedAt: null, ...leadScope(actor) },
        include: {
          calls: { orderBy: { startedAt: 'desc' }, take: 10 },
          assignedAgent: true,
          activities: { orderBy: { createdAt: 'desc' }, take: 20 },
        },
      });
      if (!lead) throw new NotFoundException('Lead not found');
      return lead;
    } catch (err: any) {
      if (err instanceof NotFoundException) throw err;
      this.logger.warn(`Failed to query lead ${id}: ${err.message}`);
      throw new NotFoundException('Lead not found or database offline');
    }
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto, actor?: ScopedActor) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    const result = await this.prisma.tenantUpdate(
      this.prisma.lead,
      tenantId,
      id,
      dto as any,
    );

    this.auditService.log({
      action: 'LEAD_UPDATED',
      resource: 'lead',
      resourceId: id,
      details: { changes: Object.keys(dto) },
      tenantId,
    });

    return result;
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateLeadStatusDto, actor?: ScopedActor) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    const result = await this.prisma.tenantUpdate(
      this.prisma.lead,
      tenantId,
      id,
      { status: dto.status },
    );

    this.auditService.log({
      action: 'LEAD_STATUS_CHANGED',
      resource: 'lead',
      resourceId: id,
      details: { newStatus: dto.status },
      tenantId,
    });

    return result;
  }

  async remove(tenantId: string, id: string, actor?: ScopedActor) {
    const existing = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Lead not found');

    const result = await this.prisma.tenantSoftDelete(
      this.prisma.lead,
      tenantId,
      id,
    );

    this.auditService.log({
      action: 'LEAD_DELETED',
      resource: 'lead',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async getPipelineStats(tenantId: string, actor?: ScopedActor) {
    try {
      const counts = await this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null, ...leadScope(actor) },
        _count: { status: true },
      });
      return counts.reduce((acc: Record<string, number>, c: any) => {
        acc[c.status] = c._count.status;
        return acc;
      }, {} as Record<string, number>);
    } catch (err: any) {
      this.logger.warn(`Failed to query pipeline stats: ${err.message}`);
      return {};
    }
  }
}
