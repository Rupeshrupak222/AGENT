import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const PHONE_STATUSES = ['available', 'assigned', 'inactive'];
const PHONE_PROVIDERS = ['twilio', 'exotel', 'sandbox'];

@Injectable()
export class PhoneNumbersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async list(tenantId: string, query: {
    status?: string;
    provider?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const pageNum = Math.max(1, Number(query?.page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(query?.limit) || 50));
    const where: Prisma.PhoneNumberWhereInput = { tenantId };
    if (query?.status) where.status = query.status;
    if (query?.provider) where.provider = query.provider;
    if (query?.search?.trim()) {
      where.OR = [
        { number: { contains: query.search.trim() } },
        { label: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.phoneNumber.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          assignedAgent: { select: { id: true, name: true, role: true, status: true } },
        },
      }),
      this.prisma.phoneNumber.count({ where }),
    ]);

    return { items, total, page: pageNum, limit: limitNum };
  }

  async create(tenantId: string, userId: string, dto: {
    number: string;
    provider?: string;
    label?: string;
    isInbound?: boolean;
    isOutbound?: boolean;
    status?: string;
  }) {
    const number = (dto.number || '').trim();
    if (!number) throw new BadRequestException('Phone number is required');

    const provider = dto.provider || 'twilio';
    const status = dto.status || 'available';
    if (!PHONE_PROVIDERS.includes(provider)) throw new BadRequestException(`Invalid provider. Allowed: ${PHONE_PROVIDERS.join(', ')}`);
    if (!PHONE_STATUSES.includes(status)) throw new BadRequestException(`Invalid status. Allowed: ${PHONE_STATUSES.join(', ')}`);
    if (dto.isInbound === false && dto.isOutbound === false) {
      throw new BadRequestException('A number must support at least one direction');
    }

    try {
      const item = await this.prisma.phoneNumber.create({
        data: {
          tenantId,
          number,
          provider,
          label: dto.label?.trim() || null,
          isInbound: dto.isInbound ?? true,
          isOutbound: dto.isOutbound ?? true,
          status,
        },
      });

      this.auditService.log({
        action: 'PHONE_NUMBER_CREATED',
        resource: 'phone_number',
        resourceId: item.id,
        details: { number, provider, status },
        tenantId,
        userId,
      });

      return item;
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('This phone number is already registered for your company');
      }
      throw err;
    }
  }

  async update(tenantId: string, id: string, userId: string, dto: {
    provider?: string;
    label?: string;
    isInbound?: boolean;
    isOutbound?: boolean;
    status?: string;
    assignedAgentId?: string | null;
  }) {
    const existing = await this.prisma.phoneNumber.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Phone number not found');

    const data: Prisma.PhoneNumberUpdateInput = {};
    if (dto.provider !== undefined) {
      if (!PHONE_PROVIDERS.includes(dto.provider)) throw new BadRequestException('Invalid provider');
      data.provider = dto.provider;
    }
    if (dto.label !== undefined) data.label = dto.label?.trim() || null;
    if (dto.isInbound !== undefined) data.isInbound = dto.isInbound;
    if (dto.isOutbound !== undefined) data.isOutbound = dto.isOutbound;
    if (dto.status !== undefined) {
      if (!PHONE_STATUSES.includes(dto.status)) throw new BadRequestException('Invalid status');
      data.status = dto.status;
    }
    if (dto.assignedAgentId !== undefined) {
      if (dto.assignedAgentId === null) {
        data.assignedAgent = { disconnect: true };
      } else {
        const agent = await this.prisma.aIAgent.findFirst({
          where: { id: dto.assignedAgentId, tenantId, deletedAt: null },
        });
        if (!agent) throw new BadRequestException('Agent not found or not in your company');
        data.assignedAgent = { connect: { id: dto.assignedAgentId } };
        if (dto.status === undefined) data.status = 'assigned';
      }
    }

    const item = await this.prisma.phoneNumber.update({ where: { id }, data });

    this.auditService.log({
      action: 'PHONE_NUMBER_UPDATED',
      resource: 'phone_number',
      resourceId: id,
      details: { changes: Object.keys(data) },
      tenantId,
      userId,
    });

    return item;
  }

  async remove(tenantId: string, id: string, userId: string) {
    const existing = await this.prisma.phoneNumber.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Phone number not found');

    await this.prisma.phoneNumber.delete({ where: { id } });

    this.auditService.log({
      action: 'PHONE_NUMBER_DELETED',
      resource: 'phone_number',
      resourceId: id,
      details: { number: existing.number },
      tenantId,
      userId,
    });

    return { success: true, id };
  }
}