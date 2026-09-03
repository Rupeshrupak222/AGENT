import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { CallsGateway } from './calls.gateway';
import { AuditModule } from '../audit/audit.module';
import { TelephonyModule } from '../telephony/telephony.module';

@Module({
  imports: [AuditModule, TelephonyModule],
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService, CallsGateway],
})
export class CallsModule {}
