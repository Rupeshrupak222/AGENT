import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const KB_TYPES = ['manual', 'pdf', 'docx', 'txt', 'url', 'faq'];
const KB_STATUSES = ['ready', 'processing', 'failed', 'outdated'];

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async list(tenantId: string, query: {
    search?: string;
    type?: string;
    status?: string;
    agentId?: string;
    page?: number;
    limit?: number;
  }) {
    const pageNum = Math.max(1, Number(query?.page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(query?.limit) || 50));
    const where: Prisma.KnowledgeSourceWhereInput = { tenantId };
    if (query?.type) where.type = query.type;
    if (query?.status) where.status = query.status;
    if (query?.agentId) where.agentId = query.agentId;
    if (query?.search?.trim()) {
      where.OR = [
        { name: { contains: query.search.trim(), mode: 'insensitive' } },
        { content: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.knowledgeSource.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, name: true, role: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.knowledgeSource.count({ where }),
    ]);

    return { items, total, page: pageNum, limit: limitNum };
  }

  async findOne(tenantId: string, id: string) {
    const item = await this.prisma.knowledgeSource.findFirst({
      where: { id, tenantId },
      include: {
        agent: { select: { id: true, name: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    if (!item) throw new NotFoundException('Knowledge source not found');
    return item;
  }

  async create(tenantId: string, userId: string, dto: {
    name: string;
    type?: string;
    content?: string;
    sourceUrl?: string;
    tags?: string[];
    agentId?: string;
  }) {
    const name = (dto.name || '').trim();
    if (!name) throw new BadRequestException('Name is required');

    const type = dto.type || 'manual';
    if (!KB_TYPES.includes(type)) throw new BadRequestException(`Invalid type. Allowed: ${KB_TYPES.join(', ')}`);

    if (!dto.content?.trim() && !dto.sourceUrl?.trim()) {
      throw new BadRequestException('Provide either content or a source URL');
    }

    if (dto.agentId) {
      const agent = await this.prisma.aIAgent.findFirst({
        where: { id: dto.agentId, tenantId, deletedAt: null },
      });
      if (!agent) throw new BadRequestException('Agent not found or not in your company');
    }

    const item = await this.prisma.knowledgeSource.create({
      data: {
        tenantId,
        name,
        type,
        content: dto.content?.trim() || null,
        sourceUrl: dto.sourceUrl?.trim() || null,
        tags: dto.tags?.slice(0, 20) ?? [],
        status: 'ready',
        lastIndexedAt: new Date(),
        agentId: dto.agentId || null,
        createdById: userId,
      },
    });

    this.auditService.log({
      action: 'KNOWLEDGE_SOURCE_CREATED',
      resource: 'knowledge_source',
      resourceId: item.id,
      details: { name, type },
      tenantId,
      userId,
    });

    return item;
  }

  async update(tenantId: string, id: string, userId: string, dto: {
    name?: string;
    type?: string;
    content?: string;
    sourceUrl?: string;
    tags?: string[];
    status?: string;
    agentId?: string | null;
  }) {
    const existing = await this.prisma.knowledgeSource.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Knowledge source not found');

    const data: Prisma.KnowledgeSourceUpdateInput = {};
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('Name cannot be empty');
      data.name = dto.name.trim();
    }
    if (dto.type !== undefined) {
      if (!KB_TYPES.includes(dto.type)) throw new BadRequestException('Invalid type');
      data.type = dto.type;
    }
    if (dto.content !== undefined) data.content = dto.content?.trim() || null;
    if (dto.sourceUrl !== undefined) data.sourceUrl = dto.sourceUrl?.trim() || null;
    if (dto.tags !== undefined) data.tags = dto.tags.slice(0, 20);
    if (dto.status !== undefined) {
      if (!KB_STATUSES.includes(dto.status)) throw new BadRequestException('Invalid status');
      data.status = dto.status;
    }
    if (dto.agentId !== undefined) {
      if (dto.agentId === null) {
        data.agent = { disconnect: true };
      } else {
        const agent = await this.prisma.aIAgent.findFirst({
          where: { id: dto.agentId, tenantId, deletedAt: null },
        });
        if (!agent) throw new BadRequestException('Agent not found or not in your company');
        data.agent = { connect: { id: dto.agentId } };
      }
    }

    if (Object.keys(data).length) {
      data.updatedAt = new Date();
      data.lastIndexedAt = new Date();
    }

    const item = await this.prisma.knowledgeSource.update({ where: { id }, data });

    this.auditService.log({
      action: 'KNOWLEDGE_SOURCE_UPDATED',
      resource: 'knowledge_source',
      resourceId: id,
      details: { changes: Object.keys(data) },
      tenantId,
      userId,
    });

    return item;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const existing = await this.prisma.knowledgeSource.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Knowledge source not found');

    await this.prisma.knowledgeSource.delete({ where: { id } });

    this.auditService.log({
      action: 'KNOWLEDGE_SOURCE_DELETED',
      resource: 'knowledge_source',
      resourceId: id,
      details: { name: existing.name },
      tenantId,
      userId,
    });

    return { success: true, id };
  }
}