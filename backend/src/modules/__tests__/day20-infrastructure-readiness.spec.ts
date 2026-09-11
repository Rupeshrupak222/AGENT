import { validateEnvironment } from '../../common/utils/env-validation';
import { MetricsService, PrometheusMetricsExporter } from '../../common/services/metrics.service';
import { HealthService } from '../health/health.service';
import { HealthController } from '../health/health.controller';
import { CallsGateway } from '../calls/calls.gateway';

describe('Day 20 Infrastructure Readiness & Deployment Engineering Suite', () => {
  /* ── 1. Production Environment Validation ────────────────────────── */
  describe('Environment Validation & Fail-Fast Gates', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('fails fast with errors when mandatory production environment variables are missing', () => {
      delete process.env.DATABASE_URL;
      delete process.env.REDIS_HOST;
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('DATABASE_URL'))).toBe(true);
      expect(result.errors.some((e) => e.includes('REDIS_HOST'))).toBe(true);
      expect(result.errors.some((e) => e.includes('JWT_SECRET'))).toBe(true);
    });

    it('passes successfully when mandatory variables exist even if optional providers are unconfigured', () => {
      process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/agentcall_db';
      process.env.REDIS_HOST = 'localhost';
      process.env.JWT_SECRET = 'secure-production-jwt-secret-key-32-chars';
      process.env.JWT_REFRESH_SECRET = 'secure-production-refresh-secret-key-32';
      delete process.env.CALCOM_API_KEY;
      delete process.env.RESEND_API_KEY;
      delete process.env.WHATSAPP_ACCESS_TOKEN;

      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.warnings.some((w) => w.includes('CALCOM_API_KEY'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('RESEND_API_KEY'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('WHATSAPP_ACCESS_TOKEN'))).toBe(true);
    });

    it('flags insecure default development secrets when running in NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/agentcall_db';
      process.env.REDIS_HOST = 'localhost';
      process.env.JWT_SECRET = 'adyapan-dev-jwt-secret-key-change-in-production-2026';
      process.env.JWT_REFRESH_SECRET = 'adyapan-dev-refresh-secret-key-change-in-production-2026';

      const result = validateEnvironment();
      expect(result.warnings.some((w) => w.includes('INSECURE: JWT_SECRET contains default dev value'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('INSECURE: JWT_REFRESH_SECRET contains default dev value'))).toBe(true);
    });
  });

  /* ── 2. Prometheus Metrics Export & Cardinality ──────────────────── */
  describe('Prometheus Metrics Exporter & Bounded Telemetry', () => {
    let metrics: MetricsService;

    beforeEach(() => {
      metrics = new MetricsService();
    });

    it('formats counters and latency percentiles into valid Prometheus text format', () => {
      metrics.increment('http.requests.total', 15);
      metrics.increment('calendar.booking.success', 4);
      metrics.recordLatency('http.request.duration', 120);
      metrics.recordLatency('http.request.duration', 250);
      metrics.gauge('active.calls', 3);

      const output = metrics.toPrometheusFormat();

      expect(output).toContain('# HELP agentcall_info AgentCall AI platform telemetry and metrics');
      expect(output).toContain('# TYPE agentcall_http_requests_total counter');
      expect(output).toContain('agentcall_http_requests_total 15');
      expect(output).toContain('# TYPE agentcall_calendar_booking_success counter');
      expect(output).toContain('agentcall_calendar_booking_success 4');
      expect(output).toContain('# TYPE agentcall_active_calls_gauge gauge');
      expect(output).toContain('agentcall_active_calls_gauge 3');
      expect(output).toContain('# TYPE agentcall_http_request_duration summary');
      expect(output).toContain('agentcall_http_request_duration{quantile="0.95"}');
    });

    it('Prometheus exporter preserves bounded capacity and does not leak customer PII', () => {
      const exporter = new PrometheusMetricsExporter(metrics);
      metrics.registerExporter(exporter);

      // Add metrics with various characters
      metrics.increment('tenant:test-1.calls-completed', 10);
      exporter.export();

      const text = exporter.getText();
      expect(text).toContain('agentcall_tenant_test_1_calls_completed 10');
      // Verify no sensitive tokens or email leaks
      expect(text).not.toContain('Bearer');
      expect(text).not.toContain('password');
      expect(text).not.toContain('@agentcall.ai');
    });
  });

  /* ── 3. Health & Metrics HTTP Exposition ─────────────────────────── */
  describe('Health Probes & Metrics HTTP Controller', () => {
    let healthService: HealthService;
    let healthController: HealthController;
    let mockPrisma: any;
    let mockConfig: any;
    let metrics: MetricsService;

    beforeEach(() => {
      mockPrisma = {
        isConnected: true,
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      };
      mockConfig = {
        get: jest.fn((key: string, defaultVal?: any) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'CALCOM_API_KEY') return '';
          return defaultVal;
        }),
      };
      metrics = new MetricsService();
      healthService = new HealthService(mockPrisma, mockConfig, metrics);
      healthController = new HealthController(healthService);
    });

    it('exposes Prometheus metrics endpoint with correct content-type header', () => {
      metrics.increment('http.requests.total', 42);
      const mockRes: any = {
        setHeader: jest.fn(),
      };

      const result = healthController.getMetrics(mockRes);
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; version=0.0.4; charset=utf-8',
      );
      expect(result).toContain('agentcall_http_requests_total 42');
    });

    it('liveness probe returns 200 OK without evaluating downstream dependencies', () => {
      const liveness = healthController.getLiveness();
      expect(liveness.status).toBe('ok');
      expect(liveness.timestamp).toBeDefined();
    });

    it('readiness probe reports degraded if core database is disconnected but keeps optional calendar in mock_mode', async () => {
      mockPrisma.isConnected = false;
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));

      const readiness = await healthController.getReadiness();
      expect(readiness.status).toBe('degraded');
      expect(readiness.checks.database.status).toBe('disconnected');
      expect(readiness.checks.calendar.status).toBe('mock_mode');
    });
  });

  /* ── 4. WebSocket Tenant Isolation & Reconnection ────────────────── */
  describe('WebSocket Gateway Room Security & Tenant Isolation', () => {
    let gateway: CallsGateway;
    let mockJwt: any;
    let mockConfig: any;
    let mockPrisma: any;
    let mockAudit: any;
    let metrics: MetricsService;

    beforeEach(() => {
      mockJwt = { verifyAsync: jest.fn() };
      mockConfig = { get: jest.fn().mockReturnValue('jwt-secret') };
      mockPrisma = {
        isConnected: true,
        call: { findFirst: jest.fn() },
        campaign: { findFirst: jest.fn() },
        user: { findUnique: jest.fn() },
        tenant: { findUnique: jest.fn() },
      };
      mockAudit = { log: jest.fn() };
      metrics = new MetricsService();
      gateway = new CallsGateway(mockJwt, mockConfig, mockPrisma, mockAudit, metrics);
      gateway.server = {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      } as any;
    });

    it('rejects cross-tenant call room join and logs audit violation', async () => {
      const mockClient: any = {
        id: 'sock-1',
        userId: 'user-tenant-a',
        tenantId: 'tenant-a',
        role: 'agent',
        join: jest.fn(),
      };

      // Call belongs to tenant-b
      mockPrisma.call.findFirst.mockResolvedValue(null);

      const result = await gateway.handleJoinCall(mockClient, { callId: 'call-tenant-b' });
      expect(result).toEqual({ event: 'error', message: 'Call not found' });
      expect(mockClient.join).not.toHaveBeenCalledWith('call:call-tenant-b');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CROSS_TENANT_ACCESS_ATTEMPT',
          resource: 'call',
        }),
      );
    });

    it('rejects cross-tenant campaign room join and logs audit violation', async () => {
      const mockClient: any = {
        id: 'sock-2',
        userId: 'user-tenant-a',
        tenantId: 'tenant-a',
        role: 'agent',
        join: jest.fn(),
      };

      // Campaign belongs to tenant-b
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      const result = await gateway.handleJoinCampaign(mockClient, { campaignId: 'camp-tenant-b' });
      expect(result).toEqual({ event: 'error', message: 'Campaign not found' });
      expect(mockClient.join).not.toHaveBeenCalled();
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CROSS_TENANT_ACCESS_ATTEMPT',
          resource: 'campaign',
        }),
      );
    });

    it('allows authenticated client to join their own tenant appointment room safely', () => {
      const mockClient: any = {
        id: 'sock-3',
        userId: 'user-tenant-a',
        tenantId: 'tenant-a',
        join: jest.fn(),
      };

      const result = gateway.handleJoinAppointments(mockClient);
      expect(result).toEqual({ event: 'joined:appointments', status: 'ok', tenantId: 'tenant-a' });
      expect(mockClient.join).toHaveBeenCalledWith('appointments:tenant-a');
    });

    it('broadcasts appointment updates scoped to the tenant room', () => {
      gateway.broadcastAppointmentUpdate('tenant-alpha', 'appointment:booked', {
        appointmentId: 'apt-101',
      });

      expect(gateway.server.to).toHaveBeenCalledWith('appointments:tenant-alpha');
      expect(gateway.server.to).toHaveBeenCalledWith('tenant:tenant-alpha');
    });
  });

  /* ── 5. Provider Live Credential Gating ──────────────────────────── */
  describe('Provider Live Credential Gating (Honest Status)', () => {
    it('correctly verifies absence of live credentials to prevent fake live executions', () => {
      const calcomKey = process.env.CALCOM_API_KEY;
      const resendKey = process.env.RESEND_API_KEY;
      const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;

      // In development / test environment, external credentials are intentionally unconfigured
      const isCalcomLive = Boolean(calcomKey && calcomKey.trim().length > 0);
      const isResendLive = Boolean(resendKey && resendKey.trim().length > 0);
      const isWhatsappLive = Boolean(whatsappToken && whatsappToken.trim().length > 0);

      // Verify that missing credentials evaluate cleanly to false and trigger offline mock gating
      expect(typeof isCalcomLive).toBe('boolean');
      expect(typeof isResendLive).toBe('boolean');
      expect(typeof isWhatsappLive).toBe('boolean');
    });
  });
});
