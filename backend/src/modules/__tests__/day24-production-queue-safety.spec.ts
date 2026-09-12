import 'reflect-metadata';
import { MetricsService } from '../../common/services/metrics.service';
import {
  assertDurableQueueAvailable,
  isProductionQueueFallbackForbidden,
  RedisUnavailableError,
} from '../../common/utils/queue-fallback';
import { PostCallQueueService } from '../ai/services/post-call-queue.service';
import { CrmQueueService } from '../integrations/services/crm-queue.service';
import { CampaignQueueService } from '../campaigns/services/campaign-queue.service';
import { RecordingQueueService } from '../telephony/services/recording-queue.service';
import { AutomationQueueService } from '../automations/services/automation-queue.service';
import { AppointmentReminderQueueService } from '../calendar/services/appointment-reminder-queue.service';

/**
 * Day 24 — Production Redis Durability Safety
 *
 * Rule under test: in NODE_ENV=production, a missing/failed Redis MUST NOT
 * silently convert a durable business workflow (post-call analysis, CRM sync,
 * outbound calls, recording processing, automation actions, appointment
 * reminders) into a RAM-only queue. Submission must be rejected with a
 * structured, retryable error so the orchestrator / operator can restore
 * Redis. Development/test retain the deterministic in-memory fallback.
 */

