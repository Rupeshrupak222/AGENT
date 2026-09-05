import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { TelephonyService } from '../../telephony/services/telephony.service';
import { CampaignEligibilityService } from '../services/campaign-eligibility.service';
import { CampaignQueueService, OutboundCallJobData } from '../services/campaign-queue.service';

@Injectable()
@Processor('outbound-calls')
export class OutboundCallProcessor implements OnModuleInit {
  private readonly logger = new Logger(OutboundCallProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telephonyService: TelephonyService,
    private readonly eligibilityService: CampaignEligibilityService,
    private readonly queueService: CampaignQueueService,
  ) {}

  onModuleInit() {
    // Connect in-memory worker runner for local dev and testing environments
    this.queueService.setInMemoryProcessor(async (data) => {
      await this.executeCallJob(data);
    });
  }

  /**
   * Bull queue worker process handler.
   */
  @Process()
  async handleBullJob(job: Job<OutboundCallJobData>): Promise<void> {
    this.logger.log(`Processing Bull job ${job.id} for lead ${job.data.leadId} in campaign ${job.data.campaignId}`);
    await this.executeCallJob(job.data);
  }

  /**
   * Core idempotent outbound execution engine.
   * Shared between Bull queue workers and in-memory dev workers.
   */
  async executeCallJob(data: OutboundCallJobData): Promise<{ dispatched: boolean; callId?: string; reason?: string }> {
    const { campaignId, campaignLeadId, leadId, tenantId } = data;
    this.logger.log(`[CALL_JOB_STARTED] campaignId=${campaignId} leadId=${leadId} attempt=${data.attemptNumber}`);

    // Offline dev environment fast-path
    if (!this.prisma.isConnected) {
      this.logger.log(`[OFFLINE_DEV_DISPATCH] Executed simulated dispatch for lead ${leadId} in campaign ${campaignId}`);
      return { dispatched: true, callId: `dev-call-${Date.now()}` };
    }

    try {
      // 1. Re-validate Campaign Status (Never trust state from when job was enqueued)
      const campaign = await this.prisma.campaign.findFirst({
        where: { id: campaignId, tenantId },
      });

      if (!campaign) {
        this.logger.warn(`Campaign ${campaignId} not found or tenant mismatch. Aborting job.`);
        return { dispatched: false, reason: 'CAMPAIGN_NOT_FOUND' };
      }

      if (campaign.status !== 'running') {
        this.logger.warn(`Campaign ${campaignId} is '${campaign.status}' (not running). Skipping dispatch.`);
        return { dispatched: false, reason: `CAMPAIGN_NOT_RUNNING_${campaign.status.toUpperCase()}` };
      }

      // 2. Re-validate Calling Hours Window
      const windowCheck = this.eligibilityService.isWithinCallingWindow(
        campaign.startTime,
        campaign.endTime,
        campaign.daysOfWeek,
      );
      if (!windowCheck.inWindow) {
        this.logger.warn(`Calling window closed for campaign ${campaignId}: ${windowCheck.reason}. Deferring.`);
        return { dispatched: false, reason: 'OUTSIDE_CALLING_WINDOW' };
      }

      // 3. Re-validate Daily Limit
      const dailyCheck = await this.eligibilityService.checkDailyLimit(
        tenantId,
        campaignId,
        campaign.callsPerDay,
      );
      if (!dailyCheck.withinLimit) {
        this.logger.warn(`Daily limit (${campaign.callsPerDay}) reached for campaign ${campaignId}. Deferring.`);
        return { dispatched: false, reason: 'DAILY_LIMIT_EXCEEDED' };
      }

      // 4. Re-validate Concurrency Cap
      const maxConcurrent = campaign.maxConcurrentCalls || 5;
      const activeCallsCount = await this.prisma.call.count({
        where: {
          tenantId,
          campaignId,
          status: { in: ['queued', 'ringing', 'in_progress'] },
        },
      });

      if (activeCallsCount >= maxConcurrent) {
        this.logger.warn(`Concurrency limit reached (${activeCallsCount}/${maxConcurrent}) for campaign ${campaignId}. Re-queueing with 5s backoff.`);
        await this.queueService.enqueueCallJob(data, { delayMs: 5000 });
        return { dispatched: false, reason: 'CONCURRENCY_CAP_REACHED' };
      }

      // 5. Re-validate Agent
      const agent = await this.prisma.aIAgent.findFirst({
        where: { id: campaign.agentId, tenantId, status: 'active' },
      });
      if (!agent) {
        this.logger.warn(`Agent ${campaign.agentId} is not active or not owned by tenant. Aborting.`);
        return { dispatched: false, reason: 'AGENT_INACTIVE_OR_INVALID' };
      }

      // 6. Re-validate CampaignLead & Lead Eligibility
      const campaignLead = await this.prisma.campaignLead.findFirst({
        where: { id: campaignLeadId, campaignId },
        include: { lead: true },
      });

      if (!campaignLead || !campaignLead.lead) {
        this.logger.warn(`CampaignLead ${campaignLeadId} not found. Aborting.`);
        return { dispatched: false, reason: 'CAMPAIGN_LEAD_NOT_FOUND' };
      }

      const eligibility = await this.eligibilityService.validateLeadEligibility(
        tenantId,
        campaignLead,
        campaign.maxAttempts || 3,
      );

      if (!eligibility.isEligible || !eligibility.normalizedPhone) {
        this.logger.warn(`Lead ${leadId} ineligible: ${eligibility.reason}. Marking as skipped.`);
        await this.prisma.campaignLead.update({
          where: { id: campaignLead.id },
          data: { status: 'skipped', errorMessage: eligibility.reason },
        });
        return { dispatched: false, reason: eligibility.reason };
      }

      // 7. Atomic Transition: CampaignLead -> 'calling' and increment attemptCount
      const updatedCampaignLead = await this.prisma.campaignLead.update({
        where: { id: campaignLead.id },
        data: {
          status: 'calling',
          attemptCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });

      // 8. Create Call record in DB
      const call = await this.prisma.call.create({
        data: {
          tenantId,
          leadId,
          agentId: agent.id,
          campaignId: campaign.id,
          direction: 'outbound',
          status: 'queued',
          phone: eligibility.normalizedPhone,
          metadata: {
            campaignLeadId: updatedCampaignLead.id,
            attemptNumber: updatedCampaignLead.attemptCount,
          },
        },
      });

      // Link call to CampaignLead
      await this.prisma.campaignLead.update({
        where: { id: updatedCampaignLead.id },
        data: { lastCallId: call.id },
      });

      this.logger.log(`[CALL_DISPATCHED] callId=${call.id} campaignId=${campaign.id} lead=${eligibility.normalizedPhone} attempt=${updatedCampaignLead.attemptCount}`);

      // 9. Dispatch Call via TelephonyService Abstraction
      try {
        await this.telephonyService.dispatchOutboundCall(tenantId, call.id, eligibility.normalizedPhone);
        return { dispatched: true, callId: call.id };
      } catch (dispatchErr: any) {
        this.logger.error(`[CALL_DISPATCH_FAILED] callId=${call.id} error: ${dispatchErr.message}`);

        // Update Call status to failed
        try {
          await this.prisma.call.update({
            where: { id: call.id },
            data: { status: 'failed', outcome: 'DISPATCH_ERROR' },
          });
        } catch {
          // ignore
        }

        // Update CampaignLead
        try {
          await this.prisma.campaignLead.update({
            where: { id: updatedCampaignLead.id },
            data: {
              status: 'failed',
              errorMessage: dispatchErr.message,
              outcome: 'DISPATCH_ERROR',
            },
          });
        } catch {
          // ignore
        }

        return { dispatched: false, callId: call.id, reason: dispatchErr.message };
      }
    } catch (err: any) {
      this.logger.error(`Unexpected failure in outbound call execution: ${err.message}`, err.stack);
      return { dispatched: false, reason: err.message };
    }
  }
}
