import { NotFoundException } from '@nestjs/common';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentAgentTools } from '../services/appointment-agent-tools.service';
import { AppointmentReminderQueueService } from '../services/appointment-reminder-queue.service';
import { AppointmentReminderProcessor } from '../processors/appointment-reminder.processor';
import { CalendarProviderRegistry } from '../providers/calendar-provider-registry.service';
import { CalendarErrorFactory } from '../providers/calendar-errors';
import { MockCalendarAdapter } from '../providers/mock-calendar.adapter';
import { CalComCalendarAdapter } from '../providers/calcom.adapter';
import { buildAppointmentContext } from '../lib/appointment-context';
import { WhatsAppAppointmentRouter } from '../../automations/services/whatsapp-appointment.router';
import { AutomationProviderRegistry } from '../../automations/providers/provider-registry.service';
import { MockWhatsAppAdapter } from '../../automations/providers/whatsapp/mock-whatsapp.adapter';
import { MetaWhatsAppAdapter } from '../../automations/providers/whatsapp/whatsapp.adapter';
import { MockEmailAdapter } from '../../automations/providers/email/mock-email.adapter';
import { ResendEmailAdapter } from '../../automations/providers/email/resend.adapter';
import { MetricsService } from '../../../common/services/metrics.service';

/* ── In-memory Prisma double ─────────────────────────────────── */

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

  return { prisma, state, mockAdapter, queue, processor, automations, service, tools, errorFactory };
}

/* ── Helpers ─────────────────────────────────────────────────── */

/** Return a Date that is `offsetDays` from now but lands on a weekday (Mon-Fri). */
function weekdayOffset(offsetDays: number): Date {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
  }
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Return a multi-day window that always covers at least one weekday. */
function weekdayWindow(offsetDays: number, daysSpan = 7): { from: Date; to: Date } {
  const from = weekdayOffset(offsetDays);
  const to = new Date(from.getTime() + daysSpan * 24 * 60 * 60 * 1000);
  return { from, to };
}

/* ── Helper: fetch the first available future slot ───────────── */
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

