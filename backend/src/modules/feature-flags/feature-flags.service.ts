import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Fallback defaults used when the flag table is empty or the DB is offline.
 * Missing flags intentionally default to ENABLED (fail-open) so a freshly
 * deployed workspace keeps working until a super admin toggles a flag off.
 */
const DEFAULT_FLAGS: Record<string, boolean> = {
  voice_ai: true,
  knowledge_rag: true,
  whatsapp_automation: true,
  email_automation: true,
  call_analysis: true,
  barge_mode: true,
  scheduled_reports: true,
};

interface FlagConfig {
  isEnabled: boolean;
  rollout: number;
  tenantOverride: Record<string, boolean>;
}

@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private static readonly CACHE_TTL_MS = 10_000;

  private cache: { flags: Record<string, FlagConfig>; at: number } | null = null;

  constructor(private prisma: PrismaService) {}

  private async getFlags(): Promise<Record<string, FlagConfig>> {
    if (this.cache && Date.now() - this.cache.at < FeatureFlagsService.CACHE_TTL_MS) {
      return this.cache.flags;
    }
    try {
      const rows = await this.prisma.featureFlag.findMany();
      const flags: Record<string, FlagConfig> = {};
      for (const row of rows) {
        flags[row.key] = {
          isEnabled: row.isEnabled,
          rollout: row.rollout,
          tenantOverride: (row.tenantOverride ?? {}) as Record<string, boolean>,
        };
      }
      this.cache = { flags, at: Date.now() };
      return flags;
    } catch (err: any) {
      this.logger.warn(`Feature flag DB lookup failed, using defaults: ${err.message}`);
      return {};
    }
  }

  /**
   * Resolve whether a feature is enabled for a workspace.
   * Unknown/absent flags fall back to DEFAULT_FLAGS (fail-open).
   */
  async isEnabled(key: string, tenantId?: string): Promise<boolean> {
    const flags = await this.getFlags();
    const cfg = flags[key] ?? { isEnabled: DEFAULT_FLAGS[key], rollout: 100, tenantOverride: {} };
    if (DEFAULT_FLAGS[key] === undefined && !flags[key]) return true;

    if (!cfg.isEnabled) return false;

    // Per-tenant override takes precedence.
    if (tenantId && cfg.tenantOverride[tenantId] !== undefined) {
      return cfg.tenantOverride[tenantId];
    }

    // Rollout: bucket the workspace deterministically.
    const bucket = this.hash(`${tenantId ?? 'global'}:${key}`) % 100;
    return bucket < cfg.rollout;
  }

  /** Throw if a feature is disabled for the workspace. */
  async requireEnabled(key: string, tenantId: string, message?: string): Promise<void> {
    if (!(await this.isEnabled(key, tenantId))) {
      throw new ForbiddenException(message ?? `This feature is currently disabled for your workspace`);
    }
  }

  private hash(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
}