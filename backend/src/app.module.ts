import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { RbacModule } from './common/rbac/rbac.module';
import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    // ── Config ────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),

    // ── Rate Limiting ─────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => [
        { ttl: cfg.get('THROTTLE_TTL', 60), limit: cfg.get('THROTTLE_LIMIT', 100) },
      ],
    }),

    // ── Background Jobs ───────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
          password: cfg.get('REDIS_PASSWORD') || undefined,
          lazyConnect: true,
          retryStrategy: () => null,
        },
      }),
    }),

    // ── Scheduler ─────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── RBAC ──────────────────────────────────────────────────
    RbacModule,

    // ── Feature Modules ───────────────────────────────────────
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
  ],
})
export class AppModule {}
