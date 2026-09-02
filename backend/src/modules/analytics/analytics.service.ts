import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardMetrics(tenantId: string, range: 'today' | 'week' | 'month' = 'week') {
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
  }

  async getCallTrend(tenantId: string, days = 7) {
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
  }

  async getAgentPerformance(tenantId: string) {
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
  }

  async getConversionFunnel(tenantId: string) {
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
  }

  async getSentimentDistribution(tenantId: string) {
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
  }

  async getLeadPriorityStats(tenantId: string) {
    return this.prisma.lead.groupBy({
      by:    ['score'],
      where: { tenantId, deletedAt: null },
      _count: { score: true },
      orderBy: { score: 'desc' },
    });
  }
}
