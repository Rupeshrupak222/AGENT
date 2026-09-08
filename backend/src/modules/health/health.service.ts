import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, { status: string; latencyMs?: number; message?: string }>;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  getLiveness(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // PostgreSQL check
    const dbStart = Date.now();
    try {
      if (this.prisma.isConnected) {
        await this.prisma.$queryRaw`SELECT 1`;
        checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
      } else {
        checks.database = { status: 'disconnected', message: 'PostgreSQL not connected' };
        overallStatus = 'degraded';
      }
    } catch (err: any) {
      checks.database = { status: 'error', latencyMs: Date.now() - dbStart, message: err.message };
      overallStatus = 'degraded';
    }

    // Redis check via a short-lived ioredis PING (no persistent connection)
    const redisStart = Date.now();
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);
    let redisOk = false;
    try {
      const redis = new Redis({
        host: redisHost,
        port: redisPort,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
      });
      await redis.connect();
      await redis.ping();
      redisOk = true;
      await redis.quit();
    } catch (err: any) {
      checks.redis = {
        status: 'error',
        latencyMs: Date.now() - redisStart,
        message: err.message,
      };
      overallStatus = 'degraded';
    }
    if (redisOk) {
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    } else if (!checks.redis) {
      checks.redis = {
        status: 'error',
        latencyMs: Date.now() - redisStart,
        message: 'PING failed',
      };
    }

    // Telephony provider status (configuration only, no live call)
    const twilioConfigured = Boolean(
      this.configService.get<string>('TWILIO_ACCOUNT_SID') &&
        this.configService.get<string>('TWILIO_AUTH_TOKEN'),
    );
    checks.telephony = {
      status: twilioConfigured ? 'configured' : 'not_configured',
    };

    // AI providers status
    const groqConfigured = Boolean(this.configService.get<string>('GROQ_API_KEY'));
    const geminiConfigured = Boolean(this.configService.get<string>('GEMINI_API_KEY'));
    const deepgramConfigured = Boolean(this.configService.get<string>('DEEPGRAM_API_KEY'));
    checks.ai = {
      status:
        groqConfigured || geminiConfigured || deepgramConfigured ? 'configured' : 'not_configured',
      message: `groq:${groqConfigured ? 'on' : 'off'} gemini:${geminiConfigured ? 'on' : 'off'} deepgram:${deepgramConfigured ? 'on' : 'off'}`,
    };

    // Storage status
    const r2Configured = Boolean(
      this.configService.get<string>('R2_ACCESS_KEY_ID') ||
        this.configService.get<string>('AWS_ACCESS_KEY_ID'),
    );
    checks.storage = { status: r2Configured ? 'configured' : 'not_configured' };

    if (overallStatus === 'healthy' && checks.database.status !== 'ok') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async getDiagnostics(): Promise<Record<string, any>> {
    const readiness = await this.getReadiness();

    let queueStats: Record<string, any> = {};
    try {
      const { PostCallQueueService } = await import('../ai/services/post-call-queue.service');
      const { CrmQueueService } = await import('../integrations/services/crm-queue.service');
      const { CampaignQueueService } = await import('../campaigns/services/campaign-queue.service');
      const { RecordingQueueService } = await import('../telephony/services/recording-queue.service');
      queueStats = {
        'post-call-analysis': {
          failedJobs: PostCallQueueService.failedJobCount,
        },
        'crm-sync': {
          failedJobs: CrmQueueService.failedJobCount,
        },
        'outbound-calls': {
          failedJobs: CampaignQueueService.failedJobCount,
        },
        'recording-processing': {
          failedJobs: RecordingQueueService.failedJobCount,
        },
      };
    } catch {
      queueStats = { error: 'Queue stats unavailable' };
    }

    return {
      ...readiness,
      queueStats,
      environment: this.configService.get<string>('NODE_ENV', 'development'),
    };
  }
}
