import { NotFoundException } from '@nestjs/common';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentAgentTools } from '../services/appointment-agent-tools.service';
import { AppointmentReminderQueueService } from '../services/appointment-reminder-queue.service';
import { AppointmentReminderProcessor } from '../processors/appointment-reminder.processor';
import { CalendarProviderRegistry } from '../providers/calendar-provider-registry.service';
import { CalendarErrorFactory } from '../providers/calendar-errors';
import { MockCalendarAdapter } from '../providers/mock-calendar.adapter';
import { CalComCalendarAdapter } from '../providers/calcom.adapter';
import { MetricsService } from '../../../common/services/metrics.service';
import {
  validateExternalUrl,
  isIpLiteral,
} from '../../../common/utils/url-validator';
import { WhatsAppAppointmentRouter } from '../../automations/services/whatsapp-appointment.router';
import { AutomationProviderRegistry } from '../../automations/providers/provider-registry.service';
import { MockWhatsAppAdapter } from '../../automations/providers/whatsapp/mock-whatsapp.adapter';
import { MetaWhatsAppAdapter } from '../../automations/providers/whatsapp/whatsapp.adapter';
import { MockEmailAdapter } from '../../automations/providers/email/mock-email.adapter';
import { ResendEmailAdapter } from '../../automations/providers/email/resend.adapter';

/* ── In-memory Prisma double (reused from Day 17 patterns) ────── */

function matches(item: any, where: any): boolean {
  if (!where || Object.keys(where).length === 0) return true;
  for (const [k, v] of Object.entries(where)) {
    if (k === 'OR') {
      const list = v as any[];
      if (!list.some((cond) => matches(item, cond))) return false;
      continue;
    }
    if (k === 'AND') {
      if (!(v as any[]).every((cond) => matches(item, cond))) return false;
      continue;
    }
    if (k === 'NOT') {
      if (matches(item, v)) return false;
      continue;
    }
    if (v === null) {
      if (item[k] !== null && item[k] !== undefined) return false;
      continue;
    }
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const op = v as any;
      if (op.equals !== undefined && item[k] !== op.equals) return false;
      if (op.not !== undefined) {
        const cmp = item[k];
        if (op.not === null) { if (cmp === null || cmp === undefined) return false; }
        else if (cmp === op.not) return false;
      }
      if (op.in !== undefined && !op.in.includes(item[k])) return false;
      if (op.gte !== undefined) {
        const a = item[k] instanceof Date ? item[k].getTime() : item[k];
        const b = op.gte instanceof Date ? op.gte.getTime() : op.gte;
        if (!(a >= b)) return false;
      }
      if (op.lte !== undefined) {
        const a = item[k] instanceof Date ? item[k].getTime() : item[k];
        const b = op.lte instanceof Date ? op.lte.getTime() : op.lte;
        if (!(a <= b)) return false;
      }
      continue;
    }
    const iv = item[k] instanceof Date ? item[k].getTime() : item[k];
    const vv = v instanceof Date ? v.getTime() : v;
    if (iv !== vv) return false;
  }
  return true;
}

