import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { CallsGateway } from '../../calls/calls.gateway';
import { MetricsService } from '../../../common/services/metrics.service';
import { AutomationQueueService, AutomationJobData } from '../services/automation-queue.service';
import { AutomationProviderRegistry } from '../providers/provider-registry.service';
import { TemplateEngine } from '../engine/template.engine';
import { MessageSendResult } from '../interfaces/message-provider.interface';

@Injectable()
@Processor('automation-actions')
export class AutomationActionProcessor implements OnModuleInit {
  private readonly logger = new Logger(AutomationActionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly callsGateway: CallsGateway,
    private readonly metrics: MetricsService,
    private readonly queueService: AutomationQueueService,
    private readonly providerRegistry: AutomationProviderRegistry,
    private readonly templateEngine: TemplateEngine,
  ) {}

  onModuleInit() {
    this.queueService.setInMemoryProcessor(async (data) => {
      await this.processJob(data);
    });
  }

  @Process()
  async handleBullJob(job: Job<AutomationJobData>): Promise<void> {
    await this.processJob(job.data);
  }

  /**
   * Main processor shared between Bull and In-Memory fallback.
   */
  async processJob(job: AutomationJobData): Promise<void> {
    const { tenantId, leadId, callId, actionType, automationRuleId } = job;
    this.metrics.increment('automation.action.started');
    this.logger.log(`Processing automation action [${actionType}] for tenant ${tenantId}, lead ${leadId || 'none'}`);

    // 1. Authoritative Data Loading
    let lead: any = null;
    let call: any = null;

    if (this.prisma.isConnected) {
      if (leadId) {
        lead = await this.prisma.lead.findFirst({
          where: { id: leadId, tenantId },
        });
      }
      if (callId) {
        call = await this.prisma.call.findFirst({
          where: { id: callId, tenantId },
          include: { agent: true },
        });
        if (!lead && call?.leadId) {
          lead = await this.prisma.lead.findFirst({
            where: { id: call.leadId, tenantId },
          });
        }
      }
    } else {
      // In offline/mock mode when DB is disconnected, synthesize minimal context
      lead = {
        id: leadId || 'mock-lead-1',
        name: 'Alex Mercer',
        phone: job.destinationOverride || '+15551234567',
        email: job.destinationOverride || 'alex@example.com',
        company: 'Acme Corp',
        score: 82,
        metadata: {},
      };
    }

    // 2. DND / Opt-Out Compliance Check
    const leadMeta = (lead?.metadata as Record<string, any>) || {};
    const isDnd = Boolean(leadMeta.isDnd || leadMeta.dnd || leadMeta.optOut || leadMeta.unsubscribed);

    if (isDnd && !job.isTestAction) {
      this.logger.warn(`Outbound automation skipped: Lead ${lead?.id} has DND/Opt-Out active.`);
      this.metrics.increment('automation.skipped');

      if (this.prisma.isConnected && lead) {
        await this.prisma.automationLog.create({
          data: {
            tenantId,
            leadId: lead.id,
            callId: call?.id,
            type: actionType.includes('whatsapp') ? 'whatsapp' : 'email',
            template: job.template || 'default',
            message: '[SKIPPED] Lead has DND/Opt-Out active',
            status: 'skipped' as any,
            metadata: { reason: 'DND_OPT_OUT', trigger: job.triggerName },
          },
        });
      }
      return;
    }

    // 3. Template Rendering
    const templateContext = {
      lead: lead ? { ...lead, ...(job.variables || {}) } : job.variables,
      call,
      analysis: (call?.metadata as any)?.analysis,
      agent: call?.agent,
    };

    const rawTemplate = job.template || (actionType.includes('whatsapp')
      ? 'Hi {{lead.name}}, thanks for connecting with us!'
      : 'Hello {{lead.name}}, here are the details from our recent conversation.');

    const renderedMessage = this.templateEngine.render(rawTemplate, templateContext);

    // 4. Provider Dispatch
    let result: MessageSendResult;
    const isWhatsApp = actionType === 'send_whatsapp' || actionType === 'whatsapp';
    const destination = job.destinationOverride || (isWhatsApp ? lead?.phone : lead?.email);

    if (!destination) {
      this.logger.warn(`No valid destination for action ${actionType} on lead ${lead?.id}`);
      this.metrics.increment('automation.action.failed');
      return;
    }

    if (isWhatsApp) {
      const { adapter, creds } = await this.providerRegistry.resolveWhatsApp(tenantId);
      result = await adapter.sendMessage(creds, {
        to: destination,
        textBody: renderedMessage,
        templateName: job.variables?.templateName,
        variables: job.variables,
      });
    } else {
      const { adapter, creds } = await this.providerRegistry.resolveEmail(tenantId);
      const subject = this.templateEngine.render(
        job.subject || 'Update regarding your inquiry - AgentCall AI',
        templateContext,
      );
      result = await adapter.sendEmail(creds, {
        to: destination,
        subject: this.templateEngine.sanitizeHeader(subject),
        text: renderedMessage,
        html: `<p>${this.templateEngine.sanitizeHtml(renderedMessage)}</p>`,
      });
    }

    // 5. Update AutomationLog & Metrics
    if (result.success) {
      this.metrics.increment('automation.action.sent');
    } else {
      this.metrics.increment('automation.action.failed');
    }

    if (this.prisma.isConnected) {
      try {
        await this.prisma.automationLog.create({
          data: {
            tenantId,
            leadId: lead?.id,
            callId: call?.id,
            type: isWhatsApp ? 'whatsapp' : 'email',
            template: rawTemplate,
            message: renderedMessage,
            status: result.success ? 'sent' : 'failed',
            error: result.error,
            providerMessageId: result.providerMessageId,
            attempts: 1,
            sentAt: result.success ? new Date() : null,
            metadata: {
              ...result.metadata,
              trigger: job.triggerName,
              destination,
              isTestAction: job.isTestAction,
            },
          },
        });

        if (automationRuleId) {
          await this.prisma.automationRule.update({
            where: { id: automationRuleId },
            data: {
              executions: { increment: 1 },
              lastRunAt: new Date(),
            },
          }).catch(() => {});
        }
      } catch (err: any) {
        this.logger.error(`Failed to persist automation log: ${err.message}`);
      }
    }

    // 6. Broadcast Real-Time UI Event
    try {
      this.callsGateway.server?.to(`tenant:${tenantId}`).emit('automation:action:executed', {
        jobId: this.queueService.generateJobId(job),
        status: result.status,
        providerMessageId: result.providerMessageId,
        actionType,
        destination,
        timestamp: Date.now(),
      });
    } catch {}

    // If permanent failure, do not rethrow; if retryable and in BullMQ, throwing causes Bull to retry
    if (!result.success && result.isRetryable) {
      throw new Error(result.error || 'Temporary automation dispatch failure');
    }
  }
}
