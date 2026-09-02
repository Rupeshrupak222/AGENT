import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard }     from '../../common/guards/jwt-auth.guard';
import { CurrentUser }      from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get top-level dashboard KPIs' })
  @ApiQuery({ name: 'range', enum: ['today','week','month'], required: false })
  dashboard(@CurrentUser() u: any, @Query('range') range: any) {
    return this.svc.getDashboardMetrics(u.tenantId, range);
  }

  @Get('call-trend')
  @ApiOperation({ summary: 'Daily call volume trend' })
  @ApiQuery({ name: 'days', required: false })
  callTrend(@CurrentUser() u: any, @Query('days') days: number) {
    return this.svc.getCallTrend(u.tenantId, days ?? 7);
  }

  @Get('agent-performance')
  @ApiOperation({ summary: 'Per-agent performance stats' })
  agentPerf(@CurrentUser() u: any) {
    return this.svc.getAgentPerformance(u.tenantId);
  }

  @Get('conversion-funnel')
  @ApiOperation({ summary: 'Lead conversion funnel by stage' })
  funnel(@CurrentUser() u: any) {
    return this.svc.getConversionFunnel(u.tenantId);
  }

  @Get('sentiment')
  @ApiOperation({ summary: 'Sentiment score distribution' })
  sentiment(@CurrentUser() u: any) {
    return this.svc.getSentimentDistribution(u.tenantId);
  }

  @Get('lead-priority')
  @ApiOperation({ summary: 'Lead priority score distribution' })
  priority(@CurrentUser() u: any) {
    return this.svc.getLeadPriorityStats(u.tenantId);
  }
}
