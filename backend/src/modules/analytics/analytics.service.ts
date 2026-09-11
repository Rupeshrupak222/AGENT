import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS, isUnlimited } from '../../common/plans';

export type DashboardGranularity = 'hour' | 'day' | 'week' | 'month';
export type DashboardSeverity = 'critical' | 'warning' | 'info';

const GRANULARITY_SQL: Record<DashboardGranularity, string> = {
  hour:  'hour',
  day:   'day',
  week:  'week',
  month: 'month',
};

interface DateRange { from: Date; to: Date; label: string; }

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly EMPTY_KPIS = {
    totalCalls: 0, connectedCalls: 0, missedCalls: 0, failedCalls: 0, transferredCalls: 0,
    inboundCalls: 0, outboundCalls: 0, avgDuration: 0, totalMinutes: 0, connectRate: 0,
    qualifiedLeads: 0, appointments: 0, closedWon: 0, appointmentRate: 0, conversionRate: 0,
    avgSentiment: 0, aiAnalyses: 0,
  };

  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(tenantId: string, range: 'today' | 'week' | 'month' = 'week') {
    try {
      const now   = new Date();
      const start = range === 'today'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : range === 'week'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);

      const where = { tenantId, startedAt: { gte: start } };

      const [
        totalCalls, connected, qualified,
        appointments, closedWon, avgDuration, avgSentiment,
      ] = await Promise.all([
        this.prisma.call.count({ where }),
        this.prisma.call.count({ where: { ...where, status: 'completed' } }),
        this.prisma.lead.count({ where: { tenantId, status: 'qualified', updatedAt: { gte: start } } }),
        this.prisma.lead.count({ where: { tenantId, status: 'appointment', updatedAt: { gte: start } } }),
        this.prisma.lead.count({ where: { tenantId, status: 'closed_won', updatedAt: { gte: start } } }),
        this.prisma.call.aggregate({ where: { ...where, status: 'completed' }, _avg: { duration: true } }),
        this.prisma.call.aggregate({ where: { ...where, sentimentScore: { not: null } }, _avg: { sentimentScore: true } }),
      ]);

      return {
        totalCalls,
        connected,
        qualified,
        appointments,
        closedWon,
        connectRate:     totalCalls ? +((connected / totalCalls) * 100).toFixed(1) : 0,
        conversionRate:  totalCalls ? +((qualified / totalCalls) * 100).toFixed(1) : 0,
        avgDuration:     Math.round(avgDuration._avg.duration ?? 0),
        avgSentiment:    +(avgSentiment._avg.sentimentScore ?? 0).toFixed(2),
      };
    } catch (err: any) {
      this.logger.warn(`Failed to query database metrics (database offline): ${err.message}`);
      return {
        totalCalls: 0,
        connected: 0,
        qualified: 0,
        appointments: 0,
        closedWon: 0,
        connectRate: 0,
        conversionRate: 0,
        avgDuration: 0,
        avgSentiment: 0,
      };
    }
  }

  async getCallTrend(tenantId: string, days = 7) {
    try {
      const rows: any[] = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('day', "startedAt") AS day,
          COUNT(*)::int                  AS total_calls,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS connected,
          AVG("sentimentScore")          AS avg_sentiment
        FROM "Call"
        WHERE "tenantId" = ${tenantId}
          AND "startedAt" >= NOW() - (${days} * INTERVAL '1 day')
        GROUP BY 1
        ORDER BY 1
      `;
      return rows;
    } catch (err: any) {
      this.logger.warn(`Failed to query call trend: ${err.message}`);
      return [];
    }
  }

  async getAgentPerformance(tenantId: string) {
    try {
      const agents = await this.prisma.aIAgent.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          _count: { select: { calls: true } },
          calls: {
            where:   { status: 'completed' },
            select:  { duration: true, sentimentScore: true, qualityScore: true },
          },
        },
      });

      return agents.map((a: any) => {
        const completedCalls = a.calls.length;
        const avgDuration    = completedCalls ? a.calls.reduce((s: number, c: any) => s + (c.duration ?? 0), 0) / completedCalls : 0;
        const avgSentiment   = completedCalls ? a.calls.reduce((s: number, c: any) => s + (c.sentimentScore ?? 0), 0) / completedCalls : 0;
        const avgQuality     = completedCalls ? a.calls.reduce((s: number, c: any) => s + (c.qualityScore ?? 0), 0) / completedCalls : 0;

        return {
          id:            a.id,
          name:          a.name,
          role:          a.role,
          totalCalls:    a._count.calls,
          completedCalls,
          avgDuration:   Math.round(avgDuration),
          avgSentiment:  +avgSentiment.toFixed(2),
          avgQuality:    +avgQuality.toFixed(1),
        };
      });
    } catch (err: any) {
      this.logger.warn(`Failed to query agent performance: ${err.message}`);
      return [];
    }
  }

  async getConversionFunnel(tenantId: string) {
    try {
      const statuses = ['new','contacted','interested','qualified','appointment','closed_won','closed_lost'];
      const counts   = await this.prisma.lead.groupBy({
        by:    ['status'],
        where: { tenantId, deletedAt: null },
        _count: { status: true },
      });

      const map = counts.reduce((acc: Record<string, number>, c: any) => { acc[c.status] = c._count.status; return acc; }, {} as Record<string, number>);
      const total = Object.values(map).reduce((s: number, n: number) => s + n, 0);

      return statuses.map(s => ({
        stage: s,
        count: map[s] ?? 0,
        pct:   total ? +(((map[s] ?? 0) / (total as number)) * 100).toFixed(1) : 0,
      }));
    } catch (err: any) {
      this.logger.warn(`Failed to query conversion funnel: ${err.message}`);
      return [];
    }
  }

  async getSentimentDistribution(tenantId: string) {
    try {
      const buckets = await this.prisma.$queryRaw<any[]>`
        SELECT
          CASE
            WHEN "sentimentScore" >= 4.5 THEN 'very_positive'
            WHEN "sentimentScore" >= 3.5 THEN 'positive'
            WHEN "sentimentScore" >= 2.5 THEN 'neutral'
            WHEN "sentimentScore" >= 1.5 THEN 'negative'
            ELSE 'very_negative'
          END AS bucket,
          COUNT(*)::int AS count
        FROM "Call"
        WHERE "tenantId" = ${tenantId} AND "sentimentScore" IS NOT NULL
        GROUP BY 1
      `;
      return buckets;
    } catch (err: any) {
      this.logger.warn(`Failed to query sentiment distribution: ${err.message}`);
      return [];
    }
  }

  async getLeadPriorityStats(tenantId: string) {
    try {
      return await this.prisma.lead.groupBy({
        by:    ['score'],
        where: { tenantId, deletedAt: null },
        _count: { score: true },
        orderBy: { score: 'desc' },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to query lead priority stats: ${err.message}`);
      return [];
    }
  }

  // ── Company Admin Dashboard ─────────────────────────────────

  async getCompanyDashboard(tenantId: string, opts: {
    from?: string; to?: string; prevFrom?: string; prevTo?: string;
    granularity?: DashboardGranularity;
  }) {
    const granularity: DashboardGranularity =
      (opts?.granularity as DashboardGranularity) in GRANULARITY_SQL ? opts.granularity as DashboardGranularity : 'day';

    try {
      const current    = this.resolveRange(opts?.from, opts?.to);
      const previous   = this.resolveComparison(current, opts?.prevFrom, opts?.prevTo);
      const now        = new Date();

      const kpiShape = () => ({ ...this.EMPTY_KPIS });
      const [cur, prev, timeSeries, outcomes, agentPerformance, activeCampaigns, facts, alerts] = await Promise.all([
        this.computeKpis(tenantId, current),
        this.computeKpis(tenantId, previous),
        this.computeTimeSeries(tenantId, current, granularity),
        this.computeOutcomes(tenantId, current),
        this.computeAgentPerformance(tenantId, current),
        this.computeActiveCampaigns(tenantId),
        this.computeFacts(tenantId),
        this.computeAlerts(tenantId),
      ]);

      kpiShape();

      return {
        period:      { from: current.from.toISOString(), to: current.to.toISOString(), label: current.label },
        comparison:  { from: previous.from.toISOString(), to: previous.to.toISOString(), label: previous.label },
        granularity,
        kpis:        { current: cur, previous: prev },
        facts,
        timeSeries,
        outcomes,
        agentPerformance,
        teamPerformance: this.computeTeamPerformance(agentPerformance as any),
        activeCampaigns,
        alerts,
        generatedAt: now.toISOString(),
      };
    } catch (err: any) {
      this.logger.warn(`Failed to build company dashboard (database offline): ${err.message}`);
      return {
        period:    { from: new Date().toISOString(), to: new Date().toISOString(), label: '' },
        comparison: { from: new Date().toISOString(), to: new Date().toISOString(), label: '' },
        granularity,
        kpis:      { current: { ...this.EMPTY_KPIS }, previous: { ...this.EMPTY_KPIS } },
        facts:     { activeAgents: 0, teamMembers: 0 },
        timeSeries: [],
        outcomes:  [],
        agentPerformance: [],
        teamPerformance: [],
        activeCampaigns: [],
        alerts:    [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  private resolveRange(from?: string, to?: string): DateRange {
    const endOffset = 24 * 60 * 60 * 1000;
    let toDate: Date;
    let fromDate: Date;

    if (from && to) {
      fromDate = new Date(from);
      toDate   = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        fromDate = new Date(Date.now() - 29 * endOffset);
        toDate   = new Date();
      }
    } else {
      toDate   = new Date();
      fromDate = new Date(Date.now() - 29 * endOffset);
    }

    // Inclusive end-of-day boundary; cap range at 370 days to protect the DB.
    toDate = new Date(Math.min(toDate.getTime() + endOffset - 1, Date.now() + endOffset * 32));

    if (toDate.getTime() - fromDate.getTime() > 370 * endOffset) {
      fromDate = new Date(toDate.getTime() - 370 * endOffset);
    }

    if (fromDate.getTime() >= toDate.getTime()) {
      fromDate = new Date(toDate.getTime() - endOffset);
    }

    return {
      from:  fromDate,
      to:    toDate,
      label: `${fromDate.toISOString().slice(0, 10)} → ${toDate.toISOString().slice(0, 10)}`,
    };
  }

  private resolveComparison(current: DateRange, prevFrom?: string, prevTo?: string): DateRange {
    const length = current.to.getTime() - current.from.getTime();

    if (prevFrom && prevTo) {
      const prefix = this.resolveRange(prevFrom, prevTo);
      // clamp the comparison so it never overlaps the current window.
      prefix.to = new Date(Math.min(prefix.to.getTime(), current.from.getTime() - 1));
      if (prefix.to.getTime() - prefix.from.getTime() > 370 * 24 * 60 * 60 * 1000) {
        prefix.from = new Date(prefix.to.getTime() - 370 * 24 * 60 * 60 * 1000);
      }
      prefix.label = `comparison window`;
      return prefix;
    }

    const from = new Date(current.from.getTime() - length - 24 * 60 * 60 * 1000);
    const to   = new Date(current.from.getTime() - 1);
    return { from, to, label: `${from.toISOString().slice(0, 10)} → ${to.toISOString().slice(0, 10)}` };
  }

  private async computeKpis(tenantId: string, range: DateRange): Promise<typeof this.EMPTY_KPIS> {
    const where = { tenantId, startedAt: { gte: range.from, lte: range.to } };
    const leadWhere = { tenantId, deletedAt: null, updatedAt: { gte: range.from, lte: range.to } };

    const [
      totalCalls, connectedCalls, missedCalls, failedCalls, transferredCalls,
      inboundCalls, avgDuration, sentimentAgg,
      qualifiedLeads, appointments, closedWon,
      aiAnalyses,
    ] = await Promise.all([
      this.prisma.call.count({ where }),
      this.prisma.call.count({ where: { ...where, status: 'completed' } }),
      this.prisma.call.count({ where: { ...where, status: 'missed' } }),
      this.prisma.call.count({ where: { ...where, status: 'failed' } }),
      this.prisma.call.count({ where: { ...where, status: 'transferred' } }),
      this.prisma.call.count({ where: { ...where, direction: 'inbound' } }),
      this.prisma.call.aggregate({ where: { ...where, status: 'completed' }, _sum: { duration: true }, _avg: { duration: true } }),
      this.prisma.call.aggregate({ where: { ...where, sentimentScore: { not: null } }, _avg: { sentimentScore: true } }),
      this.prisma.lead.count({ where: { ...leadWhere, status: 'qualified' } }),
      this.prisma.lead.count({ where: { ...leadWhere, status: 'appointment' } }),
      this.prisma.lead.count({ where: { ...leadWhere, status: 'closed_won' } }),
      this.prisma.callAnalysis.count({ where: { tenantId, processedAt: { gte: range.from, lte: range.to }, processingStatus: 'completed' } }),
    ]);

    return {
      totalCalls,
      connectedCalls,
      missedCalls,
      failedCalls,
      transferredCalls,
      inboundCalls,
      outboundCalls: totalCalls - inboundCalls,
      avgDuration: Math.round(avgDuration._avg.duration ?? 0),
      totalMinutes: Math.round(((avgDuration._sum.duration ?? 0) / 60) * 10) / 10,
      connectRate: totalCalls ? +((connectedCalls / totalCalls) * 100).toFixed(1) : 0,
      qualifiedLeads,
      appointments,
      closedWon,
      appointmentRate: totalCalls ? +((appointments / totalCalls) * 100).toFixed(1) : 0,
      conversionRate: totalCalls ? +((qualifiedLeads / totalCalls) * 100).toFixed(1) : 0,
      avgSentiment: +(sentimentAgg._avg.sentimentScore ?? 0).toFixed(2),
      aiAnalyses,
    };
  }

  private async computeTimeSeries(tenantId: string, range: DateRange, granularity: DashboardGranularity) {
    const sqlGranularity = GRANULARITY_SQL[granularity];
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${sqlGranularity}, "startedAt") AS bucket,
        COUNT(*)::int  AS total_calls,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS connected,
        COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
        COALESCE(AVG("sentimentScore"), 0)::float AS avg_sentiment,
        COALESCE(SUM("duration") FILTER (WHERE status = 'completed'), 0)::int AS total_duration
      FROM "Call"
      WHERE "tenantId" = ${tenantId}
        AND "startedAt" >= ${range.from}
        AND "startedAt" <= ${range.to}
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((r: any) => ({
      bucket: r.bucket instanceof Date ? r.bucket.toISOString() : r.bucket,
      totalCalls: r.total_calls,
      connectedCalls: r.connected,
      missedCalls: r.missed,
      failedCalls: r.failed,
      avgSentiment: +(+r.avg_sentiment).toFixed(2),
      totalMinutes: Math.round((r.total_duration / 60) * 10) / 10,
    }));
  }

  private async computeOutcomes(tenantId: string, range: DateRange) {
    const [callOutcomes, analysisOutcomes] = await Promise.all([
      this.prisma.call.groupBy({
        by: ['outcome'],
        where: { tenantId, startedAt: { gte: range.from, lte: range.to }, outcome: { not: null, notIn: ['', 'unknown', 'unknown_outcome'] } },
        _count: { outcome: true },
      }),
      this.prisma.callAnalysis.groupBy({
        by: ['outcome'],
        where: {
          tenantId,
          processedAt: { gte: range.from, lte: range.to },
          outcome: { not: null, notIn: ['', 'unknown', 'unknown_outcome'] },
        },
        _count: { outcome: true },
      }),
    ]);

    const merged = new Map<string, number>();
    callOutcomes.forEach((o: any) => merged.set(o.outcome, (merged.get(o.outcome) ?? 0) + o._count.outcome));
    analysisOutcomes.forEach((o: any) => merged.set(o.outcome, (merged.get(o.outcome) ?? 0) + o._count.outcome));

    const total = Array.from(merged.values()).reduce((s, n) => s + n, 0);
    return Array.from(merged.entries())
      .map(([outcome, count]) => ({ outcome, count, pct: total ? +((count / total) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.count - a.count);
  }

  private async computeAgentPerformance(tenantId: string, range: DateRange) {
    const [agents, stats, qualifiedByAgent] = await Promise.all([
      this.prisma.aIAgent.findMany({
        where: { tenantId, deletedAt: null },
        select: { id: true, name: true, role: true, status: true, createdBy: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.$queryRaw<any[]>`
        SELECT "agentId",
          COUNT(*)::int AS total_calls,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS connected,
          COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
          COALESCE(AVG("duration") FILTER (WHERE status = 'completed'), 0)::float AS avg_duration,
          COALESCE(AVG("sentimentScore") FILTER (WHERE status = 'completed'), 0)::float AS avg_sentiment,
          COALESCE(AVG("qualityScore") FILTER (WHERE status = 'completed'), 0)::float AS avg_quality
        FROM "Call"
        WHERE "tenantId" = ${tenantId}
          AND "startedAt" >= ${range.from}
          AND "startedAt" <= ${range.to}
        GROUP BY "agentId"
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT "assignedAgentId" AS "agentId", COUNT(*)::int AS qualified
        FROM "Lead"
        WHERE "tenantId" = ${tenantId}
          AND "assignedAgentId" IS NOT NULL
          AND status = 'qualified'
          AND "updatedAt" >= ${range.from}
          AND "updatedAt" <= ${range.to}
        GROUP BY 1
      `,
    ]);

    const statMap = new Map(stats.map((s: any) => [s.agentId, s]));
    const qualifiedMap = new Map(qualifiedByAgent.map((q: any) => [q.agentId, q.qualified]));

    return agents.map((agent: any) => {
      const stat = statMap.get(agent.id);
      const total = stat?.total_calls ?? 0;
      const connected = stat?.connected ?? 0;
      return {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        managerId: agent.createdBy?.role === 'manager' || agent.createdBy?.role === 'company_admin' ? agent.createdBy.id : null,
        managerName: agent.createdBy?.role === 'manager' || agent.createdBy?.role === 'company_admin' ? agent.createdBy.name : null,
        totalCalls: total,
        connectedCalls: connected,
        missedCalls: stat?.missed ?? 0,
        failedCalls: stat?.failed ?? 0,
        qualifiedLeads: qualifiedMap.get(agent.id) ?? 0,
        connectRate: total ? +((connected / total) * 100).toFixed(1) : 0,
        avgDuration: Math.round(stat?.avg_duration ? Number(stat.avg_duration) : 0),
        avgSentiment: stat?.avg_sentiment != null ? +(+stat.avg_sentiment).toFixed(2) : 0,
        avgQuality: stat?.avg_quality != null ? +(+stat.avg_quality).toFixed(1) : 0,
      };
    });
  }

  private computeTeamPerformance(agentPerformance: Array<{
    managerId: string | null; managerName: string | null;
    totalCalls: number; connectedCalls: number; qualifiedLeads: number; missedCalls: number; failedCalls: number;
  }>) {
    const teams = new Map<string, {
      id: string; name: string; agentCount: number; totalCalls: number; connectedCalls: number;
      qualifiedLeads: number; missedCalls: number; failedCalls: number;
    }>();
    agentPerformance.forEach((agent: any) => {
      if (!agent.managerId) return;
      const team = teams.get(agent.managerId) ?? {
        id: agent.managerId,
        name: agent.managerName ?? 'Manager',
        agentCount: 0, totalCalls: 0, connectedCalls: 0, qualifiedLeads: 0, missedCalls: 0, failedCalls: 0,
      };
      team.agentCount += 1;
      team.totalCalls += agent.totalCalls;
      team.connectedCalls += agent.connectedCalls;
      team.qualifiedLeads += agent.qualifiedLeads;
      team.missedCalls += agent.missedCalls;
      team.failedCalls += agent.failedCalls;
      teams.set(agent.managerId, team);
    });
    return Array.from(teams.values()).map((t) => ({
      ...t,
      connectRate: t.totalCalls ? +((t.connectedCalls / t.totalCalls) * 100).toFixed(1) : 0,
    }));
  }

  private async computeActiveCampaigns(tenantId: string) {
    const campaigns = await this.prisma.campaign.findMany({
      where: { tenantId, status: { in: ['running', 'scheduled', 'paused'] } },
      select: {
        id: true, name: true, status: true, scheduledAt: true, createdAt: true,
        maxCalls: true, callsPerDay: true,
        agent: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    });
    if (!campaigns.length) return [];

    const counts = await this.prisma.campaignLead.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: campaigns.map(c => c.id) } },
      _count: { _all: true },
    });

    const statusMap = new Map<string, Record<string, number>>();
    counts.forEach((c) => {
      const entry = statusMap.get(c.campaignId) ?? {};
      entry[c.status] = c._count._all;
      statusMap.set(c.campaignId, entry);
    });

    return campaigns.map((c) => {
      const statuses = statusMap.get(c.id) ?? {};
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        agentId: c.agent.id,
        agentName: c.agent.name,
        scheduledAt: c.scheduledAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        progress: statuses,
        total: Object.values(statuses).reduce((s, n) => s + n, 0),
        completed: statuses.completed ?? 0,
        failed: statuses.failed ?? 0,
        pending: (statuses.pending ?? 0) + (statuses.queued ?? 0) + (statuses.retry_pending ?? 0) + (statuses.calling ?? 0),
      };
    });
  }

  private async computeFacts(tenantId: string) {
    const [activeAgents, teamMembers] = await Promise.all([
      this.prisma.aIAgent.count({ where: { tenantId, deletedAt: null, status: 'active' } }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
    ]);
    return { activeAgents, teamMembers };
  }

  private async computeAlerts(tenantId: string) {
    const alerts: Array<{
      id: string; type: string; severity: DashboardSeverity; title: string; message: string; createdAt: string;
    }> = [];

    try {
      const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return alerts;

      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const limits = PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS.growth;

      const [monthCalls, idleAgents, runningCampaigns, failedCalls24h, latestInvoice] = await Promise.all([
        this.prisma.call.count({ where: { tenantId, startedAt: { gte: monthStart } } }),
        this.prisma.aIAgent.count({ where: { tenantId, deletedAt: null, status: 'active', calls: { none: { startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } } } }),
        this.prisma.campaign.findMany({
          where: { tenantId, status: 'running' },
          select: { id: true, name: true, _count: { select: { leads: true } } },
        }),
        this.prisma.call.count({ where: { tenantId, status: 'failed', startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
        this.prisma.invoice.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' }, select: { status: true, createdAt: true, amount: true } }),
      ]);

      // 1. Plan usage limit
      if (!isUnlimited(limits.callsPerMonth)) {
        const pct = +((monthCalls / limits.callsPerMonth) * 100).toFixed(1);
        if (monthCalls >= limits.callsPerMonth) {
          alerts.push({
            id: 'al-usage-over', type: 'usage', severity: 'critical',
            title: 'Monthly call limit reached',
            message: `${monthCalls.toLocaleString('en-IN')} of ${limits.callsPerMonth.toLocaleString('en-IN')} calls used this month. Upgrade to continue dialing.`,
            createdAt: new Date().toISOString(),
          });
        } else if (pct >= 80) {
          alerts.push({
            id: 'al-usage-near', type: 'usage', severity: 'warning',
            title: `${pct}% of monthly call limit used`,
            message: `${monthCalls.toLocaleString('en-IN')} of ${limits.callsPerMonth.toLocaleString('en-IN')} calls consumed. Consider upgrading before limits apply.`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 2. Billing failure
      if (latestInvoice && latestInvoice.status === 'failed') {
        alerts.push({
          id: 'al-billing', type: 'billing', severity: 'critical',
          title: 'Latest payment failed',
          message: `An invoice of ₹${(latestInvoice.amount / 100).toLocaleString('en-IN')} could not be charged. Update payment details to avoid service interruption.`,
          createdAt: latestInvoice.createdAt.toISOString(),
        });
      }

      // 3. Idle AI agents
      if (idleAgents > 0) {
        alerts.push({
          id: 'al-idle-agents', type: 'team', severity: 'info',
          title: `${idleAgents} active agent${idleAgents > 1 ? 's' : ''} with no calls this week`,
          message: 'Review agent settings or redistribute workload to keep your team productive.',
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Campaign errors
      for (const campaign of runningCampaigns) {
        const failed = await this.prisma.campaignLead.count({
          where: { campaignId: campaign.id, status: 'failed' },
        });
        if (failed > 0) {
          alerts.push({
            id: `al-camp-${campaign.id}`, type: 'campaign', severity: 'warning',
            title: `Errors in ${failed} lead${failed > 1 ? 's' : ''} — "${campaign.name}"`,
            message: `${failed} of ${campaign._count.leads} campaign leads failed. Check telephony numbers and lead data.`,
            createdAt: new Date().toISOString(),
          });
        }
      }

      // 5. Failed calls (last 24h)
      if (failedCalls24h > 3) {
        alerts.push({
          id: 'al-failed-calls', type: 'calls', severity: 'warning',
          title: `${failedCalls24h} failed calls in last 24 hours`,
          message: 'A spike in failed calls may indicate a telephony provider issue. Check the recent calls list.',
          createdAt: new Date().toISOString(),
        });
      } else if (failedCalls24h > 0) {
        alerts.push({
          id: 'al-failed-calls', type: 'calls', severity: 'info',
          title: `${failedCalls24h} failed call${failedCalls24h > 1 ? 's' : ''} in last 24 hours`,
          message: 'Review failed calls for numbers, agent availability, or provider configuration issues.',
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to derive alerts: ${err.message}`);
    }

    return alerts;
  }
}
