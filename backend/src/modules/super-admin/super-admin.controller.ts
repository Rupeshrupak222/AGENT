import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { IpAllowlistGuard } from './ip-allowlist.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  PLATFORM_TENANT_MANAGE,
  PLATFORM_AI_PROVIDERS,
  PLATFORM_TELEPHONY,
  PLATFORM_BILLING_CONFIG,
  PLATFORM_FEATURE_FLAGS,
  PLATFORM_API_KEYS,
  PLATFORM_WEBHOOKS,
  PLATFORM_REPORTS,
  WORKSPACE_VIEW,
} from '../../common/rbac/permissions';

@ApiTags('platform · super admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard, IpAllowlistGuard)
@Controller('platform')
export class SuperAdminController {
  constructor(private svc: SuperAdminService) {}

  // ── Admins ───────────────────────────────────────────────────
  @Get('admins')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'List platform super admins' })
  listAdmins() {
    return this.svc.listAdmins();
  }

  @Post('admins')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Provision a new super admin' })
  createAdmin(@Body() body: any, @CurrentUser() u: any, @Req() req: any) {
    return this.svc.createAdmin(body, { ...u, ip: req.ip });
  }

  @Patch('admins/:id/status')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Activate / deactivate a super admin' })
  updateAdminStatus(@Param('id') id: string, @Body('isActive') isActive: boolean, @CurrentUser() u: any) {
    return this.svc.updateAdminStatus(id, !!isActive, u);
  }

  // ── AI Providers ─────────────────────────────────────────────
  @Get('ai-providers')
  @Permissions(PLATFORM_AI_PROVIDERS)
  @ApiOperation({ summary: 'List AI providers' })
  listAiProviders() {
    return this.svc.listAiProviders();
  }

  @Post('ai-providers')
  @Permissions(PLATFORM_AI_PROVIDERS)
  createAiProvider(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createAiProvider(body, u);
  }

  @Patch('ai-providers/:id')
  @Permissions(PLATFORM_AI_PROVIDERS)
  updateAiProvider(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateAiProvider(id, body, u);
  }

  @Delete('ai-providers/:id')
  @Permissions(PLATFORM_AI_PROVIDERS)
  deleteAiProvider(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteAiProvider(id, u);
  }

  @Post('ai-providers/:id/probe')
  @Permissions(PLATFORM_AI_PROVIDERS)
  probeAiProvider(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.probeAiProvider(id, u);
  }

  // ── Telephony gateways ───────────────────────────────────────
  @Get('telephony/gateways')
  @Permissions(PLATFORM_TELEPHONY)
  @ApiOperation({ summary: 'List telephony gateways' })
  listGateways() {
    return this.svc.listGateways();
  }

  @Post('telephony/gateways')
  @Permissions(PLATFORM_TELEPHONY)
  createGateway(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createGateway(body, u);
  }

  @Patch('telephony/gateways/:id')
  @Permissions(PLATFORM_TELEPHONY)
  updateGateway(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateGateway(id, body, u);
  }

  @Delete('telephony/gateways/:id')
  @Permissions(PLATFORM_TELEPHONY)
  deleteGateway(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteGateway(id, u);
  }

  @Post('telephony/gateways/:id/probe')
  @Permissions(PLATFORM_TELEPHONY)
  probeGateway(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.probeGateway(id, u);
  }

  @Get('telephony/numbers')
  @Permissions(PLATFORM_TELEPHONY)
  @ApiOperation({ summary: 'Platform-wide number pool' })
  listNumberPool() {
    return this.svc.listNumberPool();
  }

  // ── Billing / pricing ────────────────────────────────────────
  @Get('billing/pricing')
  @Permissions(PLATFORM_BILLING_CONFIG)
  getPricing() {
    return this.svc.getPricing();
  }

  @Put('billing/pricing')
  @Permissions(PLATFORM_BILLING_CONFIG)
  upsertPricing(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.upsertPricing(body, u);
  }

  @Get('billing/invoices')
  @Permissions(PLATFORM_BILLING_CONFIG)
  listInvoices(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string, @Query('tenantId') tenantId?: string) {
    return this.svc.listInvoices({ page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20, status, tenantId });
  }

  @Patch('billing/invoices/:id')
  @Permissions(PLATFORM_BILLING_CONFIG)
  overrideInvoiceStatus(@Param('id') id: string, @Body('status') status: string, @CurrentUser() u: any) {
    return this.svc.overrideInvoiceStatus(id, status, u);
  }

  // ── Role permissions matrix ──────────────────────────────────
  @Get('roles')
  @Permissions(PLATFORM_TENANT_MANAGE)
  getRoleMatrix() {
    return this.svc.getRoleMatrix();
  }

  @Put('roles/:role')
  @Permissions(PLATFORM_TENANT_MANAGE)
  updateRolePermissions(@Param('role') role: string, @Body('permissions') permissions: string[], @CurrentUser() u: any) {
    return this.svc.updateRolePermissions(role, permissions || [], u);
  }

  @Delete('roles/:role')
  @Permissions(PLATFORM_TENANT_MANAGE)
  resetRolePermissions(@Param('role') role: string, @CurrentUser() u: any) {
    return this.svc.resetRolePermissions(role, u);
  }

  // ── Announcements ────────────────────────────────────────────
  @Get('announcements')
  @Permissions(PLATFORM_TENANT_MANAGE)
  listAnnouncements() {
    return this.svc.listAnnouncements();
  }

  @Post('announcements')
  @Permissions(PLATFORM_TENANT_MANAGE)
  createAnnouncement(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createAnnouncement(body, u);
  }

  @Patch('announcements/:id')
  @Permissions(PLATFORM_TENANT_MANAGE)
  updateAnnouncement(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateAnnouncement(id, body, u);
  }

  @Delete('announcements/:id')
  @Permissions(PLATFORM_TENANT_MANAGE)
  deleteAnnouncement(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteAnnouncement(id, u);
  }

  // ── Impersonation ────────────────────────────────────────────
  @Post('impersonate')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Sign in as another user (super admin only)' })
  impersonate(@Body('userId') userId: string, @CurrentUser() u: any, @Req() req: any) {
    return this.svc.impersonate(userId, u, { ip: req.ip, headers: req.headers });
  }

  // ── Support tickets (admin) ──────────────────────────────────
  @Get('support/tickets')
  @Permissions(PLATFORM_TENANT_MANAGE)
  listTickets(@Query('page') page?: string, @Query('limit') limit?: string, @Query('status') status?: string, @Query('priority') priority?: string) {
    return this.svc.listTickets({ page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 20, status, priority });
  }

  @Get('support/tickets/:id')
  @Permissions(PLATFORM_TENANT_MANAGE)
  getTicket(@Param('id') id: string) {
    return this.svc.getTicket(id);
  }

  @Patch('support/tickets/:id')
  @Permissions(PLATFORM_TENANT_MANAGE)
  updateTicket(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateTicket(id, body, u);
  }

  @Post('support/tickets/:id/reply')
  @Permissions(PLATFORM_TENANT_MANAGE)
  replyTicket(@Param('id') id: string, @Body('message') message: string, @CurrentUser() u: any) {
    return this.svc.replyTicket(id, message, u);
  }

  // ── Security ─────────────────────────────────────────────────
  @Get('security')
  @Permissions(PLATFORM_TENANT_MANAGE)
  getSecurityOverview() {
    return this.svc.getSecurityOverview();
  }

  @Post('security/allowlist')
  @Permissions(PLATFORM_TENANT_MANAGE)
  addAllowlist(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.addAllowlist(body, u);
  }

  @Patch('security/allowlist/:id')
  @Permissions(PLATFORM_TENANT_MANAGE)
  toggleAllowlist(@Param('id') id: string, @Body('isActive') isActive: boolean, @CurrentUser() u: any) {
    return this.svc.toggleAllowlist(id, !!isActive, u);
  }

  @Delete('security/allowlist/:id')
  @Permissions(PLATFORM_TENANT_MANAGE)
  deleteAllowlist(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteAllowlist(id, u);
  }

  @Patch('security/users/:userId/mfa')
  @Permissions(PLATFORM_TENANT_MANAGE)
  setUserMfa(@Param('userId') userId: string, @Body('enabled') enabled: boolean, @CurrentUser() u: any) {
    return this.svc.setUserMfa(userId, !!enabled, u);
  }

  @Post('security/require-mfa')
  @Permissions(PLATFORM_TENANT_MANAGE)
  setRequireMfa(@Body('value') value: boolean, @CurrentUser() u: any) {
    return this.svc.setRequireMfa(!!value, u);
  }

  @Post('security/maintenance-mode')
  @Permissions(PLATFORM_TENANT_MANAGE)
  setMaintenanceMode(@Body('value') value: boolean, @CurrentUser() u: any) {
    return this.svc.setMaintenanceMode(!!value, u);
  }

  // ── API keys ─────────────────────────────────────────────────
  @Get('api-keys')
  @Permissions(PLATFORM_API_KEYS)
  listApiKeys(@CurrentUser() u: any) {
    return this.svc.listApiKeys(u?.tenantId);
  }

  @Post('api-keys')
  @Permissions(PLATFORM_API_KEYS)
  createApiKey(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createApiKey(body, u, u?.tenantId);
  }

  @Delete('api-keys/:id')
  @Permissions(PLATFORM_API_KEYS)
  deleteApiKey(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteApiKey(id, u?.tenantId, u);
  }

  // ── Webhooks ─────────────────────────────────────────────────
  @Get('webhooks')
  @Permissions(PLATFORM_WEBHOOKS)
  listWebhooks(@CurrentUser() u: any) {
    return this.svc.listWebhooks(u?.tenantId);
  }

  @Post('webhooks')
  @Permissions(PLATFORM_WEBHOOKS)
  createWebhook(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createWebhook(body, u, u?.tenantId);
  }

  @Patch('webhooks/:id')
  @Permissions(PLATFORM_WEBHOOKS)
  updateWebhook(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateWebhook(id, body, u, u?.tenantId);
  }

  @Post('webhooks/:id/test')
  @Permissions(PLATFORM_WEBHOOKS)
  testWebhook(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.testWebhook(id, u?.tenantId, u);
  }

  @Delete('webhooks/:id')
  @Permissions(PLATFORM_WEBHOOKS)
  deleteWebhook(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteWebhook(id, u?.tenantId, u);
  }

  // ── Churn risk insights ──────────────────────────────────────
  @Get('insights/churn')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Per-company churn risk scoring' })
  getChurnRisk() {
    return this.svc.getChurnRisk();
  }

  // ── Scheduled reports ────────────────────────────────────────
  @Get('reports')
  @Permissions(PLATFORM_REPORTS)
  listScheduledReports() {
    return this.svc.listScheduledReports();
  }

  @Post('reports')
  @Permissions(PLATFORM_REPORTS)
  createScheduledReport(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createScheduledReport(body, u);
  }

  @Patch('reports/:id')
  @Permissions(PLATFORM_REPORTS)
  updateScheduledReport(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateScheduledReport(id, body, u);
  }

  @Post('reports/:id/run')
  @Permissions(PLATFORM_REPORTS)
  runScheduledReport(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.runScheduledReport(id, u);
  }

  @Delete('reports/:id')
  @Permissions(PLATFORM_REPORTS)
  deleteScheduledReport(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteScheduledReport(id, u);
  }

  // ── Platform audit trail ─────────────────────────────────────
  @Get('audit')
  @Permissions(PLATFORM_TENANT_MANAGE)
  listPlatformAudit(@Query('page') page?: string, @Query('limit') limit?: string, @Query('action') action?: string) {
    return this.svc.listPlatformAudit({ page: page ? parseInt(page, 10) : 1, limit: limit ? parseInt(limit, 10) : 50, action });
  }

  // ── Feature flags ────────────────────────────────────────────
  @Get('feature-flags')
  @Permissions(PLATFORM_FEATURE_FLAGS)
  @ApiOperation({ summary: 'List platform feature flags' })
  listFeatureFlags() {
    return this.svc.listFeatureFlags();
  }

  @Post('feature-flags')
  @Permissions(PLATFORM_FEATURE_FLAGS)
  createFeatureFlag(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createFeatureFlag(body, u);
  }

  @Patch('feature-flags/:id')
  @Permissions(PLATFORM_FEATURE_FLAGS)
  updateFeatureFlag(@Param('id') id: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.updateFeatureFlag(id, body, u);
  }

  @Delete('feature-flags/:id')
  @Permissions(PLATFORM_FEATURE_FLAGS)
  deleteFeatureFlag(@Param('id') id: string, @CurrentUser() u: any) {
    return this.svc.deleteFeatureFlag(id, u);
  }

  // ── Live activity feed ───────────────────────────────────────
  @Get('activity')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Recent platform activity (admin actions, calls, companies)' })
  getActivityFeed(@Query('limit') limit?: string) {
    return this.svc.getActivityFeed(limit ? parseInt(limit, 10) : 25);
  }

  // ── Tenant team provisioning ─────────────────────────────────
  @Post('tenants/:tenantId/team')
  @Permissions(PLATFORM_TENANT_MANAGE)
  provisionTenantTeam(@Param('tenantId') tenantId: string, @Body() body: any, @CurrentUser() u: any) {
    return this.svc.provisionTenantTeam(tenantId, body, u);
  }

  @Get('tenants/:tenantId/members')
  @Permissions(PLATFORM_TENANT_MANAGE)
  listTenantMembers(@Param('tenantId') tenantId: string) {
    return this.svc.listTenantMembers(tenantId);
  }

  // ── Data export ──────────────────────────────────────────────
  @Get('export')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Export platform data as CSV or JSON' })
  exportData(@Query('resource') resource: string, @Query('format') format: string) {
    return this.svc.exportData(resource || 'companies', format || 'csv');
  }
}

// ── Tenant-facing: announcements ───────────────────────────────
@ApiTags('announcements')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private svc: SuperAdminService) {}

  @Get('active')
  @Permissions(WORKSPACE_VIEW)
  @ApiOperation({ summary: 'Active announcements visible to the current tenant' })
  active(@CurrentUser() u: any) {
    return this.svc.getActiveAnnouncements(u.tenantId, u.id);
  }
}

// ── Tenant-facing: support ─────────────────────────────────────
@ApiTags('support')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('support')
export class SupportController {
  constructor(private svc: SuperAdminService) {}

  @Post('tickets')
  @Permissions(WORKSPACE_VIEW)
  @ApiOperation({ summary: 'Submit a support ticket' })
  createTicket(@Body() body: any, @CurrentUser() u: any) {
    return this.svc.createTicket(body, u);
  }
}