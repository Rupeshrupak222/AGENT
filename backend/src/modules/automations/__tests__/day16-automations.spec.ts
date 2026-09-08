import * as crypto from 'crypto';
import { TemplateEngine } from '../engine/template.engine';
import { ConditionEngine } from '../engine/condition.engine';
import { MetaWhatsAppAdapter } from '../providers/whatsapp/whatsapp.adapter';
import { MockWhatsAppAdapter } from '../providers/whatsapp/mock-whatsapp.adapter';
import { ResendEmailAdapter } from '../providers/email/resend.adapter';
import { MockEmailAdapter } from '../providers/email/mock-email.adapter';
import { AutomationQueueService } from '../services/automation-queue.service';
import { AutomationActionProcessor } from '../processors/automation-action.processor';
import { AutomationProviderRegistry } from '../providers/provider-registry.service';
import { MetricsService } from '../../../common/services/metrics.service';

describe('DAY 16 — CRM Automation Engine + Meta WhatsApp + Resend Email Test Suite', () => {
  let templateEngine: TemplateEngine;
  let conditionEngine: ConditionEngine;
  let metaWhatsApp: MetaWhatsAppAdapter;
  let mockWhatsApp: MockWhatsAppAdapter;
  let resendEmail: ResendEmailAdapter;
  let mockEmail: MockEmailAdapter;
  let metrics: MetricsService;
  let queueService: AutomationQueueService;
  let providerRegistry: AutomationProviderRegistry;
  let processor: AutomationActionProcessor;

  beforeEach(() => {
    templateEngine = new TemplateEngine();
    conditionEngine = new ConditionEngine();
    metaWhatsApp = new MetaWhatsAppAdapter();
    mockWhatsApp = new MockWhatsAppAdapter();
    resendEmail = new ResendEmailAdapter();
    mockEmail = new MockEmailAdapter();
    metrics = new MetricsService();

    // Mock Bull Queue
    const mockBullQueue: any = {
      client: { status: 'offline' },
      on: jest.fn(),
      add: jest.fn(),
    };

    queueService = new AutomationQueueService(mockBullQueue, metrics);
    (queueService as any).isRedisAvailable = false;

    // Prisma Mock with disconnected flag to test safe offline fallback
    const mockPrisma: any = {
      isConnected: false,
      lead: { findFirst: jest.fn() },
      call: { findFirst: jest.fn() },
      automationLog: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
      automationRule: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
      integration: { findUnique: jest.fn() },
    };

    const mockConfig: any = {
      get: jest.fn((key: string) => {
        if (key === 'WHATSAPP_APP_SECRET') return 'test_app_secret_123';
        if (key === 'WHATSAPP_VERIFY_TOKEN') return 'test_verify_token_123';
        return undefined;
      }),
    };

    providerRegistry = new AutomationProviderRegistry(
      mockPrisma,
      mockConfig,
      metaWhatsApp,
      mockWhatsApp,
      resendEmail,
      mockEmail,
    );

    const mockGateway: any = {
      server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    };

    processor = new AutomationActionProcessor(
      mockPrisma,
      mockGateway,
      metrics,
      queueService,
      providerRegistry,
      templateEngine,
    );
    processor.onModuleInit();
  });

  // ── 1. TEMPLATE ENGINE & INJECTION DEFENSE ──────────────────
  describe('1. Template Engine & Security Defense', () => {
    it('should replace whitelisted variables correctly', () => {
      const template = 'Hello {{lead.name}} from {{lead.company}}! Your score is {{analysis.leadScore}}.';
      const context = {
        lead: { name: 'Sarah Connor', company: 'Cyberdyne Systems' },
        analysis: { leadScore: 92 },
      };
      const rendered = templateEngine.render(template, context);
      expect(rendered).toBe('Hello Sarah Connor from Cyberdyne Systems! Your score is 92.');
    });

    it('should handle legacy shorthand aliases {{name}}, {{company}}, {{phone}}', () => {
      const template = 'Hi {{name}}, we received your request for {{company}} at {{phone}}.';
      const context = {
        lead: { name: 'John Doe', company: 'Acme', phone: '+1234567890' },
      };
      const rendered = templateEngine.render(template, context);
      expect(rendered).toBe('Hi John Doe, we received your request for Acme at +1234567890.');
    });

    it('should neutralize template injection attempts to access process.env or credentials', () => {
      const template = 'Secret: {{process.env.SECRET}} DB: {{database.password}} Token: {{lead.token}}';
      const context = {
        process: { env: { SECRET: 'SUPER_SECRET' } },
        database: { password: 'db_secret_password' },
        lead: { name: 'Alice', token: 'jwt.token.here' },
      };
      const rendered = templateEngine.render(template, context);
      expect(rendered).not.toContain('SUPER_SECRET');
      expect(rendered).not.toContain('db_secret_password');
      expect(rendered).not.toContain('jwt.token.here');
    });

    it('should strip CRLF carriage returns from header fields (Header Injection defense)', () => {
      const maliciousSubject = 'Normal Subject\r\nBcc: victim@example.com\r\n\r\nInjected body';
      const cleaned = templateEngine.sanitizeHeader(maliciousSubject);
      expect(cleaned).not.toContain('\r');
      expect(cleaned).not.toContain('\n');
      expect(cleaned).toBe('Normal Subject  Bcc: victim@example.com    Injected body');
    });

    it('should sanitize HTML templates to strip executable script tags', () => {
      const unsafeHtml = '<p>Hello</p><script>alert("xss")</script><a href="javascript:steal()">Click</a>';
      const sanitized = templateEngine.sanitizeHtml(unsafeHtml);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("xss")');
      expect(sanitized).not.toContain('javascript:steal()');
    });
  });

  // ── 2. DECLARATIVE CONDITION ENGINE ─────────────────────────
  describe('2. Declarative Condition Engine', () => {
    it('should evaluate numeric comparisons (>=, >, <, <=)', () => {
      const context = { analysis: { leadScore: 85 } };
      expect(conditionEngine.evaluate([{ field: 'leadScore', operator: '>=', value: 75 }], context)).toBe(true);
      expect(conditionEngine.evaluate([{ field: 'leadScore', operator: '>', value: 85 }], context)).toBe(false);
      expect(conditionEngine.evaluate([{ field: 'leadScore', operator: '<=', value: 90 }], context)).toBe(true);
      expect(conditionEngine.evaluate([{ field: 'leadScore', operator: '<', value: 80 }], context)).toBe(false);
    });

    it('should evaluate equality and string matching (==, !=, contains)', () => {
      const context = {
        analysis: { intent: 'appointment_scheduled', sentiment: 'positive' },
        lead: { status: 'qualified' },
      };
      expect(conditionEngine.evaluate([{ field: 'intent', operator: '==', value: 'appointment_scheduled' }], context)).toBe(true);
      expect(conditionEngine.evaluate([{ field: 'sentiment', operator: '!=', value: 'negative' }], context)).toBe(true);
      expect(conditionEngine.evaluate([{ field: 'intent', operator: 'contains', value: 'appointment' }], context)).toBe(true);
      expect(conditionEngine.evaluate([{ field: 'status', operator: '==', value: 'qualified' }], context)).toBe(true);
    });

    it('should evaluate compound conditions with AND / OR logic', () => {
      const context = {
        analysis: { leadScore: 65, intent: 'demo_request' },
      };

      // AND: should fail because score is not >= 75
      const andGroup = {
        logic: 'AND' as const,
        conditions: [
          { field: 'leadScore', operator: '>=' as const, value: 75 },
          { field: 'intent', operator: '==' as const, value: 'demo_request' },
        ],
      };
      expect(conditionEngine.evaluate(andGroup, context)).toBe(false);

      // OR: should pass because intent matches
      const orGroup = {
        logic: 'OR' as const,
        conditions: [
          { field: 'leadScore', operator: '>=' as const, value: 75 },
          { field: 'intent', operator: '==' as const, value: 'demo_request' },
        ],
      };
      expect(conditionEngine.evaluate(orGroup, context)).toBe(true);
    });
  });

  // ── 3. META WHATSAPP CLOUD API PROVIDER ─────────────────────
  describe('3. Meta WhatsApp Cloud API Provider & Security', () => {
    it('should validate valid HMAC-SHA256 signatures and reject forged ones', () => {
      const secret = 'app_secret_test_2026';
      const rawPayload = JSON.stringify({ event: 'status_update', id: '123' });

      // Generate correct signature
      const validHmac = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
      const validHeader = `sha256=${validHmac}`;

      expect(metaWhatsApp.validateWebhookSignature(validHeader, rawPayload, secret)).toBe(true);

      // Tampered payload
      expect(metaWhatsApp.validateWebhookSignature(validHeader, rawPayload + 'tamper', secret)).toBe(false);

      // Forged signature
      expect(metaWhatsApp.validateWebhookSignature('sha256=forged_hex_signature', rawPayload, secret)).toBe(false);
      expect(metaWhatsApp.validateWebhookSignature('', rawPayload, secret)).toBe(false);
    });

    it('should parse Meta webhook status events accurately', () => {
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: { display_phone_number: '1234567890', phone_number_id: '987654321' },
                  statuses: [
                    {
                      id: 'wamid.HBgLM...==',
                      status: 'delivered',
                      timestamp: '1725800000',
                      recipient_id: '919876543210',
                    },
                    {
                      id: 'wamid.FAILED...==',
                      status: 'failed',
                      timestamp: '1725800010',
                      recipient_id: '919876543211',
                      errors: [{ code: 131026, title: 'Message Undeliverable' }],
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const parsed = metaWhatsApp.parseWebhookStatuses(webhookPayload);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].status).toBe('delivered');
      expect(parsed[0].messageId).toBe('wamid.HBgLM...==');
      expect(parsed[1].status).toBe('failed');
      expect(parsed[1].error?.code).toBe(131026);
    });

    it('should execute Mock WhatsApp adapter in deterministic success and rate-limit modes', async () => {
      mockWhatsApp.reset();
      mockWhatsApp.setMode('success');

      const successRes = await mockWhatsApp.sendMessage({}, {
        to: '+919876543210',
        textBody: 'Hello World',
      });
      expect(successRes.success).toBe(true);
      expect(successRes.providerMessageId).toMatch(/^wamid\.mock_/);
      expect(successRes.status).toBe('sent');

      mockWhatsApp.setMode('rate_limit');
      const rateLimitRes = await mockWhatsApp.sendMessage({}, {
        to: '+919876543210',
        textBody: 'Hello World',
      });
      expect(rateLimitRes.success).toBe(false);
      expect(rateLimitRes.isRetryable).toBe(true);
      expect(rateLimitRes.error).toContain('rate limit');
    });
  });

  // ── 4. RESEND EMAIL PROVIDER ────────────────────────────────
  describe('4. Resend Email Provider & Safety', () => {
    it('should reject invalid recipient email format before dispatch', async () => {
      const res = await resendEmail.sendEmail({ apiKey: 're_test_key' }, {
        to: 'invalid-email-address',
        subject: 'Test',
        text: 'Body',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Invalid recipient email address');
      expect(res.isRetryable).toBe(false);
    });

    it('should reject execution when Resend API key is unconfigured', async () => {
      const res = await resendEmail.sendEmail({}, {
        to: 'valid@example.com',
        subject: 'Test',
        text: 'Body',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('API key is unconfigured');
    });

    it('should execute Mock Email adapter in deterministic success and invalid_credentials modes', async () => {
      mockEmail.reset();
      mockEmail.setMode('success');

      const successRes = await mockEmail.sendEmail({}, {
        to: 'client@example.com',
        subject: 'Appointment Booked',
        text: 'Your demo is confirmed.',
      });
      expect(successRes.success).toBe(true);
      expect(successRes.providerMessageId).toMatch(/^resend_mock_/);

      mockEmail.setMode('invalid_credentials');
      const authRes = await mockEmail.sendEmail({}, {
        to: 'client@example.com',
        subject: 'Test',
        text: 'Body',
      });
      expect(authRes.success).toBe(false);
      expect(authRes.isRetryable).toBe(false);
      expect(authRes.error).toContain('Invalid API key');
    });
  });

  // ── 5. QUEUE, IDEMPOTENCY & OFFLINE FALLBACK ────────────────
  describe('5. Automation Queue, Deduplication & Resilience', () => {
    it('should generate deterministic job IDs for idempotency deduplication', () => {
      const data1 = {
        tenantId: 'tenant_abc',
        automationRuleId: 'rule_123',
        triggerEventId: 'call_999',
        triggerName: 'call_completed',
        leadId: 'lead_456',
        actionType: 'send_whatsapp' as const,
      };

      const data2 = { ...data1 };
      const jobId1 = queueService.generateJobId(data1);
      const jobId2 = queueService.generateJobId(data2);

      expect(jobId1).toBe(jobId2);
      expect(jobId1).toHaveLength(24);
    });

    it('should suppress duplicate enqueue attempts with identical parameters', async () => {
      const jobData = {
        tenantId: 'tenant_xyz',
        automationRuleId: 'rule_dedup',
        triggerEventId: 'event_1',
        triggerName: 'lead_qualified',
        leadId: 'lead_1',
        actionType: 'send_email' as const,
      };

      const first = await queueService.enqueueAction(jobData);
      expect(first.queued).toBe(true);

      const second = await queueService.enqueueAction(jobData);
      expect(second.queued).toBe(false);
    });

    it('should operate in in-memory offline fallback mode when Redis is offline', async () => {
      expect(queueService.isRedisAvailable).toBe(false);

      let executed = false;
      queueService.setInMemoryProcessor(async (data) => {
        if (data.leadId === 'lead_in_memory') {
          executed = true;
        }
      });

      await queueService.enqueueAction({
        tenantId: 'tenant_mem',
        triggerEventId: 'ev_mem_1',
        triggerName: 'test',
        leadId: 'lead_in_memory',
        actionType: 'send_whatsapp',
      });

      // Wait a tick for in-memory queue processing
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(executed).toBe(true);
    });
  });

  // ── 6. COMPLIANCE & DND OPT-OUT SAFETY ──────────────────────
  describe('6. DND & Opt-Out Enforcement', () => {
    it('should suppress outbound automation if lead is marked as DND/Opt-Out', async () => {
      mockWhatsApp.reset();
      const jobWithDnd: any = {
        tenantId: 'tenant_dnd',
        triggerEventId: 'dnd_ev_1',
        triggerName: 'lead_qualified',
        leadId: 'lead_dnd_optout',
        actionType: 'send_whatsapp',
      };

      // Mock lead with DND active
      const dndPrisma: any = {
        isConnected: true,
        lead: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'lead_dnd_optout',
            tenantId: 'tenant_dnd',
            phone: '+919876543210',
            metadata: { isDnd: true },
          }),
        },
        automationLog: { create: jest.fn() },
      };

      const dndProcessor = new AutomationActionProcessor(
        dndPrisma,
        { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } } as any,
        metrics,
        queueService,
        providerRegistry,
        templateEngine,
      );

      await dndProcessor.processJob(jobWithDnd);

      // Verify no message was dispatched to WhatsApp provider
      expect(mockWhatsApp.sentMessages).toHaveLength(0);
      expect(dndPrisma.automationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            message: expect.stringContaining('DND/Opt-Out active'),
          }),
        }),
      );
    });
  });

  // ── 7. TENANT ISOLATION ─────────────────────────────────────
  describe('7. Multi-Tenant Isolation', () => {
    it('should ensure tenantId scoping on all automation executions', async () => {
      const tenantAPrisma: any = {
        isConnected: true,
        lead: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.tenantId === 'tenant_A' && where.id === 'lead_1') {
              return Promise.resolve({ id: 'lead_1', tenantId: 'tenant_A', phone: '+1234567890' });
            }
            return Promise.resolve(null);
          }),
        },
        automationLog: { create: jest.fn() },
      };

      const tenantProcessor = new AutomationActionProcessor(
        tenantAPrisma,
        { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } } as any,
        metrics,
        queueService,
        providerRegistry,
        templateEngine,
      );

      // Attempting to access Tenant A's lead using Tenant B context must return null
      await tenantProcessor.processJob({
        tenantId: 'tenant_B', // Wrong tenant!
        leadId: 'lead_1',     // Belongs to Tenant A
        triggerEventId: 'ev_cross_1',
        triggerName: 'cross_tenant_test',
        actionType: 'send_whatsapp',
      });

      // findFirst should have been called with where.tenantId = 'tenant_B'
      expect(tenantAPrisma.lead.findFirst).toHaveBeenCalledWith({
        where: { id: 'lead_1', tenantId: 'tenant_B' },
      });
    });
  });
});
