import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  DryRunDto,
  TestActionDto,
} from './dto/automation-rule.dto';
import { AutomationQueueService } from './services/automation-queue.service';
import { AutomationProviderRegistry } from './providers/provider-registry.service';
import { ConditionEngine } from './engine/condition.engine';
import { TemplateEngine } from './engine/template.engine';
import { AutomationTriggerEvent } from './interfaces/message-provider.interface';

export type AutomationType = 'whatsapp' | 'sms' | 'email';

export interface SendMessageDto {
  leadId: string;
  type: AutomationType;
  template: string;
  variables?: Record<string, string>;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly queueService: AutomationQueueService,
    private readonly providerRegistry: AutomationProviderRegistry,
    private readonly conditionEngine: ConditionEngine,
    private readonly templateEngine: TemplateEngine,
  ) {}

  /**
   * Dispatches trigger event to all matching active automation rules asynchronously.
   */
  async triggerAutomation(tenantId: string, event: AutomationTriggerEvent) {
    this.logger.log(`Triggering automations for [${event.trigger}] on tenant ${tenantId}`);

    if (!this.prisma.isConnected) {
      // In offline mode, enqueue directly with fallback
      await this.queueService.enqueueAction({
        tenantId,
        triggerEventId: `${event.trigger}_${Date.now()}`,
        triggerName: event.trigger,
        leadId: event.leadId,
        callId: event.callId,
        actionType: 'send_whatsapp',
        template: 'Automated follow-up message for {{lead.name}}',
        variables: event.data?.lead,
      });
      return { triggered: 1, rulesMatched: 1 };
    }

    // 1. Fetch matching active rules for tenant
    const rules = await this.prisma.automationRule.findMany({
      where: {
        tenantId,
        trigger: event.trigger as any,
        status: 'active',
      },
    });

    if (!rules || rules.length === 0) {
      return { triggered: 0, rulesMatched: 0 };
    }

    // 2. Fetch authoritative context data
    let lead: any = event.data?.lead;
    if (!lead && event.leadId) {
      lead = await this.prisma.lead.findFirst({
        where: { id: event.leadId, tenantId },
      });
    }

    let call: any = event.data?.call;
    if (!call && event.callId) {
      call = await this.prisma.call.findFirst({
        where: { id: event.callId, tenantId },
      });
      if (!lead && call?.leadId) {
        lead = await this.prisma.lead.findFirst({
          where: { id: call.leadId, tenantId },
        });
      }
    }

    const context = {
      lead,
      call,
      analysis: event.data?.analysis || (call?.metadata as any)?.analysis,
      appointment: event.data?.appointment,
      tenant: { id: tenantId },
    };

    let enqueuedCount = 0;

    // 3. Evaluate each rule
    for (const rule of rules) {
      const conditions = (rule.conditions as any) || [];
      const matches = this.conditionEngine.evaluate(conditions, context);

      if (!matches) {
        this.logger.log(`Rule [${rule.name}] skipped: conditions did not match.`);
        continue;
      }

      // Check actions: either modern actions array or legacy action field
      const actionsToRun: Array<{ type: string; template?: string; subject?: string }> = [];
      const ruleActions = (rule.actions as any[]) || [];

      if (ruleActions.length > 0) {
        actionsToRun.push(...ruleActions);
      } else {
        actionsToRun.push({
          type: rule.action === 'whatsapp' || rule.action === ('send_whatsapp' as any) ? 'send_whatsapp' : 'send_email',
          template: rule.template || undefined,
        });
      }

      for (const act of actionsToRun) {
        const actionType = act.type.includes('email') ? 'send_email' : 'send_whatsapp';
        const triggerEventId = `${event.trigger}_${event.callId || event.leadId || Date.now()}`;

        await this.queueService.enqueueAction({
          tenantId,
          automationRuleId: rule.id,
          triggerEventId,
          triggerName: event.trigger,
          leadId: lead?.id || event.leadId,
          callId: call?.id || event.callId,
          actionType: actionType as any,
          template: act.template || rule.template || undefined,
          subject: act.subject,
          variables: event.data?.lead,
        });

        enqueuedCount++;
      }
    }

    return { triggered: enqueuedCount, rulesMatched: rules.length };
  }

  /**
   * Dry-run preview: evaluates rule conditions and template against sample or real data without sending.
   */
  async dryRun(tenantId: string, dto: DryRunDto) {
    let leadData: any = dto.sampleData?.lead;

    if (!leadData && dto.leadId && this.prisma.isConnected) {
      leadData = await this.prisma.lead.findFirst({
        where: { id: dto.leadId, tenantId },
      });
    }

    if (!leadData) {
      leadData = {
        name: 'Jane Doe',
        phone: '+919876543210',
        email: 'jane.doe@example.com',
        company: 'Acme Technologies',
        score: 85,
        status: 'qualified',
      };
    }

    const context = {
      lead: leadData,
      call: dto.sampleData?.call || { duration: 180, outcome: 'appointment_scheduled' },
      analysis: dto.sampleData?.analysis || {
        leadScore: 85,
        intent: 'demo_request',
        sentiment: 'positive',
        qualification: 'qualified',
        summary: 'Caller requested a platform demonstration for sales automation.',
      },
      appointment: dto.sampleData?.appointment || {
        date: new Date().toLocaleDateString(),
        time: '11:00 AM',
      },
    };

    const conditionsMet = this.conditionEngine.evaluate(dto.conditions as any, context);
    const template = dto.template || 'Hi {{lead.name}}, thank you for speaking with our agent. We look forward to our meeting on {{appointment.date}}!';
    const renderedMessage = this.templateEngine.render(template, context);

    return {
      success: true,
      conditionsMet,
      renderedMessage,
      contextUsed: {
        leadName: leadData.name,
        leadScore: context.analysis.leadScore,
        intent: context.analysis.intent,
      },
    };
  }

  /**
   * Test action: sends a single message to an explicit user destination.
   */
  async testAction(tenantId: string, dto: TestActionDto) {
    if (!dto.destination) {
      throw new BadRequestException('Destination is required for test message');
    }

    const triggerEventId = `test_action_${Date.now()}`;
    const result = await this.queueService.enqueueAction({
      tenantId,
      triggerEventId,
      triggerName: 'manual_test_action',
      actionType: dto.actionType,
      destinationOverride: dto.destination,
      template: dto.message || 'This is a test notification from AgentCall AI CRM Automation Engine.',
      subject: dto.subject || 'AgentCall AI — Test Automation Message',
      isTestAction: true,
    });

    return {
      success: true,
      jobId: result.jobId,
      destination: dto.destination,
      actionType: dto.actionType,
      message: 'Test action successfully queued for delivery',
    };
  }

  /**
   * Handle WhatsApp Webhooks from Meta.
   */
  async handleWhatsAppWebhook(rawBody: Buffer | string, signature: string, payload: any) {
    const appSecret = this.config.get<string>('WHATSAPP_APP_SECRET');
    if (appSecret && signature) {
      const isValid = this.providerRegistry.metaWhatsApp.validateWebhookSignature(
        signature,
        rawBody,
        appSecret,
      );
      if (!isValid) {
        this.logger.warn('WhatsApp webhook signature verification failed');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const statuses = this.providerRegistry.metaWhatsApp.parseWebhookStatuses(payload);
    let updatedCount = 0;

    if (this.prisma.isConnected) {
      for (const s of statuses) {
        try {
          const log = await this.prisma.automationLog.findFirst({
            where: { providerMessageId: s.messageId },
          });

          if (log) {
            await this.prisma.automationLog.update({
              where: { id: log.id },
              data: {
                status: s.status as any,
                error: s.error ? `${s.error.code}: ${s.error.title} - ${s.error.message}` : undefined,
              },
            });
            updatedCount++;
          }
        } catch (err: any) {
          this.logger.warn(`Could not update WhatsApp delivery status: ${err.message}`);
        }
      }
    }

    return { success: true, processedStatuses: statuses.length, updated: updatedCount };
  }

  /**
   * Legacy Send message direct (preserved for backward compatibility).
   */
  async sendMessage(tenantId: string, dto: SendMessageDto) {
    return this.queueService.enqueueAction({
      tenantId,
      triggerEventId: `direct_${Date.now()}`,
      triggerName: 'direct_send',
      leadId: dto.leadId,
      actionType: dto.type === 'email' ? 'send_email' : 'send_whatsapp',
      template: dto.template,
      variables: dto.variables,
    });
  }

  /**
   * Send post-call automation (preserved for backward compatibility, now enqueues through dispatcher).
   */
  async sendPostCallAutomation(tenantId: string, callId: string) {
    return this.triggerAutomation(tenantId, {
      trigger: 'call_completed',
      tenantId,
      callId,
    });
  }

  /**
   * Retrieve automation logs with enhanced filtering and pagination.
   */
  async getAutomationLogs(
    tenantId: string,
    query: { type?: string; status?: string; page?: number; limit?: number; leadId?: string },
  ) {
    const { page = 1, limit = 20, type, status, leadId } = query;
    const where: any = { tenantId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (leadId) where.leadId = leadId;

    if (!this.prisma.isConnected) {
      // Return synthesized dev logs when offline
      return {
        items: [
          {
            id: 'mock-log-1',
            type: 'whatsapp',
            template: 'Hi {{lead.name}}, thanks for your call!',
            message: 'Hi Alex Mercer, thanks for your call!',
            status: 'delivered',
            providerMessageId: 'wamid.mock_123',
            createdAt: new Date(),
            sentAt: new Date(),
            lead: { name: 'Alex Mercer', phone: '+919876543210' },
          },
          {
            id: 'mock-log-2',
            type: 'email',
            template: 'Appointment Confirmation',
            message: 'Hello Alex Mercer, your demo has been scheduled.',
            status: 'sent',
            providerMessageId: 'resend_mock_456',
            createdAt: new Date(Date.now() - 3600000),
            sentAt: new Date(Date.now() - 3600000),
            lead: { name: 'Alex Mercer', phone: '+919876543210' },
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.automationLog.findMany({
        where,
        skip: (Math.max(1, Number(page) || 1) - 1) * Math.max(1, Math.min(100, Number(limit) || 20)),
        take: Math.max(1, Math.min(100, Number(limit) || 20)),
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { id: true, name: true, phone: true, email: true } } },
      }),
      this.prisma.automationLog.count({ where }),
    ]);

    return { items, total, page: Number(page) || 1, limit: Number(limit) || 20 };
  }

  // ── Automation Rule CRUD ─────────────────────────────────────

  async createRule(tenantId: string, dto: CreateAutomationRuleDto) {
    if (!this.prisma.isConnected) {
      return {
        id: `rule_mock_${Date.now()}`,
        name: dto.name,
        trigger: dto.trigger,
        action: dto.action,
        template: dto.template,
        conditions: dto.conditions || [],
        actions: dto.actions || [],
        status: dto.status ?? 'active',
        executions: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return this.prisma.automationRule.create({
      data: {
        name: dto.name,
        trigger: dto.trigger as any,
        action: dto.action as any,
        template: dto.template,
        conditions: (dto.conditions as any) || [],
        actions: (dto.actions as any) || [],
        status: dto.status ?? 'active',
        tenantId,
      },
    });
  }

  async listRules(tenantId: string) {
    if (!this.prisma.isConnected) {
      return [
        {
          id: 'rule_mock_1',
          name: 'WhatsApp follow-up on Qualified Lead',
          trigger: 'lead_qualified',
          action: 'whatsapp',
          template: 'Hi {{lead.name}}, our team reviewed your details and would love to schedule a demo.',
          conditions: [{ field: 'leadScore', operator: '>=', value: 75 }],
          status: 'active',
          executions: 12,
          lastRunAt: new Date(Date.now() - 1800000),
          createdAt: new Date(),
        },
        {
          id: 'rule_mock_2',
          name: 'Email Confirmation on Appointment',
          trigger: 'appointment_detected',
          action: 'email',
          template: 'Hello {{lead.name}}, your appointment is booked for {{appointment.date}} at {{appointment.time}}.',
          conditions: [],
          status: 'active',
          executions: 5,
          lastRunAt: new Date(Date.now() - 7200000),
          createdAt: new Date(),
        },
      ];
    }

    return this.prisma.automationRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(tenantId: string, id: string, dto: UpdateAutomationRuleDto) {
    if (!this.prisma.isConnected) {
      return { id, ...dto, updatedAt: new Date() };
    }

    const existing = await this.prisma.automationRule.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Automation rule not found');

    return this.prisma.automationRule.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.trigger && { trigger: dto.trigger as any }),
        ...(dto.action && { action: dto.action as any }),
        ...(dto.template !== undefined && { template: dto.template }),
        ...(dto.conditions !== undefined && { conditions: dto.conditions as any }),
        ...(dto.actions !== undefined && { actions: dto.actions as any }),
        ...(dto.status && { status: dto.status as any }),
      },
    });
  }

  async toggleRule(tenantId: string, id: string, status: 'active' | 'paused') {
    return this.updateRule(tenantId, id, { status } as UpdateAutomationRuleDto);
  }

  async deleteRule(tenantId: string, id: string) {
    if (!this.prisma.isConnected) {
      return { success: true, id };
    }

    const existing = await this.prisma.automationRule.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Automation rule not found');
    return this.prisma.automationRule.delete({ where: { id } });
  }

  // ── Provider Management ──────────────────────────────────────

  async getProviderStatuses(tenantId: string) {
    return this.providerRegistry.getProviderStatuses(tenantId);
  }

  async testProvider(tenantId: string, provider: 'whatsapp' | 'resend') {
    return this.providerRegistry.testProvider(tenantId, provider);
  }
}
