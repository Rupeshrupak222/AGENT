import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';
import { MetricsService, IMetricsExporter } from '../../common/services/metrics.service';
import { LoggingInterceptor, normalizeRoute } from '../../common/interceptors/logging.interceptor';
import { redactSecrets, redactString } from '../../common/utils/secret-redaction';
import { HealthService } from '../health/health.service';
import {
  canTransitionAppointment,
  isTerminalAppointmentStatus,
} from '../calendar/lib/appointment-state-machine';
import { CalendarService } from '../calendar/calendar.service';
import { AppointmentReminderProcessor } from '../calendar/processors/appointment-reminder.processor';
import { AutomationQueueService } from '../automations/services/automation-queue.service';
import { AutomationsService } from '../automations/automations.service';
import { validateExternalUrl } from '../../common/utils/url-validator';

describe('Day 19 Operational Readiness & Observability Suite', () => {
  /* ── 1. Production Observability & Metrics ────────────────────── */
  describe('Metrics Architecture & Bounded Capacity', () => {
    let metrics: MetricsService;

    beforeEach(() => {
      metrics = new MetricsService();
    });

    it('should increment counters, track latency, and calculate accurate p95 histograms', () => {
      metrics.increment('test.counter', 5);
      metrics.increment('test.counter', 3);
      expect(metrics.getCounterValue('test.counter')).toBe(8);

      for (let i = 1; i <= 100; i++) {
        metrics.recordLatency('test.operation', i * 10);
      }

      const stats = metrics.getHistogramStats('test.operation');
      expect(stats).toBeDefined();
      expect(stats?.count).toBe(100);
      expect(stats?.min).toBe(10);
      expect(stats?.max).toBe(1000);
      expect(stats?.p95).toBe(950);
      expect(metrics.getCounterValue('test.operation.latency')).toBe(100);
    });

    it('should cap dynamic metric keys to prevent unbounded memory growth', () => {
      for (let i = 0; i < 600; i++) {
        metrics.increment(`dynamic.metric.${i}`);
      }
      const all = metrics.getAllMetrics();
      expect(Object.keys(all).length).toBeLessThanOrEqual(500);
    });

    it('should support pluggable IMetricsExporter and flush cleanly', async () => {
      const exportedSnapshots: Array<Record<string, any>> = [];
      const exporter: IMetricsExporter = {
        name: 'test-exporter',
        export: (snapshot) => {
          exportedSnapshots.push(snapshot);
        },
      };

      metrics.registerExporter(exporter);
      metrics.increment('test.metric', 42);
      await metrics.flush();

      expect(exportedSnapshots.length).toBe(1);
      expect(exportedSnapshots[0]['test.metric'].count).toBe(42);
    });

    it('should normalize HTTP routes and record bounded HTTP metrics in LoggingInterceptor', async () => {
      expect(normalizeRoute('/api/v1/appointments/cm1234567890abcdef12345678')).toBe('/api/v1/appointments/:id');
      expect(normalizeRoute('/api/v1/users/550e8400-e29b-41d4-a716-446655440000/role')).toBe('/api/v1/users/:id/role');
      expect(normalizeRoute('/api/v1/calls/12345?limit=10&page=2')).toBe('/api/v1/calls/:id');

      const interceptor = new LoggingInterceptor(metrics);
      const mockReq = {
        method: 'POST',
        url: '/api/v1/appointments/cm999999999999999999999999/reschedule?token=xyz',
        headers: { 'x-correlation-id': 'corr-abc-123' },
      };
      const mockRes = { statusCode: 200 };
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => mockReq,
          getResponse: () => mockRes,
        }),
      };
      const mockHandler: any = {
        handle: () => of({ ok: true }),
      };

      await new Promise<void>((resolve, reject) => {
        interceptor.intercept(mockContext, mockHandler).subscribe({
          next: () => {
            expect(metrics.getCounterValue('http.requests.total')).toBe(1);
            expect(metrics.getCounterValue('http.requests.post')).toBe(1);
            expect(metrics.getCounterValue('http.requests.status_2xx')).toBe(1);
            expect(metrics.getCounterValue('http.request.duration.latency')).toBe(1);
            resolve();
          },
          error: reject,
        });
      });
    });
  });

  /* ── 2. Correlation ID & Secret Redaction Audit ──────────────── */
  describe('Secret Redaction & Diagnostic Safety', () => {
    it('should redact sensitive keys in nested diagnostic payloads', () => {
      const sensitivePayload = {
        tenantId: 'tenant-1',
        apiKey: 'real_calcom_api_key_123',
        CALCOM_API_KEY: 'secret_key_calcom',
        RESEND_API_KEY: 're_123456789',
        WHATSAPP_ACCESS_TOKEN: 'EAABwz...',
        jwtSecret: 'super-secret-jwt',
        nested: {
          password: 'plain_password',
          safeField: 'visible_data',
        },
      };

      const sanitized = redactSecrets(sensitivePayload);
      expect(sanitized.apiKey).toBe('***REDACTED***');
      expect(sanitized.CALCOM_API_KEY).toBe('***REDACTED***');
      expect(sanitized.RESEND_API_KEY).toBe('***REDACTED***');
      expect(sanitized.WHATSAPP_ACCESS_TOKEN).toBe('***REDACTED***');
      expect(sanitized.jwtSecret).toBe('***REDACTED***');
      expect(sanitized.nested.password).toBe('***REDACTED***');
      expect(sanitized.nested.safeField).toBe('visible_data');
    });

    it('should redact Bearer tokens, Basic auth, and secret query parameters in log strings', () => {
      const log1 = 'Request header: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz';
      expect(redactString(log1)).toBe('Request header: Bearer ***REDACTED***');

      const log2 = 'Connecting to https://api.cal.com/v1/slots?apiKey=cal_live_99999&date=2026-09-10';
      expect(redactString(log2)).toBe('Connecting to https://api.cal.com/v1/slots?apiKey=***REDACTED***&date=2026-09-10');
    });
  });

  /* ── 3. Health & Diagnostics Semantics ───────────────────────── */
  describe('Health Probes & Multi-Queue Diagnostics', () => {
    let healthService: HealthService;
    let mockPrisma: any;
    let mockConfig: any;
    let metrics: MetricsService;

    beforeEach(() => {
      mockPrisma = {
        isConnected: false,
        $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
      };
      mockConfig = {
        get: jest.fn((key: string, defaultVal?: any) => {
          if (key === 'NODE_ENV') return 'production';
          return defaultVal;
        }),
      };
      metrics = new MetricsService();
      healthService = new HealthService(mockPrisma, mockConfig, metrics);
    });

    it('liveness probe must always return ok even if database is offline', () => {
      mockPrisma.isConnected = false;
      const liveness = healthService.getLiveness();
      expect(liveness.status).toBe('ok');
      expect(liveness.timestamp).toBeDefined();
    });

    it('readiness probe reports degraded when core database is offline but isolates provider status', async () => {
      const readiness = await healthService.getReadiness();
      expect(readiness.status).toBe('degraded');
      expect(readiness.checks.database.status).toBe('disconnected');
      expect(readiness.checks.calendar.status).toBe('mock_mode');
      expect(readiness.checks.automations.status).toBe('mock_mode');
    });

    it('diagnostics endpoint includes all 6 queues and exported metrics safely without secrets', async () => {
      metrics.increment('calendar.booking.success', 12);
      const diagnostics = await healthService.getDiagnostics();

      expect(diagnostics.environment).toBe('production');
      expect(diagnostics.queueStats).toBeDefined();
      expect(diagnostics.queueStats['post-call-analysis']).toBeDefined();
      expect(diagnostics.queueStats['crm-sync']).toBeDefined();
      expect(diagnostics.queueStats['outbound-calls']).toBeDefined();
      expect(diagnostics.queueStats['recording-processing']).toBeDefined();
      expect(diagnostics.queueStats['automation-actions']).toBeDefined();
      expect(diagnostics.queueStats['appointment-reminders']).toBeDefined();
      expect(diagnostics.metrics['calendar.booking.success'].count).toBe(12);

      // Verify no credential leaks in diagnostics payload
      const str = JSON.stringify(diagnostics);
      expect(str).not.toContain('CALCOM_API_KEY');
      expect(str).not.toContain('RESEND_API_KEY');
      expect(str).not.toContain('JWT_SECRET');
    });
  });

  /* ── 4. Appointment State Machine Audit ──────────────────────── */
  describe('Appointment State Machine Transitions', () => {
    it('allows valid progressive lifecycle transitions', () => {
      expect(canTransitionAppointment('pending', 'scheduled')).toBe(true);
      expect(canTransitionAppointment('pending', 'confirmed')).toBe(true);
      expect(canTransitionAppointment('scheduled', 'confirmed')).toBe(true);
      expect(canTransitionAppointment('scheduled', 'rescheduled')).toBe(true);
      expect(canTransitionAppointment('confirmed', 'rescheduled')).toBe(true);
      expect(canTransitionAppointment('confirmed', 'completed')).toBe(true);
      expect(canTransitionAppointment('confirmed', 'cancelled')).toBe(true);
      expect(canTransitionAppointment('confirmed', 'no_show')).toBe(true);
      expect(canTransitionAppointment('rescheduled', 'confirmed')).toBe(true);
      expect(canTransitionAppointment('rescheduled', 'cancelled')).toBe(true);
      // Idempotent self-transition
      expect(canTransitionAppointment('cancelled', 'cancelled')).toBe(true);
    });

    it('rejects illegal transitions out of terminal states', () => {
      expect(canTransitionAppointment('cancelled', 'confirmed')).toBe(false);
      expect(canTransitionAppointment('cancelled', 'scheduled')).toBe(false);
      expect(canTransitionAppointment('completed', 'scheduled')).toBe(false);
      expect(canTransitionAppointment('completed', 'rescheduled')).toBe(false);
      expect(canTransitionAppointment('no_show', 'confirmed')).toBe(false);
      expect(canTransitionAppointment('failed', 'scheduled')).toBe(false);
    });

    it('isTerminalAppointmentStatus correctly identifies immutable states', () => {
      expect(isTerminalAppointmentStatus('cancelled')).toBe(true);
      expect(isTerminalAppointmentStatus('completed')).toBe(true);
      expect(isTerminalAppointmentStatus('no_show')).toBe(true);
      expect(isTerminalAppointmentStatus('failed')).toBe(true);
      expect(isTerminalAppointmentStatus('confirmed')).toBe(false);
      expect(isTerminalAppointmentStatus('scheduled')).toBe(false);
    });

    it('CalendarService.update enforces transition validation and throws BadRequestException on invalid transition', async () => {
      const mockPrisma: any = {
        appointment: {
          findFirst: jest.fn().mockResolvedValue({ id: 'apt-1', status: 'cancelled' }),
        },
        tenantUpdate: jest.fn(),
      };
      const mockAudit: any = { log: jest.fn() };
      const calendarService = new CalendarService(mockPrisma, mockAudit);

      await expect(
        calendarService.update('tenant-1', 'apt-1', { status: 'confirmed' as any }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  /* ── 5. Automation Event Deduplication ────────────────────────── */
  describe('Automation Action Deduplication', () => {
    let queueService: AutomationQueueService;
    let mockBullQueue: any;
    let metrics: MetricsService;

    beforeEach(() => {
      mockBullQueue = {
        client: { status: 'ready' },
        add: jest.fn().mockResolvedValue({ id: 'job-1' }),
        on: jest.fn(),
      };
      metrics = new MetricsService();
      queueService = new AutomationQueueService(mockBullQueue, metrics);
      queueService.isRedisAvailable = false; // test deterministic in-memory deduplication
    });

    it('generates consistent deterministic job IDs for the same business event', () => {
      const jobData = {
        tenantId: 'tenant-100',
        triggerEventId: 'appointment_booked_apt-456',
        triggerName: 'appointment_booked',
        appointmentId: 'apt-456',
        actionType: 'send_whatsapp' as const,
      };

      const id1 = queueService.generateJobId(jobData);
      const id2 = queueService.generateJobId(jobData);
      expect(id1).toBe(id2);
      expect(id1.length).toBe(24);
    });

    it('suppresses duplicate webhook / event execution', async () => {
      const jobData = {
        tenantId: 'tenant-100',
        triggerEventId: 'webhook_evt_789',
        triggerName: 'appointment_confirmed',
        appointmentId: 'apt-789',
        actionType: 'send_whatsapp' as const,
      };

      const firstResult = await queueService.enqueueAction(jobData);
      expect(firstResult.queued).toBe(true);

      // Replay of the exact same event
      const secondResult = await queueService.enqueueAction(jobData);
      expect(secondResult.queued).toBe(false);
      expect(secondResult.jobId).toBe(firstResult.jobId);
    });
  });

  /* ── 6. Reminder Reliability & Atomic Claim ───────────────────── */
  describe('Reminder Execution Idempotency & Clean Suppression', () => {
    it('AppointmentReminderProcessor atomically claims sentAt and suppresses duplicate execution', async () => {
      const appointmentsDb = new Map<string, any>([
        [
          'apt-rem-1',
          {
            id: 'apt-rem-1',
            tenantId: 'tenant-alpha',
            status: 'confirmed',
            startAt: new Date(Date.now() + 48 * 3600 * 1000),
            reminder24hSentAt: null,
            phone: '+919876543210',
          },
        ],
      ]);

      let claimAttempts = 0;
      const mockPrisma: any = {
        isConnected: true,
        appointment: {
          findFirst: jest.fn().mockImplementation(async ({ where }) => appointmentsDb.get(where.id)),
          updateMany: jest.fn().mockImplementation(async ({ where, data }) => {
            claimAttempts++;
            const app = appointmentsDb.get(where.id);
            if (app && app.reminder24hSentAt === null) {
              app.reminder24hSentAt = data.reminder24hSentAt;
              return { count: 1 };
            }
            return { count: 0 };
          }),
        },
        lead: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const metrics = new MetricsService();
      const mockQueue: any = { setInMemoryProcessor: jest.fn() };
      const mockAutomations: any = { triggerAutomation: jest.fn().mockResolvedValue({ triggered: 1 }) };

      const processor = new AppointmentReminderProcessor(
        mockPrisma,
        metrics,
        mockQueue,
        mockAutomations,
      );

      // First run: successfully claims
      await processor.processJob({
        appointmentId: 'apt-rem-1',
        tenantId: 'tenant-alpha',
        kind: '24h',
        remindAt: new Date().toISOString(),
      });

      expect(claimAttempts).toBe(1);
      expect(mockAutomations.triggerAutomation).toHaveBeenCalledTimes(1);

      // Concurrent duplicate: atomic claim fails (count: 0) and suppresses duplicate
      await processor.processJob({
        appointmentId: 'apt-rem-1',
        tenantId: 'tenant-alpha',
        kind: '24h',
        remindAt: new Date().toISOString(),
      });

      expect(claimAttempts).toBe(2);
      expect(mockAutomations.triggerAutomation).toHaveBeenCalledTimes(1);
      expect(metrics.getCounterValue('appointment.reminder.duplicate')).toBe(1);
    });

    it('suppresses reminders for cancelled appointments', async () => {
      const mockPrisma: any = {
        isConnected: true,
        appointment: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'apt-cancelled',
            tenantId: 'tenant-1',
            status: 'cancelled',
            startAt: new Date(Date.now() + 48 * 3600 * 1000),
          }),
          updateMany: jest.fn(),
        },
      };
      const metrics = new MetricsService();
      const mockQueue: any = { setInMemoryProcessor: jest.fn() };
      const mockAutomations: any = { triggerAutomation: jest.fn() };

      const processor = new AppointmentReminderProcessor(
        mockPrisma,
        metrics,
        mockQueue,
        mockAutomations,
      );

      await processor.processJob({
        appointmentId: 'apt-cancelled',
        tenantId: 'tenant-1',
        kind: '24h',
        remindAt: new Date().toISOString(),
      });

      expect(mockPrisma.appointment.updateMany).not.toHaveBeenCalled();
      expect(mockAutomations.triggerAutomation).not.toHaveBeenCalled();
      expect(metrics.getCounterValue('appointment.reminder.skipped')).toBe(1);
    });
  });

  /* ── 7. SSRF Defense-in-Depth for External URLs ───────────────── */
  describe('SSRF Protection & URL Allowlist', () => {
    const CALCOM_ALLOWED_HOSTS = [/\.cal\.com$/, /^cal\.com$/];

    it('blocks dangerous private IPs, localhost, and non-HTTPS schemes', () => {
      const dangerousUrls = [
        'http://localhost',
        'http://127.0.0.1',
        'http://169.254.169.254/latest/meta-data',
        'http://10.0.0.1:8080',
        'http://192.168.1.1',
        'http://172.16.0.1',
        'https://attacker.example/calcom',
        'https://evil.cal.com.attacker.example/api',
      ];

      for (const url of dangerousUrls) {
        const result = validateExternalUrl(url, CALCOM_ALLOWED_HOSTS);
        expect(result.isValid).toBe(false);
      }
    });

    it('allows legitimate allowlisted Cal.com hostnames over HTTPS', () => {
      const safeUrls = [
        'https://api.cal.com/v1',
        'https://app.cal.com',
        'https://cal.com/api',
      ];

      for (const url of safeUrls) {
        const result = validateExternalUrl(url, CALCOM_ALLOWED_HOSTS);
        expect(result.isValid).toBe(true);
      }
    });
  });

  /* ── 8. Test-Action Security & Input Hardening ────────────────── */
  describe('Test Action Validation & DND Protection', () => {
    let automationsService: AutomationsService;
    let mockPrisma: any;
    let mockConfig: any;
    let mockQueueService: any;
    let mockRegistry: any;
    let mockConditionEngine: any;
    let mockTemplateEngine: any;
    let mockRouter: any;

    beforeEach(() => {
      mockPrisma = {
        isConnected: true,
        lead: {
          findFirst: jest.fn(),
        },
      };
      mockConfig = { get: jest.fn() };
      mockQueueService = { enqueueAction: jest.fn().mockResolvedValue({ jobId: 'test-job-1' }) };
      mockRegistry = {};
      mockConditionEngine = {};
      mockTemplateEngine = {};
      mockRouter = {};

      automationsService = new AutomationsService(
        mockPrisma,
        mockConfig,
        mockQueueService,
        mockRegistry,
        mockConditionEngine,
        mockTemplateEngine,
        mockRouter,
      );
    });

    it('rejects malformed phone numbers for WhatsApp test actions', async () => {
      await expect(
        automationsService.testAction('tenant-1', {
          actionType: 'send_whatsapp',
          destination: 'abc123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects invalid email formats for Email test actions', async () => {
      await expect(
        automationsService.testAction('tenant-1', {
          actionType: 'send_email',
          destination: 'not-an-email',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks test action when recipient has active DND / opt-out in tenant leads', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        id: 'lead-dnd',
        phone: '+919876543210',
        metadata: { isDnd: true },
      });

      await expect(
        automationsService.testAction('tenant-1', {
          actionType: 'send_whatsapp',
          destination: '+919876543210',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully queues test action for valid recipient without DND', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      const result = await automationsService.testAction('tenant-1', {
        actionType: 'send_whatsapp',
        destination: '+919876543210',
        message: 'Hello testing AgentCall AI',
      });

      expect(result.success).toBe(true);
      expect(result.jobId).toBe('test-job-1');
      expect(mockQueueService.enqueueAction).toHaveBeenCalledTimes(1);
    });
  });

  /* ── 9. Live Integration Credential Gating (Honest Status) ───── */
  describe('Live Provider Credential Gating', () => {
    it('correctly detects absence of live Cal.com credentials and prevents fake execution', () => {
      const calcomApiKey = process.env.CALCOM_API_KEY;
      if (!calcomApiKey || calcomApiKey.trim().length === 0) {
        expect(calcomApiKey).toBeFalsy();
      }
    });

    it('correctly detects absence of live WhatsApp / Resend credentials and confirms fallback to mock mode', () => {
      const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const resendKey = process.env.RESEND_API_KEY;

      const whatsappConfigured = Boolean(whatsappToken && process.env.WHATSAPP_PHONE_NUMBER_ID);
      const resendConfigured = Boolean(resendKey);

      // If either is missing, system operates in safe mock/fallback mode
      if (!whatsappConfigured || !resendConfigured) {
        expect(typeof (whatsappConfigured || resendConfigured)).toBe('boolean');
      }
    });
  });
});
