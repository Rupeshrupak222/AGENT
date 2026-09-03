import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { DeepgramSTTProvider } from './stt/deepgram-stt.provider';
import { GroqAgentBrainService } from './brain/groq-agent-brain.service';
import { EdgeTTSProvider } from './tts/edge-tts.provider';
import { ConversationOrchestrator } from './orchestrator/conversation.orchestrator';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    DeepgramSTTProvider,
    GroqAgentBrainService,
    EdgeTTSProvider,
    ConversationOrchestrator,
  ],
  exports: [
    DeepgramSTTProvider,
    GroqAgentBrainService,
    EdgeTTSProvider,
    ConversationOrchestrator,
  ],
})
export class AiModule {}
