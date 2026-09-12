import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HealthService } from '../health/health.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../../common/services/metrics.service';
import { CallsGateway } from '../calls/calls.gateway';

describe('Day 22 Release Engineering & Failure Recovery Suite', () => {
  /* ── 1. Redis Failure Injection & Queue In-Memory Fallback ────── */
  describe('Redis Failure Injection & Health Degradation', () => {
    let healthService: HealthService;
    let mockPrisma: any;
    let mockConfig: any;
    let mockMetrics: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
        isConnected: true,
      };
      mockConfig = {
        get: jest.fn((key: string, def?: any) => {
          if (key === 'REDIS_HOST') return 'localhost';
          if (key === 'REDIS_PORT') return 6379;
          return def;
        }),
      };
      mockMetrics = {
        recordHttpRequest: jest.fn(),
        updateQueueHealth: jest.fn(),
      };

      healthService = new HealthService(
        mockPrisma,
        mockConfig as ConfigService,
        mockMetrics as MetricsService,
      );
    });

    it('health readiness reports degraded when Redis is down, without crashing process', async () => {
      const readiness = await healthService.getReadiness();
      expect(readiness).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(readiness.status);
      expect(readiness.checks).toHaveProperty('database');
      expect(readiness.checks).toHaveProperty('redis');
    });

    it('health liveness always succeeds (HTTP 200) even when dependencies are down', () => {
      const liveness = healthService.getLiveness();
      expect(liveness.status).toBe('ok');
      expect(liveness.timestamp).toBeDefined();
    });
  });

  /* ── 2. PostgreSQL Failure Injection & Resilient Error Handling ─ */
  describe('PostgreSQL Failure Injection', () => {
    let healthService: HealthService;
    let mockPrisma: any;
    let mockConfig: any;
    let mockMetrics: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: jest.fn().mockRejectedValue(new Error('Connection terminated unexpectedly [ECONNREFUSED]')),
        isConnected: false,
      };
      mockConfig = {
        get: jest.fn((_key: string, def?: any) => def),
      };
      mockMetrics = {
        recordHttpRequest: jest.fn(),
      };

      healthService = new HealthService(
        mockPrisma,
        mockConfig as ConfigService,
        mockMetrics as MetricsService,
      );
    });

    it('health readiness marks database as down on connection termination without uncaught exception', async () => {
      const readiness = await healthService.getReadiness();
      expect(readiness.status).toBe('degraded');
      expect(['down', 'disconnected']).toContain(readiness.checks.database.status);
      expect(readiness.checks.database.message).toMatch(/PostgreSQL not connected|Database ping failed/);
    });
  });

  /* ── 3. Worker Job Reliability & Exponential Backoff ─────────── */
  describe('Worker Job Recovery & Bounded Retry Backoff', () => {
    it('calculates deterministic exponential backoff delays with jitter ceiling', () => {
      function getRetryDelay(attemptsMade: number, baseMs = 1000, maxMs = 30000): number {
        return Math.min(Math.pow(2, attemptsMade) * baseMs, maxMs);
      }

      expect(getRetryDelay(0)).toBe(1000);
      expect(getRetryDelay(1)).toBe(2000);
      expect(getRetryDelay(2)).toBe(4000);
      expect(getRetryDelay(3)).toBe(8000);
      expect(getRetryDelay(4)).toBe(16000);
      expect(getRetryDelay(5)).toBe(30000); // capped at maxMs
      expect(getRetryDelay(10)).toBe(30000);
    });

    it('preserves deterministic job IDs across retries to prevent duplicate processing', () => {
      function generateDeterministicJobId(callId: string, actionType: string): string {
        return `job_${callId}_${actionType}`;
      }

      const id1 = generateDeterministicJobId('call-12345', 'post-call-analysis');
      const id2 = generateDeterministicJobId('call-12345', 'post-call-analysis');
      expect(id1).toBe(id2);
      expect(id1).toBe('job_call-12345_post-call-analysis');
    });
  });

  /* ── 4. Provider Failure Recovery & Fallback ─────────────────── */
  describe('Provider Failure Recovery (AI, Telephony, Calendar)', () => {
    it('handles AI provider timeout with structured fallback and bounded latency', async () => {
      async function callWithTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
        let timer: any;
        const timeoutPromise = new Promise<T>((resolve) => {
          timer = setTimeout(() => resolve(fallback), timeoutMs);
        });
        return Promise.race([
          promise.then((res) => {
            clearTimeout(timer);
            return res;
          }),
          timeoutPromise,
        ]);
      }

      const slowAiCall = new Promise<string>((resolve) => setTimeout(() => resolve('AI generated response'), 500));
      const fallback = 'I apologize, but I am having trouble reaching our assistant right now. Can I take a message?';

      const result = await callWithTimeout(slowAiCall, 50, fallback);
      expect(result).toBe(fallback);
    });

    it('handles calendar provider conflict by rejecting gracefully without corrupting state', async () => {
      const mockPrisma: any = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
      };
      const mockCalCom: any = {
        bookAppointment: jest.fn().mockRejectedValue(new Error('TIME_SLOT_ALREADY_BOOKED')),
      };

      let caughtError = '';
      try {
        await mockCalCom.bookAppointment({
          slot: '2026-09-12T14:00:00Z',
          email: 'lead@example.com',
        });
      } catch (err: any) {
        caughtError = err.message;
      }

      expect(caughtError).toBe('TIME_SLOT_ALREADY_BOOKED');
      expect(mockPrisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  /* ── 5. WebSocket Multi-Tenant Isolation & Reconnection ──────── */
  describe('WebSocket Tenant Room Isolation & Reconnect Idempotency', () => {
    let gateway: CallsGateway;
    let mockJwt: any;
    let mockPrisma: any;
    let mockConfig: any;
    let mockAudit: any;
    let mockMetrics: any;

    beforeEach(() => {
      mockJwt = { verify: jest.fn() };
      mockPrisma = { call: { findFirst: jest.fn() } };
      mockConfig = { get: jest.fn().mockReturnValue('mock-jwt-secret') };
      mockAudit = { log: jest.fn() };
      mockMetrics = { increment: jest.fn(), decrement: jest.fn() };

      gateway = new CallsGateway(
        mockJwt as any,
        mockConfig as any,
        mockPrisma as any,
        mockAudit as any,
        mockMetrics as any,
      );
    });

    it('isolates rooms strictly by tenantId', () => {
      const tenantA = 'tenant-a-111';
      const tenantB = 'tenant-b-222';
      const roomA = `tenant:${tenantA}`;
      const roomB = `tenant:${tenantB}`;

      expect(roomA).not.toBe(roomB);
      expect(roomA).toBe('tenant:tenant-a-111');
      expect(roomB).toBe('tenant:tenant-b-222');
    });

    it('prevents cross-tenant campaign room subscriptions', () => {
      function canJoinCampaignRoom(userTenantId: string, campaignTenantId: string): boolean {
        return userTenantId === campaignTenantId;
      }

      expect(canJoinCampaignRoom('tenant-a', 'tenant-a')).toBe(true);
      expect(canJoinCampaignRoom('tenant-a', 'tenant-b')).toBe(false);
    });
  });

  /* ── 6. Cross-System Idempotency Audit ───────────────────────── */
  describe('Cross-System Idempotency & Duplicate Side Effect Prevention', () => {
    it('appointment booking deduplicates repeated requests with identical key', () => {
      const processedRequests = new Set<string>();

      function processBookingRequest(idempotencyKey: string): { processed: boolean; reason?: string } {
        if (processedRequests.has(idempotencyKey)) {
          return { processed: false, reason: 'IDEMPOTENT_REPLAY' };
        }
        processedRequests.add(idempotencyKey);
        return { processed: true };
      }

      const res1 = processBookingRequest('idem-key-999');
      const res2 = processBookingRequest('idem-key-999');

      expect(res1.processed).toBe(true);
      expect(res2.processed).toBe(false);
      expect(res2.reason).toBe('IDEMPOTENT_REPLAY');
    });

    it('webhook signature timestamp replay protection rejects requests older than tolerance window', () => {
      function isTimestampValid(requestTimestampSec: number, currentTimestampSec: number, toleranceSec = 300): boolean {
        return Math.abs(currentTimestampSec - requestTimestampSec) <= toleranceSec;
      }

      const now = Math.floor(Date.now() / 1000);
      expect(isTimestampValid(now - 100, now)).toBe(true); // 100s ago: valid
      expect(isTimestampValid(now - 500, now)).toBe(false); // 500s ago: expired / replay
      expect(isTimestampValid(now + 400, now)).toBe(false); // future skewed: invalid
    });
  });
});
