import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationProvider } from '@prisma/client';

export class UpsertIntegrationDto {
  isActive?: boolean;
  credentials?: Record<string, any>;
  settings?: Record<string, any>;
}

export class TestConnectionDto {
  credentials?: Record<string, any>;
}

@ApiTags('integrations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'List all configured integrations for tenant' })
  list(@CurrentUser() user: any) {
    return this.integrationsService.listIntegrations(user.tenantId);
  }

  @Get(':provider')
  @ApiOperation({ summary: 'Get specific integration configuration' })
  get(@CurrentUser() user: any, @Param('provider') provider: IntegrationProvider) {
    return this.integrationsService.getIntegration(user.tenantId, provider);
  }

  @Post(':provider')
  @ApiOperation({ summary: 'Upsert credentials and settings for an integration' })
  upsert(
    @CurrentUser() user: any,
    @Param('provider') provider: IntegrationProvider,
    @Body() dto: UpsertIntegrationDto,
  ) {
    return this.integrationsService.upsertIntegration(user.tenantId, provider, dto);
  }

  @Post(':provider/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test connection with integration credentials' })
  testConnection(
    @CurrentUser() user: any,
    @Param('provider') provider: string,
    @Body() dto: TestConnectionDto,
  ) {
    return this.integrationsService.testConnection(user.tenantId, provider, dto?.credentials);
  }

  @Post('sync/:callId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger manual CRM synchronization for a call' })
  syncCallNow(@CurrentUser() user: any, @Param('callId') callId: string) {
    return this.integrationsService.syncCallNow(user.tenantId, callId);
  }
}
