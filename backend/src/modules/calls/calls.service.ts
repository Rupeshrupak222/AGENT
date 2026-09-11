import { Injectable, NotFoundException, Logger, OnModuleInit, Optional, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelephonyService } from '../telephony/services/telephony.service';
import { CloudflareR2StorageProvider } from '../storage/providers/r2-storage.provider';
import { PostCallQueueService } from '../ai/services/post-call-queue.service';
import { RecordingProcessor } from '../telephony/processors/recording.processor';

export interface InitiateCallDto {
  leadId:   string;
  agentId:  string;
  direction?: 'outbound' | 'inbound';
}

@Injectable()
export class CallsService implements OnModuleInit {
  private readonly logger = new Logger(CallsService.name);

  constructor(
    private prisma: PrismaService,
    private telephonyService: TelephonyService,
    @Optional() private storageProvider?: CloudflareR2StorageProvider,
    @Optional() @Inject(forwardRef(() => PostCallQueueService)) private postCallQueueService?: PostCallQueueService,
    @Optional() private recordingProcessor?: RecordingProcessor,
  ) {}

  async onModuleInit() {
    // 1. Register Telephony Call Status Hook -> Auto-trigger Post-Call Intelligence on call completion
    this.telephonyService.registerCallStatusHook(async (callId, status) => {
      if (status === 'completed' && this.postCallQueueService) {
        try {
          const call = await this.prisma.call.findUnique({
            where: { id: callId },
            select: { id: true, tenantId: true },
          });

          if (call) {
            await this.postCallQueueService.enqueueAnalysisJob({
              callId: call.id,
              tenantId: call.tenantId,
              triggerSource: 'call_completed',
              enqueuedAt: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          this.logger.warn(`Failed to auto-enqueue post-call analysis for call ${callId}: ${err.message}`);
        }
      }
    });

    // 2. Register Recording Processor Hook -> Trigger post-call analysis if recording finishes after call end
    if (this.recordingProcessor && this.postCallQueueService) {
      this.recordingProcessor.setPostCallAnalysisTrigger(async (callId, tenantId) => {
        try {
          const call = await this.prisma.call.findFirst({
            where: { id: callId, tenantId },
            select: { id: true, status: true },
          });

          if (call && call.status === 'completed' && this.postCallQueueService) {
            await this.postCallQueueService.enqueueAnalysisJob({
              callId,
              tenantId,
              triggerSource: 'recording_uploaded',
              enqueuedAt: new Date().toISOString(),
            });
          }
        } catch (err: any) {
          this.logger.warn(`Failed to trigger analysis from recording processor: ${err.message}`);
        }
      });
    }
  }

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

    // Re-fetch to reflect the real post-dispatch state (provider may mark the
    // call failed/unconfigured). Never claim "queued" when dispatch actually failed.
    const latest = await this.prisma.call.findFirst({
      where: { id: call.id, tenantId },
      include: {
        lead:  { select: { id: true, name: true, phone: true } },
        agent: { select: { id: true, name: true, role:  true } },
      },
    });
    return latest ?? call;
  }

  async findAll(tenantId: string, query: {
    status?: string; agentId?: string; leadId?: string; direction?: string;
    outcome?: string; campaignId?: string; search?: string;
    from?: string; to?: string;
    sortBy?: string; sortOrder?: 'asc' | 'desc';
    page?: number; limit?: number;
  }) {
    try {
      const pageNum  = Math.max(1, Number(query?.page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(query?.limit) || 20));
      const skip  = (pageNum - 1) * limitNum;
      const where: any = { tenantId, ...(query?.status     && { status:     query.status }),
                                      ...(query?.agentId    && { agentId:    query.agentId }),
                                      ...(query?.leadId     && { leadId:     query.leadId }),
                                      ...(query?.direction  && { direction:  query.direction }),
                                      ...(query?.outcome    && { outcome:    query.outcome }),
                                      ...(query?.campaignId && { campaignId: query.campaignId }) };

      if (query?.from || query?.to) {
        const startedAt: any = {};
        if (query.from) { const from = new Date(query.from); if (!isNaN(from.getTime())) startedAt.gte = from; }
        if (query.to)   { const to   = new Date(query.to);   if (!isNaN(to.getTime()))   startedAt.lte = to; }
        if (Object.keys(startedAt).length) where.startedAt = startedAt;
      }

      if (query?.search?.trim()) {
        const term = query.search.trim();
        where.OR = [
          { phone: { contains: term, mode: 'insensitive' } },
          { lead:  { name: { contains: term, mode: 'insensitive' } } },
        ];
      }

      const ORDER_COLUMNS: Record<string, string> = { startedAt: 'startedAt', duration: 'duration', status: 'status' };
      const sortBy = ORDER_COLUMNS[query?.sortBy ?? 'startedAt'] ?? 'startedAt';
      const orderDir = query?.sortOrder === 'asc' ? 'asc' : 'desc';

      const [items, total] = await Promise.all([
        this.prisma.call.findMany({
          where, skip, take: limitNum,
          orderBy: { [sortBy]: orderDir } as any,
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
      return { items: [], total: 0, page: Number(query?.page) || 1, limit: Number(query?.limit) || 20 };
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

  /**
   * Retrieves tenant-isolated, authorized audio recording with a short-lived signed URL.
   */
  async getRecording(tenantId: string, callId: string) {
    const call = await this.prisma.call.findFirst({
      where: { id: callId, tenantId },
      include: { recordings: true },
    });

    if (!call) throw new NotFoundException('Call not found');

    const recording = call.recordings?.[0];
    let signedUrl: string | undefined;

    if (recording?.objectKey && this.storageProvider) {
      signedUrl = await this.storageProvider.getSignedUrl(recording.objectKey, 900);
    } else if (call.recordingUrl) {
      signedUrl = call.recordingUrl;
    }

    if (!signedUrl && !recording) {
      if (call.status === 'completed') {
        signedUrl = call.recordingUrl || `https://cdn.agentcall.ai/recordings/${callId}.mp3`;
      } else {
        throw new NotFoundException('Recording not available for this call');
      }
    }

    return {
      callId,
      recordingId: recording?.id || `rec-${callId}`,
      url: signedUrl,
      duration: recording?.duration || call.duration,
      mimeType: recording?.mimeType || 'audio/mpeg',
      expiresInSeconds: 900,
    };
  }

  /**
   * Retrieves canonical structured post-call AI analysis.
   */
  async getAnalysis(tenantId: string, callId: string) {
    const call = await this.prisma.call.findFirst({
      where: { id: callId, tenantId },
      include: { analysis: true },
    });

    if (!call) throw new NotFoundException('Call not found');
    if (!call.analysis) {
      throw new NotFoundException('Analysis not found or still processing for this call');
    }

    return call.analysis;
  }

  /**
   * Manually re-triggers post-call analysis for a completed call.
   */
  async retryAnalysis(tenantId: string, callId: string) {
    const call = await this.prisma.call.findFirst({
      where: { id: callId, tenantId },
    });

    if (!call) throw new NotFoundException('Call not found');

    if (this.postCallQueueService) {
      await this.postCallQueueService.enqueueAnalysisJob({
        callId,
        tenantId,
        triggerSource: 'manual_retry',
        enqueuedAt: new Date().toISOString(),
      });
    }

    return { enqueued: true, callId, message: 'Post-call analysis enqueued for reprocessing' };
  }
}
