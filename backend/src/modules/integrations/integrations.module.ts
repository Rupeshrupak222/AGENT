import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { CallsModule } from '../calls/calls.module';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { CrmQueueService } from './services/crm-queue.service';
import { CrmSyncProcessor } from './processors/crm-sync.processor';
import { MockCrmAdapter } from './adapters/mock-crm.adapter';
import { HubSpotAdapter } from './adapters/hubspot.adapter';
import { SalesforceAdapter } from './adapters/salesforce.adapter';
import { ZohoAdapter } from './adapters/zoho.adapter';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CallsModule),
    BullModule.registerQueue({
      name: 'crm-sync',
    }),
  ],
  controllers: [IntegrationsController],
  providers: [
    IntegrationsService,
    CrmQueueService,
    CrmSyncProcessor,
    MockCrmAdapter,
    HubSpotAdapter,
    SalesforceAdapter,
    ZohoAdapter,
  ],
  exports: [
    IntegrationsService,
    CrmQueueService,
    CrmSyncProcessor,
    MockCrmAdapter,
    HubSpotAdapter,
    SalesforceAdapter,
    ZohoAdapter,
  ],
})
export class IntegrationsModule {}
