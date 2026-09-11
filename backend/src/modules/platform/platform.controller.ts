import { Controller, Get, Patch, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentTenant, TenantContext } from '../../common/decorators/current-tenant.decorator';
import { PLATFORM_TENANT_MANAGE } from '../../common/rbac/permissions';

@ApiTags('platform')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('platform')
export class PlatformController {
  constructor(private svc: PlatformService) {}

  @Get('dashboard')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Platform-wide dashboard KPIs' })
  getDashboard(@Query('range') range?: 'today' | 'week' | 'month') {
    return this.svc.getDashboard(range || 'week');
  }

  @Get('call-trend')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Platform-wide call volume trend' })
  getCallTrend(@Query('days') days?: string) {
    return this.svc.getCallTrend(days ? parseInt(days, 10) : 30);
  }

  @Get('company-performance')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Company performance comparison' })
  getCompanyPerformance(@Query('range') range?: 'today' | 'week' | 'month') {
    return this.svc.getCompanyPerformance(range || 'month');
  }

  @Get('users')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'All users across platform' })
  getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.svc.getAllUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      role,
      tenantId,
    });
  }

  @Get('calls')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'All calls across platform' })
  getAllCalls(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.svc.getAllCalls({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      tenantId,
      agentId,
      status,
      direction,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get('campaigns')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'All campaigns across platform' })
  getAllCampaigns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.getAllCampaigns({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      tenantId,
      status,
    });
  }

  @Get('audit-logs')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Cross-tenant audit logs' })
  getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
  ) {
    return this.svc.getAuditLogs({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      tenantId,
      userId,
      action,
    });
  }

  @Get('usage')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Platform-wide usage metrics' })
  getUsage() {
    return this.svc.getUsage();
  }

  @Get('revenue')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Platform-wide revenue/billing data' })
  getRevenue() {
    return this.svc.getRevenue();
  }

  @Get('settings')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Platform-wide configuration settings' })
  getSettings(@CurrentTenant() tenant: TenantContext) {
    return this.svc.getPlatformSettings(tenant.tenantId);
  }

  @Patch('settings')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Update platform-wide configuration settings' })
  updateSettings(
    @CurrentTenant() tenant: TenantContext,
    @Body() data: Record<string, any>,
  ) {
    return this.svc.updatePlatformSettings(tenant.tenantId, data);
  }

  @Get('search')
  @Permissions(PLATFORM_TENANT_MANAGE)
  @ApiOperation({ summary: 'Global search across all entities' })
  globalSearch(@Query('q') query: string) {
    return this.svc.globalSearch(query || '');
  }
}
