import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { DeepgramSTTProvider } from './stt/deepgram-stt.provider';
import { GroqAgentBrainService } from './brain/groq-agent-brain.service';
import { EdgeTTSProvider } from './tts/edge-tts.provider';
import { ConversationOrchestrator } from './orchestrator/conversation.orchestrator';
import { AudioFormatConverterService } from '../telephony/services/audio-format-converter.service';
import { GeminiPostCallProvider } from './providers/gemini-post-call.provider';
import { PostCallQueueService } from './services/post-call-queue.service';
import { PostCallProcessor } from './processors/post-call.processor';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    BullModule.registerQueue({
      name: 'post-call-analysis',
    }),
  ],
  providers: [
    DeepgramSTTProvider,
    GroqAgentBrainService,
    EdgeTTSProvider,
    ConversationOrchestrator,
    AudioFormatConverterService,
    GeminiPostCallProvider,
    PostCallQueueService,
    PostCallProcessor,
  ],
  exports: [
    DeepgramSTTProvider,
    GroqAgentBrainService,
    EdgeTTSProvider,
    ConversationOrchestrator,
    AudioFormatConverterService,
    GeminiPostCallProvider,
    PostCallQueueService,
    PostCallProcessor,
  ],
})
export class AiModule {}
