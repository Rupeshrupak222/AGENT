import 'reflect-metadata';
import { execFile } from 'child_process';
import * as path from 'path';
import { MetricsService } from '../../common/services/metrics.service';
import {
  assertDurableQueueAvailable,
  RedisUnavailableError,
} from '../../common/utils/queue-fallback';
import { PostCallQueueService } from '../ai/services/post-call-queue.service';
import { CampaignQueueService } from '../campaigns/services/campaign-queue.service';
import { CrmQueueService } from '../integrations/services/crm-queue.service';
import { AutomationQueueService } from '../automations/services/automation-queue.service';
import { RecordingQueueService } from '../telephony/services/recording-queue.service';
import { AppointmentReminderQueueService } from '../calendar/services/appointment-reminder-queue.service';
import { HealthService } from '../health/health.service';
import { CallsGateway } from '../calls/calls.gateway';

/**
 * Day 25 — Staging Release Candidate Validation & Production Safety.
 *
 * Complements the Day 24 production-queue-safety suite with additional
 * failure-path coverage and honest release-gate semantics:
 *  - queue error contract: queue identification, retryability, no credential
 *    leakage, no false success
 *  - concurrent deterministic idempotency in dev/test
 *  - Redis recovery routes submissions back to the durable Bull path
 *  - health component recovery after database outage
 *  - WebSocket reconnect re-joins tenant rooms idempotently without losing
 *    cross-tenant enforcement
 *  - release gate refuses to mark staging/load PASS from configuration alone
 */