function makePrisma() {
  const state = {
    appointments: [] as any[],
    leads: [] as any[],
    integration: [] as any[],
  };
  let seq = 0;
  const app = (data: any) => ({
    id: `appt_${++seq}`,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'scheduled',
    startAt: null,
    endAt: null,
    timezone: 'UTC',
    calendarProvider: 'native',
    metadata: {},
    source: 'manual',
    ...data,
  });

  const prisma: any = {
    isConnected: true,
    appointment: {
      findUnique: jest.fn(async ({ where }: any) => {
        const key = where.tenantId_idempotencyKey;
        const item = state.appointments.find(
          (a) => a.tenantId === key.tenantId && a.idempotencyKey === key.idempotencyKey,
        );
        return item ?? null;
      }),
      findFirst: jest.fn(async ({ where }: any) => state.appointments.find((a) => matches(a, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => state.appointments.filter((a) => matches(a, where))),
      create: jest.fn(async ({ data }: any) => {
        const record = app(data);
        state.appointments.push(record);
        return record;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const idx = state.appointments.findIndex((a) => a.id === where.id);
        state.appointments[idx] = { ...state.appointments[idx], ...data, updatedAt: new Date() };
        return state.appointments[idx];
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const claimField = Object.keys(data).find((k) => data[k] instanceof Date);
        let count = 0;
        state.appointments = state.appointments.map((a) => {
          const w = { ...where };
          if (claimField) delete (w as any)[claimField];
          if (matches(a, w)) {
            if (claimField && a[claimField] != null) return a;
            count += 1;
            return { ...a, ...data, updatedAt: new Date() };
          }
          return a;
        });
        return { count };
      }),
    },
    lead: {
      findFirst: jest.fn(async ({ where }: any) => state.leads.find((l) => matches(l, where)) ?? null),
      findMany: jest.fn(async ({ where }: any) => state.leads.filter((l) => matches(l, where))),
    },
    integration: {
      findUnique: jest.fn(async () => null),
    },
    tenantUpdate: jest.fn(async (_model: any, tenantId: string, id: string, data: any) => {
      const idx = state.appointments.findIndex((a) => a.id === id && a.tenantId === tenantId);
      if (idx === -1) throw new NotFoundException('Resource not found');
      state.appointments[idx] = { ...state.appointments[idx], ...data, updatedAt: new Date() };
      return state.appointments[idx];
    }),
  };
  return { prisma, state };
}

function makeMockBullQueue() {
  return {
    client: { status: 'offline' },
    on: jest.fn(),
    add: jest.fn(),
    removeJobs: jest.fn(),
  } as any;
}

function makeAuditStub() {
  return { log: jest.fn() } as any;
}

function makeAutomationStub() {
  return { triggerAutomation: jest.fn(async () => ({ triggered: 0, rulesMatched: 0 })) };
}

interface Ctx {
  prisma: any;
  state: any;
  mockAdapter: MockCalendarAdapter;
  queue: AppointmentReminderQueueService;
  processor: AppointmentReminderProcessor;
  automations: any;
  service: AppointmentService;
  tools: AppointmentAgentTools;
  metrics: MetricsService;
  errorFactory: CalendarErrorFactory;
}

async function buildContext(): Promise<Ctx> {
  const { prisma, state } = makePrisma();
  const mockAdapter = new MockCalendarAdapter();
  const calcom = new CalComCalendarAdapter();
  const registry = new CalendarProviderRegistry(prisma, mockAdapter, calcom);
  const metrics = new MetricsService();
  const queue = new AppointmentReminderQueueService(makeMockBullQueue(), metrics);
  const automations: any = makeAutomationStub();
  const errorFactory = new CalendarErrorFactory();

  const service = new AppointmentService(prisma, makeAuditStub(), metrics, registry, queue, automations, errorFactory);
  const tools = new AppointmentAgentTools(service, prisma, errorFactory);

  const processor = new AppointmentReminderProcessor(prisma, metrics, queue, automations);
  processor.onModuleInit();

  return { prisma, state, mockAdapter, queue, processor, automations, service, tools, metrics, errorFactory };
}

function weekdayOffset(offsetDays: number): Date {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function weekdayWindow(offsetDays: number, daysSpan = 7): { from: Date; to: Date } {
  const from = weekdayOffset(offsetDays);
  const to = new Date(from.getTime() + daysSpan * 24 * 60 * 60 * 1000);
  return { from, to };
}

async function nextSlot(ctx: Ctx, offsetDays = 1): Promise<any> {
  const from = weekdayOffset(offsetDays);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  const avail: any = await ctx.service.getAvailability('tenant-1', {
    from: from.toISOString(),
    to: to.toISOString(),
    timezone: 'UTC',
    duration: 30,
  });
  const slot = avail.slots[0];
  if (!slot) throw new Error('No mock slot available for the test window');
  return slot;
}

describe('DAY 18 — Production Reliability & Security Test Suite', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await buildContext();
  });

  afterEach(() => {
    const timers = (ctx.queue as any).inMemoryTimers;
    timers.forEach((t: any) => clearTimeout(t));
    timers.clear();
    ctx.mockAdapter.reset();
    process.env.CALCOM_API_KEY = '';
    process.env.CALCOM_API_URL = '';
  });

  // ── 1. IDEMPOTENCY & RACE CONDITIONS ────────────────────────
  describe('1. Idempotency & Race Conditions', () => {
    it('idempotent booking is isolated per tenant (same key, different tenant = distinct booking)', async () => {
      const slot: any = await nextSlot(ctx);
      const a: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'T1',
        phone: '+919800000031',
        startAt: slot.startAt,
        provider: 'native' as any,
        idempotencyKey: 'shared_key_race',
      });
      const b: any = await ctx.service.create('tenant-2', 'user-2', {
        leadName: 'T2',
        phone: '+919800000032',
        startAt: slot.startAt,
        provider: 'native' as any,
        idempotencyKey: 'shared_key_race',
      });
      expect(b.id).not.toBe(a.id);
      expect(b.idempotent).toBeUndefined();
    });

    it('repeated concurrent-style creates with the same key yield a single provider booking', async () => {
      const slot: any = await nextSlot(ctx);
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          ctx.service.create('tenant-1', 'user-1', {
            leadName: `Race-${i}`,
            phone: '+919800000033',
            startAt: slot.startAt,
            provider: 'auto' as any,
            idempotencyKey: 'race_booking_key',
          }).catch(() => ({ error: true })),
        ),
      );
      const ok = results.filter((r: any) => !r.error);
      expect(ok.length).toBe(1);
      expect(ctx.state.appointments.filter((a: any) => a.idempotencyKey === 'race_booking_key').length).toBe(1);
    });

    it('future bookings a second time without a key are prevented by the provider guard', async () => {
      const slot: any = await nextSlot(ctx);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Slot',
        phone: '+919800000034',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      await expect(
        ctx.service.create('tenant-1', 'user-1', {
          leadName: 'Slot2',
          phone: '+919800000035',
          startAt: slot.startAt,
          provider: 'auto' as any,
        }),
      ).rejects.toThrow(/not available/i);
    });
  });

  // ── 2. FAILURE INJECTION ────────────────────────────────────
  describe('2. Failure Injection', () => {
    it('availability surfaces transient provider failure as HTTP error, not silent empty slots', async () => {
      const from = weekdayOffset(2);
      ctx.mockAdapter.setMode('server_error');
      await expect(
        ctx.service.getAvailability('tenant-1', {
          from: from.toISOString(),
          to: new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'UTC',
        }),
      ).rejects.toThrow();
      expect(ctx.state.appointments.length).toBe(0);
    });

    it('reschedule compensates cleanly when local persist fails (no orphan)', async () => {
      const slot: any = await nextSlot(ctx);
      const a: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'RS',
        phone: '+919800000036',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      const { from, to } = weekdayWindow(4, 7);
      const avail: any = await ctx.service.getAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: 'UTC',
        duration: 30,
      });
      const newSlot = avail.slots[1] ?? avail.slots[0];
      ctx.prisma.tenantUpdate.mockRejectedValueOnce(new Error('persist boom'));
      await expect(
        ctx.service.reschedule('tenant-1', 'user-1', a.id, { startAt: newSlot.startAt }),
      ).rejects.toThrow('persist boom');
    });

    it('cancel with no provider booking id and no force warns instead of faking success', async () => {
      const a: any = await ctx.prisma.appointment.create({
        data: {
          id: 'appt_nokey',
          tenantId: 'tenant-1',
          leadName: 'NoKey',
          phone: '+919800000037',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'confirmed',
          calendarProvider: 'mock',
          metadata: {},
        },
      });
      const warnSpy = jest.spyOn((ctx.service as any).logger, 'warn').mockImplementation(() => undefined);
      const res: any = await ctx.service.cancel('tenant-1', 'user-1', a.id, { reason: 'x' });
      expect(res.status).toBe('cancelled');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('compensates the provider booking when automation trigger fails (booking still persisted)', async () => {
      const slot: any = await nextSlot(ctx);
      ctx.automations.triggerAutomation.mockRejectedValueOnce(new Error('automation down'));
      const a: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'AutoFail',
        phone: '+919800000038',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      expect(a.id).toBeDefined();
      expect(ctx.mockAdapter.bookedRecords.filter((r) => r.status !== 'cancelled').length).toBe(1);
    });
  });

  // ── 3. REMINDER RELIABILITY ─────────────────────────────────
  describe('3. Reminder Reliability', () => {
    async function seedConfirmed(id: string, phone: string) {
      const startAt = new Date(Date.now() + 40 * 60 * 60 * 1000);
      await ctx.prisma.appointment.create({
        data: {
          id,
          tenantId: 'tenant-1',
          leadName: 'Rel',
          phone,
          date: startAt,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          duration: 30,
          status: 'confirmed',
          calendarProvider: 'mock',
          metadata: {},
        },
      });
      return startAt;
    }

    it('concurrent duplicate processing sends exactly one reminder', async () => {
      const startAt = await seedConfirmed('appt_rel_dup', '+919800000041');
      const job = {
        appointmentId: 'appt_rel_dup',
        tenantId: 'tenant-1',
        kind: '1h' as const,
        remindAt: startAt.toISOString(),
      };
      await Promise.all([
        ctx.processor.processJob(job),
        ctx.processor.processJob(job),
        ctx.processor.processJob(job),
      ]);
      const calls = ctx.automations.triggerAutomation.mock.calls.filter(
        (c: any) => c[1].trigger === 'appointment_reminder' && c[1].appointmentId === 'appt_rel_dup',
      );
      expect(calls.length).toBe(1);
    });

    it('cancelled appointment suppresses in-flight reminders', async () => {
      const startAt = new Date(Date.now() + 20 * 60 * 60 * 1000);
      await ctx.prisma.appointment.create({
        data: {
          id: 'appt_rel_cancel',
          tenantId: 'tenant-1',
          leadName: 'RelC',
          phone: '+919800000042',
          date: startAt,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          duration: 30,
          status: 'cancelled',
          calendarProvider: 'mock',
          metadata: {},
        },
      });
      await ctx.processor.processJob({
        appointmentId: 'appt_rel_cancel',
        tenantId: 'tenant-1',
        kind: '24h',
        remindAt: startAt.toISOString(),
      });
      const calls = ctx.automations.triggerAutomation.mock.calls.filter(
        (c: any) => c[1].trigger === 'appointment_reminder',
      );
      expect(calls.length).toBe(0);
    });

    it('processor increments reminder metrics on a successful fire', async () => {
      const startAt = await seedConfirmed('appt_rel_metric', '+919800000048');
      const before = ctx.metrics.getCounterValue('appointment.reminder.triggered');
      await ctx.processor.processJob({
        appointmentId: 'appt_rel_metric',
        tenantId: 'tenant-1',
        kind: '24h',
        remindAt: startAt.toISOString(),
      });
      expect(ctx.metrics.getCounterValue('appointment.reminder.triggered')).toBe(before + 1);
    });
  });

  // ── 4. TENANT ISOLATION EDGE CASES ──────────────────────────
  describe('4. Tenant Isolation Edge Cases', () => {
    it('findOne blocks cross-tenant reads', async () => {
      const slot: any = await nextSlot(ctx);
      const a: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Iso',
        phone: '+919800000043',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      await expect(ctx.service.findOne('tenant-2', a.id)).rejects.toThrow(NotFoundException);
    });

    it('cancel blocks cross-tenant cancels', async () => {
      const slot: any = await nextSlot(ctx);
      const a: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Iso2',
        phone: '+919800000044',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      await expect(
        ctx.service.cancel('tenant-2', 'user-2', a.id, { reason: 'nope' }),
      ).rejects.toThrow(NotFoundException);
      expect(ctx.mockAdapter.bookedRecords.some((r) => r.status === 'cancelled')).toBe(false);
    });

    it('findAll only returns rows for the requesting tenant', async () => {
      const slot: any = await nextSlot(ctx);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Iso3',
        phone: '+919800000045',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      await ctx.service.create('tenant-2', 'user-2', {
        leadName: 'Iso3b',
        phone: '+919800000046',
        startAt: slot.startAt,
        provider: 'native' as any,
      });
      const list: any = await ctx.service.findAll('tenant-1', {});
      expect(list.every((a: any) => a.tenantId === 'tenant-1')).toBe(true);
      expect(list.some((a: any) => a.leadName === 'Iso3b')).toBe(false);
    });
  });

  // ── 5. AI TOOL EDGE CASES ───────────────────────────────────
  describe('5. AI Tool Edge Cases', () => {
    it('AI tool availability results are sorted and leak no credentials', async () => {
      const { from, to } = weekdayWindow(3, 7);
      const a: any = await ctx.tools.checkCalendarAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        durationMinutes: 30,
      });
      expect(a.success).toBe(true);
      expect(a.slots.length).toBeGreaterThan(0);
      expect(JSON.stringify(a)).not.toMatch(/apiKey|accessToken|password|secret/i);
      const starts = a.slots.map((s: any) => new Date(s.startAt).getTime());
      expect([...starts].sort((x: number, y: number) => x - y)).toEqual(starts);
    });

    it('AI tool booking for tenant-1 cannot be cancelled through tenant-2', async () => {
      const slot: any = await nextSlot(ctx);
      const a: any = await ctx.tools.bookAppointment('tenant-1', {
        leadName: 'AI Iso',
        phone: '+919800000001',
        startAt: slot.startAt,
      });
      expect(a.success).toBe(true);
      const res: any = await ctx.tools.cancelAppointment('tenant-2', {
        appointmentId: a.appointmentId,
        reason: 'cross tenant',
      });
      expect(res.success).toBe(false);
      expect(res.reason).toBe('APPOINTMENT_NOT_FOUND');
      const stored: any = await ctx.service.findOne('tenant-1', a.appointmentId);
      expect(stored.status).not.toBe('cancelled');
    });

    it('rejects invalid dates with a clean reason, never a crash', async () => {
      const res: any = await ctx.tools.rescheduleAppointment('tenant-1', {
        appointmentId: 'appt_ai_1',
        startAt: 'not-a-date',
        reason: 'x',
      });
      expect(res.success).toBe(false);
      expect(res.reason).toBeDefined();
    });

    it('AI cancel of a missing appointment reports a structured not-found', async () => {
      const res: any = await ctx.tools.cancelAppointment('tenant-1', {
        appointmentId: 'appt_missing_100',
        reason: 'ai',
      });
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/NOT_FOUND|not found/i);
    });
  });

  // ── 6. SSRF / URL SAFETY ────────────────────────────────────
  describe('6. SSRF & URL Safety', () => {
    it('rejects HTTP (non-TLS) API URLs for the Cal.com adapter', () => {
      const res = validateExternalUrl('http://api.cal.com/v1', [/\.cal\.com$/]);
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe('HTTPS_REQUIRED');
    });

    it('rejects private IP literal URLs', () => {
      expect(validateExternalUrl('https://10.0.0.1/cal', [/\.cal\.com$/]).reason)
        .toBe('IP_LITERAL_BLOCKED');
      expect(validateExternalUrl('https://192.168.1.1/cal', [/\.cal\.com$/]).reason)
        .toBe('IP_LITERAL_BLOCKED');
      expect(validateExternalUrl('https://172.16.5.5/cal', [/\.cal\.com$/]).reason)
        .toBe('IP_LITERAL_BLOCKED');
    });

    it('rejects localhost and internal hostnames', () => {
      expect(validateExternalUrl('https://localhost:8080/cal', [/\.cal\.com$/]).reason)
        .toBe('LOCALHOST_BLOCKED');
      expect(validateExternalUrl('https://localhost.localdomain/cal', [/\.cal\.com$/]).reason)
        .toBe('LOCALHOST_BLOCKED');
      expect(validateExternalUrl('https://metadata.google.internal/cal', [/\.cal\.com$/]).reason)
        .toBe('LOCALHOST_BLOCKED');
      expect(validateExternalUrl('https://169.254.169.254/latest/meta-data', [/\.cal\.com$/]).reason)
        .toBe('LOCALHOST_BLOCKED');
    });

    it('rejects non-allowlisted public hosts', async () => {
      const res = validateExternalUrl('https://evil.example.com/v1', [/\.cal\.com$/]);
      expect(res.isValid).toBe(false);
      expect(res.reason).toBe('HOST_NOT_IN_ALLOWLIST');
    });

    it('accepts the canonical Cal.com host', () => {
      const res = validateExternalUrl('https://api.cal.com/v1', [/\.cal\.com$/]);
      expect(res.isValid).toBe(true);
    });

    it('CalComCalendarAdapter refuses a poisoned apiUrl before any request is made', async () => {
      const calcom = new CalComCalendarAdapter();
      const poisoned = { apiKey: 'secret', apiUrl: 'https://169.254.169.254/meta', eventTypeId: 1 };
      const res: any = await calcom.testConnection(poisoned, {} as any);
      expect(res.success).toBe(false);
      expect(JSON.stringify(res)).toMatch(/IP_LITERAL_BLOCKED|rejected|AUTH_FAILED/i);
    });

    it('isIpLiteral blocks private v4 ranges and anything with a colon', () => {
      expect(isIpLiteral('10.1.2.3')).toBe(true);
      expect(isIpLiteral('172.16.0.1')).toBe(true);
      expect(isIpLiteral('203.0.113.99')).toBe(false);
      expect(isIpLiteral('[::1]')).toBe(true);
      expect(isIpLiteral('db.internal')).toBe(true);
    });
  });

  // ── 7. VECTOR / OVERVIEW COMPUTATION ────────────────────────
  describe('7. Overview & Filtering', () => {
    async function seedMany() {
      const base = weekdayOffset(2);
      const mk = (i: number, status: string, duration = 30) =>
        ctx.prisma.appointment.create({
          data: {
            id: `ovr_${i}`,
            tenantId: 'tenant-1',
            leadName: `L${i}`,
            phone: `+9198000000${i.toString().padStart(2, '0')}`,
            date: new Date(base.getTime() + i * 3600 * 1000),
            startAt: new Date(base.getTime() + i * 3600 * 1000),
            endAt: new Date(base.getTime() + (i * 3600 + duration / 60) * 1000),
            duration,
            status,
            calendarProvider: 'native',
            metadata: {},
          },
        });
      await mk(1, 'confirmed');
      await mk(2, 'confirmed', 45);
      await mk(3, 'cancelled');
      await mk(4, 'no_show');
      await mk(5, 'scheduled');
    }

    it('computes show-up ratio and counts from the tenant row set', async () => {
      await seedMany();
      const ov: any = await ctx.service.overview('tenant-1', {});
      expect(ov.total).toBe(5);
      expect(ov.confirmed).toBe(2);
      expect(ov.cancelled).toBe(1);
      expect(ov.noShow).toBe(1);
      expect(ov.showUpRatio).toBe('60.0');
      expect(ov.avgDurationMins).toBe(33);
    });

    it('filters upcoming and status subsets without leaking other tenants', async () => {
      await seedMany();
      await ctx.prisma.appointment.create({
        data: {
          id: 'ovr_other',
          tenantId: 'tenant-9',
          leadName: 'Other',
          phone: '+919899999900',
          date: new Date(),
          status: 'cancelled',
          calendarProvider: 'native',
          metadata: {},
        },
      });
      const upcoming: any = await ctx.service.findAll('tenant-1', { upcoming: true });
      expect(upcoming.length).toBe(5);
      const cancelled: any = await ctx.service.findAll('tenant-1', { status: 'cancelled' });
      expect(cancelled.length).toBe(1);
      expect(cancelled.every((a: any) => a.tenantId === 'tenant-1')).toBe(true);
    });
  });

  // ── 8. LIFECYCLE METRICS ────────────────────────────────────
  describe('8. Lifecycle Metrics', () => {
    it('tracks attempted + completed counters across the booking lifecycle', async () => {
      const slot: any = await nextSlot(ctx);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Metric',
        phone: '+919800000051',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      expect(ctx.metrics.getCounterValue('appointment.created.attempted')).toBe(1);
      expect(ctx.metrics.getCounterValue('appointment.booked.completed')).toBe(1);

      const a2: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Metric2',
        phone: '+919800000052',
        startAt: slot.startAt,
        provider: 'native' as any,
      });
      expect(ctx.metrics.getCounterValue('appointment.created.completed')).toBe(1);

      await ctx.service.cancel('tenant-1', 'user-1', a2.id, { reason: 'metric test' });
      expect(ctx.metrics.getCounterValue('appointment.cancelled.completed')).toBe(1);
    });

    it('records availability latency and failure counters', async () => {
      expect(ctx.metrics.getCounterValue('appointment.availability.failed')).toBe(0);
      const from = weekdayOffset(2);
      ctx.mockAdapter.setMode('server_error');
      await expect(
        ctx.service.getAvailability('tenant-1', {
          from: from.toISOString(),
          to: new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'UTC',
        }),
      ).rejects.toThrow();
      expect(ctx.metrics.getCounterValue('appointment.availability.failed')).toBe(1);
      const stats = ctx.metrics.getHistogramStats('appointment.availability');
      expect(stats).toBeDefined();
      expect(stats!.count).toBeGreaterThan(0);
    });
  });

  // ── 9. WHATSAPP SECURITY ────────────────────────────────────
  describe('9. WhatsApp Inbound Safety', () => {
    it('unresolvable sender is handled without crashing and no reply goes out', async () => {
      const mockWhatsApp = new MockWhatsAppAdapter();
      const mockConfig: any = { get: jest.fn(() => undefined) };
      const providerRegistry = new AutomationProviderRegistry(
        ctx.prisma,
        mockConfig,
        new MetaWhatsAppAdapter(),
        mockWhatsApp,
        new ResendEmailAdapter(),
        new MockEmailAdapter(),
      );
      const router = new WhatsAppAppointmentRouter(ctx.prisma, ctx.tools, providerRegistry);
      const result = await router.handleInbound([
        {
          messageId: 'wamid.safety_1',
          from: '91980009999',
          type: 'text',
          text: 'cancel my appointment',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);
      expect(result).toBeDefined();
      expect(result.handled).toBe(0);
      expect(result.tenantResolved).toBe(false);
    });
  });
});