import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelephonyService } from '../telephony/services/telephony.service';

export interface InitiateCallDto {
  leadId:   string;
  agentId:  string;
  direction?: 'outbound' | 'inbound';
}

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private prisma: PrismaService,
    private telephonyService: TelephonyService,
  ) {}

  async initiateCall(tenantId: string, dto: InitiateCallDto) {
    const [lead, agent] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: dto.leadId, tenantId } }),
      this.prisma.aIAgent.findFirst({ where: { id: dto.agentId, tenantId, status: 'active' } }),
    ]);

    if (!lead)  throw new NotFoundException('Lead not found');
    if (!agent) throw new NotFoundException('Agent not found or inactive');

    const call = await this.prisma.call.create({
      data: {
        tenantId,
        leadId:    dto.leadId,
        agentId:   dto.agentId,
        direction: dto.direction ?? 'outbound',
        status:    'queued',
        phone:     lead.phone,
      },
    });

    this.logger.log(`Call queued: ${call.id} → ${lead.phone}`);

    // Dispatch through telephony provider abstraction
    try {
      await this.telephonyService.dispatchOutboundCall(tenantId, call.id, lead.phone);
    } catch (err: any) {
      this.logger.warn(`Telephony dispatch deferred or failed for call ${call.id}: ${err.message}`);
    }

    return call;
  }

  async findAll(tenantId: string, query: {
    status?: string; agentId?: string; leadId?: string;
    page?: number; limit?: number;
  }) {
    try {
      const pageNum  = Math.max(1, Number(query?.page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(query?.limit) || 20));
      const skip  = (pageNum - 1) * limitNum;
      const where: any = { tenantId, ...(query?.status  && { status:  query.status }),
                                      ...(query?.agentId && { agentId: query.agentId }),
                                      ...(query?.leadId  && { leadId:  query.leadId }) };

      const [items, total] = await Promise.all([
        this.prisma.call.findMany({
          where, skip, take: limitNum,
          orderBy: { startedAt: 'desc' },
          include: {
            lead:  { select: { id: true, name: true, phone: true } },
            agent: { select: { id: true, name: true, role:  true } },
          },
        }),
        this.prisma.call.count({ where }),
      ]);
      return { items, total, page: pageNum, limit: limitNum };
    } catch (err: any) {
      this.logger.warn(`Failed to query calls: ${err.message}`);
      return { items: [], total: 0, page: query.page ?? 1, limit: query.limit ?? 20 };
    }
  }

  async findOne(tenantId: string, id: string) {
    const call = await this.prisma.call.findFirst({
      where:   { id, tenantId },
      include: { lead: true, agent: true, transcript: true },
    });
    if (!call) throw new NotFoundException('Call not found');
    return call;
  }

  async getMetrics(tenantId: string, range: 'today' | 'week' | 'month' = 'today') {
    try {
      const now   = new Date();
      const start = range === 'today'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : range === 'week'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);

      const where = { tenantId, startedAt: { gte: start } };

      const [total, completed, missed, failed, avgDur] = await Promise.all([
        this.prisma.call.count({ where }),
        this.prisma.call.count({ where: { ...where, status: 'completed' } }),
        this.prisma.call.count({ where: { ...where, status: 'missed' } }),
        this.prisma.call.count({ where: { ...where, status: 'failed' } }),
        this.prisma.call.aggregate({ where: { ...where, status: 'completed' }, _avg: { duration: true } }),
      ]);

      return {
        total,
        completed,
        missed,
        failed,
        connectRate:     total ? ((completed / total) * 100).toFixed(1) : '0',
        avgDuration:     Math.round(avgDur._avg.duration ?? 0),
      };
    } catch (err: any) {
      this.logger.warn(`Failed to query call metrics: ${err.message}`);
      return {
        total: 0,
        completed: 0,
        missed: 0,
        failed: 0,
        connectRate: '0',
        avgDuration: 0,
      };
    }
  }
}