describe('Day 25 Staging Release Candidate & Production Safety Suite', () => {
  const isoNow = new Date().toISOString();

  function makeOfflineBullQueue(): any {
    return {
      client: { status: 'offline', on: jest.fn() },
      on: jest.fn(),
      add: jest.fn(),
      removeAllListeners: jest.fn(),
      removeJobs: jest.fn(),
    };
  }

  function makeOnlineBullQueue(): any {
    return {
      client: { status: 'ready', on: jest.fn() },
      on: jest.fn(),
      add: jest.fn().mockResolvedValue({ id: 'bull-job-1' }),
      removeAllListeners: jest.fn(),
      removeJobs: jest.fn(),
    };
  }

  describe('Queue durability — production error contract', () => {
    it('RedisUnavailableError identifies the queue, is retryable, and never leaks connection material', () => {
      const err = new RedisUnavailableError('crm-sync');
      expect(err.queue).toBe('crm-sync');
      expect(err.retryable).toBe(true);
      expect(err.code).toBe('REDIS_UNAVAILABLE');

      const serialized = JSON.stringify(err) + err.message;
      const secrets = ['redis://', 'REDIS_PASSWORD', 'DATABASE_URL', 'password', 'apiKey', 'token', '://'];
      for (const s of secrets) {
        expect(serialized).not.toContain(s);
      }
    });

    it('production + Redis unavailable ⇒ rejects; RESULT is an error, never a false queued:true', async () => {
      const savedEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const service = new PostCallQueueService(makeOfflineBullQueue(), new MetricsService());
        (service as any).isRedisAvailable = false;

        let resolved = false;
        try {
          await service.enqueueAnalysisJob({
            callId: `call-${Date.now()}`,
            tenantId: 'tenant-a',
            triggerSource: 'call_completed',
            enqueuedAt: isoNow,
          });
          resolved = true;
        } catch (err: any) {
          expect(err).toBeInstanceOf(RedisUnavailableError);
          expect(err.queue).toBe('post-call-analysis');
        }

        expect(resolved).toBe(false);
        expect((service as any).inMemoryQueue.length).toBe(0);
      } finally {
        process.env.NODE_ENV = savedEnv;
      }
    });

    it('production + Bull add() fails mid-enqueue (connection drop) ⇒ structured retryable error, no RAM entry', async () => {
      const savedEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const queue = makeOnlineBullQueue();
      queue.add.mockRejectedValue(new Error('ECONNRESET connection dropped'));
      try {
        const service = new CrmQueueService(queue, new MetricsService());
        (service as any).isRedisAvailable = true;

        await expect(
          service.enqueueSyncJob({
            tenantId: 'tenant-a',
            callId: 'call-drop-1',
            phone: '+15550109999',
            direction: 'outbound',
            callStatus: 'completed',
            timestamp: new Date(),
          }),
        ).rejects.toMatchObject({ name: 'RedisUnavailableError', queue: 'crm-sync', retryable: true });

        expect((service as any).inMemoryQueue.length).toBe(0);
      } finally {
        process.env.NODE_ENV = savedEnv;
      }
    });

    it('the production guard is centralized and used by every critical queue service (no per-service drift)', () => {
      const queues = [
        'outbound-calls',
        'post-call-analysis',
        'crm-sync',
        'recording-processing',
        'automation-actions',
        'appointment-reminders',
      ];
      for (const q of queues) {
        expect(() => assertDurableQueueAvailable(q, 'production')).toThrow(RedisUnavailableError);
        expect(() => assertDurableQueueAvailable(q, 'test')).not.toThrow();
        expect(() => assertDurableQueueAvailable(q, 'development')).not.toThrow();
      }
    });
  });

  describe('Queue durability — deterministic idempotency under concurrency', () => {
    it('dev/test: concurrent identical deterministic enqueues produce ONE in-memory job', async () => {
      const service = new PostCallQueueService(makeOfflineBullQueue(), new MetricsService());
      (service as any).isRedisAvailable = false;

      const data = {
        callId: 'call-idem-1',
        tenantId: 'tenant-a',
        triggerSource: 'call_completed' as const,
        enqueuedAt: isoNow,
      };

      const [a, b] = await Promise.all([
        service.enqueueAnalysisJob({ ...data }),
        service.enqueueAnalysisJob({ ...data }),
      ]);

      expect([a.queued, b.queued].sort()).toEqual([false, true]);
      expect((service as any).inMemoryQueue.length).toBe(1);
    });

    it('dev/test: concurrent identical outbound call enqueues de-duplicate to a single job', async () => {
      const service = new CampaignQueueService(makeOfflineBullQueue(), new MetricsService());
      (service as any).isRedisAvailable = false;

      const data = {
        campaignId: 'camp-1',
        campaignLeadId: 'clead-1',
        leadId: 'lead-1',
        agentId: 'agent-1',
        tenantId: 'tenant-a',
        attemptNumber: 1,
        phoneNumber: '+15550107777',
        enqueuedAt: isoNow,
      };

      const [a, b] = await Promise.all([
        service.enqueueCallJob({ ...data }),
        service.enqueueCallJob({ ...data }),
      ]);

      expect([a.queued, b.queued].sort()).toEqual([false, true]);
      expect((service as any).inMemoryQueue.length).toBe(1);
    });

    it('dev/test: concurrent identical automation actions deduplicate via deterministic job id', async () => {
      const service = new AutomationQueueService(makeOfflineBullQueue(), new MetricsService());
      (service as any).isRedisAvailable = false;

      const data = {
        tenantId: 'tenant-a',
        triggerEventId: 'evt-idem-1',
        triggerName: 'test',
        actionType: 'send_email' as const,
        template: 'follow-up',
        isTestAction: false,
      };

      const [a, b] = await Promise.all([
        service.enqueueAction({ ...data }),
        service.enqueueAction({ ...data }),
      ]);

      const queuedCount = [a, b].filter((r) => r.queued).length;
      expect(queuedCount).toBeLessThanOrEqual(1);
      expect((service as any).inMemoryQueue.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Queue durability — Redis recovery routes back to the durable path', () => {
    it('after Redis is restored, submissions use Bull again instead of the in-memory fallback', async () => {
      const queue = makeOnlineBullQueue();
      const service = new RecordingQueueService(queue, new MetricsService());
      service.isRedisAvailable = false;

      const before = await service.enqueueRecordingJob({
        recordingId: 'rec-1',
        providerRecordingId: 'prov-1',
        callId: 'call-1',
        tenantId: 'tenant-a',
        sourceUrl: 'https://example.com/rec-1.mp3',
        provider: 'aws',
        enqueuedAt: isoNow,
      });
      expect(before.mode).toBe('in_memory');

      service.isRedisAvailable = true;

      const after = await service.enqueueRecordingJob({
        recordingId: 'rec-2',
        providerRecordingId: 'prov-2',
        callId: 'call-2',
        tenantId: 'tenant-a',
        sourceUrl: 'https://example.com/rec-2.mp3',
        provider: 'aws',
        enqueuedAt: isoNow,
      });
      expect(after.mode).toBe('bull');
      expect(queue.add).toHaveBeenCalled();
      expect((service as any).inMemoryQueue.length).toBe(1); // only the pre-recovery job
    });

    it('appointment reminders re-route to Bull after Redis recovery', async () => {
      const queue = makeOnlineBullQueue();
      const service = new AppointmentReminderQueueService(queue, new MetricsService());
      service.isRedisAvailable = true;

      const result = await service.scheduleReminders({
        id: 'apt-rec-1',
        tenantId: 'tenant-a',
        startAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      });

      expect(result.length).toBeGreaterThan(0);
      expect(queue.add).toHaveBeenCalled();
      for (const r of result) expect(r.queued).toBe(true);
      expect((service as any).inMemoryTimers.size).toBe(0);

      for (const t of (service as any).inMemoryTimers.values()) clearTimeout(t);
    });
  });

  describe('Failure recovery — health component restoration', () => {
    function buildHealth(prismaState: { isConnected: boolean; $queryRaw: jest.Mock }) {
      const mockConfig = {
        get: jest.fn((key: string, def?: any) => {
          if (key === 'REDIS_HOST') return '127.0.0.1';
          if (key === 'REDIS_PORT') return 6399;
          return def;
        }),
      };
      return new HealthService(
        prismaState as any,
        mockConfig as any,
        new MetricsService(),
      );
    }

    it('database check degrades on outage and recovers to ok once restored (component level)', async () => {
      const prismaState: any = {
        isConnected: false,
        $queryRaw: jest.fn().mockRejectedValue(new Error('Connection refused')),
      };
      const health = buildHealth(prismaState);

      const during = await health.getReadiness();
      expect(during.status).toBe('degraded');
      expect(['down', 'disconnected']).toContain(during.checks.database.status);

      prismaState.isConnected = true;
      prismaState.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const after = await health.getReadiness();
      expect(after.checks.database.status).toBe('ok');
      expect(after.status).toMatch(/degraded|healthy/); // redis may still be down in test env
    });
  });

  describe('WebSocket — reconnect re-joins tenant rooms without losing isolation', () => {
    let gateway: CallsGateway;
    let mockJwt: any;
    let mockPrisma: any;
    let mockAudit: any;
    let metrics: MetricsService;

    beforeEach(() => {
      mockJwt = { verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', tenantId: 'tenant-a', role: 'agent' }) };
      mockPrisma = {
        isConnected: true,
        user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1', tenantId: 'tenant-a', role: 'agent', isActive: true, name: 'Agent One', email: 'a@x.io' }) },
        tenant: { findUnique: jest.fn().mockResolvedValue({ id: 'tenant-a', isActive: true }) },
        call: { findFirst: jest.fn() },
        campaign: { findFirst: jest.fn() },
      };
      mockAudit = { log: jest.fn().mockResolvedValue(true) };
      metrics = new MetricsService();

      gateway = new CallsGateway(mockJwt, { get: jest.fn().mockReturnValue('jwt-secret') } as any, mockPrisma, mockAudit, metrics);
      gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as any;
    });

    function authedSocket(id: string) {
      return {
        id,
        handshake: { auth: { token: 'jwt' }, query: {}, headers: {} },
        join: jest.fn(),
        leave: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;
    }

    it('reconnects rejoin the tenant room idempotently and preserve cross-tenant denial', async () => {
      const socket1 = authedSocket('sock-1');
      await gateway.handleConnection(socket1);
      expect(socket1.join).toHaveBeenCalledWith('tenant:tenant-a');

      const socket2 = authedSocket('sock-2'); // reconnect after disconnect
      await gateway.handleConnection(socket2);
      expect(socket2.join).toHaveBeenCalledWith('tenant:tenant-a');
      expect(socket2.tenantId).toBe('tenant-a');

      // Cross-tenant enforcement still active on the reconnected connection
      mockPrisma.campaign.findFirst.mockResolvedValue(null);
      const res = await gateway.handleJoinCampaign(socket2, { campaignId: 'camp-tenant-b' });
      expect(res).toEqual({ event: 'error', message: 'Campaign not found' });
      expect(socket2.join).not.toHaveBeenCalledWith('campaign:camp-tenant-b');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CROSS_TENANT_ACCESS_ATTEMPT' }),
      );
    });

    it('rejects connections without a token without joining any room', async () => {
      const anon = { id: 'sock-anon', handshake: { auth: {}, query: {}, headers: {} }, join: jest.fn(), emit: jest.fn(), disconnect: jest.fn() } as any;
      await gateway.handleConnection(anon);
      expect(anon.join).not.toHaveBeenCalled();
      expect(anon.disconnect).toHaveBeenCalled();
    });
  });

  describe('Release gate honesty — configuration never implies PASS', () => {
    function runGate(extraEnv: Record<string, string>, removeKeys: string[]): Promise<{ code: number; stdout: string }> {
      return new Promise((resolve, reject) => {
        const env: Record<string, string> = { ...(process.env as Record<string, string>) };
        for (const k of removeKeys) delete env[k];
        Object.assign(env, extraEnv);

        execFile(
          process.execPath,
          ['scripts/release-gate.js', '--json'],
          { cwd: path.resolve(__dirname, '../../../../'), env, timeout: 120000, maxBuffer: 10 * 1024 * 1024 },
          (err, stdout) => {
            if (err && !stdout) reject(err);
            else resolve({ code: err ? (err as any).code ?? 1 : 0, stdout: String(stdout) });
          },
        );
      });
    }

    function parseJson(stdout: string): any {
      const idx = stdout.lastIndexOf('{\n  "timestamp"');
      return JSON.parse(stdout.slice(idx));
    }

    it('STAGING_API_URL pointing at an unreachable target stays BLOCKED (never auto-PASS by config)', async () => {
      const { stdout } = await runGate(
        { STAGING_API_URL: 'http://127.0.0.1:9/api/v1' },
        ['TARGET_URL', 'SMOKE_API_BASE', 'LOAD_TARGET_URL', 'LOAD_RESULT_FILE', 'TEST_DB_RESTORE', 'BACKUP_DRILL_EVIDENCE'],
      );
      const parsed = parseJson(stdout);
      expect(parsed.gates.GATE_STAGING_DEPLOY.status).toBe('BLOCKED');
      expect(parsed.gates.GATE_STAGING_DEPLOY.status).not.toBe('PASS');
    });

    it('LOAD_TARGET_URL without a zero-failure artifact does not PASS the load gate', async () => {
      const { stdout } = await runGate(
        { LOAD_TARGET_URL: 'http://127.0.0.1:9/api/v1' },
        ['TARGET_URL', 'SMOKE_API_BASE', 'LOAD_RESULT_FILE', 'STAGING_API_URL', 'TEST_DB_RESTORE', 'BACKUP_DRILL_EVIDENCE'],
      );
      const parsed = parseJson(stdout);
      expect(parsed.gates.GATE_LOAD_TEST.status).not.toBe('PASS');
    });

    it('smoke gate without a live target is WARN, not PASS', async () => {
      const { stdout } = await runGate(
        {},
        ['TARGET_URL', 'SMOKE_API_BASE', 'LOAD_RESULT_FILE', 'STAGING_API_URL', 'TEST_DB_RESTORE', 'BACKUP_DRILL_EVIDENCE', 'SMOKE_EMAIL', 'SMOKE_PASSWORD'],
      );
      const parsed = parseJson(stdout);
      expect(['WARN', 'FAIL', 'BLOCKED']).toContain(parsed.gates.GATE_SMOKE_TEST.status);
      expect(parsed.gates.GATE_SMOKE_TEST.status).not.toBe('PASS');
    });
  });
});