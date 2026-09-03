import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ANALYTICS_VIEW } from '../../common/rbac/permissions';

@ApiTags('analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('dashboard')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get top-level dashboard KPIs' })
  @ApiQuery({ name: 'range', enum: ['today', 'week', 'month'], required: false })
  dashboard(@CurrentUser() u: any, @Query('range') range: any) {
    return this.svc.getDashboardMetrics(u.tenantId, range);
  }

  @Get('overview')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Get top-level dashboard KPIs (overview alias)' })
  @ApiQuery({ name: 'range', enum: ['today', 'week', 'month'], required: false })
  overview(@CurrentUser() u: any, @Query('range') range: any) {
    return this.svc.getDashboardMetrics(u.tenantId, range);
  }

  @Get('call-trend')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Daily call volume trend' })
  @ApiQuery({ name: 'days', required: false })
  callTrend(@CurrentUser() u: any, @Query('days') days: number) {
    return this.svc.getCallTrend(u.tenantId, days ?? 7);
  }

  @Get('agent-performance')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Per-agent performance stats' })
  agentPerf(@CurrentUser() u: any) {
    return this.svc.getAgentPerformance(u.tenantId);
  }

  @Get('conversion-funnel')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Lead conversion funnel by stage' })
  funnel(@CurrentUser() u: any) {
    return this.svc.getConversionFunnel(u.tenantId);
  }

  @Get('sentiment')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Sentiment score distribution' })
  sentiment(@CurrentUser() u: any) {
    return this.svc.getSentimentDistribution(u.tenantId);
  }

  @Get('lead-priority')
  @Permissions(ANALYTICS_VIEW)
  @ApiOperation({ summary: 'Lead priority score distribution' })
  priority(@CurrentUser() u: any) {
    return this.svc.getLeadPriorityStats(u.tenantId);
  }
}
