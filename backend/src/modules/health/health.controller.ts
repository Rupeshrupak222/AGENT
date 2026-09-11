import { Controller, Get, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe — is the process alive?' })
  @ApiResponse({ status: 200, description: 'Application is alive' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe — can this instance safely receive traffic?' })
  @ApiResponse({ status: 200, description: 'Readiness status with dependency checks' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }

  @Get('diagnostics')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'company_admin')
  @ApiOperation({ summary: 'Admin-only diagnostics — system health overview' })
  @ApiResponse({ status: 200, description: 'Detailed system diagnostics' })
  async getDiagnostics() {
    return this.healthService.getDiagnostics();
  }

  @Get('public-stats')
  @Public()
  @ApiOperation({ summary: 'Public live system telemetry for landing page' })
  @ApiResponse({ status: 200, description: 'Live platform call and agent stats' })
  async getPublicStats() {
    return this.healthService.getPublicLiveStats();
  }

  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Prometheus metrics scrape endpoint' })
  @ApiResponse({ status: 200, description: 'Prometheus-formatted metrics' })
  getMetrics(@Res({ passthrough: true }) res: any) {
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return this.healthService.getPrometheusMetrics();
  }
}
