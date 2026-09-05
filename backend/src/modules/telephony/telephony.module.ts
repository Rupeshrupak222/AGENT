import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { TelephonyController } from './telephony.controller';
import { TelephonyService } from './services/telephony.service';
import { AudioSessionService } from './services/audio-session.service';
import { TelephonyProviderRegistry } from './providers/provider-registry.service';
import { TwilioTelephonyProvider } from './providers/twilio.provider';
import { ExotelTelephonyProvider } from './providers/exotel.provider';
import { TelephonyMediaGateway } from './gateway/telephony-media.gateway';

import { AiModule } from '../ai/ai.module';

import { AudioFormatConverterService } from './services/audio-format-converter.service';

@Module({
  imports: [PrismaModule, ConfigModule, AiModule],
  controllers: [TelephonyController],
  providers: [
    TelephonyService,
    AudioSessionService,
    TelephonyProviderRegistry,
    TwilioTelephonyProvider,
    ExotelTelephonyProvider,
    TelephonyMediaGateway,
    AudioFormatConverterService,
  ],
  exports: [
    TelephonyService,
    AudioSessionService,
    TelephonyProviderRegistry,
    TelephonyMediaGateway,
    AudioFormatConverterService,
  ],
})
export class TelephonyModule {}
