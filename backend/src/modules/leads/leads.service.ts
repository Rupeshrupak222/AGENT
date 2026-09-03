import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLeadDto, UpdateLeadDto, BulkImportLeadsDto, UpdateLeadStatusDto } from './dto/lead.dto';

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
    const data = dto.leads.map(l => ({ ...l, tenantId }));
    const result = await this.prisma.lead.createMany({ data, skipDuplicates: true });

    this.auditService.log({
      action: 'LEAD_IMPORTED',
      resource: 'lead',
      details: { count: result.count, total: dto.leads.length },
      tenantId,
    });

    return result;
  }

  async findAll(tenantId: string, query: {
    status?: string; search?: string; agentId?: string;
    page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const { page = 1, limit = 20, status, search, agentId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
      const skip = (page - 1) * limit;

      const where: any = {
        tenantId,
        deletedAt: null,
        ...(status && { status }),
        ...(agentId && { assignedAgentId: agentId }),
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
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: { assignedAgent: { select: { id: true, name: true } } },
        }),
        this.prisma.lead.count({ where }),
      ]);

      return { items, total, page, limit, pages: Math.ceil(total / limit) };
    } catch (err: any) {
      this.logger.warn(`Failed to query leads: ${err.message}`);
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20, pages: 0 };
    }
  }

  async findOne(tenantId: string, id: string) {
    try {
      const lead = await this.prisma.lead.findFirst({
        where: { id, tenantId, deletedAt: null },
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

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
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

  async updateStatus(tenantId: string, id: string, dto: UpdateLeadStatusDto) {
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

  async remove(tenantId: string, id: string) {
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

  async getPipelineStats(tenantId: string) {
    try {
      const counts = await this.prisma.lead.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
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
