import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { AuditModule } from '../audit/audit.module';
import { TelephonyModule } from '../telephony/telephony.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AuditModule, TelephonyModule, AuthModule, StorageModule, AiModule],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService, CallsGateway],
})
export class CallsModule {}