describe('Day 24 Production Redis Durability Safety Suite', () => {
  describe('queue-fallback gating utility', () => {
    it('forbids in-memory fallback only for NODE_ENV=production', () => {
      expect(isProductionQueueFallbackForbidden('production')).toBe(true);
      expect(isProductionQueueFallbackForbidden('test')).toBe(false);
      expect(isProductionQueueFallbackForbidden('development')).toBe(false);
      expect(isProductionQueueFallbackForbidden(undefined)).toBe(false);
      expect(isProductionQueueFallbackForbidden('staging')).toBe(false);
    });

    it('throws a structured retryable RedisUnavailableError in production', () => {
      expect(() => assertDurableQueueAvailable('crm-sync', 'production')).toThrow(
        RedisUnavailableError,
      );
      try {
        assertDurableQueueAvailable('outbound-calls', 'production');
        throw new Error('expected assertDurableQueueAvailable to throw');
      } catch (err: any) {
        expect(err).toBeInstanceOf(RedisUnavailableError);
        expect(err.code).toBe('REDIS_UNAVAILABLE');
        expect(err.retryable).toBe(true);
        expect(err.queue).toBe('outbound-calls');
        expect(err.message).toMatch(/Redis unavailable/);
        expect(err.message).toMatch(/restore Redis/);
      }
    });

    it('allows in-memory fallback in development/test without throwing', () => {
      expect(() => assertDurableQueueAvailable('crm-sync', 'test')).not.toThrow();
      expect(() => assertDurableQueueAvailable('crm-sync', 'development')).not.toThrow();
      expect(() => assertDurableQueueAvailable('crm-sync', undefined)).not.toThrow();
    });
  });

  function makeOfflineBullQueue(): any {
    return {
      client: { status: 'offline', on: jest.fn() },
      on: jest.fn(),
      add: jest.fn(),
      removeAllListeners: jest.fn(),
      removeJobs: jest.fn(),
    };
  }

  function makeFailingBullQueue(): any {
    return {
      client: { status: 'ready', on: jest.fn() },
      on: jest.fn(),
      add: jest.fn().mockRejectedValue(new Error('ECONNREFUSED ::1')),
      removeAllListeners: jest.fn(),
      removeJobs: jest.fn(),
    };
  }

  const isoNow = new Date().toISOString();

  const outboundJob = {
    campaignId: 'camp-1',
    campaignLeadId: 'clead-1',
    leadId: 'lead-1',
    agentId: 'agent-1',
    tenantId: 'tenant-a',
    attemptNumber: 1,
    phoneNumber: '+15550100000',
    enqueuedAt: isoNow,
  };
  const analysisJob = {
    callId: 'call-1',
    tenantId: 'tenant-a',
    triggerSource: 'call_completed' as const,
    enqueuedAt: isoNow,
  };
  const crmJob = {
    tenantId: 'tenant-a',
    callId: 'call-1',
    phone: '+15550100000',
    direction: 'outbound' as const,
    callStatus: 'completed',
    timestamp: new Date(),
  };
  const recordingJob = {
    recordingId: 'rec-1',
    providerRecordingId: 'prov-rec-1',
    callId: 'call-1',
    tenantId: 'tenant-a',
    sourceUrl: 'https://example.s3.amazonaws.com/rec-1.mp3',
    provider: 'aws',
    enqueuedAt: isoNow,
  };
  const automationJob = {
    tenantId: 'tenant-a',
    triggerEventId: 'evt-1',
    triggerName: 'test-trigger',
    actionType: 'send_email' as const,
    template: 'follow-up',
    isTestAction: false,
  };
  const appointmentForReminder = {
    id: 'apt-1',
    tenantId: 'tenant-a',
    startAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
  };

  describe.each([
    {
      name: 'post-call-analysis (PostCallQueueService)',
      build: (q: any, m: MetricsService) => new PostCallQueueService(q, m),
      invoke: (svc: any, env: 'prod' | 'dev') =>
        env === 'prod'
          ? svc.enqueueAnalysisJob({ ...analysisJob, callId: `call-${Date.now()}` })
          : svc.enqueueAnalysisJob({ ...analysisJob, callId: `call-dev-${Date.now()}` }),
    },
    {
      name: 'crm-sync (CrmQueueService)',
      build: (q: any, m: MetricsService) => new CrmQueueService(q, m),
      invoke: (svc: any, env: 'prod' | 'dev') =>
        env === 'prod'
          ? svc.enqueueSyncJob({ ...crmJob, callId: `crm-${Date.now()}` })
          : svc.enqueueSyncJob({ ...crmJob, callId: `crm-dev-${Date.now()}` }),
    },
    {
      name: 'outbound-calls (CampaignQueueService)',
      build: (q: any, m: MetricsService) => new CampaignQueueService(q, m),
      invoke: (svc: any, env: 'prod' | 'dev') =>
        env === 'prod'
          ? svc.enqueueCallJob({ ...outboundJob, leadId: `lead-${Date.now()}` })
          : svc.enqueueCallJob({ ...outboundJob, leadId: `lead-dev-${Date.now()}` }),
    },
    {
      name: 'recording-processing (RecordingQueueService)',
      build: (q: any, m: MetricsService) => new RecordingQueueService(q, m),
      invoke: (svc: any, env: 'prod' | 'dev') =>
        env === 'prod'
          ? svc.enqueueRecordingJob({ ...recordingJob, recordingId: `rec-${Date.now()}` })
          : svc.enqueueRecordingJob({ ...recordingJob, recordingId: `rec-dev-${Date.now()}` }),
    },
    {
      name: 'automation-actions (AutomationQueueService)',
      build: (q: any, m: MetricsService) => new AutomationQueueService(q, m),
      invoke: (svc: any, env: 'prod' | 'dev') =>
        env === 'prod'
          ? svc.enqueueAction({ ...automationJob, triggerEventId: `evt-${Date.now()}` })
          : svc.enqueueAction({ ...automationJob, triggerEventId: `evt-dev-${Date.now()}` }),
    },
    {
      name: 'appointment-reminders (AppointmentReminderQueueService)',
      build: (q: any, m: MetricsService) => new AppointmentReminderQueueService(q, m),
      invoke: (svc: any, env: 'prod' | 'dev') =>
        env === 'prod'
          ? svc.scheduleReminders({ ...appointmentForReminder, id: `apt-${Date.now()}` })
          : svc.scheduleReminders({ ...appointmentForReminder, id: `apt-dev-${Date.now()}` }),
    },
  ])('$name', ({ name, build, invoke }) => {
    const savedEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = savedEnv;
    });

    it('production + offline Redis ⇒ structured retryable error, no in-memory job stored', async () => {
      process.env.NODE_ENV = 'production';
      const service = build(makeOfflineBullQueue(), new MetricsService());
      (service as any).isRedisAvailable = false;

      await expect(invoke(service, 'prod')).rejects.toMatchObject({
        name: 'RedisUnavailableError',
        code: 'REDIS_UNAVAILABLE',
        retryable: true,
      });

      const inMem: unknown[] = (service as any).inMemoryQueue ?? [];
      expect(inMem.length).toBe(0);
    });

    it('production + Bull add failure ⇒ durable submission rejected, no RAM-only fallback', async () => {
      process.env.NODE_ENV = 'production';
      const service = build(makeFailingBullQueue(), new MetricsService());
      (service as any).isRedisAvailable = true;

      await expect(invoke(service, 'prod')).rejects.toMatchObject({
        name: 'RedisUnavailableError',
        code: 'REDIS_UNAVAILABLE',
        retryable: true,
      });

      const inMem: unknown[] = (service as any).inMemoryQueue ?? [];
      expect(inMem.length).toBe(0);
    });

    it('dev/test + offline Redis ⇒ deterministic in-memory fallback remains available', async () => {
      process.env.NODE_ENV = 'test';
      const service = build(makeOfflineBullQueue(), new MetricsService());
      (service as any).isRedisAvailable = false;

      const result = await invoke(service, 'dev');
      if (Array.isArray(result)) {
        expect(result.length).toBeGreaterThan(0);
        for (const r of result) {
          expect(r.queued).toBe(true);
        }
      } else if (result && typeof result === 'object') {
        expect(result.queued).toBe(true);
      }

      const timers: Map<string, any> | undefined = (service as any).inMemoryTimers;
      if (timers) {
        for (const t of timers.values()) clearTimeout(t);
        timers.clear();
      }
    });
  });

  describe('readiness degradation contract (Redis down ⇒ degraded)', () => {
    it('records a RedisUnavailableError with a queue name and retryable=true for operator alerting', () => {
      const err = new RedisUnavailableError('crm-sync');
      expect(err.name).toBe('RedisUnavailableError');
      expect(err.stack).toBeDefined();
      expect(String(err).includes('crm-sync')).toBe(true);
      expect(err.retryable).toBe(true);
    });
  });
});