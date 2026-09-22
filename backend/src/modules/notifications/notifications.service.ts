import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';
export type NotificationType = 'call' | 'campaign' | 'billing' | 'appointment' | 'automation' | 'alert' | 'system';

export interface CreateNotificationInput {
  tenantId: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    if (!this.prisma.isConnected) return;
    try {
      const tenants = await this.prisma.tenant.findMany({ select: { id: true } });
      for (const t of tenants) {
        const count = await this.prisma.notification.count({ where: { tenantId: t.id } });
        if (count === 0) {
          await this.prisma.notification.create({
            data: {
              tenantId: t.id,
              type: 'system',
              severity: 'info',
              title: 'Welcome to AgentCall AI',
              message: 'Your workspace is ready. You will see call, campaign, billing and system updates here.',
            },
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Notification seed skipped: ${err.message}`);
    }
  }

  async create(input: CreateNotificationInput) {
    if (!this.prisma.isConnected) return null;
    try {
      return await this.prisma.notification.create({
        data: {
          tenantId: input.tenantId,
          type: input.type,
          severity: input.severity || 'info',
          title: String(input.title).slice(0, 200),
          message: String(input.message).slice(0, 2000),
          data: input.data ? (input.data as any) : undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Notification create failed: ${err.message}`);
      return null;
    }
  }

  async notifyCallStatus(callId: string, status: string, duration?: number, outcome?: string) {
    if (!this.prisma.isConnected) return;
    try {
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        select: {
          id: true,
          tenantId: true,
          phone: true,
          outcome: true,
          lead: { select: { id: true, name: true } },
        },
      });
      if (!call) return;

      const who = call.lead?.name || call.phone || 'unknown contact';
      const data = { callId, phone: call.phone, leadId: call.lead?.id, link: '/dashboard/calls' };

      if (status === 'missed') {
        await this.create({ tenantId: call.tenantId, type: 'call', severity: 'warning', title: 'Call missed', message: `Call to ${who} was missed.`, data });
      } else if (status === 'failed') {
        await this.create({ tenantId: call.tenantId, type: 'call', severity: 'warning', title: 'Call failed', message: `Call to ${who} failed to connect.`, data });
      } else if (status === 'completed') {
        await this.create({
          tenantId: call.tenantId,
          type: 'call',
          severity: 'success',
          title: 'Call completed',
          message: `Call with ${who} completed${duration ? ` in ${Math.round(duration)}s` : ''}${outcome || call.outcome ? ` (${outcome || call.outcome})` : ''}.`,
          data,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Call notification failed: ${err.message}`);
    }
  }

  async notifyCampaignEvent(campaignId: string, event: 'completed' | 'paused' | 'cancelled', extra?: { name?: string }) {
    if (!this.prisma.isConnected) return;
    try {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { id: true, tenantId: true, name: true },
      });
      if (!campaign) return;

      const name = extra?.name || campaign.name;
      const data = { campaignId, link: '/dashboard/campaigns' };
      const map: Record<string, { severity: NotificationSeverity; title: string; message: string }> = {
        completed: { severity: 'success', title: 'Campaign completed', message: `Campaign "${name}" finished successfully.` },
        paused: { severity: 'warning', title: 'Campaign paused', message: `Campaign "${name}" was paused.` },
        cancelled: { severity: 'warning', title: 'Campaign cancelled', message: `Campaign "${name}" was cancelled.` },
      };
      const tpl = map[event];
      if (tpl) {
        await this.create({ tenantId: campaign.tenantId, type: 'campaign', severity: tpl.severity, title: tpl.title, message: tpl.message, data });
      }
    } catch (err: any) {
      this.logger.warn(`Campaign notification failed: ${err.message}`);
    }
  }

  async list(tenantId: string, query: { page?: number | string; limit?: number | string; type?: string; unreadOnly?: string } = {}) {
    if (!this.prisma.isConnected) return { items: [], total: 0, unread: 0, page: 1, limit: 20 };
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const where: any = { tenantId, ...(query.type ? { type: query.type } : {}) };
    if (query.unreadOnly === 'true' || query.unreadOnly === '1') where.isRead = false;

    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where: { tenantId } }),
      this.prisma.notification.count({ where: { tenantId, isRead: false } }),
    ]);

    return { items, total, unread, page, limit };
  }

  async unreadCount(tenantId: string) {
    if (!this.prisma.isConnected) return 0;
    return this.prisma.notification.count({ where: { tenantId, isRead: false } });
  }

  async markRead(id: string, tenantId: string) {
    const existing = await this.prisma.notification.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(tenantId: string) {
    const res = await this.prisma.notification.updateMany({ where: { tenantId, isRead: false }, data: { isRead: true } });
    return { updated: res.count };
  }

  async clearAll(tenantId: string) {
    const res = await this.prisma.notification.deleteMany({ where: { tenantId } });
    return { deleted: res.count };
  }
}