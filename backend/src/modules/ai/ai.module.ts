import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { DeepgramSTTProvider } from './stt/deepgram-stt.provider';
import { GroqAgentBrainService } from './brain/groq-agent-brain.service';
import { EdgeTTSProvider } from './tts/edge-tts.provider';
import { ConversationOrchestrator } from './orchestrator/conversation.orchestrator';

import { AudioFormatConverterService } from '../telephony/services/audio-format-converter.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    DeepgramSTTProvider,
    GroqAgentBrainService,
    EdgeTTSProvider,
    ConversationOrchestrator,
    AudioFormatConverterService,
  ],
  exports: [
    DeepgramSTTProvider,
    GroqAgentBrainService,
    EdgeTTSProvider,
    ConversationOrchestrator,
    AudioFormatConverterService,
  ],
})
export class AiModule {}
