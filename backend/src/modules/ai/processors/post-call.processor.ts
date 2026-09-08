import { Injectable, Logger, OnModuleInit, Inject, forwardRef, Optional } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiPostCallProvider } from '../providers/gemini-post-call.provider';
import {
  PostCallAnalysisJobData,
  PostCallQueueService,
} from '../services/post-call-queue.service';
import { PostCallAnalysisInput } from '../interfaces/post-call.interface';
import { CallsGateway } from '../../calls/calls.gateway';
import { CrmQueueService } from '../../integrations/services/crm-queue.service';
import { AutomationsService } from '../../automations/automations.service';

@Injectable()
@Processor('post-call-analysis')
export class PostCallProcessor implements OnModuleInit {
  private readonly logger = new Logger(PostCallProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiProvider: GeminiPostCallProvider,
    private readonly queueService: PostCallQueueService,
    @Optional()
    @Inject(forwardRef(() => CallsGateway))
    private readonly callsGateway?: CallsGateway,
    @Optional()
    @Inject(forwardRef(() => CrmQueueService))
    private readonly crmQueueService?: CrmQueueService,
    @Optional()
    @Inject(forwardRef(() => AutomationsService))
    private readonly automationsService?: AutomationsService,
  ) {}

  onModuleInit() {
    this.queueService.setInMemoryProcessor(async (data) => {
      await this.executeAnalysis(data);
    });
  }

  @Process()
  async handleBullJob(job: Job<PostCallAnalysisJobData>): Promise<void> {
    this.logger.log(`Processing Bull post-call analysis job ${job.id} for call ${job.data.callId}`);
    await this.executeAnalysis(job.data);
  }

