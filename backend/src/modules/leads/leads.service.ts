import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeadDto, UpdateLeadDto, BulkImportLeadsDto, UpdateLeadStatusDto } from './dto/lead.dto';

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({ data: { ...dto, tenantId } });
  }

  async bulkImport(tenantId: string, dto: BulkImportLeadsDto) {
    const data = dto.leads.map(l => ({ ...l, tenantId }));
    return this.prisma.lead.createMany({ data, skipDuplicates: true });
  }

  async findAll(tenantId: string, query: {
    status?: string; search?: string; agentId?: string;
    page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc';
  }) {
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
  }

  async findOne(tenantId: string, id: string) {
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
  }

  async update(tenantId: string, id: string, dto: UpdateLeadDto) {
    return this.prisma.tenantUpdate(
      this.prisma.lead,
      tenantId,
      id,
      dto as any,
    );
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateLeadStatusDto) {
    return this.prisma.tenantUpdate(
      this.prisma.lead,
      tenantId,
      id,
      { status: dto.status },
    );
  }

  async remove(tenantId: string, id: string) {
    return this.prisma.tenantSoftDelete(
      this.prisma.lead,
      tenantId,
      id,
    );
  }

  async getPipelineStats(tenantId: string) {
    const counts = await this.prisma.lead.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { status: true },
    });
    return counts.reduce((acc: Record<string, number>, c: any) => {
      acc[c.status] = c._count.status;
      return acc;
    }, {} as Record<string, number>);
  }
}
