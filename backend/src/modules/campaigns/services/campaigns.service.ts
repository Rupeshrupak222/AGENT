import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  OnModuleInit,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignEligibilityService } from './campaign-eligibility.service';
import { CampaignQueueService } from './campaign-queue.service';
import { TelephonyService } from '../../telephony/services/telephony.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignQueryDto,
  CampaignStatus,
} from '../dto/campaign.dto';

@Injectable()
export class CampaignsService implements OnModuleInit {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibilityService: CampaignEligibilityService,
    private readonly queueService: CampaignQueueService,
    @Inject(forwardRef(() => TelephonyService))
    private readonly telephonyService: TelephonyService,
  ) {}

  onModuleInit() {
    this.telephonyService.registerCallStatusHook(async (callId, status, duration, outcome) => {
      await this.handleCallOutcome(callId, status, outcome);
    });
    this.logger.log('Registered CampaignsService hook with TelephonyService for real-time call webhook synchronization');
  }

  // ── 1. Create Campaign ──────────────────────────────────────
  async create(tenantId: string, createdById: string, dto: CreateCampaignDto) {
    if (!this.prisma.isConnected) {
      return {
        id: `campaign-mock-${Date.now()}`,
        name: dto.name,
        description: dto.description || null,
        status: CampaignStatus.DRAFT,
        agentId: dto.agentId,
        tenantId,
        maxConcurrentCalls: dto.maxConcurrentCalls || 5,
        maxAttempts: dto.maxAttempts || 3,
        callsPerDay: dto.callsPerDay || null,
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '18:00',
        daysOfWeek: dto.daysOfWeek || [1, 2, 3, 4, 5],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Verify Agent belongs to tenant and is active
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: dto.agentId, tenantId, deletedAt: null },
    });
    if (!agent) {
      throw new NotFoundException(`Agent [${dto.agentId}] not found for this tenant`);
    }
    if (agent.status !== 'active') {
      throw new BadRequestException(`Cannot assign agent [${agent.name}] with status '${agent.status}'. Agent must be 'active'.`);
    }

    // Create Campaign record
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        agentId: dto.agentId,
        status: CampaignStatus.DRAFT,
        maxCalls: dto.maxCalls || null,
        callsPerDay: dto.callsPerDay || null,
        maxConcurrentCalls: dto.maxConcurrentCalls || 5,
        maxAttempts: dto.maxAttempts || 3,
        startTime: dto.startTime || '09:00',
        endTime: dto.endTime || '18:00',
        daysOfWeek: dto.daysOfWeek || [1, 2, 3, 4, 5],
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        metadata: dto.metadata || {},
      },
    });

    this.logger.log(`[CAMPAIGN_CREATED] campaignId=${campaign.id} tenantId=${tenantId} name="${campaign.name}"`);

    // Attach initial leads if provided
    if (dto.leadIds && dto.leadIds.length > 0) {
      await this.addLeads(tenantId, campaign.id, dto.leadIds);
    }

    return campaign;
  }

  // ── 2. Find All Campaigns (Tenant-Scoped) ───────────────────
  async findAll(tenantId: string, query: CampaignQueryDto) {
    if (!this.prisma.isConnected) {
      return {
        items: [
          {
            id: 'campaign-dev-1',
            name: 'Q4 Enterprise Inbound Follow-up',
            description: 'Automated outreach for high-intent demo requests',
            status: CampaignStatus.RUNNING,
            agentId: 'agent-dev-1',
            tenantId,
            maxConcurrentCalls: 5,
            maxAttempts: 3,
            callsPerDay: 100,
            startTime: '09:00',
            endTime: '18:00',
            daysOfWeek: [1, 2, 3, 4, 5],
            agent: { id: 'agent-dev-1', name: 'Sarah - Inbound Concierge', role: 'telecaller' },
            _count: { leads: 48, calls: 32 },
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: query.page || 1,
        limit: query.limit || 20,
      };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          agent: { select: { id: true, name: true, role: true, status: true } },
          _count: { select: { leads: true, calls: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ── 3. Find One Campaign ────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    if (!this.prisma.isConnected) {
      return {
        id,
        name: 'Demo Outbound Campaign',
        status: CampaignStatus.RUNNING,
        agentId: 'agent-dev-1',
        tenantId,
        maxConcurrentCalls: 5,
        maxAttempts: 3,
        agent: { id: 'agent-dev-1', name: 'Sarah - Inbound Concierge', role: 'telecaller' },
        _count: { leads: 48, calls: 32 },
      };
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        agent: true,
        _count: { select: { leads: true, calls: true } },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campaign [${id}] not found`);
    }

    return campaign;
  }

  // ── 4. Update Campaign ──────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    const campaign = await this.findOne(tenantId, id);

    if (!this.prisma.isConnected) {
      return { ...campaign, ...dto, updatedAt: new Date().toISOString() };
    }

    if (dto.agentId && dto.agentId !== campaign.agentId) {
      const agent = await this.prisma.aIAgent.findFirst({
        where: { id: dto.agentId, tenantId, status: 'active', deletedAt: null },
      });
      if (!agent) {
        throw new BadRequestException(`New assigned agent [${dto.agentId}] not found or not active`);
      }
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.agentId && { agentId: dto.agentId }),
        ...(dto.maxCalls !== undefined && { maxCalls: dto.maxCalls }),
        ...(dto.callsPerDay !== undefined && { callsPerDay: dto.callsPerDay }),
        ...(dto.maxConcurrentCalls !== undefined && { maxConcurrentCalls: dto.maxConcurrentCalls }),
        ...(dto.maxAttempts !== undefined && { maxAttempts: dto.maxAttempts }),
        ...(dto.startTime && { startTime: dto.startTime }),
        ...(dto.endTime && { endTime: dto.endTime }),
        ...(dto.daysOfWeek && { daysOfWeek: dto.daysOfWeek }),
        ...(dto.metadata && { metadata: dto.metadata }),
      },
    });
  }

  // ── 5. Delete Campaign ──────────────────────────────────────
  async delete(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);
    if (!this.prisma.isConnected) {
      return { id, deleted: true };
    }

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('Cannot delete a running campaign. Pause or cancel the campaign first.');
    }

    return this.prisma.campaign.delete({ where: { id } });
  }

  // ── 6. Add Leads to Campaign ────────────────────────────────
  async addLeads(tenantId: string, campaignId: string, leadIds: string[]) {
    await this.findOne(tenantId, campaignId);

    if (!this.prisma.isConnected) {
      return { added: leadIds.length, total: leadIds.length };
    }

    // Verify leads belong to tenant and not deleted
    const leads = await this.prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true, phone: true },
    });

    if (leads.length === 0) {
      throw new BadRequestException('None of the provided lead IDs were valid or accessible in this workspace');
    }

    // Check existing enrolled leads
    const existing = await this.prisma.campaignLead.findMany({
      where: { campaignId, leadId: { in: leads.map(l => l.id) } },
      select: { leadId: true },
    });
    const existingIds = new Set(existing.map(e => e.leadId));

    const toEnroll = leads.filter(l => !existingIds.has(l.id));

    if (toEnroll.length > 0) {
      await this.prisma.campaignLead.createMany({
        data: toEnroll.map(l => ({
          campaignId,
          leadId: l.id,
          status: 'pending',
          attemptCount: 0,
        })),
        skipDuplicates: true,
      });
    }

    const totalLeads = await this.prisma.campaignLead.count({ where: { campaignId } });
    this.logger.log(`Enrolled ${toEnroll.length} new leads into campaign ${campaignId} (Total: ${totalLeads})`);
    return { added: toEnroll.length, total: totalLeads };
  }

  // ── 7. Get Campaign Leads ───────────────────────────────────
  async getLeads(tenantId: string, campaignId: string, query: { status?: string; page?: number; limit?: number }) {
    await this.findOne(tenantId, campaignId);

    if (!this.prisma.isConnected) {
      return { items: [], total: 0, page: 1, limit: 20 };
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      campaignId,
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.campaignLead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, name: true, phone: true, email: true, company: true, status: true } },
          lastCall: { select: { id: true, status: true, duration: true, startedAt: true } },
        },
      }),
      this.prisma.campaignLead.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ── 8. Start Campaign ───────────────────────────────────────
  async startCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);

    if (campaign.status === CampaignStatus.RUNNING) {
      throw new ConflictException('Campaign is already running');
    }
    if (campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Cannot start a cancelled campaign');
    }

    if (!this.prisma.isConnected) {
      return { status: CampaignStatus.RUNNING, enqueued: 12 };
    }

    // Verify Agent is active
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id: campaign.agentId, tenantId, status: 'active', deletedAt: null },
    });
    if (!agent) {
      throw new BadRequestException(`Assigned agent [${campaign.agentId}] is not active or deleted`);
    }

    // Update status to RUNNING
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING },
    });

    this.logger.log(`[CAMPAIGN_STARTED] campaignId=${campaignId} tenantId=${tenantId}`);

    // Select eligible leads in a bounded batch
    const eligibleLeads = await this.prisma.campaignLead.findMany({
      where: {
        campaignId,
        status: { in: ['pending', 'retry_pending'] },
        attemptCount: { lt: campaign.maxAttempts || 3 },
      },
      include: { lead: true },
      take: 50, // Bounded batch to avoid memory/queue overload
    });

    let enqueued = 0;
    for (const cl of eligibleLeads) {
      if (!cl.lead) continue;
      const phoneNorm = this.eligibilityService.normalizePhoneNumber(cl.lead.phone);
      if (!phoneNorm.isValid || !phoneNorm.normalized) {
        try {
          await this.prisma.campaignLead.update({
            where: { id: cl.id },
            data: { status: 'skipped', errorMessage: phoneNorm.reason },
          });
        } catch {
          // ignore
        }
        continue;
      }

      await this.queueService.enqueueCallJob({
        campaignId,
        campaignLeadId: cl.id,
        leadId: cl.leadId,
        agentId: campaign.agentId,
        tenantId,
        attemptNumber: cl.attemptCount + 1,
        phoneNumber: phoneNorm.normalized,
        enqueuedAt: new Date().toISOString(),
      });

      // Update CampaignLead status to queued
      try {
        await this.prisma.campaignLead.update({
          where: { id: cl.id },
          data: { status: 'queued' },
        });
      } catch {
        // ignore
      }

      enqueued++;
    }

    this.logger.log(`[CAMPAIGN_DISPATCH_BATCH] campaignId=${campaignId} enqueued=${enqueued} leads`);
    return { status: CampaignStatus.RUNNING, enqueued };
  }

  // ── 9. Pause Campaign ───────────────────────────────────────
  async pauseCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);
    if (!this.prisma.isConnected) {
      return { status: CampaignStatus.PAUSED };
    }

    if (campaign.status !== CampaignStatus.RUNNING) {
      throw new BadRequestException(`Cannot pause campaign with status '${campaign.status}' (must be running)`);
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.PAUSED },
    });

    this.logger.log(`[CAMPAIGN_PAUSED] campaignId=${campaignId} tenantId=${tenantId}. Active calls will finish naturally.`);
    return { status: CampaignStatus.PAUSED };
  }

  // ── 10. Resume Campaign ─────────────────────────────────────
  async resumeCampaign(tenantId: string, campaignId: string) {
    const campaign = await this.findOne(tenantId, campaignId);
    if (!this.prisma.isConnected) {
      return { status: CampaignStatus.RUNNING, enqueued: 8 };
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      throw new BadRequestException(`Cannot resume campaign with status '${campaign.status}' (must be paused)`);
    }

    return this.startCampaign(tenantId, campaignId);
  }

  // ── 11. Cancel Campaign ─────────────────────────────────────
  async cancelCampaign(tenantId: string, campaignId: string) {
    await this.findOne(tenantId, campaignId);

    // Cancel in-memory queue jobs
    this.queueService.clearCampaignInMemoryJobs(campaignId);

    if (!this.prisma.isConnected) {
      return { status: CampaignStatus.CANCELLED };
    }

    // Update campaign status
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.CANCELLED },
    });

    // Mark pending & queued leads as skipped
    await this.prisma.campaignLead.updateMany({
      where: { campaignId, status: { in: ['pending', 'queued', 'retry_pending'] } },
      data: { status: 'skipped', errorMessage: 'Campaign cancelled by user' },
    });

    this.logger.log(`[CAMPAIGN_CANCELLED] campaignId=${campaignId} tenantId=${tenantId}`);
    return { status: CampaignStatus.CANCELLED };
  }

  // ── 12. Campaign Metrics ────────────────────────────────────
  async getCampaignMetrics(tenantId: string, campaignId: string) {
    await this.findOne(tenantId, campaignId);

    if (!this.prisma.isConnected) {
      return {
        totalLeads: 48,
        pending: 12,
        queued: 4,
        calling: 2,
        completed: 26,
        failed: 4,
        skipped: 0,
        retryPending: 0,
        connectRate: 81.2,
        conversionRate: 34.4,
        totalCalls: 32,
        avgDuration: 185,
      };
    }

    const [leadStatusCounts, callsAgg, connectedCount, qualifiedCount] = await Promise.all([
      this.prisma.campaignLead.groupBy({
        by: ['status'],
        where: { campaignId },
        _count: { status: true },
      }),
      this.prisma.call.aggregate({
        where: { campaignId, status: 'completed' },
        _avg: { duration: true },
        _count: { id: true },
      }),
      this.prisma.call.count({ where: { campaignId, status: 'completed' } }),
      this.prisma.call.count({ where: { campaignId, outcome: { in: ['qualified', 'appointment', 'closed_won'] } } }),
    ]);

    const statusMap = leadStatusCounts.reduce((acc, c) => {
      acc[c.status] = c._count.status;
      return acc;
    }, {} as Record<string, number>);

    const totalLeads = Object.values(statusMap).reduce((s, n) => s + n, 0);
    const totalCalls = await this.prisma.call.count({ where: { campaignId } });

    return {
      totalLeads,
      pending: statusMap['pending'] || 0,
      queued: statusMap['queued'] || 0,
      calling: statusMap['calling'] || 0,
      completed: statusMap['completed'] || 0,
      failed: statusMap['failed'] || 0,
      skipped: statusMap['skipped'] || 0,
      retryPending: statusMap['retry_pending'] || 0,
      totalCalls,
      connectedCalls: connectedCount,
      connectRate: totalCalls > 0 ? +((connectedCount / totalCalls) * 100).toFixed(1) : 0,
      conversionRate: connectedCount > 0 ? +((qualifiedCount / connectedCount) * 100).toFixed(1) : 0,
      avgDuration: Math.round(callsAgg._avg.duration || 0),
    };
  }

  // ── 13. Auto-Completion Check ───────────────────────────────
  async checkCampaignCompletion(campaignId: string): Promise<boolean> {
    if (!this.prisma.isConnected) return false;

    try {
      const [unfinishedLeads, activeCalls] = await Promise.all([
        this.prisma.campaignLead.count({
          where: {
            campaignId,
            status: { in: ['pending', 'queued', 'calling', 'retry_pending'] },
          },
        }),
        this.prisma.call.count({
          where: {
            campaignId,
            status: { in: ['queued', 'ringing', 'in_progress'] },
          },
        }),
      ]);

      if (unfinishedLeads === 0 && activeCalls === 0) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { status: CampaignStatus.COMPLETED },
        });
        this.logger.log(`[CAMPAIGN_COMPLETED] campaignId=${campaignId}. All leads processed and all calls finalized.`);
        return true;
      }
    } catch (err: any) {
      this.logger.warn(`Error checking campaign completion: ${err.message}`);
    }
    return false;
  }

  // ── 14. Handle Call Webhook Outcome Integration ─────────────
  async handleCallOutcome(callId: string, callStatus: string, outcome?: string) {
    if (!this.prisma.isConnected) return;

    try {
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        include: { campaign: true },
      });

      if (!call || !call.campaignId || !call.campaign) return;

      const campaignLeadId = (call.metadata as any)?.campaignLeadId;
      const campaignLead = campaignLeadId
        ? await this.prisma.campaignLead.findUnique({ where: { id: campaignLeadId } })
        : await this.prisma.campaignLead.findFirst({ where: { campaignId: call.campaignId, leadId: call.leadId } });

      if (!campaignLead) return;

      const maxAttempts = call.campaign.maxAttempts || 3;

      if (callStatus === 'completed') {
        await this.prisma.campaignLead.update({
          where: { id: campaignLead.id },
          data: {
            status: 'completed',
            outcome: outcome || 'completed',
            lastCallId: call.id,
          },
        });
        this.logger.log(`[CAMPAIGN_LEAD_COMPLETED] campaignLeadId=${campaignLead.id} callId=${call.id}`);
      } else if (['missed', 'failed', 'busy'].includes(callStatus)) {
        if (campaignLead.attemptCount < maxAttempts && call.campaign.status === 'running') {
          // Retryable policy: Schedule delayed retry (5m backoff)
          const delayMs = Math.min(300000 * campaignLead.attemptCount, 1800000); // 5m, 10m, max 30m
          const nextAttemptAt = new Date(Date.now() + delayMs);

          await this.prisma.campaignLead.update({
            where: { id: campaignLead.id },
            data: {
              status: 'retry_pending',
              nextAttemptAt,
              errorMessage: `Call ${callStatus}. Scheduled retry attempt ${campaignLead.attemptCount + 1}`,
            },
          });

          this.logger.log(`[CAMPAIGN_LEAD_RETRY_SCHEDULED] leadId=${campaignLead.leadId} nextAttemptAt=${nextAttemptAt.toISOString()}`);

          // Re-enqueue delayed job
          await this.queueService.enqueueCallJob(
            {
              campaignId: call.campaignId,
              campaignLeadId: campaignLead.id,
              leadId: campaignLead.leadId,
              agentId: call.agentId,
              tenantId: call.tenantId,
              attemptNumber: campaignLead.attemptCount + 1,
              phoneNumber: call.phone,
              enqueuedAt: new Date().toISOString(),
            },
            { delayMs },
          );
        } else {
          // Terminal failure
          await this.prisma.campaignLead.update({
            where: { id: campaignLead.id },
            data: {
              status: 'failed',
              outcome: campaignLead.attemptCount >= maxAttempts ? 'MAX_ATTEMPTS_REACHED' : callStatus.toUpperCase(),
              errorMessage: `Call ${callStatus} (attempt ${campaignLead.attemptCount}/${maxAttempts})`,
            },
          });
          this.logger.log(`[CAMPAIGN_LEAD_FAILED] leadId=${campaignLead.leadId} attempts=${campaignLead.attemptCount}`);
        }
      }

      // Check if this finalized the campaign
      await this.checkCampaignCompletion(call.campaignId);
    } catch (err: any) {
      this.logger.warn(`Error handling call webhook outcome for campaign: ${err.message}`);
    }
  }
}
