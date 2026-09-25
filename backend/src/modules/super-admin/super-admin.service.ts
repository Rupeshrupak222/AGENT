import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ResendEmailAdapter } from '../automations/providers/email/resend.adapter';
import { ROLE_PERMISSIONS, ROLE_METADATA } from '../../common/rbac/role-permissions';
import { GROUPED_PERMISSIONS } from '../../common/rbac/permissions-groups';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

/**
 * Platform-layer (Super Admin) governance service.
 * Every method is guarded at the controller with platform permissions.
 */
@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ── Platform audit trail ─────────────────────────────────────
  async logAdmin(action: string, resource: string, resourceId: string | null, details: Record<string, any>, ctx: any, user: any) {
    try {
      if (!this.prisma.isConnected) return;
      await this.prisma.platformAuditLog.create({
        data: {
          action,
          resource,
          resourceId,
          details: details ?? {},
          ipAddress: ctx?.ip || null,
          userAgent: ctx?.headers?.['user-agent'] || null,
          userId: user?.id || null,
          userEmail: user?.email || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write platform audit log: ${err.message}`);
    }
  }

  // ── Super admin user management ──────────────────────────────
  async listAdmins() {
    if (!this.prisma.isConnected) {
      return { items: [], total: 0 };
    }
    const admins = await this.prisma.user.findMany({
      where: { role: 'super_admin' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, isActive: true, mfaEnabled: true,
        lastLoginAt: true, createdAt: true,
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    return { items: admins, total: admins.length };
  }

  async createAdmin(data: { name: string; email: string; password?: string }, actor: any) {
    if (!this.prisma.isConnected) {
      throw new BadRequestException('Database offline — cannot provision admins');
    }
    const email = (data.email || '').trim().toLowerCase();
    if (!data.name?.trim() || !email) {
      throw new BadRequestException('name and email are required');
    }
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    // Super admins are provisioned into the platform tenant (actor's tenant)
    const tenant = await this.prisma.tenant.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!tenant) throw new BadRequestException('No active platform tenant available');

    const password = data.password || Math.random().toString(36).slice(-12) + 'Aa1!';
    const hashed = await bcrypt.hash(password, 12);
    const admin = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email,
        password: hashed,
        role: 'super_admin',
        tenantId: tenant.id,
      },
    });

    await this.logAdmin('ADMIN_CREATED', 'user', admin.id, { name: admin.name, email: admin.email }, {}, actor);
    const { password: _pw, ...safe } = admin as any;
    return { ...safe, tempPassword: password };
  }

  async updateAdminStatus(id: string, isActive: boolean, actor: any) {
    if (!this.prisma.isConnected) {
      throw new BadRequestException('Database offline');
    }
    if (actor && actor.id === id) {
      throw new ForbiddenException('You cannot deactivate your own admin account');
    }
    const admin = await this.prisma.user.findFirst({ where: { id, role: 'super_admin' } });
    if (!admin) throw new NotFoundException('Super admin not found');

    if (!isActive) {
      const activeAdmins = await this.prisma.user.count({ where: { role: 'super_admin', isActive: true } });
      if (activeAdmins <= 1) {
        throw new ForbiddenException('Cannot deactivate the last active super admin');
      }
    }

    const updated = await this.prisma.user.update({ where: { id }, data: { isActive } });
    await this.logAdmin('ADMIN_STATUS_CHANGED', 'user', id, { isActive }, {}, actor);
    const { password: _pw, ...safe } = updated as any;
    return safe;
  }

  // ── AI Providers ─────────────────────────────────────────────
  async listAiProviders() {
    if (!this.prisma.isConnected) {
      return [
        { provider: 'openrouter', name: 'OpenRouter', isEnabled: true, defaultModel: 'openai/gpt-4o-mini' },
        { provider: 'groq', name: 'Groq', isEnabled: true, defaultModel: 'openai/gpt-oss-20b' },
      ];
    }
    return this.prisma.aiProvider.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createAiProvider(data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.provider || !data.name) throw new BadRequestException('provider and name are required');
    const existing = await this.prisma.aiProvider.findUnique({ where: { provider: data.provider } });
    if (existing) throw new ConflictException('Provider already registered');
    const created = await this.prisma.aiProvider.create({
      data: {
        provider: data.provider,
        name: data.name,
        baseUrl: data.baseUrl || null,
        apiKeyEncrypted: data.apiKeyEncrypted ? String(data.apiKeyEncrypted) : null,
        isEnabled: data.isEnabled ?? true,
        defaultModel: data.defaultModel || null,
        models: (data.models ?? []) as any,
        rateLimit: data.rateLimit ? Number(data.rateLimit) : 0,
      },
    });
    await this.logAdmin('AI_PROVIDER_CREATED', 'ai_provider', created.id, { provider: created.provider }, {}, actor);
    return created;
  }

  async updateAiProvider(id: string, data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Provider not found');
    const updated = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        baseUrl: data.baseUrl !== undefined ? data.baseUrl : undefined,
        apiKeyEncrypted: data.apiKeyEncrypted !== undefined && data.apiKeyEncrypted !== ''
          ? String(data.apiKeyEncrypted)
          : undefined,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : undefined,
        defaultModel: data.defaultModel !== undefined ? data.defaultModel : undefined,
        models: data.models !== undefined ? (data.models as any) : undefined,
        rateLimit: data.rateLimit !== undefined ? Number(data.rateLimit) : undefined,
      },
    });
    await this.logAdmin('AI_PROVIDER_UPDATED', 'ai_provider', id, { provider: updated.provider }, {}, actor);
    return updated;
  }

  async deleteAiProvider(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Provider not found');
    await this.prisma.aiProvider.delete({ where: { id } });
    await this.logAdmin('AI_PROVIDER_DELETED', 'ai_provider', id, { provider: existing.provider }, {}, actor);
    return { success: true };
  }

  async probeAiProvider(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) throw new NotFoundException('Provider not found');
    // For now a config-level probe — verify baseUrl reachability if supplied.
    const result: any = {
      provider: provider.provider,
      isEnabled: provider.isEnabled,
      hasKey: !!provider.apiKeyEncrypted,
      defaultModel: provider.defaultModel,
      reachable: provider.isEnabled,
      checkedAt: new Date().toISOString(),
    };
    if (provider.isEnabled && provider.baseUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(provider.baseUrl, { signal: controller.signal, method: 'GET' });
        clearTimeout(timeout);
        result.reachable = res.status < 500;
        result.statusCode = res.status;
      } catch {
        result.reachable = false;
      }
    }
    await this.prisma.aiProvider.update({
      where: { id },
      data: { usageCount: { increment: 0 }, lastUsedAt: new Date() },
    });
    await this.logAdmin('AI_PROVIDER_PROBED', 'ai_provider', id, result, {}, actor);
    return result;
  }

  // ── Telephony gateways ───────────────────────────────────────
  async listGateways() {
    if (!this.prisma.isConnected) {
      return [
        { provider: 'twilio', name: 'Twilio', isEnabled: false, healthStatus: 'unknown' },
        { provider: 'exotel', name: 'Exotel', isEnabled: false, healthStatus: 'unknown' },
        { provider: 'sandbox', name: 'Sandbox', isEnabled: true, healthStatus: 'healthy' },
      ];
    }
    return this.prisma.telephonyGateway.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createGateway(data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.provider || !data.name) throw new BadRequestException('provider and name are required');
    const existing = await this.prisma.telephonyGateway.findUnique({ where: { provider: data.provider } });
    if (existing) throw new ConflictException('Gateway already registered');
    const created = await this.prisma.telephonyGateway.create({
      data: {
        provider: data.provider,
        name: data.name,
        isEnabled: data.isEnabled ?? true,
        settings: (data.settings ?? {}) as any,
        healthStatus: 'unknown',
      },
    });
    await this.logAdmin('GATEWAY_CREATED', 'telephony_gateway', created.id, { provider: created.provider }, {}, actor);
    return created;
  }

  async updateGateway(id: string, data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.telephonyGateway.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Gateway not found');
    const updated = await this.prisma.telephonyGateway.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        isEnabled: data.isEnabled !== undefined ? data.isEnabled : undefined,
        settings: data.settings !== undefined ? (data.settings as any) : undefined,
      },
    });
    await this.logAdmin('GATEWAY_UPDATED', 'telephony_gateway', id, { provider: updated.provider }, {}, actor);
    return updated;
  }

  async deleteGateway(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.telephonyGateway.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Gateway not found');
    await this.prisma.telephonyGateway.delete({ where: { id } });
    await this.logAdmin('GATEWAY_DELETED', 'telephony_gateway', id, { provider: existing.provider }, {}, actor);
    return { success: true };
  }

  async probeGateway(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const gateway = await this.prisma.telephonyGateway.findUnique({ where: { id } });
    if (!gateway) throw new NotFoundException('Gateway not found');
    let healthStatus = 'down';
    if (!gateway.isEnabled) {
      healthStatus = 'unknown';
    } else {
      const settings = (gateway.settings ?? {}) as any;
      const baseUrl = settings.baseUrl as string | undefined;
      if (!baseUrl) {
        healthStatus = 'degraded';
      } else {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(baseUrl, { signal: controller.signal, method: 'GET' });
          clearTimeout(timeout);
          healthStatus = res.status < 500 ? 'healthy' : 'degraded';
        } catch {
          healthStatus = 'down';
        }
      }
    }
    const updated = await this.prisma.telephonyGateway.update({
      where: { id },
      data: { healthStatus, lastCheckedAt: new Date() },
    });
    await this.logAdmin('GATEWAY_PROBED', 'telephony_gateway', id, { healthStatus }, {}, actor);
    return updated;
  }

  async listNumberPool() {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const numbers = await this.prisma.phoneNumber.findMany({
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        assignedAgent: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const total = await this.prisma.phoneNumber.count();
    return { items: numbers, total };
  }

  // ── Billing / pricing ────────────────────────────────────────
  async getPricing() {
    if (!this.prisma.isConnected) {
      return [
        { plan: 'starter', currency: 'INR', amount: 499900, isActive: true },
        { plan: 'growth', currency: 'INR', amount: 1499900, isActive: true },
        { plan: 'business', currency: 'INR', amount: 3999900, isActive: true },
        { plan: 'enterprise', currency: 'INR', amount: 9999900, isActive: true },
      ];
    }
    const rows = await this.prisma.planPricing.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (rows.length === 0) {
      // seed default pricing on first read
      const defaults = [
        { plan: 'starter' as Role, currency: 'INR', amount: 499900 },
        { plan: 'growth' as Role, currency: 'INR', amount: 1499900 },
        { plan: 'business' as Role, currency: 'INR', amount: 3999900 },
        { plan: 'enterprise' as Role, currency: 'INR', amount: 9999900 },
      ];
      const seeds = await this.prisma.$transaction(
        defaults.map((d) => this.prisma.planPricing.upsert({
          where: { plan_currency: { plan: d.plan as any, currency: d.currency } },
          update: {},
          create: { plan: d.plan as any, currency: d.currency, amount: d.amount },
        })),
      );
      return seeds;
    }
    return rows;
  }

  async upsertPricing(data: { plan: string; currency?: string; amount: number; isActive?: boolean }, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const validPlans = ['starter', 'growth', 'business', 'enterprise'];
    if (!validPlans.includes(data.plan)) throw new BadRequestException(`Invalid plan: ${data.plan}`);
    const amount = Math.max(0, Number(data.amount));
    if (Number.isNaN(amount)) throw new BadRequestException('amount must be a number (paise)');
    const currency = data.currency || 'INR';
    const updated = await this.prisma.planPricing.upsert({
      where: { plan_currency: { plan: data.plan as any, currency } },
      update: { amount, isActive: data.isActive ?? true },
      create: { plan: data.plan as any, currency, amount, isActive: data.isActive ?? true },
    });
    await this.logAdmin('BILLING_PRICING_UPDATED', 'plan_pricing', updated.id, { plan: data.plan, amount, currency }, {}, actor);
    return updated;
  }

  async listInvoices(params: { page?: number; limit?: number; status?: string; tenantId?: string }) {
    if (!this.prisma.isConnected) return { items: [], total: 0, page: 1, limit: 20, pages: 0 };
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Math.max(1, Number(params.limit) || 20), 100);
    const where: any = {};
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.tenantId) where.tenantId = params.tenantId;
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { tenant: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async overrideInvoiceStatus(id: string, status: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const allowed = ['pending', 'paid', 'failed'];
    if (!allowed.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status, paidAt: status === 'paid' ? (invoice.paidAt || new Date()) : invoice.paidAt },
    });
    await this.logAdmin('INVOICE_OVERRIDDEN', 'invoice', id, { from: invoice.status, to: status }, {}, actor);
    return updated;
  }

  // ── Role permissions matrix ──────────────────────────────────
  async getRoleMatrix() {
    const overrides: Record<string, string[]> = {};
    if (this.prisma.isConnected) {
      const rows = await this.prisma.roleOverride.findMany();
      rows.forEach((r) => { overrides[r.role] = (r.permissions as string[]) || []; });
    }
    const roles = Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => ({
      role,
      label: ROLE_METADATA[role]?.label || role,
      description: ROLE_METADATA[role]?.description || '',
      permissions: overrides[role] !== undefined ? overrides[role] : [...perms],
      isOverridden: overrides[role] !== undefined,
    }));
    return { groups: GROUPED_PERMISSIONS, roles };
  }

  async updateRolePermissions(role: string, permissions: string[], actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!ROLE_PERMISSIONS[role]) throw new BadRequestException(`Unknown role: ${role}`);
    if (role === 'super_admin') {
      throw new ForbiddenException('super_admin always retains full platform access');
    }
    // Validate that all provided permissions are known
    const known = new Set<string>();
    GROUPED_PERMISSIONS.forEach((g) => g.permissions.forEach((p) => known.add(p.value)));
    const invalid = permissions.filter((p) => !known.has(p));
    if (invalid.length) throw new BadRequestException(`Unknown permissions: ${invalid.join(', ')}`);

    const updated = await this.prisma.roleOverride.upsert({
      where: { role },
      update: { permissions: permissions as any, updatedById: actor?.id || null },
      create: { role, permissions: permissions as any, updatedById: actor?.id || null },
    });
    PermissionsGuard.invalidateOverrides();
    await this.logAdmin('ROLE_PERMISSIONS_UPDATED', 'role', role, { permissions }, {}, actor);
    return updated;
  }

  async resetRolePermissions(role: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!ROLE_PERMISSIONS[role]) throw new BadRequestException(`Unknown role: ${role}`);
    const existing = await this.prisma.roleOverride.findUnique({ where: { role } });
    if (!existing) return { success: true };
    await this.prisma.roleOverride.delete({ where: { role } });
    PermissionsGuard.invalidateOverrides();
    await this.logAdmin('ROLE_PERMISSIONS_RESET', 'role', role, {}, {}, actor);
    return { success: true };
  }

  // ── Announcements ────────────────────────────────────────────
  async listAnnouncements() {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const items = await this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
    return { items, total: items.length };
  }

  async createAnnouncement(data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.title?.trim() || !data.body?.trim()) throw new BadRequestException('title and body are required');
    const created = await this.prisma.announcement.create({
      data: {
        title: data.title.trim(),
        body: data.body.trim(),
        priority: ['info', 'warning', 'important'].includes(data.priority) ? data.priority : 'info',
        audience: data.audience === 'specific' ? 'specific' : 'all',
        tenantIds: data.audience === 'specific' && Array.isArray(data.tenantIds) ? data.tenantIds : [],
        startsAt: data.startsAt ? new Date(data.startsAt) : new Date(),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive ?? true,
        createdById: actor?.id || null,
      },
    });
    await this.logAdmin('ANNOUNCEMENT_CREATED', 'announcement', created.id, { title: created.title, priority: created.priority }, {}, actor);
    return created;
  }

  async updateAnnouncement(id: string, data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    const updated = await this.prisma.announcement.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title.trim() : undefined,
        body: data.body !== undefined ? data.body.trim() : undefined,
        priority: data.priority !== undefined ? data.priority : undefined,
        audience: data.audience !== undefined ? data.audience : undefined,
        tenantIds: data.audience === 'specific' && Array.isArray(data.tenantIds) ? data.tenantIds : undefined,
        startsAt: data.startsAt !== undefined ? new Date(data.startsAt) : undefined,
        expiresAt: data.expiresAt !== undefined ? (data.expiresAt ? new Date(data.expiresAt) : null) : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });
    await this.logAdmin('ANNOUNCEMENT_UPDATED', 'announcement', id, { title: updated.title }, {}, actor);
    return updated;
  }

  async deleteAnnouncement(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
    await this.logAdmin('ANNOUNCEMENT_DELETED', 'announcement', id, { title: existing.title }, {}, actor);
    return { success: true };
  }

  async getActiveAnnouncements(tenantId: string, _userId: string) {
    const now = new Date();
    if (!this.prisma.isConnected) return { items: [] };
    const items = await this.prisma.announcement.findMany({
      where: {
        isActive: true,
        startsAt: { lte: now },
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
          {
            OR: [
              { audience: 'all' },
              { audience: 'specific', tenantIds: { has: tenantId } },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const visible = items.filter((a) =>
      a.audience === 'all' || (a.tenantIds || []).includes(tenantId),
    );
    return { items: visible };
  }

  // ── Impersonation ────────────────────────────────────────────
  async impersonate(userId: string, actor: any, ctx: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (actor && actor.id === userId) throw new BadRequestException('You are already logged in as this user');

    const user: any = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });
    if (!user || !user.isActive) throw new NotFoundException('User not found or inactive');
    if (!user.tenant?.isActive) throw new ForbiddenException('Target tenant is suspended');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      impersonation: true,
      impersonator: actor?.id,
    };
    const secret = this.config.get<string>('JWT_SECRET') || 'adyapan-dev-jwt-secret-key-change-in-production-2026';
    const refreshSecret = this.config.get<string>('JWT_REFRESH_SECRET') || 'adyapan-dev-refresh-secret-key-change-in-production-2026';
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, { secret, expiresIn: '2h' }),
      this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId }, { secret: refreshSecret, expiresIn: '1d' }),
    ]);

    await this.logAdmin('ADMIN_IMPERSONATED', 'user', userId, { targetEmail: user.email }, ctx, actor);
    const { password: _pw, ...safe } = user;
    return { accessToken, refreshToken, user: safe, tenant: user.tenant, impersonation: true };
  }

  // ── Support tickets ──────────────────────────────────────────
  async listTickets(params: { page?: number; limit?: number; status?: string; priority?: string }) {
    if (!this.prisma.isConnected) return { items: [], total: 0, page: 1, limit: 20, pages: 0 };
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Math.max(1, Number(params.limit) || 20), 100);
    const where: any = {};
    if (params.status && params.status !== 'all') where.status = params.status;
    if (params.priority && params.priority !== 'all') where.priority = params.priority;
    const [items, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getTicket(id: string) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async createTicket(data: any, user: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.subject?.trim() || !data.body?.trim()) throw new BadRequestException('subject and body are required');
    const created = await this.prisma.supportTicket.create({
      data: {
        subject: data.subject.trim(),
        body: data.body.trim(),
        priority: ['low', 'medium', 'high', 'urgent'].includes(data.priority) ? data.priority : 'medium',
        tenantId: user?.tenantId || null,
        tenantName: user?.tenant?.name || null,
        tenantEmail: user?.email || null,
        createdBy: user?.id || null,
        messages: [] as any,
      },
    });
    await this.logAdmin('SUPPORT_TICKET_CREATED', 'support_ticket', created.id, { subject: created.subject }, {}, user);
    return created;
  }

  async updateTicket(id: string, data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Ticket not found');
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: data.status !== undefined ? data.status : undefined,
        priority: data.priority !== undefined ? data.priority : undefined,
        assignedToId: data.assignedToId !== undefined ? data.assignedToId : undefined,
      },
    });
    await this.logAdmin('SUPPORT_TICKET_UPDATED', 'support_ticket', id, { status: updated.status, priority: updated.priority }, {}, actor);
    return updated;
  }

  async replyTicket(id: string, message: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!message?.trim()) throw new BadRequestException('message is required');
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const messages = (ticket.messages as Array<Record<string, any>>) || [];
    messages.push({
      body: message.trim(),
      fromEmail: actor?.email || 'platform-admin',
      createdAt: new Date().toISOString(),
    });
    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        messages: messages as any,
        status: ticket.status === 'open' ? 'in_progress' : ticket.status,
        updatedAt: new Date(),
      },
    });
    await this.logAdmin('SUPPORT_TICKET_REPLIED', 'support_ticket', id, {}, {}, actor);
    return updated;
  }

  // ── Security ─────────────────────────────────────────────────
  async getSecurityOverview() {
    if (!this.prisma.isConnected) {
      return { allowlistCount: 0, mfaEnabledCount: 0, superAdmins: 0, requireMfa: false, allowlist: [] };
    }
    const [allowlist, mfaEnabledCount, superAdmins, settings] = await Promise.all([
      this.prisma.ipAllowlist.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.user.count({ where: { mfaEnabled: true } }),
      this.prisma.user.count({ where: { role: 'super_admin' } }),
      this.getPlatformSettingsRaw(),
    ]);
    return {
      allowlist,
      allowlistCount: allowlist.length,
      mfaEnabledCount,
      superAdmins,
      requireMfa: !!(settings as any)?.requireMfa,
      maintenanceMode: !!(settings as any)?.maintenanceMode,
    };
  }

  async addAllowlist(data: { cidr: string; label?: string }, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.cidr?.trim()) throw new BadRequestException('cidr is required');
    const existing = await this.prisma.ipAllowlist.findUnique({ where: { cidr: data.cidr.trim() } });
    if (existing) throw new ConflictException('CIDR already in allowlist');
    const created = await this.prisma.ipAllowlist.create({
      data: { cidr: data.cidr.trim(), label: data.label || null, createdById: actor?.id || null },
    });
    await this.logAdmin('ALLOWLIST_ENTRY_ADDED', 'ip_allowlist', created.id, { cidr: created.cidr }, {}, actor);
    return created;
  }

  async toggleAllowlist(id: string, isActive: boolean, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.ipAllowlist.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Allowlist entry not found');
    const updated = await this.prisma.ipAllowlist.update({ where: { id }, data: { isActive } });
    await this.logAdmin('ALLOWLIST_ENTRY_TOGGLED', 'ip_allowlist', id, { isActive }, {}, actor);
    return updated;
  }

  async deleteAllowlist(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.ipAllowlist.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Allowlist entry not found');
    await this.prisma.ipAllowlist.delete({ where: { id } });
    await this.logAdmin('ALLOWLIST_ENTRY_DELETED', 'ip_allowlist', id, { cidr: existing.cidr }, {}, actor);
    return { success: true };
  }

  async setUserMfa(userId: string, enabled: boolean, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!enabled && user.role === 'super_admin') {
      const mfaAdmins = await this.prisma.user.count({ where: { role: 'super_admin', mfaEnabled: true } });
      const settings = await this.getPlatformSettingsRaw();
      if ((settings as any)?.requireMfa && mfaAdmins <= 1 && user.mfaEnabled) {
        throw new ForbiddenException('MFA is required for super admins; enable another admin MFA first');
      }
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: enabled, mfaSecret: enabled ? (user.mfaSecret || 'totp-pending') : null },
    });
    await this.logAdmin('USER_MFA_UPDATED', 'user', userId, { mfaEnabled: enabled }, {}, actor);
    const { password: _pw, ...safe } = updated as any;
    return safe;
  }

  async setRequireMfa(value: boolean, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const adminsWithoutMfa = await this.prisma.user.count({ where: { role: 'super_admin', mfaEnabled: false } });
    if (value && adminsWithoutMfa > 0) {
      throw new ForbiddenException('Enable MFA for all super admins before enforcing it');
    }
    const stored = await this.getPlatformSettingsRaw();
    const platform = { ...((stored as any) || {}), requireMfa: value };
    const platformTenant = await this.prisma.tenant.findFirst({
      where: { users: { some: { role: 'super_admin' } } },
      select: { id: true, settings: true },
    });
    if (platformTenant) {
      const currentSettings = (platformTenant.settings as any) || {};
      await this.prisma.tenant.update({
        where: { id: platformTenant.id },
        data: { settings: { ...currentSettings, platform } },
      });
    }
    await this.logAdmin('MFA_REQUIREMENT_UPDATED', 'platform_security', null, { requireMfa: value }, {}, actor);
    return { requireMfa: value };
  }

  async listPlatformAudit(params: { page?: number; limit?: number; action?: string }) {
    if (!this.prisma.isConnected) return { items: [], total: 0, page: 1, limit: 50, pages: 0 };
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(Math.max(1, Number(params.limit) || 50), 100);
    const where: any = {};
    if (params.action && params.action !== 'all') where.action = { contains: params.action, mode: 'insensitive' };
    const [items, total] = await Promise.all([
      this.prisma.platformAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.platformAuditLog.count({ where }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  // ── Tenant team provisioning ─────────────────────────────────
  async provisionTenantTeam(tenantId: string, data: { name: string; email: string; role: string }, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const allowedRoles: Role[] = ['company_admin', 'manager'];
    if (!allowedRoles.includes(data.role as Role)) {
      throw new BadRequestException(`Role must be one of: ${allowedRoles.join(', ')}`);
    }
    const email = (data.email || '').trim().toLowerCase();
    if (!data.name?.trim() || !email) throw new BadRequestException('name and email are required');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('A user with this email already exists');

    const tempPwd = Math.random().toString(36).slice(-10) + 'Aa1!';
    const hashed = await bcrypt.hash(tempPwd, 12);
    const created = await this.prisma.user.create({
      data: { name: data.name.trim(), email, password: hashed, role: data.role as Role, tenantId },
    });
    await this.logAdmin('TENANT_TEAM_PROVISIONED', 'user', created.id, { tenantId, email, role: data.role }, {}, actor);
    const { password: _pw, ...safe } = created as any;
    return { ...safe, tempPassword: tempPwd };
  }

  async listTenantMembers(tenantId: string) {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const items = await this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, mfaEnabled: true, createdAt: true, lastLoginAt: true },
    });
    return { items, total: items.length };
  }

  // ── Data export ──────────────────────────────────────────────
  async exportData(resource: string, format: string) {
    const fmt = format === 'csv' ? 'csv' : 'json';
    if (!this.prisma.isConnected) {
      if (fmt === 'csv') return { content: 'resource,message\n' + resource + ',offline', mimetype: 'text/csv', filename: `${resource}.csv` };
      return { content: JSON.stringify([{ message: 'offline' }]), mimetype: 'application/json', filename: `${resource}.json` };
    }

    let rows: any[] = [];
    if (resource === 'companies') {
      rows = await this.prisma.tenant.findMany({
        include: { _count: { select: { users: true, agents: true, calls: true, leads: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (resource === 'users') {
      rows = await this.prisma.user.findMany({
        include: { tenant: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (resource === 'agents') {
      rows = await this.prisma.aIAgent.findMany({
        where: { deletedAt: null },
        include: { tenant: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (resource === 'calls') {
      rows = await this.prisma.call.findMany({ orderBy: { startedAt: 'desc' }, take: 5000 });
    } else if (resource === 'invoices') {
      rows = await this.prisma.invoice.findMany({ include: { tenant: { select: { name: true } } }, orderBy: { createdAt: 'desc' } });
    } else if (resource === 'audit-logs') {
      rows = await this.prisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5000 });
    } else if (resource === 'gateways') {
      rows = await this.prisma.telephonyGateway.findMany();
    } else if (resource === 'ai-providers') {
      rows = await this.prisma.aiProvider.findMany();
    } else {
      throw new BadRequestException(`Unknown resource: ${resource}`);
    }

    // Strip secrets before export
    const sanitized = rows.map((r: any) => {
      const copy: any = { ...r };
      delete copy.password;
      delete copy.apiKeyEncrypted;
      delete copy.mfaSecret;
      delete copy.keyHash;
      return copy;
    });

    if (fmt === 'csv') {
      return { content: this.toCsv(sanitized), mimetype: 'text/csv', filename: `${resource}.csv` };
    }
    return { content: JSON.stringify(sanitized, null, 2), mimetype: 'application/json', filename: `${resource}.json` };
  }

  private toCsv(rows: any[]): string {
    if (!rows.length) return '';
    const header = Object.keys(rows[0]);
    const esc = (v: any) => {
      const s = v === null || v === undefined ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push(header.map((h) => esc((row as any)[h])).join(','));
    }
    return lines.join('\n');
  }

  async getPlatformSettingsRaw() {
    const platformTenant = await this.prisma.tenant.findFirst({
      where: { users: { some: { role: 'super_admin' } } },
      select: { settings: true },
    });
    return ((platformTenant?.settings as any) || {}).platform || {};
  }

  // ── Feature flags ───────────────────────────────────────────
  async listFeatureFlags() {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const items = await this.prisma.featureFlag.findMany({ orderBy: { createdAt: 'asc' } });
    return { items, total: items.length };
  }

  async createFeatureFlag(data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const key = (data.key || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!key) throw new BadRequestException('key is required');
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (existing) throw new ConflictException(`Feature flag "${key}" already exists`);
    const created = await this.prisma.featureFlag.create({
      data: {
        key,
        description: data.description || null,
        isEnabled: !!data.isEnabled,
        defaultEnabled: !!data.defaultEnabled,
        rollout: Math.min(Math.max(0, Number(data.rollout) || 100), 100),
        tenantOverride: (data.tenantOverride ?? {}) as any,
        updatedById: actor?.id || null,
      },
    });
    await this.logAdmin('FEATURE_FLAG_CREATED', 'feature_flag', created.id, { key }, {}, actor);
    return created;
  }

  async updateFeatureFlag(id: string, data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Feature flag not found');
    const updated = await this.prisma.featureFlag.update({
      where: { id },
      data: {
        description: data.description !== undefined ? data.description : undefined,
        isEnabled: data.isEnabled !== undefined ? !!data.isEnabled : undefined,
        defaultEnabled: data.defaultEnabled !== undefined ? !!data.defaultEnabled : undefined,
        rollout: data.rollout !== undefined ? Math.min(Math.max(0, Number(data.rollout) || 0), 100) : undefined,
        tenantOverride: data.tenantOverride !== undefined ? (data.tenantOverride as any) : undefined,
        updatedById: actor?.id || undefined,
      },
    });
    await this.logAdmin('FEATURE_FLAG_UPDATED', 'feature_flag', id, { key: updated.key, isEnabled: updated.isEnabled }, {}, actor);
    return updated;
  }

  async deleteFeatureFlag(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.featureFlag.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Feature flag not found');
    await this.prisma.featureFlag.delete({ where: { id } });
    await this.logAdmin('FEATURE_FLAG_DELETED', 'feature_flag', id, { key: existing.key }, {}, actor);
    return { success: true };
  }

  // ── API keys ─────────────────────────────────────────────────
  async listApiKeys(tenantId?: string) {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const items = await this.prisma.apiKey.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true },
    });
    return { items, total: items.length };
  }

  async createApiKey(data: any, actor: any, tenantId?: string) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.name?.trim()) throw new BadRequestException('name is required');
    const tenant = tenantId
      ? await this.prisma.tenant.findUnique({ where: { id: tenantId } })
      : await this.prisma.tenant.findFirst();
    if (!tenant) throw new BadRequestException('No platform tenant to attach the key to');
    const raw = `ac_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = await bcrypt.hash(raw, 10);
    const scopes = Array.isArray(data.scopes) ? data.scopes.map(String) : [];
    const created = await this.prisma.apiKey.create({
      data: {
        name: data.name.trim(),
        keyHash,
        prefix: raw.slice(0, 10),
        scopes,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        tenantId: tenant.id,
      },
    });
    await this.logAdmin('API_KEY_CREATED', 'api_key', created.id, { name: created.name, tenantId: tenant.id }, {}, actor);
    return { id: created.id, name: created.name, prefix: created.prefix, key: raw, note: 'Store this key now; it will not be shown again.' };
  }

  async deleteApiKey(id: string, tenantId: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('API key not found');
    await this.prisma.apiKey.delete({ where: { id } });
    await this.logAdmin('API_KEY_DELETED', 'api_key', id, { name: existing.name }, {}, actor);
    return { success: true };
  }

  // ── Webhooks ─────────────────────────────────────────────────
  private normalizeWebhookEvents(events: any): string[] {
    if (!events) return [];
    return (Array.isArray(events) ? events : String(events).split(' ').filter(Boolean)).map(String);
  }

  async listWebhooks(tenantId?: string) {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const items = await this.prisma.webhook.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return { items: items.map((i) => ({ ...i, events: this.normalizeWebhookEvents(i.events) })), total: items.length };
  }

  async createWebhook(data: any, actor: any, tenantId?: string) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.url?.trim()) throw new BadRequestException('url is required');
    const tenant = tenantId
      ? await this.prisma.tenant.findUnique({ where: { id: tenantId } })
      : await this.prisma.tenant.findFirst();
    if (!tenant) throw new BadRequestException('No platform tenant to attach the webhook to');
    const events = Array.isArray(data.events) ? data.events.map(String) : ['platform.event'];
    const secret = data.secret || crypto.randomBytes(18).toString('hex');
    const created = await this.prisma.webhook.create({
      data: {
        name: (data.name || data.url).trim().slice(0, 80),
        url: data.url.trim(),
        events,
        secret,
        isActive: data.isActive !== false,
        tenantId: tenant.id,
      },
    });
    await this.logAdmin('WEBHOOK_CREATED', 'webhook', created.id, { url: created.url, events }, {}, actor);
    return created;
  }

  async updateWebhook(id: string, data: any, actor: any, tenantId: string) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.webhook.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Webhook not found');
    const updated = await this.prisma.webhook.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name : undefined,
        url: data.url !== undefined ? data.url.trim() : undefined,
        events: data.events !== undefined ? data.events.map(String) : undefined,
        isActive: data.isActive !== undefined ? !!data.isActive : undefined,
      },
    });
    await this.logAdmin('WEBHOOK_UPDATED', 'webhook', id, { name: updated.name }, {}, actor);
    return { ...updated, events: this.normalizeWebhookEvents(updated.events) };
  }

  async deleteWebhook(id: string, tenantId: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.webhook.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Webhook not found');
    await this.prisma.webhook.delete({ where: { id } });
    await this.logAdmin('WEBHOOK_DELETED', 'webhook', id, { name: existing.name }, {}, actor);
    return { success: true };
  }

  async testWebhook(id: string, tenantId: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.webhook.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== tenantId) throw new NotFoundException('Webhook not found');
    const body = { event: 'platform.test', timestamp: new Date().toISOString(), webhookId: existing.id };
    const signature = crypto.createHmac('sha256', existing.secret).update(JSON.stringify(body)).digest('hex');
    try {
      await fetch(existing.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AgentCall-Event': 'platform.test', 'X-AgentCall-Signature': signature },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err: any) {
      await this.logAdmin('WEBHOOK_TEST_FAILED', 'webhook', id, { url: existing.url, error: err.message }, {}, actor);
      return { success: false, error: err.message };
    }
    await this.logAdmin('WEBHOOK_TEST_OK', 'webhook', id, { url: existing.url }, {}, actor);
    return { success: true };
  }

  // ── Maintenance mode ─────────────────────────────────────────
  async setMaintenanceMode(value: boolean, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const platformTenant = await this.prisma.tenant.findFirst({
      where: { users: { some: { role: 'super_admin' } } },
      select: { id: true, settings: true },
    });
    const stored = ((platformTenant?.settings as any)?.platform || {}) as any;
    const platform = { ...stored, maintenanceMode: !!value };
    if (platformTenant) {
      const currentSettings = (platformTenant.settings as any) || {};
      await this.prisma.tenant.update({
        where: { id: platformTenant.id },
        data: { settings: { ...currentSettings, platform } },
      });
    }
    await this.logAdmin(!!value ? 'MAINTENANCE_MODE_ENABLED' : 'MAINTENANCE_MODE_DISABLED', 'platform_security', null, { maintenanceMode: !!value }, {}, actor);
    return { maintenanceMode: !!value };
  }

  // ── Churn risk insights ──────────────────────────────────────
  async getChurnRisk() {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const tenants = await this.prisma.tenant.findMany({
      include: {
        _count: { select: { users: true, agents: true, leads: true, calls: true } },
        calls: {
          where: { startedAt: { gte: lastMonth } },
          select: { startedAt: true, status: true },
        },
      },
    });

    const items = tenants.map((t: any) => {
      const callsThis = t.calls.filter((c: any) => c.startedAt >= thisMonth).length;
      const callsPrev = t.calls.length - callsThis;
      const lastCall = t.calls.reduce((max: Date | null, c: any) => {
        if (!max || c.startedAt > max) return c.startedAt;
        return max;
      }, null);
      const daysSinceLast = lastCall ? Math.floor((now.getTime() - lastCall.getTime()) / 86400000) : 999;

      let score = 0;
      if (t._count.calls === 0) score += 30;                 // no usage at all
      if (callsThis === 0 && callsPrev > 0) score += 35;     // dropped to zero
      if (daysSinceLast > 30) score += Math.min(25, daysSinceLast / 4); // stale
      if (t._count.agents === 0 && t._count.leads > 0) score += 10;
      score = Math.min(95, Math.round(score));

      const label = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
      return {
        tenantId: t.id,
        company: t.name,
        plan: t.plan,
        callsThisMonth: callsThis,
        callsLastMonth: callsPrev,
        activeAgents: t._count.agents,
        leads: t._count.leads,
        daysSinceLastCall: daysSinceLast === 999 ? null : daysSinceLast,
        score,
        risk: label,
      };
    });

    items.sort((a: any, b: any) => b.score - a.score);
    return { items, total: items.length };
  }

  // ── Scheduled reports ────────────────────────────────────────
  async listScheduledReports() {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const items = await this.prisma.scheduledReport.findMany({ orderBy: { createdAt: 'desc' } });
    return { items, total: items.length };
  }

  async createScheduledReport(data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    if (!data.name?.trim()) throw new BadRequestException('name is required');
    const recipients = (Array.isArray(data.recipients) ? data.recipients : [String(data.recipients || '')])
      .map((r: string) => String(r).trim().toLowerCase())
      .filter((r: string) => r.includes('@'));
    if (!recipients.length) throw new BadRequestException('At least one valid recipient email is required');
    const created = await this.prisma.scheduledReport.create({
      data: {
        name: data.name.trim(),
        type: ['companies', 'calls', 'agents', 'leads', 'summary'].includes(data.type) ? data.type : 'companies',
        frequency: ['daily', 'weekly', 'monthly'].includes(data.frequency) ? data.frequency : 'weekly',
        recipients,
        format: data.format === 'summary' ? 'summary' : 'csv',
        enabled: data.enabled !== false,
        createdById: actor?.id || null,
        nextRunAt: this.computeNextRun(data.frequency),
      },
    });
    await this.logAdmin('SCHEDULED_REPORT_CREATED', 'scheduled_report', created.id, { name: created.name }, {}, actor);
    return created;
  }

  async updateScheduledReport(id: string, data: any, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Scheduled report not found');
    const updated = await this.prisma.scheduledReport.update({
      where: { id },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        type: data.type !== undefined ? data.type : undefined,
        frequency: data.frequency !== undefined ? data.frequency : undefined,
        recipients: data.recipients !== undefined ? (Array.isArray(data.recipients) ? data.recipients.map(String) : []) : undefined,
        format: data.format !== undefined ? data.format : undefined,
        enabled: data.enabled !== undefined ? !!data.enabled : undefined,
      },
    });
    await this.logAdmin('SCHEDULED_REPORT_UPDATED', 'scheduled_report', id, { name: updated.name }, {}, actor);
    return updated;
  }

  async deleteScheduledReport(id: string, actor: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Scheduled report not found');
    await this.prisma.scheduledReport.delete({ where: { id } });
    await this.logAdmin('SCHEDULED_REPORT_DELETED', 'scheduled_report', id, { name: existing.name }, {}, actor);
    return { success: true };
  }

  async runScheduledReport(id: string, actor?: any) {
    if (!this.prisma.isConnected) throw new BadRequestException('Database offline');
    const existing = await this.prisma.scheduledReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Scheduled report not found');

    const payload = await this.buildReportPayload(existing);
    const recipients = existing.recipients;
    let status = 'generated';
    let lastError: string | null = null;

    const resendKey = this.config.get<string>('RESEND_API_KEY', '');
    if (resendKey && recipients.length) {
      try {
        const adapter = new ResendEmailAdapter();
        let failures = 0;
        for (const to of recipients) {
          const result = await adapter.sendEmail(
            { apiKey: resendKey, fromEmail: this.config.get('RESEND_FROM_EMAIL', 'onboarding@resend.dev'), fromName: 'AgentCall Platform' },
            { subject: payload.subject, html: payload.html, to },
          );
          if (result.error) failures += 1;
        }
        if (failures > 0) {
          status = 'failed';
          lastError = `${failures}/${recipients.length} recipients failed`;
        } else {
          status = 'sent';
        }
      } catch (err: any) {
        status = 'failed';
        lastError = err.message;
      }
    }

    await this.prisma.scheduledReport.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        lastStatus: status,
        nextRunAt: this.computeNextRun(existing.frequency),
      },
    });

    const actorSafe = actor || { id: null, email: 'system' };
    await this.logAdmin('SCHEDULED_REPORT_RUN', 'scheduled_report', id, { name: existing.name, status, error: lastError, payload: payload.text.slice(0, 500) }, {}, actorSafe);

    return { success: true, status, error: lastError, summary: payload.text };
  }

  private async buildReportPayload(report: any): Promise<{ subject: string; text: string; html: string }> {
    const dateLabel = new Date().toISOString().slice(0, 10);
    const subject = `[${report.name}] report · ${dateLabel}`;
    let text = '';
    if (report.type === 'companies') {
      const rows = await this.prisma.tenant.findMany({
        include: { _count: { select: { users: true, agents: true, calls: true, leads: true } } },
        orderBy: { createdAt: 'desc' },
      });
      text = ['Company,Plan,Users,Agents,Leads,Calls', ...rows.map((r: any) => [r.name, r.plan, r._count.users, r._count.agents, r._count.leads, r._count.calls].join(','))].join('\n');
    } else if (report.type === 'agents') {
      const rows = await this.prisma.aIAgent.findMany({
        where: { deletedAt: null },
        include: { tenant: { select: { name: true } }, _count: { select: { calls: true } } },
      });
      text = ['Agent,Tenant,Status,Calls', ...rows.map((r: any) => [r.name, r.tenant?.name || '', r.status, r._count.calls].join(','))].join('\n');
    } else if (report.type === 'calls') {
      const rows = await this.prisma.call.findMany({
        orderBy: { startedAt: 'desc' },
        take: 500,
        include: { tenant: { select: { name: true } } },
      });
      text = ['Call,Direction,Status,Duration,Tenant', ...rows.map((r: any) => [r.id, r.direction, r.status, r.duration ?? '', r.tenant?.name || ''].join(','))].join('\n');
    } else if (report.type === 'leads') {
      const rows = await this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
      text = ['Name,Company,Phone,Score,Status', ...rows.map((r: any) => [r.name, r.company, r.phone, r.score ?? '', r.status ?? ''].join(','))].join('\n');
    } else {
      const [companies, agents, leads, calls] = await Promise.all([
        this.prisma.tenant.count(), this.prisma.aIAgent.count({ where: { deletedAt: null } }),
        this.prisma.lead.count(), this.prisma.call.count(),
      ]);
      text = `Platform summary ${dateLabel}\nCompanies: ${companies}\nAI agents: ${agents}\nLeads: ${leads}\nCalls: ${calls}`;
    }
    return { subject, text, html: `<pre>${text}</pre>` };
  }

  private computeNextRun(frequency: string): Date {
    const next = new Date();
    if (frequency === 'daily') next.setDate(next.getDate() + 1);
    else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    else next.setDate(next.getDate() + 7);
    next.setHours(6, 0, 0, 0);
    return next;
  }

  // ── Live activity feed ──────────────────────────────────────
  async getActivityFeed(limit: number = 25) {
    if (!this.prisma.isConnected) return { items: [], total: 0 };
    const take = Math.min(Math.max(1, Number(limit) || 25), 50);
    const [auditLogs, recentCalls, recentTenants] = await Promise.all([
      this.prisma.platformAuditLog.findMany({ orderBy: { createdAt: 'desc' }, take }),
      this.prisma.call.findMany({
        orderBy: { startedAt: 'desc' },
        take: 12,
        include: { tenant: { select: { name: true } }, agent: { select: { name: true } } },
      }),
      this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const feed: Array<Record<string, any>> = [];

    for (const c of recentCalls) {
      feed.push({
        type: 'call',
        icon: c.status === 'completed' ? 'success' : c.status === 'failed' || c.status === 'missed' ? 'error' : 'info',
        title: `Call ${c.direction} ${c.status}`,
        detail: `${c.agent?.name || 'Agent'} · ${c.tenant?.name || 'Unknown company'}`,
        meta: c.status === 'completed' && c.duration ? `${c.duration}s` : undefined,
        timestamp: c.startedAt.toISOString(),
      });
    }

    for (const t of recentTenants) {
      feed.push({
        type: 'company',
        icon: 'info',
        title: 'Company created',
        detail: t.name,
        meta: t.plan,
        timestamp: t.createdAt.toISOString(),
      });
    }

    for (const a of auditLogs) {
      feed.push({
        type: 'admin',
        icon: this.auditIcon(a.action),
        title: a.action.replace(/_/g, ' '),
        detail: a.userEmail ? `by ${a.userEmail}` : undefined,
        meta: a.resource,
        timestamp: a.createdAt.toISOString(),
      });
    }

    feed.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return { items: feed.slice(0, limit), total: feed.length };
  }

  private auditIcon(action: string): string {
    const a = (action || '').toUpperCase();
    if (a.includes('FAILED') || a.includes('BLOCKED')) return 'error';
    if (a.includes('CREATED') || a.includes('PROVISIONED')) return 'success';
    if (a.includes('DELETED') || a.includes('DEACTIVATED')) return 'error';
    if (a.includes('IMPERSONAT')) return 'warning';
    return 'info';
  }
}