describe('DAY 17 — Appointment & Scheduling Test Suite', () => {
  let ctx: Ctx;

  beforeEach(async () => {
    ctx = await buildContext();
  });

  afterEach(() => {
    // Drop any pending in-memory reminder timers so jest can exit cleanly.
    const timers = (ctx.queue as any).inMemoryTimers;
    timers.forEach((t: any) => clearTimeout(t));
    timers.clear();
    ctx.mockAdapter.reset();
    process.env.CALCOM_API_KEY = '';
  });

  // ── 1. AVAILABILITY ─────────────────────────────────────────
  describe('1. Availability', () => {
    it('returns sorted business-hour slots for the window', async () => {
      const from = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      from.setUTCHours(0, 0, 0, 0);
      const to = new Date(from.getTime() + 3 * 24 * 60 * 60 * 1000);
      const res: any = await ctx.service.getAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: 'UTC',
        duration: 30,
      });
      expect(res.provider).toBe('mock');
      expect(res.authenticated).toBe(true);
      expect(res.slots.length).toBeGreaterThan(0);
      const starts = res.slots.map((s: any) => new Date(s.startAt).getTime());
      expect([...starts].sort((a: number, b: number) => a - b)).toEqual(starts);
    });

    it('excludes the provider slot already taken by a local appointment', async () => {
      const slot: any = await nextSlot(ctx);
      const startAt = new Date(slot.startAt);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Riya',
        phone: '+919800000001',
        startAt: startAt.toISOString(),
        duration: 30,
        provider: 'auto' as any,
      });
      const from = new Date(startAt.getTime() - 12 * 60 * 60 * 1000);
      const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
      const res: any = await ctx.service.getAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: 'UTC',
        duration: 30,
      });
      const clash = res.slots.some(
        (s: any) => new Date(s.startAt).getTime() === startAt.getTime(),
      );
      expect(clash).toBe(false);
    });

    it('rejects inverted or oversized windows', async () => {
      await expect(
        ctx.service.getAvailability('tenant-1', {
          from: new Date().toISOString(),
          to: new Date(Date.now() - 1000).toISOString(),
          timezone: 'UTC',
        }),
      ).rejects.toThrow();
      await expect(
        ctx.service.getAvailability('tenant-1', {
          from: new Date().toISOString(),
          to: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
          timezone: 'UTC',
        }),
      ).rejects.toThrow();
    });

    it('returns an unauthenticated payload on provider auth failure instead of leaking', async () => {
      const from = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      ctx.mockAdapter.setMode('auth');
      const res: any = await ctx.service.getAvailability('tenant-1', {
        from: from.toISOString(),
        to: new Date(from.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        timezone: 'UTC',
      });
      expect(res.authenticated).toBe(false);
      expect(res.slots).toEqual([]);
    });
  });

  // ── 2. BOOKING ──────────────────────────────────────────────
  describe('2. Booking', () => {
    it('books an external slot and persists provider ids + confirmed status', async () => {
      const slot: any = await nextSlot(ctx);
      const appointment: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Aarav Mehta',
        phone: '+919800000002',
        email: 'aarav@example.com',
        startAt: slot.startAt,
        duration: 30,
        timezone: 'Asia/Kolkata',
        provider: 'auto' as any,
      });
      expect(appointment.status).toBe('confirmed');
      expect(appointment.calendarProvider).toBe('mock');
      expect(appointment.providerAppointmentId).toMatch(/^mock_/);
      expect(appointment.providerBookingUrl).toContain('mock.calendar');
      expect(new Date(appointment.startAt).getTime()).toBe(new Date(slot.startAt).getTime());
    });

    it('will not book a slot the provider already reserved (real provider guard)', async () => {
      const slot: any = await nextSlot(ctx);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Aarav',
        phone: '+919800000003',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      await expect(
        ctx.service.create('tenant-1', 'user-1', {
          leadName: 'Other',
          phone: '+919800000003',
          startAt: slot.startAt,
          provider: 'auto' as any,
        }),
      ).rejects.toThrow(/not available|no longer available/i);
    });

    it('rejects past-dated bookings', async () => {
      await expect(
        ctx.service.create('tenant-1', 'user-1', {
          leadName: 'X',
          phone: '+919800000004',
          startAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        }),
      ).rejects.toThrow('past');
    });

    it('is idempotent: same idempotencyKey returns the same appointment', async () => {
      const slot: any = await nextSlot(ctx);
      const first: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Idem',
        phone: '+919800000005',
        startAt: slot.startAt,
        provider: 'auto' as any,
        idempotencyKey: 'req_test_booking_001',
      });
      const second: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Idem',
        phone: '+919800000005',
        startAt: slot.startAt,
        provider: 'auto' as any,
        idempotencyKey: 'req_test_booking_001',
      });
      expect(second.id).toBe(first.id);
      expect(second.idempotent).toBe(true);
      const bookings = ctx.mockAdapter.bookedRecords.filter((r) => r.status !== 'cancelled');
      expect(bookings.length).toBe(1);
    });

    it('emits the confirmed automation trigger on external booking', async () => {
      const slot: any = await nextSlot(ctx);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Trig',
        phone: '+919800000006',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      const calls = ctx.automations.triggerAutomation.mock.calls.map((c: any) => c[1].trigger);
      expect(calls).toContain('appointment_confirmed');
    });

    it('fires appointment_booked for native (manual) bookings', async () => {
      const slot: any = await nextSlot(ctx);
      await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Native',
        phone: '+919800000007',
        startAt: slot.startAt,
        duration: 30,
        provider: 'native' as any,
      });
      const calls = ctx.automations.triggerAutomation.mock.calls.map((c: any) => c[1].trigger);
      expect(calls).toContain('appointment_booked');
    });

    it('compensates the provider booking when the local persist fails', async () => {
      const slot: any = await nextSlot(ctx);
      ctx.prisma.appointment.create.mockRejectedValueOnce(new Error('db down'));
      await expect(
        ctx.service.create('tenant-1', 'user-1', {
          leadName: 'Fail',
          phone: '+919800000008',
          startAt: slot.startAt,
          provider: 'auto' as any,
        }),
      ).rejects.toThrow('db down');
      const unCancelled = ctx.mockAdapter.bookedRecords.filter((r) => r.status !== 'cancelled');
      expect(unCancelled.length).toBe(0);
    });

    it('fails booking cleanly under provider failure modes (no phantom booking)', async () => {
      const slot: any = await nextSlot(ctx);
      ctx.mockAdapter.setMode('rate_limit');
      await expect(
        ctx.service.create('tenant-1', 'user-1', {
          leadName: 'Fail2',
          phone: '+919800000009',
          startAt: slot.startAt,
          provider: 'auto' as any,
        }),
      ).rejects.toThrow();
      expect(ctx.state.appointments.length).toBe(0);
      expect(ctx.mockAdapter.bookedRecords.length).toBe(0);
    });
  });

  // ── 3. RESCHEDULE & CANCEL ──────────────────────────────────
  describe('3. Reschedule & Cancel', () => {
    async function booked(): Promise<{ id: string }> {
      const slot: any = await nextSlot(ctx);
      const a: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Sched',
        phone: '+919800000010',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      return { id: a.id };
    }

    it('reschedules, keeps it active, and marks rescheduled fields', async () => {
      const { id } = await booked();
      const { from, to } = weekdayWindow(3, 7);
      const avail: any = await ctx.service.getAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        timezone: 'UTC',
        duration: 30,
      });
      const newSlot = avail.slots[1] ?? avail.slots[0];
      expect(newSlot).toBeDefined();

      const updated: any = await ctx.service.reschedule('tenant-1', 'user-1', id, {
        startAt: newSlot.startAt,
        reason: 'Client requested a different day',
      });
      expect(updated.status).toBe('confirmed');
      expect(updated.rescheduledAt).toBeInstanceOf(Date);
      expect(updated.rescheduleReason).toBe('Client requested a different day');
      expect(new Date(updated.startAt).getTime()).toBe(new Date(newSlot.startAt).getTime());

      const triggers = ctx.automations.triggerAutomation.mock.calls.map((c: any) => c[1].trigger);
      expect(triggers).toContain('appointment_rescheduled');
    });

    it('rejects rescheduling a cancelled appointment', async () => {
      const { id } = await booked();
      await ctx.service.cancel('tenant-1', 'user-1', id, { reason: 'client busy' });
      await expect(
        ctx.service.reschedule('tenant-1', 'user-1', id, {
          startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ).rejects.toThrow('cancelled');
    });

    it('cancels at the provider and locally; second cancel is idempotent', async () => {
      const { id } = await booked();
      expect(ctx.mockAdapter.bookedRecords.some((r) => r.status === 'cancelled')).toBe(false);

      const cancelled: any = await ctx.service.cancel('tenant-1', 'user-1', id, {
        reason: 'No longer needed',
      });
      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.cancelledAt).toBeInstanceOf(Date);
      expect(ctx.mockAdapter.bookedRecords.some((r) => r.status === 'cancelled')).toBe(true);

      const again: any = await ctx.service.cancel('tenant-1', 'user-1', id, {});
      expect(again.alreadyCancelled).toBe(true);
    });

    it('blocks cross-tenant access on reschedule (tenant isolation)', async () => {
      const { id } = await booked();
      await expect(
        ctx.service.reschedule('tenant-2', 'user-1', id, {
          startAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('drops pending reminders when the appointment is cancelled', async () => {
      const { id } = await booked();
      const cancelSpy = jest.spyOn(ctx.queue, 'cancelReminders');
      await ctx.service.cancel('tenant-1', 'user-1', id, { reason: 'spy' });
      expect(cancelSpy).toHaveBeenCalledWith(id);
      expect((ctx.queue as any).inMemoryTimers.size).toBe(0);
    });
  });

  // ── 4. REMINDERS ────────────────────────────────────────────
  describe('4. Reminders', () => {
    it('computes 24h/1h reminder windows from the appointment start', () => {
      const startAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const describe = ctx.queue.describeReminders(startAt);
      expect(describe.find((d) => d.kind === '24h')!.scheduled).toBe(true);
      expect(describe.find((d) => d.kind === '1h')!.scheduled).toBe(true);
      const oneHour = describe.find((d) => d.kind === '1h')!;
      expect(new Date(oneHour.remindAt).getTime()).toBe(startAt.getTime() - 60 * 60 * 1000);
    });

    it('skips the 24h reminder when the appointment is under 24h away', () => {
      const startAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const describe = ctx.queue.describeReminders(startAt);
      expect(describe.find((d) => d.kind === '24h')!.scheduled).toBe(false);
      expect(describe.find((d) => d.kind === '1h')!.scheduled).toBe(true);
    });

    it('schedules deterministic job ids for both windows', async () => {
      const appointment = {
        id: 'appt_abc',
        tenantId: 'tenant-1',
        startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      };
      const res = await ctx.queue.scheduleReminders(appointment);
      const ids = res.map((r) => r.jobId);
      expect(ids).toContain('apnt:reminder:appt_abc:24h');
      expect(ids).toContain('apnt:reminder:appt_abc:1h');
    });

    it('processor sends a reminder once and claims the sent field atomically', async () => {
      const startAt = new Date(Date.now() + 30 * 60 * 60 * 1000);
      await ctx.prisma.appointment.create({
        data: {
          id: 'appt_rem_1',
          tenantId: 'tenant-1',
          leadName: 'Rem',
          phone: '+919800000011',
          date: startAt,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          duration: 30,
          status: 'confirmed',
          calendarProvider: 'mock',
          metadata: {},
        },
      });

      await ctx.processor.processJob({
        appointmentId: 'appt_rem_1',
        tenantId: 'tenant-1',
        kind: '24h',
        remindAt: new Date(startAt.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(ctx.automations.triggerAutomation).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ trigger: 'appointment_reminder', appointmentId: 'appt_rem_1' }),
      );
      const stored: any = ctx.state.appointments.find((a: any) => a.id === 'appt_rem_1');
      expect(stored.reminder24hSentAt).toBeInstanceOf(Date);
    });

    it('suppresses the duplicate reminder when another worker already fired it', async () => {
      const startAt = new Date(Date.now() + 30 * 60 * 60 * 1000);
      await ctx.prisma.appointment.create({
        data: {
          id: 'appt_rem_dup',
          tenantId: 'tenant-1',
          leadName: 'Rem2',
          phone: '+919800000012',
          date: startAt,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          duration: 30,
          status: 'confirmed',
          reminder24hSentAt: new Date(),
          metadata: {},
        },
      });

      await ctx.processor.processJob({
        appointmentId: 'appt_rem_dup',
        tenantId: 'tenant-1',
        kind: '24h',
        remindAt: startAt.toISOString(),
      });
      expect(ctx.automations.triggerAutomation).not.toHaveBeenCalled();
    });

    it('skips reminders for cancelled appointments', async () => {
      const startAt = new Date(Date.now() + 30 * 60 * 60 * 1000);
      await ctx.prisma.appointment.create({
        data: {
          id: 'appt_rem_cancelled',
          tenantId: 'tenant-1',
          leadName: 'Rem3',
          phone: '+919800000013',
          date: startAt,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          duration: 30,
          status: 'cancelled',
          metadata: {},
        },
      });
      await ctx.processor.processJob({
        appointmentId: 'appt_rem_cancelled',
        tenantId: 'tenant-1',
        kind: '1h',
        remindAt: startAt.toISOString(),
      });
      expect(ctx.automations.triggerAutomation).not.toHaveBeenCalled();
    });

    it('respects lead DND opt-out before firing the reminder', async () => {
      const startAt = new Date(Date.now() + 30 * 60 * 60 * 1000);
      await ctx.prisma.appointment.create({
        data: {
          id: 'appt_rem_dnd',
          tenantId: 'tenant-1',
          leadName: 'Dnd',
          phone: '+919800000014',
          date: startAt,
          startAt,
          endAt: new Date(startAt.getTime() + 30 * 60000),
          duration: 30,
          status: 'confirmed',
          metadata: {},
        },
      });
      ctx.state.leads.push({
        id: 'lead_dnd_1',
        tenantId: 'tenant-1',
        phone: '+919800000014',
        name: 'Dnd',
        metadata: { optOut: true },
      });
      await ctx.processor.processJob({
        appointmentId: 'appt_rem_dnd',
        tenantId: 'tenant-1',
        kind: '1h',
        remindAt: startAt.toISOString(),
      });
      expect(ctx.automations.triggerAutomation).not.toHaveBeenCalled();
    });
  });

  // ── 5. AI TOOLS ─────────────────────────────────────────────
  describe('5. AI Scheduling Tools', () => {
    it('returns slots for checkCalendarAvailability', async () => {
      const { from, to } = weekdayWindow(2, 7);
      const res: any = await ctx.tools.checkCalendarAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        durationMinutes: 30,
      });
      expect(res.success).toBe(true);
      expect(res.slots.length).toBeGreaterThan(0);
    });

    it('books via bookAppointment and reports confirmation', async () => {
      const { from, to } = weekdayWindow(2, 7);
      const avail: any = await ctx.tools.checkCalendarAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        durationMinutes: 30,
      });
      const res: any = await ctx.tools.bookAppointment('tenant-1', {
        leadName: 'AI Booked',
        phone: '+919800000015',
        email: 'ai@example.com',
        startAt: avail.slots[0].startAt,
      });
      expect(res.success).toBe(true);
      expect(res.status).toBe('confirmed');
    });

    it('rejects the tool call when the slot is gone (no invented confirmation)', async () => {
      const { from, to } = weekdayWindow(2, 7);
      const avail: any = await ctx.tools.checkCalendarAvailability('tenant-1', {
        from: from.toISOString(),
        to: to.toISOString(),
        durationMinutes: 30,
      });
      const slot = avail.slots[0];
      await ctx.tools.bookAppointment('tenant-1', {
        leadName: 'Taker',
        phone: '+919800000016',
        startAt: slot.startAt,
      });
      const res: any = await ctx.tools.bookAppointment('tenant-1', {
        leadName: 'Lose',
        phone: '+919800000017',
        startAt: slot.startAt,
      });
      expect(res.success).toBe(false);
      expect(res.reason).toMatch(/UNAVAILABLE|SLOT_CONFLICT/);
    });

    it('returns MISSING_REQUIRED_FIELDS when phone/leadName/startAt are absent', async () => {
      const res: any = await ctx.tools.bookAppointment('tenant-1', {} as any);
      expect(res.success).toBe(false);
      expect(res.reason).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  // ── 6. WHATSAPP INBOUND ─────────────────────────────────────
  describe('6. WhatsApp Appointment Assistant', () => {
    let router: WhatsAppAppointmentRouter;
    let mockWhatsApp: MockWhatsAppAdapter;

    beforeEach(() => {
      mockWhatsApp = new MockWhatsAppAdapter();
      const metaWhatsApp = new MetaWhatsAppAdapter();
      const resendEmail = new ResendEmailAdapter();
      const mockEmail = new MockEmailAdapter();
      const mockConfig: any = { get: jest.fn(() => undefined) };
      const providerRegistry = new AutomationProviderRegistry(
        ctx.prisma,
        mockConfig,
        metaWhatsApp,
        mockWhatsApp,
        resendEmail,
        mockEmail,
      );
      router = new WhatsAppAppointmentRouter(ctx.prisma, ctx.tools, providerRegistry);
    });

    it('detects intents', () => {
      expect(router.detectIntent('cancel my appointment please')).toBe('cancel');
      expect(router.detectIntent('Can I move it to tomorrow?')).toBe('reschedule');
      expect(router.detectIntent('what time is my appointment')).toBe('lookup');
      expect(router.detectIntent('I want to book now')).toBe('book');
      expect(router.detectIntent('hello there')).toBe('help');
    });

    it('cancels an upcoming appointment and replies via the tenant WhatsApp provider (mock)', async () => {
      const slot: any = await nextSlot(ctx);
      const appointment: any = await ctx.service.create('tenant-1', 'user-1', {
        leadName: 'Wa Lead',
        phone: '+919800000018',
        startAt: slot.startAt,
        provider: 'auto' as any,
      });
      ctx.state.leads.push({
        id: 'lead_wa_1',
        tenantId: 'tenant-1',
        phone: '+919800000018',
        name: 'Wa Lead',
        metadata: {},
      });

      const result = await router.handleInbound([
        {
          messageId: 'wamid.inbound_1',
          from: '919800000018',
          type: 'text',
          text: 'cancel my appointment',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);

      expect(result.handled).toBe(1);
      expect(result.tenantResolved).toBe(true);
      expect(mockWhatsApp.sentMessages.length).toBe(1);
      expect(mockWhatsApp.sentMessages[0].options.to).toBe('919800000018');
      expect(mockWhatsApp.sentMessages[0].options.textBody).toContain('cancelled');

      const stored: any = ctx.state.appointments.find((a: any) => a.id === appointment.id);
      expect(stored.status).toBe('cancelled');
    });

    it('returns a helpful response when the sender has no appointment', async () => {
      ctx.state.leads.push({
        id: 'lead_wa_2',
        tenantId: 'tenant-1',
        phone: '+919800000019',
        name: 'No Appt',
        metadata: {},
      });
      const result = await router.handleInbound([
        {
          messageId: 'wamid.inbound_2',
          from: '919800000019',
          type: 'text',
          text: 'what time is my appointment',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);
      expect(result.handled).toBe(1);
      expect(mockWhatsApp.sentMessages[0].options.textBody).toContain('could not find any upcoming appointment');
    });

    it('ignores DND leads silently (no reply, not intended for them)', async () => {
      ctx.state.leads.push({
        id: 'lead_wa_3',
        tenantId: 'tenant-1',
        phone: '+919800000021',
        name: 'Dnd Wa',
        metadata: { optOut: true },
      });
      const result = await router.handleInbound([
        {
          messageId: 'wamid.inbound_3',
          from: '919800000021',
          type: 'text',
          text: 'book an appointment',
          timestamp: Math.floor(Date.now() / 1000),
        },
      ]);
      expect(result.tenantResolved).toBe(true);
      expect(result.handled).toBe(0);
      expect(mockWhatsApp.sentMessages.length).toBe(0);
    });
  });

  // ── 7. SECURITY & ERRORS ────────────────────────────────────
  describe('7. Security & Error Normalization', () => {
    it('maps provider errors to canonical, non-leaking HTTP codes', async () => {
      const shape = ctx.errorFactory.toShape({
        code: 'CALENDAR_AUTH_FAILED' as any,
        message: 'apiKey=super-secret leaked',
        isRetryable: false,
      });
      const http = ctx.errorFactory.toHttpException(shape);
      expect(http.getStatus()).toBe(401);
      const body: any = http.getResponse();
      expect(body.message).toBe('Calendar provider authentication failed. Re-link the provider from Settings.');
      expect(JSON.stringify(body)).not.toContain('super-secret');
    });

    it('never serializes raw provider credentials in tool results', async () => {
      const res: any = await ctx.tools.checkCalendarAvailability('tenant-1', {
        from: new Date().toISOString(),
        to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(JSON.stringify(res)).not.toMatch(/apiKey|accessToken|password|secret/i);
    });
  });

  // ── 8. TEMPLATE CONTEXT ─────────────────────────────────────
  describe('8. Appointment Template Context', () => {
    it('formats date/time in the appointment timezone', () => {
      const startAt = new Date('2026-09-10T04:00:00.000Z');
      const a: any = {
        id: 'appt_ctx',
        leadName: 'Ctx',
        phone: '+919800000022',
        email: null,
        topic: 'Demo',
        date: startAt,
        startAt,
        endAt: new Date(startAt.getTime() + 30 * 60000),
        duration: 30,
        status: 'confirmed',
        timezone: 'Asia/Kolkata',
        location: 'Zoom',
        providerBookingUrl: 'https://mock.calendar/booking/1',
      };
      const ctx2 = buildAppointmentContext(a);
      expect(ctx2.time).toBe('09:30 AM');
      expect(ctx2.timezone).toBe('Asia/Kolkata');
      expect(ctx2.bookingUrl).toBe('https://mock.calendar/booking/1');
      expect(ctx2.durationMinutes).toBe(30);
    });
  });
});