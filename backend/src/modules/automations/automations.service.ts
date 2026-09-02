import { Injectable, Logger } from '@nestjs/common';
import { PrismaService }      from '../prisma/prisma.service';
import { ConfigService }      from '@nestjs/config';

export type AutomationType = 'whatsapp' | 'sms' | 'email';

export interface SendMessageDto {
  leadId:    string;
  type:      AutomationType;
  template:  string;
  variables?: Record<string, string>;
}

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async sendMessage(tenantId: string, dto: SendMessageDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, tenantId } });
    if (!lead) throw new Error('Lead not found');

    // Resolve template variables
    const message = this.resolveTemplate(dto.template, {
      name:    lead.name,
      phone:   lead.phone,
      company: lead.company ?? '',
      ...dto.variables,
    });

    // Log automation attempt
    await this.prisma.automationLog.create({
      data: {
        tenantId,
        leadId:   lead.id,
        type:     dto.type,
        template: dto.template,
        message,
        status:   'queued',
      },
    });

    // In production: dispatch to provider (Twilio/2Factor/SendGrid)
    this.logger.log(`Automation queued: ${dto.type} → ${lead.phone}`);
    return { success: true, leadId: lead.id, type: dto.type, message };
  }

  async sendPostCallAutomation(tenantId: string, callId: string) {
    const call = await this.prisma.call.findFirst({
      where:   { id: callId, tenantId },
      include: { lead: true, agent: true },
    });
    if (!call) throw new Error('Call not found');

    const automations: { type: AutomationType; template: string }[] = [];

    // Trigger automations based on call outcome
    if (call.outcome?.includes('appointment')) {
      automations.push({ type: 'whatsapp', template: 'appointment_confirmation' });
      automations.push({ type: 'email',    template: 'appointment_email' });
    }
    if (call.outcome?.includes('qualified')) {
      automations.push({ type: 'whatsapp', template: 'brochure_followup' });
    }
    if (call.status === 'missed') {
      automations.push({ type: 'sms', template: 'missed_call_alert' });
    }

    const results = await Promise.all(
      automations.map(a => this.sendMessage(tenantId, { leadId: call.leadId, ...a }))
    );

    return results;
  }

  async getAutomationLogs(tenantId: string, query: { type?: string; page?: number; limit?: number }) {
    const { page = 1, limit = 20, type } = query;
    const where: any = { tenantId, ...(type && { type }) };

    const [items, total] = await Promise.all([
      this.prisma.automationLog.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        include: { lead: { select: { name: true, phone: true } } },
      }),
      this.prisma.automationLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  private resolveTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  }
}