  /**
   * Main idempotent post-call intelligence execution engine.
   */
  async executeAnalysis(
    data: PostCallAnalysisJobData,
  ): Promise<{ success: boolean; analysisId?: string; reason?: string }> {
    const { callId, tenantId, triggerSource } = data;
    this.logger.log(`[POST_CALL_ANALYSIS_STARTED] callId=${callId} tenantId=${tenantId} trigger=${triggerSource}`);

    // Offline dev environment fast-path
    if (!this.prisma.isConnected) {
      this.logger.log(`[OFFLINE_DEV_ANALYSIS] Simulated post-call analysis completed for call ${callId}`);
      return { success: true, analysisId: `dev-analysis-${callId}` };
    }

    try {
      // 1. Idempotency Check (Never run duplicate Gemini analysis if already completed)
      const existingAnalysis = await this.prisma.callAnalysis.findFirst({
        where: { callId, tenantId },
      });

      if (
        existingAnalysis &&
        existingAnalysis.processingStatus === 'completed' &&
        triggerSource !== 'manual_retry'
      ) {
        this.logger.log(`Analysis for call ${callId} already completed. Skipping duplicate execution.`);
        return { success: true, analysisId: existingAnalysis.id };
      }

      // 2. Load Call Context (with Lead, AIAgent, Campaign, and CallTranscript)
      const call = await this.prisma.call.findFirst({
        where: { id: callId, tenantId },
        include: {
          lead: true,
          agent: true,
          campaign: true,
          transcript: true,
        },
      });

      if (!call) {
        this.logger.warn(`Call ${callId} not found or tenant mismatch. Aborting post-call analysis.`);
        return { success: false, reason: 'CALL_NOT_FOUND' };
      }

      // Mark status as processing
      await this.prisma.callAnalysis.upsert({
        where: { callId },
        create: {
          callId,
          tenantId,
          processingStatus: 'processing',
        },
        update: {
          processingStatus: 'processing',
          errorMessage: null,
        },
      });

      // 3. Transcript Requirement Validation
      const transcriptText = this.buildTranscriptText(call.transcript);
      if (!transcriptText || transcriptText.trim().length === 0) {
        this.logger.warn(`Call ${callId} has no usable transcript. Marking analysis as skipped.`);
        await this.prisma.callAnalysis.update({
          where: { callId },
          data: {
            processingStatus: 'skipped',
            errorMessage: 'NO_TRANSCRIPT',
            processedAt: new Date(),
          },
        });
        return { success: false, reason: 'NO_TRANSCRIPT' };
      }

      // 4. Construct Structured Input with Data Minimization
      const analysisInput: PostCallAnalysisInput = {
        callId: call.id,
        tenantId: call.tenantId,
        duration: call.duration ?? undefined,
        transcript: transcriptText,
        agentContext: {
          name: call.agent?.name,
          businessGoal: call.agent?.businessGoal,
          qualificationRules: call.agent?.qualificationRules ?? undefined,
          knowledgeBase: call.agent?.knowledgeBase ?? undefined,
        },
        leadContext: {
          name: call.lead?.name,
          company: call.lead?.company ?? undefined,
          designation: call.lead?.designation ?? undefined,
        },
        campaignContext: call.campaign
          ? {
              campaignId: call.campaign.id,
              campaignName: call.campaign.name,
            }
          : undefined,
      };

      // 5. Invoke Gemini Post-Call Provider
      const result = await this.geminiProvider.analyze(analysisInput);
      this.logger.log(
        `[POST_CALL_ANALYSIS_COMPLETED] callId=${callId} leadScore=${result.leadScore} intent=${result.intent} qualified=${result.qualification.qualified}`,
      );

      // 6. Persist Structured Analysis
      const savedAnalysis = await this.prisma.callAnalysis.upsert({
        where: { callId },
        create: {
          callId,
          tenantId,
          leadScore: result.leadScore,
          intent: result.intent,
          sentiment: result.sentiment,
          summary: result.summary,
          qualification: result.qualification as any,
          outcome: result.outcome,
          nextAction: result.nextAction,
          appointmentDetected: result.appointment.detected,
          appointmentDetails: result.appointment.details as any,
          model: this.geminiProvider.modelName,
          promptVersion: 'v1.0',
          processingStatus: 'completed',
          processedAt: new Date(),
        },
        update: {
          leadScore: result.leadScore,
          intent: result.intent,
          sentiment: result.sentiment,
          summary: result.summary,
          qualification: result.qualification as any,
          outcome: result.outcome,
          nextAction: result.nextAction,
          appointmentDetected: result.appointment.detected,
          appointmentDetails: result.appointment.details as any,
          model: this.geminiProvider.modelName,
          processingStatus: 'completed',
          errorMessage: null,
          processedAt: new Date(),
        },
      });

      // 7. Update Call Metrics
      const sentimentScoreMap: Record<string, number> = {
        positive: 4.8,
        neutral: 3.5,
        mixed: 3.0,
        negative: 1.5,
        unknown: 3.0,
      };

      await this.prisma.call.update({
        where: { id: callId },
        data: {
          outcome: result.outcome,
          sentimentScore: sentimentScoreMap[result.sentiment] || 3.0,
          qualityScore: result.leadScore,
          intentScore: Number((result.leadScore / 20).toFixed(1)),
        },
      });

      // 8. Update Campaign Lead State if call was part of a campaign
      if (call.campaignId && call.leadId) {
        await this.prisma.campaignLead.updateMany({
          where: { campaignId: call.campaignId, leadId: call.leadId },
          data: {
            outcome: result.outcome,
            metadata: {
              leadScore: result.leadScore,
              intent: result.intent,
              qualified: result.qualification.qualified,
              appointmentDetected: result.appointment.detected,
            },
          },
        });
      }

      // 9. Update CRM Lead State (Non-destructive progression)
      if (call.leadId && call.lead) {
        const leadUpdates: any = {
          score: Math.max(call.lead.score || 0, result.leadScore),
        };

        if (result.appointment.detected) {
          leadUpdates.status = 'appointment';
        } else if (result.qualification.qualified && call.lead.status !== 'appointment') {
          leadUpdates.status = 'qualified';
        }

        await this.prisma.lead.update({
          where: { id: call.leadId },
          data: leadUpdates,
        });
      }

      // 9b. Auto-Create Calendar Appointment when Detected by AI
      if (result.appointment.detected) {
        try {
          const appointmentDate = this.resolveAppointmentDate(result.appointment.details?.date);
          const newAppointment = await this.prisma.appointment.create({
            data: {
              leadName: call.lead?.name || 'Prospect',
              phone: call.phone,
              email: call.lead?.email || null,
              topic: result.appointment.details?.topic || result.summary || 'AI Follow-up Consultation',
              date: appointmentDate,
              duration: result.appointment.details?.duration || 30,
              status: 'scheduled',
              tenantId: call.tenantId,
              leadId: call.leadId,
              agentId: call.agentId,
            },
          });
          this.logger.log(
            `[APPOINTMENT_SCHEDULED] Successfully booked appointment ${newAppointment.id} on ${appointmentDate.toISOString()} for call ${callId}`,
          );
        } catch (appErr: any) {
          this.logger.warn(`Failed to auto-schedule appointment for call [${callId}]: ${appErr.message}`);
        }
      }

      // 10. Realtime Event Broadcast (Tenant, Call Room, and Campaign Room)
      this.callsGateway?.broadcastCallAnalysis(callId, tenantId, call.campaignId || null, {
        analysisStatus: 'completed',
        leadScore: result.leadScore,
        intent: result.intent,
        sentiment: result.sentiment,
        summary: result.summary,
        qualification: result.qualification,
        appointmentDetected: result.appointment.detected,
      });

      // 11. Two-Way CRM Synchronization (HubSpot, Salesforce, Zoho, Mock)
      if (this.crmQueueService) {
        try {
          await this.crmQueueService.enqueueSyncJob({
            tenantId,
            callId: call.id,
            leadId: call.leadId || undefined,
            phone: call.phone,
            direction: call.direction as any,
            duration: call.duration ?? undefined,
            callStatus: call.status,
            analysis: {
              qualificationScore: result.leadScore,
              sentiment: result.sentiment,
              summary: result.summary,
              outcome: result.outcome,
              nextAction: result.nextAction,
              appointmentDetected: result.appointment.detected,
              appointmentDetails: result.appointment.details,
              qualification: result.qualification,
            },
            timestamp: new Date(),
          });
        } catch (crmErr: any) {
          this.logger.warn(`Failed to enqueue CRM synchronization for call [${callId}]: ${crmErr.message}`);
        }
      }

      // 12. Post-Call Automation Messaging (WhatsApp / SMS / Email)
      if (this.automationsService) {
        try {
          await this.automationsService.sendPostCallAutomation(tenantId, callId);
          this.logger.log(`[AUTOMATIONS_TRIGGERED] Executed post-call automation rules for call ${callId}`);
        } catch (autoErr: any) {
          this.logger.warn(`Failed to execute post-call automations for call [${callId}]: ${autoErr.message}`);
        }
      }

      return { success: true, analysisId: savedAnalysis.id };
    } catch (err: any) {
      this.logger.error(`[POST_CALL_ANALYSIS_FAILED] callId=${callId}: ${err.message}`);

      // Crucial: Call status is NEVER regressed to failed!
      try {
        await this.prisma.callAnalysis.upsert({
          where: { callId },
          create: {
            callId,
            tenantId,
            processingStatus: 'failed',
            errorMessage: err.message,
          },
          update: {
            processingStatus: 'failed',
            errorMessage: err.message,
          },
        });
      } catch (dbErr: any) {
        this.logger.warn(`Failed to update call analysis error state: ${dbErr.message}`);
      }

      // Realtime event broadcast on failure
      this.callsGateway?.broadcastCallAnalysis(callId, tenantId, null, {
        analysisStatus: 'failed',
        errorMessage: err.message,
      });

      return { success: false, reason: err.message };
    }
  }

