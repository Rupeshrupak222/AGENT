import { Module }          from '@nestjs/common';
import { CallsService }    from './calls.service';
import { CallsController } from './calls.controller';
import { CallsGateway }    from './calls.gateway';

@Module({
  providers: [CallsService, CallsGateway],
  controllers: [CallsController],
  exports: [CallsService, CallsGateway],
})
export class CallsModule {}
