import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { GroqAgentBrainService } from '../ai/brain/groq-agent-brain.service';
import { EdgeTTSProvider } from '../ai/tts/edge-tts.provider';
import { ScopedActor, agentScope, isManager } from '../../common/scope';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private brain: GroqAgentBrainService,
    private tts: EdgeTTSProvider,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateAgentDto, actor?: ScopedActor) {
    const agent = await this.prisma.aIAgent.create({
      data: {
        ...dto,
        tenantId,
        createdById: userId,
        status: 'draft',
        ...(actor && isManager(actor) ? { managerId: actor.id } : {}),
      },
    });

    this.auditService.log({
      action: 'AI_AGENT_CREATED',
      resource: 'ai_agent',
      resourceId: agent.id,
      details: { name: agent.name, role: agent.role },
      tenantId,
      userId,
    });

    return agent;
  }

  async findAll(tenantId: string, filters?: { status?: string; role?: string }, actor?: ScopedActor) {
    try {
      return await this.prisma.aIAgent.findMany({
        where: {
          tenantId,
          deletedAt: null,
          ...agentScope(actor),
          ...(filters?.status && { status: filters.status as any }),
          ...(filters?.role && { role: filters.role as any }),
        },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { calls: true, campaigns: true } } },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to query agents: ${err.message}`);
      return [];
    }
  }

  async findAllPlatform() {
    try {
      return await this.prisma.aIAgent.findMany({
        where: { deletedAt: null },
        include: {
          tenant: {
            select: { id: true, name: true, slug: true, plan: true },
          },
          _count: { select: { calls: true, campaigns: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to query platform agents: ${err.message}`);
      return [];
    }
  }

  async findOne(tenantId: string, id: string, actor?: ScopedActor) {
    const agent = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null, ...agentScope(actor) },
      include: {
        _count: { select: { calls: true } },
        campaigns: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto, actor?: ScopedActor) {
    const existing = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null, ...agentScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Agent not found');

    const result = await this.prisma.tenantUpdate(
      this.prisma.aIAgent,
      tenantId,
      id,
      dto as any,
    );

    this.auditService.log({
      action: 'AI_AGENT_UPDATED',
      resource: 'ai_agent',
      resourceId: id,
      details: { changes: Object.keys(dto) },
      tenantId,
    });

    return result;
  }

  async remove(tenantId: string, id: string, actor?: ScopedActor) {
    const existing = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null, ...agentScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Agent not found');

    const result = await this.prisma.tenantSoftDelete(
      this.prisma.aIAgent,
      tenantId,
      id,
    );

    this.auditService.log({
      action: 'AI_AGENT_DELETED',
      resource: 'ai_agent',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async activate(tenantId: string, id: string, actor?: ScopedActor) {
    const existing = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null, ...agentScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Agent not found');

    const result = await this.prisma.tenantUpdate(
      this.prisma.aIAgent,
      tenantId,
      id,
      { status: 'active' },
    );

    this.auditService.log({
      action: 'AI_AGENT_ACTIVATED',
      resource: 'ai_agent',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async pause(tenantId: string, id: string, actor?: ScopedActor) {
    const existing = await this.prisma.aIAgent.findFirst({
      where: { id, tenantId, deletedAt: null, ...agentScope(actor) },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Agent not found');

    const result = await this.prisma.tenantUpdate(
      this.prisma.aIAgent,
      tenantId,
      id,
      { status: 'paused' },
    );

    this.auditService.log({
      action: 'AI_AGENT_PAUSED',
      resource: 'ai_agent',
      resourceId: id,
      tenantId,
    });

    return result;
  }

  async getStats(tenantId: string, id: string, actor?: ScopedActor) {
    try {
      await this.findOne(tenantId, id, actor);
      const [totalCalls, connectedCalls, qualifiedLeads] = await Promise.all([
        this.prisma.call.count({ where: { agentId: id, tenantId } }),
        this.prisma.call.count({ where: { agentId: id, tenantId, status: 'completed' } }),
        this.prisma.lead.count({ where: { tenantId, assignedAgentId: id, status: 'qualified' } }),
      ]);

      const avgDuration = await this.prisma.call.aggregate({
        where: { agentId: id, tenantId, status: 'completed' },
        _avg: { duration: true },
      });

      return {
        totalCalls,
        connectedCalls,
        qualifiedLeads,
        conversionRate: totalCalls ? ((qualifiedLeads / totalCalls) * 100).toFixed(1) : '0',
        avgCallDuration: Math.round(avgDuration._avg.duration ?? 0),
      };
    } catch (err: any) {
      this.logger.warn(`Failed to query agent stats: ${err.message}`);
      return {
        totalCalls: 0,
        connectedCalls: 0,
        qualifiedLeads: 0,
        conversionRate: '0',
        avgCallDuration: 0,
      };
    }
  }

  async duplicate(tenantId: string, id: string, userId: string, actor?: ScopedActor) {
    const agent = await this.findOne(tenantId, id, actor);
    const { id: _, createdAt, updatedAt, _count, campaigns, ...rest } = agent as any;
    const newAgent = await this.prisma.aIAgent.create({
      data: {
        ...rest,
        name: `${agent.name} (Copy)`,
        status: 'draft',
        tenantId,
        createdById: userId,
        ...(actor && isManager(actor) ? { managerId: actor.id } : {}),
      },
    });

    this.auditService.log({
      action: 'AI_AGENT_DUPLICATED',
      resource: 'ai_agent',
      resourceId: newAgent.id,
      details: { sourceId: id, name: newAgent.name },
      tenantId,
      userId,
    });

    return newAgent;
  }

  /**
   * Interactive voice & chat simulation turn for AI Agent Studio.
   */
  async testChat(
    tenantId: string,
    id: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    actor?: ScopedActor,
  ) {
    const agent = await this.findOne(tenantId, id, actor);
    const t0 = Date.now();

    // 1. Build conversational turn input conforming to AgentTurnInput
    const conversationHistory = history.map((h, idx) => ({
      speaker: (h.role === 'assistant' ? 'agent' : 'user') as 'agent' | 'user',
      content: h.content,
      timestamp: Date.now() - (history.length - idx) * 1000,
    }));

    // 2. Generate LLM response
    const llmT0 = Date.now();
    const brainTurn = await this.brain.generateResponse({
      sessionId: `test-sim-${agent.id}`,
      callId: `test-sim-${Date.now()}`,
      context: {
        tenantId,
        agentId: agent.id,
        businessGoal: agent.businessGoal || undefined,
        openingScript: agent.openingScript || undefined,
        qualificationRules: agent.qualificationRules || undefined,
        knowledgeBase: agent.knowledgeBase || undefined,
      },
      userMessage,
      history: conversationHistory,
    });
    const llmLatencyMs = Math.max(1, Date.now() - llmT0);
    const replyText = brainTurn.responseText;

    // 3. Generate Edge-TTS Speech Audio
    const ttsT0 = Date.now();
    let audioBase64: string | null = null;
    try {
      const voiceId = this.mapVoiceToEdgeTTS(agent.voiceId, agent.language);
      const synthResult = await this.tts.synthesize(replyText, { voiceId });
      if (synthResult.audioBuffer && synthResult.audioBuffer.length > 0) {
        audioBase64 = `data:audio/mp3;base64,${synthResult.audioBuffer.toString('base64')}`;
      }
    } catch (ttsErr: any) {
      this.logger.warn(`EdgeTTS synthesis warning in testChat: ${ttsErr.message}`);
    }
    const ttsLatencyMs = Math.max(1, Date.now() - ttsT0);
    const totalLatencyMs = Math.max(1, Date.now() - t0);

    return {
      agentId: agent.id,
      agentName: agent.name,
      role: agent.role,
      language: agent.language,
      voiceId: agent.voiceId,
      replyText,
      audioBase64,
      totalLatencyMs,
      metrics: {
        llmLatencyMs,
        ttsLatencyMs,
      },
    };
  }

  private mapVoiceToEdgeTTS(voiceId?: string | null, language?: string | null): string {
    const v = (voiceId || '').toLowerCase();
    const l = (language || '').toLowerCase();

    if (v.includes('priya') || l.includes('hindi') || l.includes('hinglish')) {
      return 'hi-IN-SwaraNeural';
    }
    if (v.includes('arjun') || v.includes('ravi') || l.includes('marathi')) {
      return 'hi-IN-MadhurNeural';
    }
    if (l.includes('tamil')) return 'ta-IN-PallaviNeural';
    if (l.includes('telugu')) return 'te-IN-ShrutiNeural';
    if (l.includes('bengali')) return 'bn-IN-TanishaaNeural';
    if (l.includes('gujarati')) return 'gu-IN-DhwaniNeural';
    return 'en-IN-NeerjaNeural';
  }
}
