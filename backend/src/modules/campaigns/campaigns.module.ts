import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './services/campaigns.service';
import { CampaignEligibilityService } from './services/campaign-eligibility.service';
import { CampaignQueueService } from './services/campaign-queue.service';
import { OutboundCallProcessor } from './processors/outbound-call.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { TelephonyModule } from '../telephony/telephony.module';
import { CallsModule } from '../calls/calls.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => TelephonyModule),
    forwardRef(() => CallsModule),
    BullModule.registerQueue({
      name: 'outbound-calls',
    }),
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    CampaignEligibilityService,
    CampaignQueueService,
    OutboundCallProcessor,
  ],
  exports: [
    CampaignsService,
    CampaignQueueService,
    CampaignEligibilityService,
  ],
})
export class CampaignsModule {}