  private buildTranscriptText(transcript: any): string {
    if (!transcript) return '';

    if (Array.isArray(transcript.segments) && transcript.segments.length > 0) {
      return transcript.segments
        .map((s: any) => `${s.speaker === 'user' ? 'Caller' : s.speaker === 'agent' ? 'AI Agent' : s.speaker}: ${s.text}`)
        .join('\n');
    }

    if (transcript.summary) {
      return transcript.summary;
    }

    return '';
  }

  private resolveAppointmentDate(dateStr?: string): Date {
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now() - 86400000) {
        return parsed;
      }
      const lower = dateStr.toLowerCase();
      const now = new Date();
      if (lower.includes('tomorrow')) {
        const d = new Date();
        d.setDate(now.getDate() + 1);
        d.setHours(14, 0, 0, 0);
        return d;
      }
      if (lower.includes('monday')) {
        const d = new Date();
        const day = d.getDay();
        const diff = (1 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        d.setHours(14, 0, 0, 0);
        return d;
      }
      if (lower.includes('friday')) {
        const d = new Date();
        const day = d.getDay();
        const diff = (5 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        d.setHours(15, 0, 0, 0);
        return d;
      }
    }
    // Default fallback: 2 days from now at 10:00 AM
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 2);
    fallback.setHours(10, 0, 0, 0);
    return fallback;
  }
}

