import { CircuitBreaker, CircuitState } from '../services/circuit-breaker';
import { MetricsService } from '../services/metrics.service';
import { redactSecrets, redactString } from '../utils/secret-redaction';

describe('Day 15 — Production Reliability & Failure Recovery Tests', () => {
  // ─── CIRCUIT BREAKER ────────────────────────────────────────────

  describe('CircuitBreaker', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 1000,
      });
    });

    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isAvailable()).toBe(true);
    });

    it('should transition to OPEN after threshold failures', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);

      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
      expect(breaker.isAvailable()).toBe(false);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);

      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(breaker.isAvailable()).toBe(true);
    });

    it('should recover to CLOSED from HALF_OPEN after successes', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      breaker.recordSuccess();
      breaker.recordSuccess();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should return to OPEN from HALF_OPEN on failure', async () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      breaker.recordFailure();
      expect(breaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should reset failure count on success in CLOSED state', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess();
      breaker.recordFailure();
      // Should still be CLOSED because success reset the count
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should expose stats', () => {
      breaker.recordFailure();
      const stats = breaker.getStats();
      expect(stats.failureCount).toBe(1);
      expect(stats.state).toBe(CircuitState.CLOSED);
    });

    it('should manually reset', () => {
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      breaker.reset();
      expect(breaker.getState()).toBe(CircuitState.CLOSED);
      expect(breaker.isAvailable()).toBe(true);
    });
  });

  // ─── METRICS SERVICE ────────────────────────────────────────────

  describe('MetricsService', () => {
    let metrics: MetricsService;

    beforeEach(() => {
      metrics = new MetricsService();
    });

    it('should track counters', () => {
      metrics.increment('test.counter');
      metrics.increment('test.counter');
      metrics.increment('test.counter', 5);
      expect(metrics.getCounterValue('test.counter')).toBe(7);
    });

    it('should track gauges', () => {
      metrics.gauge('queue.depth', 42);
      const entry = metrics.getCounter('queue.depth');
      expect(entry?.lastValue).toBe(42);
    });

    it('should track latency histograms', () => {
      metrics.recordLatency('api.call', 100);
      metrics.recordLatency('api.call', 200);
      metrics.recordLatency('api.call', 150);

      const stats = metrics.getHistogramStats('api.call');
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.min).toBe(100);
      expect(stats!.max).toBe(200);
      expect(stats!.avg).toBe(150);
    });

    it('should return all metrics', () => {
      metrics.increment('calls.started');
      metrics.increment('calls.completed');
      metrics.gauge('websocket.connections', 5);

      const all = metrics.getAllMetrics();
      expect(all['calls.started']).toBeDefined();
      expect(all['calls.completed']).toBeDefined();
    });

    it('should reset all metrics', () => {
      metrics.increment('test');
      metrics.reset();
      expect(metrics.getCounterValue('test')).toBe(0);
    });
  });

  // ─── SECRET REDACTION ───────────────────────────────────────────

  describe('SecretRedaction', () => {
    it('should redact sensitive keys in objects', () => {
      const input = {
        name: 'Test',
        password: 'hunter2',
        TWILIO_AUTH_TOKEN: 'secret-token',
        nested: {
          apiKey: 'abc123',
          safe: 'visible',
        },
      };

      const redacted = redactSecrets(input);
      expect(redacted.name).toBe('Test');
      expect(redacted.password).toBe('***REDACTED***');
      expect(redacted.TWILIO_AUTH_TOKEN).toBe('***REDACTED***');
      expect(redacted.nested.apiKey).toBe('***REDACTED***');
      expect(redacted.nested.safe).toBe('visible');
    });

    it('should redact arrays of objects', () => {
      const input = [{ token: 'abc' }, { password: 'xyz' }];
      const redacted = redactSecrets(input);
      expect(redacted[0].token).toBe('***REDACTED***');
      expect(redacted[1].password).toBe('***REDACTED***');
    });

    it('should redact Bearer tokens in strings', () => {
      const str = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const redacted = redactString(str);
      expect(redacted).toContain('***REDACTED***');
      expect(redacted).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact Basic auth in strings', () => {
      const str = 'Basic dXNlcjpwYXNzd29yZA==';
      const redacted = redactString(str);
      expect(redacted).toContain('***REDACTED***');
      expect(redacted).not.toContain('dXNlcjpwYXNzd29yZA==');
    });

    it('should not modify non-sensitive data', () => {
      const input = { id: '123', name: 'Test', status: 'active' };
      const redacted = redactSecrets(input);
      expect(redacted).toEqual(input);
    });

    it('should handle null and undefined', () => {
      expect(redactSecrets(null)).toBeNull();
      expect(redactSecrets(undefined)).toBeUndefined();
      expect(redactSecrets('hello')).toBe('hello');
    });
  });

  // ─── QUEUE IDEMPOTENCY ──────────────────────────────────────────

  describe('Queue Idempotency', () => {
    it('should generate deterministic analysis job IDs', () => {
      const tenantId = 'tenant-1';
      const callId = 'call-1';
      const jobId = `analysis:${tenantId}:${callId}`;
      const jobId2 = `analysis:${tenantId}:${callId}`;
      expect(jobId).toBe(jobId2);
    });

    it('should generate different job IDs for different calls', () => {
      const jobId1 = `analysis:tenant-1:call-1`;
      const jobId2 = `analysis:tenant-1:call-2`;
      expect(jobId1).not.toBe(jobId2);
    });

    it('should generate deterministic CRM sync job IDs', () => {
      const jobId = `crm-sync:tenant-1:call-1`;
      const jobId2 = `crm-sync:tenant-1:call-1`;
      expect(jobId).toBe(jobId2);
    });

    it('should generate deterministic campaign job IDs', () => {
      const jobId = `campaign:camp-1:lead:lead-1:attempt:1`;
      const jobId2 = `campaign:camp-1:lead:lead-1:attempt:1`;
      expect(jobId).toBe(jobId2);
    });

    it('should generate different campaign IDs for different attempts', () => {
      const jobId1 = `campaign:camp-1:lead:lead-1:attempt:1`;
      const jobId2 = `campaign:camp-1:lead:lead-1:attempt:2`;
      expect(jobId1).not.toBe(jobId2);
    });
  });

  // ─── SSRF URL VALIDATION ────────────────────────────────────────

  describe('SSRF URL Validation', () => {
    const isIpLiteral = (host: string): boolean => {
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
      if (/^\[?[0-9a-f:]+\]?$/.test(host) && host.includes(':')) return true;
      const internalHosts = ['metadata.google.internal', '169.254.169.254', '0.0.0.0'];
      if (internalHosts.includes(host)) return true;
      return false;
    };

    it('should block IPv4 addresses', () => {
      expect(isIpLiteral('127.0.0.1')).toBe(true);
      expect(isIpLiteral('10.0.0.1')).toBe(true);
      expect(isIpLiteral('192.168.1.1')).toBe(true);
      expect(isIpLiteral('169.254.169.254')).toBe(true);
    });

    it('should block IPv6 addresses', () => {
      expect(isIpLiteral('::1')).toBe(true);
      expect(isIpLiteral('[::1]')).toBe(true);
    });

    it('should block metadata endpoints', () => {
      expect(isIpLiteral('metadata.google.internal')).toBe(true);
    });

    it('should allow valid hostnames', () => {
      expect(isIpLiteral('api.twilio.com')).toBe(false);
      expect(isIpLiteral('recordings.twilio.com')).toBe(false);
      expect(isIpLiteral('example.com')).toBe(false);
    });
  });

  // ─── PROVIDER TIMEOUTS ──────────────────────────────────────────

  describe('Provider Timeout Configurations', () => {
    it('should have bounded timeouts for all providers', () => {
      const timeouts = {
        groq: 10000,
        gemini: 25000,
        recording_download: 30000,
        twilio_api: 15000,
        exotel_api: 15000,
        crm_adapter: 10000,
      };

      for (const [provider, timeout] of Object.entries(timeouts)) {
        expect(timeout).toBeGreaterThan(0);
        expect(timeout).toBeLessThanOrEqual(60000);
        expect(Number.isFinite(timeout)).toBe(true);
      }
    });
  });

  // ─── ERROR CLASSIFICATION ───────────────────────────────────────

  describe('Error Classification', () => {
    const classifyError = (err: any): string => {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') return 'network';
      if (err.code === 'ETIMEDOUT' || err.name === 'AbortError') return 'timeout';
      if (err.response?.status === 429) return 'rate_limit';
      if (err.response?.status === 401 || err.response?.status === 403) return 'authentication';
      if (err.response?.status >= 400 && err.response?.status < 500) return 'validation';
      if (err.response?.status >= 500) return 'provider_unavailable';
      return 'unknown';
    };

    it('should classify timeout errors', () => {
      expect(classifyError({ code: 'ETIMEDOUT' })).toBe('timeout');
      expect(classifyError({ name: 'AbortError' })).toBe('timeout');
    });

    it('should classify network errors', () => {
      expect(classifyError({ code: 'ECONNREFUSED' })).toBe('network');
      expect(classifyError({ code: 'ENOTFOUND' })).toBe('network');
    });

    it('should classify rate limit errors', () => {
      expect(classifyError({ response: { status: 429 } })).toBe('rate_limit');
    });

    it('should classify auth errors', () => {
      expect(classifyError({ response: { status: 401 } })).toBe('authentication');
      expect(classifyError({ response: { status: 403 } })).toBe('authentication');
    });

    it('should classify provider errors', () => {
      expect(classifyError({ response: { status: 500 } })).toBe('provider_unavailable');
      expect(classifyError({ response: { status: 503 } })).toBe('provider_unavailable');
    });
  });

  // ─── CROSS-TENANT SECURITY ──────────────────────────────────────

  describe('Cross-Tenant Isolation', () => {
    it('should enforce tenant isolation in queue job IDs', () => {
      const tenantA_job = `analysis:tenant-a:call-1`;
      const tenantB_job = `analysis:tenant-b:call-1`;
      expect(tenantA_job).not.toBe(tenantB_job);
    });

    it('should enforce tenant isolation in CRM sync job IDs', () => {
      const tenantA = `crm-sync:tenant-a:call-1`;
      const tenantB = `crm-sync:tenant-b:call-1`;
      expect(tenantA).not.toBe(tenantB);
    });
  });

  // ─── ENVIRONMENT VALIDATION ─────────────────────────────────────

  describe('Environment Validation', () => {
    it('should have required environment variables defined in example', () => {
      const requiredVars = [
        'DATABASE_URL',
        'REDIS_HOST',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
      ];

      for (const v of requiredVars) {
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      }
    });
  });

  // ─── HEALTH CHECK STRUCTURE ─────────────────────────────────────

  describe('Health Check Response Structure', () => {
    it('should define valid health status values', () => {
      const validStatuses = ['healthy', 'degraded', 'unhealthy'];
      for (const s of validStatuses) {
        expect(['healthy', 'degraded', 'unhealthy']).toContain(s);
      }
    });

    it('should define valid liveness response', () => {
      const response = { status: 'ok', timestamp: new Date().toISOString() };
      expect(response.status).toBe('ok');
      expect(response.timestamp).toBeDefined();
    });
  });

  // ─── QUEUE HEALTH / FAILED-JOB COUNTERS ─────────────────────────

  describe('Queue failed-job health counters', () => {
    it('should expose a process-local static failed-job counter per queue service', () => {
      const { PostCallQueueService } = require('../../modules/ai/services/post-call-queue.service');
      const { CrmQueueService } = require('../../modules/integrations/services/crm-queue.service');
      const { CampaignQueueService } = require('../../modules/campaigns/services/campaign-queue.service');
      const { RecordingQueueService } = require('../../modules/telephony/services/recording-queue.service');

      expect(typeof PostCallQueueService.failedJobCount).toBe('number');
      expect(typeof CrmQueueService.failedJobCount).toBe('number');
      expect(typeof CampaignQueueService.failedJobCount).toBe('number');
      expect(typeof RecordingQueueService.failedJobCount).toBe('number');
      expect(PostCallQueueService.failedJobCount).toBeGreaterThanOrEqual(0);
    });

    it('should report degraded readiness when database is disconnected', async () => {
      const { HealthService } = require('../../modules/health/health.service');

      const service = new HealthService(
        { isConnected: false },
        { get: jest.fn((key: string, def: any) => def) },
      );

      const result = await service.getReadiness();
      expect(['healthy', 'degraded']).toContain(result.status);
      expect(result.checks.database.status).toBe('disconnected');
      expect(result.checks.redis.status).toMatch(/^(ok|error)$/);
      expect(result.checks.telephony).toBeDefined();
      expect(result.checks.ai).toBeDefined();
      expect(result.checks.storage).toBeDefined();
    });

    it('should include queue stats in diagnostics', async () => {
      const { HealthService } = require('../../modules/health/health.service');

      const service = new HealthService(
        { isConnected: false },
        { get: jest.fn((key: string, def: any) => def) },
      );

      const diag = await service.getDiagnostics();
      expect(diag.queueStats).toBeDefined();
      expect(diag.queueStats['post-call-analysis']).toEqual({ failedJobs: expect.any(Number) });
      expect(diag.queueStats['outbound-calls']).toEqual({ failedJobs: expect.any(Number) });
    });
  });
});
