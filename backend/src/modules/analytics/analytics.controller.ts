import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ANALYTICS_VIEW } from '../../common/rbac/permissions';

@ApiTags('analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('dashboard')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get top-level dashboard KPIs' })
  @ApiQuery({ name: 'range', enum: ['today', 'week', 'month'], required: false })
  dashboard(@CurrentUser() u: any, @Query('range') range: any) {
    return this.svc.getDashboardMetrics(u.tenantId, range, u);
  }

  @Get('overview')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get top-level dashboard KPIs (overview alias)' })
  @ApiQuery({ name: 'range', enum: ['today', 'week', 'month'], required: false })
  overview(@CurrentUser() u: any, @Query('range') range: any) {
    return this.svc.getDashboardMetrics(u.tenantId, range, u);
  }

  @Get('company-dashboard')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Company Admin operational dashboard (KPIs, trends, outcomes, agent & team performance, campaigns, alerts)' })
  companyDashboard(
    @CurrentUser() u: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('prevFrom') prevFrom?: string,
    @Query('prevTo') prevTo?: string,
    @Query('granularity') granularity?: string,
  ) {
    return this.svc.getCompanyDashboard(u.tenantId, { from, to, prevFrom, prevTo, granularity: granularity as any }, u);
  }

  @Get('call-trend')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Daily call volume trend' })
  @ApiQuery({ name: 'days', required: false })
  callTrend(@CurrentUser() u: any, @Query('days') days: number) {
    return this.svc.getCallTrend(u.tenantId, days ?? 7, u);
  }

  @Get('agent-performance')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Per-agent performance stats' })
  agentPerf(@CurrentUser() u: any) {
    return this.svc.getAgentPerformance(u.tenantId, u);
  }

  @Get('conversion-funnel')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Lead conversion funnel by stage' })
  funnel(@CurrentUser() u: any) {
    return this.svc.getConversionFunnel(u.tenantId, u);
  }

  @Get('sentiment')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Sentiment score distribution' })
  sentiment(@CurrentUser() u: any) {
    return this.svc.getSentimentDistribution(u.tenantId, u);
  }

  @Get('lead-priority')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Lead priority score distribution' })
  priority(@CurrentUser() u: any) {
    return this.svc.getLeadPriorityStats(u.tenantId, u);
  }
}
