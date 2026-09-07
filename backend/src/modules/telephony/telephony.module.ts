import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TelephonyController } from './telephony.controller';
import { TelephonyService } from './services/telephony.service';
import { AudioSessionService } from './services/audio-session.service';
import { CallInsightsService } from './services/call-insights.service';
import { RecordingQueueService } from './services/recording-queue.service';
import { RecordingProcessor } from './processors/recording.processor';
import { TelephonyProviderRegistry } from './providers/provider-registry.service';
import { TwilioTelephonyProvider } from './providers/twilio.provider';
import { ExotelTelephonyProvider } from './providers/exotel.provider';
import { TelephonyMediaGateway } from './gateway/telephony-media.gateway';
import { AiModule } from '../ai/ai.module';
import { AudioFormatConverterService } from './services/audio-format-converter.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    AiModule,
    StorageModule,
    BullModule.registerQueue({
      name: 'recording-processing',
    }),
  ],
  controllers: [TelephonyController],
  providers: [
    TelephonyService,
    AudioSessionService,
    CallInsightsService,
    RecordingQueueService,
    RecordingProcessor,
    TelephonyProviderRegistry,
    TwilioTelephonyProvider,
    ExotelTelephonyProvider,
    TelephonyMediaGateway,
    AudioFormatConverterService,
  ],
  exports: [
    TelephonyService,
    AudioSessionService,
    CallInsightsService,
    RecordingQueueService,
    RecordingProcessor,
    TelephonyProviderRegistry,
    TelephonyMediaGateway,
    AudioFormatConverterService,
  ],
})
export class TelephonyModule {}
