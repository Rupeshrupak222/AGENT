import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentAgentTools } from '../../calendar/services/appointment-agent-tools.service';
import { AutomationProviderRegistry } from '../providers/provider-registry.service';
import { WhatsAppInboundMessage } from '../interfaces/message-provider.interface';
import { formatLocal, zonedTimeToUtc } from '../../calendar/lib/calendar-time';

export type AppointmentIntent = 'lookup' | 'cancel' | 'reschedule' | 'book' | 'help';

interface RouterResult {
  handled: number;
  replies: string[];
  tenantResolved: boolean;
  intents: Array<{ from: string; intent: AppointmentIntent }>;
}

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Deterministic, tenant-scoped WhatsApp appointment assistant (Day 17).
 * Parses inbound text intents — lookup / cancel / reschedule / book —
 * routes them into the appointment tools, and replies through the same
 * WhatsApp provider that received the message. Fully DND-aware.
 */
@Injectable()
export class WhatsAppAppointmentRouter {
  private readonly logger = new Logger(WhatsAppAppointmentRouter.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AppointmentAgentTools))
    private readonly tools: AppointmentAgentTools,
    private readonly providerRegistry: AutomationProviderRegistry,
  ) {}

  detectIntent(text: string): AppointmentIntent {
    const t = (text || '').toLowerCase();
    if (/\b(cancel|unbook|don'?t\s+(need|want)\b|remove.*(appointment|booking|meeting))\b/.test(t)) {
      return 'cancel';
    }
    if (/\b(move|reschedule|rebook|shift)\b|\banother\s+(time|day|slot)\b|\bdifferent\s+(time|day)\b/.test(t)) {
      return 'reschedule';
    }
    if (/\b(what time|when is|my appointment|appointment.*status|status of|do i have)\b/.test(t)) {
      return 'lookup';
    }
    if (/\b(book|schedule|fix|availability|slot|available)\b/.test(t)) {
      return 'book';
    }
    return 'help';
  }

  /** Resolves the single tenant that owns a given Messenger wa_id, else null. */
  private async resolveTenantByPhone(from: string): Promise<{ tenantId: string; lead?: any } | null> {
    if (!this.prisma.isConnected || !from) return null;

    const digits = from.replace(/\D/g, '');
    const leads = await this.prisma.lead.findMany({
      select: { id: true, tenantId: true, name: true, phone: true, email: true, metadata: true },
      take: 1000,
    }).catch(() => [] as any[]);

    const matches = leads.filter((l) => l.phone && (l.phone as string).replace(/\D/g, '') === digits);
    const tenants = new Set(matches.map((l) => l.tenantId));
    if (tenants.size !== 1) {
      this.logger.warn(`Ambiguous/unmatched sender ${from} (${tenants.size} tenants) — ignoring.`);
      return null;
    }
    return { tenantId: matches[0].tenantId, lead: matches[0] };
  }

  private isLeadDnd(lead?: any): boolean {
    const meta = (lead?.metadata as Record<string, any>) || {};
    return Boolean(meta.isDnd || meta.dnd || meta.optOut || meta.unsubscribed);
  }

  async handleInbound(messages: WhatsAppInboundMessage[]): Promise<RouterResult> {
    const result: RouterResult = { handled: 0, replies: [], tenantResolved: false, intents: [] };
    if (!messages || messages.length === 0) return result;

    for (const msg of messages) {
      if (!msg.text) continue;
      const resolved = await this.resolveTenantByPhone(msg.from);
      if (!resolved) continue;
      result.tenantResolved = true;

      if (this.isLeadDnd(resolved.lead)) {
        this.logger.warn(`WhatsApp inbound ignored: DND/opt-out active for ${msg.from}.`);
        continue;
      }

      const intent = this.detectIntent(msg.text);
      result.intents.push({ from: msg.from, intent });
      const reply = await this.route(resolved.tenantId, intent, msg, resolved.lead);
      result.handled += 1;
      if (reply) {
        result.replies.push(reply);
        await this.sendReply(resolved.tenantId, msg.from, reply).catch((err: any) =>
          this.logger.warn(`WhatsApp reply failed: ${err.message}`),
        );
      }
    }
    return result;
  }

  private async route(
    tenantId: string,
    intent: AppointmentIntent,
    msg: WhatsAppInboundMessage,
    lead?: any,
  ): Promise<string> {
    // Look up by the lead's stored phone so digit/normalization differences
    // between the inbound wa_id and the saved appointment never hide bookings.
    const phone = lead?.phone ?? msg.from;

    switch (intent) {
      case 'lookup': {
        const res = await this.tools.lookupAppointment(tenantId, phone);
        if (!res.success) return 'I could not find any upcoming appointment for you. Reply BOOK to schedule one.';
        return this.describeAppointment(res);
      }
      case 'cancel': {
        const res: any = await this.tools.lookupAppointment(tenantId, phone);
        if (!res.success) return 'I could not find an upcoming appointment to cancel.';
        const cancel: any = await this.tools.cancelAppointment(tenantId, {
          appointmentId: res.appointmentId,
          reason: `Cancelled via WhatsApp (msg ${msg.messageId})`,
        });
        return cancel.success
          ? `Your appointment for ${res.startAt ? this.faceOf(res.startAt, res.timezone) : res.startAt} has been cancelled. Reply BOOK to schedule a new one.`
          : 'I could not cancel that appointment right now. Please try again shortly.';
      }
      case 'reschedule': {
        const current: any = await this.tools.lookupAppointment(tenantId, phone);
        if (!current.success) return 'I could not find an upcoming appointment to reschedule.';
        const duration = current.durationMinutes ?? 30;
        const target = this.parseRescheduleTarget(msg.text ?? '');

        const fromUtc = new Date(
          zonedTimeToUtc(current.timezone ?? 'UTC', this.localMidnight(target ?? new Date())).getTime(),
        );
        const toUtc = new Date(fromUtc.getTime() + 4 * 24 * 60 * 60 * 1000);

        const avail: any = await this.tools.checkCalendarAvailability(tenantId, {
          from: fromUtc.toISOString(),
          to: toUtc.toISOString(),
          timezone: current.timezone ?? 'UTC',
          durationMinutes: duration,
        });
        if (!avail.success || avail.count === 0) {
          return 'I could not find a free slot in the next few days. Please try again later.';
        }

        const slot = avail.slots[0];
        const reschedule: any = await this.tools.rescheduleAppointment(tenantId, {
          appointmentId: current.appointmentId,
          startAt: slot.startAt,
          timezone: current.timezone,
          reason: `Rescheduled via WhatsApp (msg ${msg.messageId})`,
        });
        if (!reschedule.success) {
          return 'Your appointment could not be moved right now. Please try again shortly.';
        }
        return `Done! I have moved your appointment to ${this.faceOf(slot.startAt, current.timezone ?? 'UTC')}.`;
      }
      case 'book': {
        const avail: any = await this.tools.checkCalendarAvailability(tenantId, {
          from: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          to: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'UTC',
          durationMinutes: 30,
        });
        if (!avail.success || avail.count === 0) {
          return 'We currently have no free slots. Please try again later.';
        }
        const top3 = avail.slots.slice(0, 3);
        return 'Here are the next available slots:\n' + top3.map((s: any) => `• ${this.faceOf(s.startAt, 'UTC')}`).join('\n') +
          '\n\nReply with the slot time you want, and I will confirm your booking.';
      }
      case 'help':
      default:
        return 'I can help you manage your appointment on WhatsApp.\n\n' +
          '- Type "My appointment status" to see your booking details\n' +
          '- Type "Cancel my appointment" to cancel it\n' +
          '- Type "Move my appointment to tomorrow" to reschedule\n' +
          '- Type "Book an appointment" to see available slots';
    }
  }

  private describeAppointment(res: any): string {
    const lines = [`Your appointment: ${this.faceOf(res.startAt, res.timezone ?? 'UTC')}`];
    if (res.leadName) lines.push(`Name: ${res.leadName}`);
    if (res.topic) lines.push(`Topic: ${res.topic}`);
    if (res.bookingUrl) lines.push(`Booking link: ${res.bookingUrl}`);
    lines.push('Reply CANCEL to cancel or MOVE to reschedule.');
    return lines.join('\n');
  }

  private faceOf(iso: string, timezone: string): string {
    try {
      return formatLocal(timezone || 'UTC', new Date(iso));
    } catch {
      return iso;
    }
  }

  private localMidnight(d: Date): Date {
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    return m;
  }

  /** Returns a Date whose UTC fields hold the requested LOCAL wall-clock day. */
  private parseRescheduleTarget(text: string, now = new Date()): Date | null {
    const t = text.toLowerCase();

    const nowLocal = now; // approximation; weekday math below is relative to UTC day
    const currentDay = nowLocal.getDay();

    if (/\btomorrow\b/.test(t)) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    }

    const match = t.match(/\bmon|tues?|wed(?:nes)?|thur?s?|fri|sat|sun\b|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (match) {
      const word = match[0].toLowerCase();
      let target = -1;
      for (const key of Object.keys(WEEKDAY_INDEX)) {
        if (word.startsWith(key) || (key.length === 3 && word.startsWith(key))) {
          target = WEEKDAY_INDEX[key];
          break;
        }
      }
      if (target >= 0) {
        let diff = (target - currentDay + 7) % 7;
        if (diff === 0) diff = 7;
        const d = new Date(now);
        d.setUTCDate(d.getUTCDate() + diff);
        return d;
      }
    }

    const inDays = t.match(/\bin\s+(\d+)\s+day/i);
    if (inDays) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() + parseInt(inDays[1], 10));
      return d;
    }

    return null;
  }

  private async sendReply(tenantId: string, to: string, text: string) {
    const { adapter, creds } = await this.providerRegistry.resolveWhatsApp(tenantId);
    const res = await adapter.sendMessage(creds, { to, textBody: text });
    if (!res.success) {
      this.logger.warn(`WhatsApp reply to ${to} failed: ${res.error}`);
    }
    return res;
  }
}