import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboard(range: 'today' | 'week' | 'month' = 'week') {
    try {
      const now = new Date();
      const start =
        range === 'today'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : range === 'week'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);

      const prevStart =
        range === 'today'
          ? new Date(start.getTime() - 24 * 60 * 60 * 1000)
          : range === 'week'
          ? new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(
              now.getFullYear(),
              now.getMonth() - 1,
              1
            );

      const [
        totalCompanies,
        activeCompanies,
        totalUsers,
        activeUsers,
        totalAgents,
        activeAgents,
        totalCalls,
        totalLeads,
        totalCampaigns,
        completedCalls,
        failedCalls,
        inboundCalls,
        outboundCalls,
        transferredCalls,
        totalCallMinutes,
        avgDuration,
        totalRevenue,
        invoicesCount,
        failedPayments,
      ] = await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { isActive: true } }),
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.aIAgent.count({ where: { deletedAt: null } }),
        this.prisma.aIAgent.count({ where: { deletedAt: null, status: 'active' } }),
        this.prisma.call.count({ where: { startedAt: { gte: start } } }),
        this.prisma.lead.count({ where: { deletedAt: null } }),
        this.prisma.campaign.count(),
        this.prisma.call.count({ where: { startedAt: { gte: start }, status: 'completed' } }),
        this.prisma.call.count({ where: { startedAt: { gte: start }, status: 'failed' } }),
        this.prisma.call.count({ where: { startedAt: { gte: start }, direction: 'inbound' } }),
        this.prisma.call.count({ where: { startedAt: { gte: start }, direction: 'outbound' } }),
        this.prisma.call.count({ where: { startedAt: { gte: start }, status: 'transferred' } }),
        this.prisma.call.aggregate({
          where: { startedAt: { gte: start }, status: 'completed' },
          _sum: { duration: true },
        }),
        this.prisma.call.aggregate({
          where: { startedAt: { gte: start }, status: 'completed' },
          _avg: { duration: true },
        }),
        this.prisma.invoice.aggregate({
          where: { status: 'paid' },
          _sum: { amount: true },
        }),
        this.prisma.invoice.count({ where: { status: 'paid' } }),
        this.prisma.invoice.count({ where: { status: 'failed' } }),
      ]);

      // Previous period for comparison
      const prevCalls = await this.prisma.call.count({
        where: { startedAt: { gte: prevStart, lt: start } },
      });
      const prevUsers = await this.prisma.user.count({
        where: { createdAt: { gte: prevStart, lt: start } },
      });
      const prevCompanies = await this.prisma.tenant.count({
        where: { createdAt: { gte: prevStart, lt: start } },
      });

      const callsChange = prevCalls ? +(((totalCalls - prevCalls) / prevCalls) * 100).toFixed(1) : 0;
      const usersChange = prevUsers ? +(((activeUsers - prevUsers) / prevUsers) * 100).toFixed(1) : 0;
      const companiesChange = prevCompanies ? +(((totalCompanies - prevCompanies) / prevCompanies) * 100).toFixed(1) : 0;

      const PLAN_PRICES: Record<string, number> = {
        starter: 4999,
        growth: 14999,
        business: 39999,
        enterprise: 99999,
      };

      // Calculate MRR from active tenants
      const activeTenants = await this.prisma.tenant.findMany({
        where: { isActive: true },
        select: { plan: true },
      });
      const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.plan] || PLAN_PRICES.starter), 0);

      return {
        companies: { total: totalCompanies, active: activeCompanies, change: companiesChange },
        users: { total: totalUsers, active: activeUsers, change: usersChange },
        agents: { total: totalAgents, active: activeAgents },
        calls: {
          total: totalCalls,
          completed: completedCalls,
          failed: failedCalls,
          inbound: inboundCalls,
          outbound: outboundCalls,
          transferred: transferredCalls,
          change: callsChange,
        },
        callMinutes: {
          total: Math.round((totalCallMinutes._sum.duration ?? 0) / 60),
          avgDuration: Math.round(avgDuration._avg.duration ?? 0),
        },
        leads: { total: totalLeads },
        campaigns: { total: totalCampaigns },
        revenue: {
          total: Math.round((totalRevenue._sum.amount ?? 0) / 100),
          mrr,
          invoicesCount,
          failedPayments,
        },
      };
    } catch (err: any) {
      this.logger.warn(`Platform dashboard query failed: ${err.message}`);
      return this.getEmptyDashboard();
    }
  }

  async getCallTrend(days = 30) {
    try {
      const rows: any[] = await this.prisma.$queryRaw`
        SELECT
          DATE_TRUNC('day', "startedAt") AS day,
          COUNT(*)::int AS total_calls,
          COUNT(*) FILTER (WHERE "status" = 'completed')::int AS completed,
          COUNT(*) FILTER (WHERE "direction" = 'inbound')::int AS inbound,
          COUNT(*) FILTER (WHERE "direction" = 'outbound')::int AS outbound,
          AVG("sentimentScore") AS avg_sentiment
        FROM "Call"
        WHERE "startedAt" >= NOW() - (${days} * INTERVAL '1 day')
        GROUP BY 1
        ORDER BY 1
      `;
      return rows.map((r: any) => ({
        day: r.day?.toISOString?.()?.split('T')[0] || r.day,
        total_calls: r.total_calls,
        completed: r.completed,
        inbound: r.inbound,
        outbound: r.outbound,
        avg_sentiment: r.avg_sentiment ? +Number(r.avg_sentiment).toFixed(2) : 0,
      }));
    } catch (err: any) {
      this.logger.warn(`Platform call trend query failed: ${err.message}`);
      return [];
    }
  }

  async getCompanyPerformance(range: 'today' | 'week' | 'month' = 'month') {
    try {
      const now = new Date();
      const start =
        range === 'today'
          ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
          : range === 'week'
          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          : new Date(now.getFullYear(), now.getMonth(), 1);

      const tenants = await this.prisma.tenant.findMany({
        include: {
          _count: { select: { users: true, agents: true, calls: true, leads: true } },
          agents: {
            where: { deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const results = await Promise.all(
        tenants.map(async (t) => {
          const callCount = await this.prisma.call.count({
            where: { tenantId: t.id, startedAt: { gte: start } },
          });
          const completedCalls = await this.prisma.call.count({
            where: { tenantId: t.id, startedAt: { gte: start }, status: 'completed' },
          });
          const totalMinutes = await this.prisma.call.aggregate({
            where: { tenantId: t.id, startedAt: { gte: start }, status: 'completed' },
            _sum: { duration: true },
          });
          const avgDuration = await this.prisma.call.aggregate({
            where: { tenantId: t.id, startedAt: { gte: start }, status: 'completed' },
            _avg: { duration: true },
          });
          const activeAgents = await this.prisma.aIAgent.count({
            where: { tenantId: t.id, deletedAt: null, status: 'active' },
          });
          const lastCall = await this.prisma.call.findFirst({
            where: { tenantId: t.id },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true },
          });

          const PLAN_PRICES: Record<string, number> = {
            starter: 4999, growth: 14999, business: 39999, enterprise: 99999,
          };

          return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            plan: t.plan,
            isActive: t.isActive,
            createdAt: t.createdAt,
            users: t._count.users,
            agents: t._count.agents,
            activeAgents,
            calls: callCount,
            completedCalls,
            successRate: callCount > 0 ? +((completedCalls / callCount) * 100).toFixed(1) : 0,
            minutes: Math.round((totalMinutes._sum.duration ?? 0) / 60),
            avgDuration: Math.round(avgDuration._avg.duration ?? 0),
            revenue: PLAN_PRICES[t.plan] || PLAN_PRICES.starter,
            lastActivity: lastCall?.startedAt || t.createdAt,
          };
        })
      );

      return results;
    } catch (err: any) {
      this.logger.warn(`Company performance query failed: ${err.message}`);
      return [];
    }
  }

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    tenantId?: string;
  }) {
    try {
      const page = params.page || 1;
      const limit = Math.min(params.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ];
      }
      if (params.role) {
        where.role = params.role;
      }
      if (params.tenantId) {
        where.tenantId = params.tenantId;
      }

      const [items, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err: any) {
      this.logger.warn(`Platform users query failed: ${err.message}`);
      return { items: [], total: 0, page: 1, limit: 20, pages: 0 };
    }
  }

  async getAllCalls(params: {
    page?: number;
    limit?: number;
    tenantId?: string;
    agentId?: string;
    status?: string;
    direction?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const page = params.page || 1;
      const limit = Math.min(params.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (params.tenantId) where.tenantId = params.tenantId;
      if (params.agentId) where.agentId = params.agentId;
      if (params.status) where.status = params.status;
      if (params.direction) where.direction = params.direction;
      if (params.search) {
        where.OR = [
          { phone: { contains: params.search, mode: 'insensitive' } },
          { outcome: { contains: params.search, mode: 'insensitive' } },
        ];
      }

      const orderBy: any = {};
      if (params.sortBy) {
        orderBy[params.sortBy] = params.sortOrder || 'desc';
      } else {
        orderBy.startedAt = 'desc';
      }

      const [items, total] = await Promise.all([
        this.prisma.call.findMany({
          where,
          include: {
            lead: { select: { id: true, name: true, phone: true } },
            agent: { select: { id: true, name: true, role: true } },
            tenant: { select: { id: true, name: true } },
          },
          skip,
          take: limit,
          orderBy,
        }),
        this.prisma.call.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err: any) {
      this.logger.warn(`Platform calls query failed: ${err.message}`);
      return { items: [], total: 0, page: 1, limit: 20, pages: 0 };
    }
  }

  async getAllCampaigns(params: {
    page?: number;
    limit?: number;
    tenantId?: string;
    status?: string;
  }) {
    try {
      const page = params.page || 1;
      const limit = Math.min(params.limit || 20, 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (params.tenantId) where.tenantId = params.tenantId;
      if (params.status) where.status = params.status;

      const [items, total] = await Promise.all([
        this.prisma.campaign.findMany({
          where,
          include: {
            agent: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
            _count: { select: { leads: true, calls: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.campaign.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err: any) {
      this.logger.warn(`Platform campaigns query failed: ${err.message}`);
      return { items: [], total: 0, page: 1, limit: 20, pages: 0 };
    }
  }

  async getAuditLogs(params: {
    page?: number;
    limit?: number;
    tenantId?: string;
    userId?: string;
    action?: string;
  }) {
    try {
      const page = params.page || 1;
      const limit = Math.min(params.limit || 50, 100);
      const skip = (page - 1) * limit;

      const where: any = {};
      if (params.tenantId) where.tenantId = params.tenantId;
      if (params.userId) where.userId = params.userId;
      if (params.action) where.action = { contains: params.action, mode: 'insensitive' };

      const [items, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          include: {
            tenant: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (err: any) {
      this.logger.warn(`Platform audit logs query failed: ${err.message}`);
      return { items: [], total: 0, page: 1, limit: 50, pages: 0 };
    }
  }

  async getUsage() {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalCallMinutes,
        monthlyCallMinutes,
        totalAgents,
        activeAgents,
        totalStorage,
        totalTenants,
        activeTenants,
        apiCalls,
      ] = await Promise.all([
        this.prisma.call.aggregate({
          where: { status: 'completed' },
          _sum: { duration: true },
        }),
        this.prisma.call.aggregate({
          where: { status: 'completed', startedAt: { gte: monthStart } },
          _sum: { duration: true },
        }),
        this.prisma.aIAgent.count({ where: { deletedAt: null } }),
        this.prisma.aIAgent.count({ where: { deletedAt: null, status: 'active' } }),
        this.prisma.callRecording.aggregate({
          _sum: { size: true },
        }),
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { isActive: true } }),
        this.prisma.call.count({ where: { startedAt: { gte: monthStart } } }),
      ]);

      // Get per-tenant usage
      const tenants = await this.prisma.tenant.findMany({
        where: { isActive: true },
        select: { id: true, name: true, plan: true },
      });

      const tenantUsage = await Promise.all(
        tenants.map(async (t) => {
          const calls = await this.prisma.call.count({
            where: { tenantId: t.id, startedAt: { gte: monthStart } },
          });
          const minutes = await this.prisma.call.aggregate({
            where: { tenantId: t.id, startedAt: { gte: monthStart }, status: 'completed' },
            _sum: { duration: true },
          });
          const agents = await this.prisma.aIAgent.count({
            where: { tenantId: t.id, deletedAt: null, status: 'active' },
          });

          return {
            tenantId: t.id,
            tenantName: t.name,
            plan: t.plan,
            calls,
            minutes: Math.round((minutes._sum.duration ?? 0) / 60),
            agents,
          };
        })
      );

      return {
        callMinutes: {
          total: Math.round((totalCallMinutes._sum.duration ?? 0) / 60),
          monthly: Math.round((monthlyCallMinutes._sum.duration ?? 0) / 60),
        },
        agents: { total: totalAgents, active: activeAgents },
        storage: { totalBytes: totalStorage._sum?.size ?? 0 },
        tenants: { total: totalTenants, active: activeTenants },
        apiCalls,
        tenantUsage: tenantUsage.sort((a, b) => b.minutes - a.minutes),
      };
    } catch (err: any) {
      this.logger.warn(`Platform usage query failed: ${err.message}`);
      return {
        callMinutes: { total: 0, monthly: 0 },
        agents: { total: 0, active: 0 },
        storage: { totalBytes: 0 },
        tenants: { total: 0, active: 0 },
        apiCalls: 0,
        tenantUsage: [],
      };
    }
  }

  async getRevenue() {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const PLAN_PRICES: Record<string, number> = {
        starter: 4999, growth: 14999, business: 39999, enterprise: 99999,
      };

      const [activeTenants, allInvoices, monthlyInvoices, prevMonthlyInvoices] = await Promise.all([
        this.prisma.tenant.findMany({
          where: { isActive: true },
          select: { plan: true },
        }),
        this.prisma.invoice.findMany({
          where: { status: 'paid' },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.prisma.invoice.findMany({
          where: { status: 'paid', createdAt: { gte: monthStart } },
        }),
        this.prisma.invoice.findMany({
          where: { status: 'paid', createdAt: { gte: prevMonthStart, lt: monthStart } },
        }),
      ]);

      const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.plan] || PLAN_PRICES.starter), 0);
      const arr = mrr * 12;

      const monthlyRevenue = monthlyInvoices.reduce((sum, inv) => sum + inv.amount, 0) / 100;
      const prevMonthlyRevenue = prevMonthlyInvoices.reduce((sum, inv) => sum + inv.amount, 0) / 100;
      const revenueGrowth = prevMonthlyRevenue > 0
        ? +(((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100).toFixed(1)
        : 0;

      // Plan distribution
      const planDist: Record<string, number> = { starter: 0, growth: 0, business: 0, enterprise: 0 };
      activeTenants.forEach((t) => {
        const plan = (t.plan || 'starter').toLowerCase();
        planDist[plan] = (planDist[plan] || 0) + 1;
      });

      // Subscription stats
      const totalSubscriptions = activeTenants.length;
      const trialAccounts = await this.prisma.tenant.count({ where: { plan: 'starter' as any } });
      const cancelledAccounts = await this.prisma.tenant.count({ where: { isActive: false } });

      return {
        mrr,
        arr,
        monthlyRevenue,
        revenueGrowth,
        totalRevenue: Math.round(
          (allInvoices.reduce((sum, inv) => sum + inv.amount, 0)) / 100
        ),
        planDistribution: Object.entries(planDist).map(([plan, count]) => ({ plan, count, price: PLAN_PRICES[plan] || 0 })),
        recentTransactions: allInvoices.slice(0, 20).map((inv) => ({
          id: inv.id,
          amount: inv.amount / 100,
          currency: inv.currency,
          status: inv.status,
          plan: inv.plan,
          paidAt: inv.paidAt,
          createdAt: inv.createdAt,
        })),
        subscriptions: {
          total: totalSubscriptions,
          trial: trialAccounts,
          cancelled: cancelledAccounts,
        },
      };
    } catch (err: any) {
      this.logger.warn(`Platform revenue query failed: ${err.message}`);
      return {
        mrr: 0, arr: 0, monthlyRevenue: 0, revenueGrowth: 0, totalRevenue: 0,
        planDistribution: [], recentTransactions: [], subscriptions: { total: 0, trial: 0, cancelled: 0 },
      };
    }
  }

  async globalSearch(query: string) {
    try {
      const q = query.trim();
      if (!q) return { companies: [], users: [], agents: [], calls: [] };

      const [companies, users, agents, calls] = await Promise.all([
        this.prisma.tenant.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, slug: true, plan: true, isActive: true },
          take: 5,
        }),
        this.prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true, name: true, email: true, role: true,
            tenant: { select: { name: true } },
          },
          take: 5,
        }),
        this.prisma.aIAgent.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
            ],
            deletedAt: null,
          },
          select: {
            id: true, name: true, role: true, status: true,
            tenant: { select: { name: true } },
          },
          take: 5,
        }),
        this.prisma.call.findMany({
          where: {
            OR: [
              { phone: { contains: q, mode: 'insensitive' } },
              { outcome: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true, phone: true, status: true, direction: true, startedAt: true,
            tenant: { select: { name: true } },
          },
          take: 5,
          orderBy: { startedAt: 'desc' },
        }),
      ]);

      return { companies, users, agents, calls };
    } catch (err: any) {
      this.logger.warn(`Global search failed: ${err.message}`);
      return { companies: [], users: [], agents: [], calls: [] };
    }
  }

  private readonly DEFAULT_PLATFORM_SETTINGS = {
    platformName: 'AgentCall AI',
    platformSlug: 'agentcall-ai',
    logoUrl: '',
    supportEmail: '',
    website: '',
    industry: '',
    whitelabelDomain: '',
    defaultPlan: 'starter',
    defaultCurrency: 'INR',
    timezone: 'Asia/Kolkata',
    registrationEnabled: true,
    maintenanceMode: false,
    emailNotifications: true,
    apiRateLimit: 'default',
    defaultCallLimit: 0,
  };

  async getPlatformSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const stored = ((tenant?.settings as any) || {}).platform || {};
    return { ...this.DEFAULT_PLATFORM_SETTINGS, ...stored };
  }

  async updatePlatformSettings(tenantId: string, data: Record<string, any>) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });
    const current = (tenant?.settings as any) || {};
    const platform = {
      ...this.DEFAULT_PLATFORM_SETTINGS,
      ...(current.platform || {}),
      ...data,
    };
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: { ...current, platform } },
    });
    return platform;
  }

  private getEmptyDashboard() {
    return {
      companies: { total: 0, active: 0, change: 0 },
      users: { total: 0, active: 0, change: 0 },
      agents: { total: 0, active: 0 },
      calls: { total: 0, completed: 0, failed: 0, inbound: 0, outbound: 0, transferred: 0, change: 0 },
      callMinutes: { total: 0, avgDuration: 0 },
      leads: { total: 0 },
      campaigns: { total: 0 },
      revenue: { total: 0, mrr: 0, invoicesCount: 0, failedPayments: 0 },
    };
  }
}
