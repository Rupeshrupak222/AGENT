import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { LeadsModule } from './modules/leads/leads.module';
import { CallsModule } from './modules/calls/calls.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BillingModule } from './modules/billing/billing.module';
import { AutomationsModule } from './modules/automations/automations.module';
import { AuditModule } from './modules/audit/audit.module';
import { VoicesModule } from './modules/voices/voices.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CacheModule } from './modules/cache/cache.module';
import { RbacModule } from './common/rbac/rbac.module';
import { TelephonyModule } from './modules/telephony/telephony.module';
import { AiModule } from './modules/ai/ai.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { StorageModule } from './modules/storage/storage.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { HealthModule } from './modules/health/health.module';
import { PlatformModule } from './modules/platform/platform.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { MetricsModule } from './common/services/metrics.module';
import { AppController } from './app.controller';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

@Module({
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  imports: [
    MetricsModule,
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        { ttl: cfg.get('THROTTLE_TTL', 60), limit: cfg.get('THROTTLE_LIMIT', 100) },
      ],
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        createClient: (_type, redisOpts) => {
          const Redis = require('ioredis');
          const client = new Redis({
            ...redisOpts,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            retryStrategy: (times: number) => Math.min(times * 100, 2000),
          });
          client.on('error', () => {});
          return client;
        },
      }),
    }),

    ScheduleModule.forRoot(),

    RbacModule,

    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    LeadsModule,
    CallsModule,
    AnalyticsModule,
    BillingModule,
    AutomationsModule,
    AuditModule,
    VoicesModule,
    CalendarModule,
    CacheModule,
    TelephonyModule,
    AiModule,
    CampaignsModule,
    StorageModule,
    IntegrationsModule,
    HealthModule,
    PlatformModule,
    ResourcesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*');
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes('*');
  }
}
