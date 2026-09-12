import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseEnumPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntegrationProvider } from '@prisma/client';
import { IsOptional, IsBoolean, Allow } from 'class-validator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { INTEGRATIONS_VIEW, INTEGRATIONS_MANAGE } from '../../common/rbac/permissions';

export class UpsertIntegrationDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Allow()
  credentials?: Record<string, any>;

  @IsOptional()
  @Allow()
  settings?: Record<string, any>;
}

export class TestConnectionDto {
  @IsOptional()
  @Allow()
  credentials?: Record<string, any>;
}

@ApiTags('integrations')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  private static readonly providerPipe = new ParseEnumPipe(IntegrationProvider, {
    exceptionFactory: () =>
      new BadRequestException(
        `Unsupported integration provider. Valid providers: ${Object.values(IntegrationProvider).join(', ')}`,
      ),
  });

  @Get()
  @Permissions(INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'List all configured integrations for tenant' })
  list(@CurrentUser() user: any) {
    return this.integrationsService.listIntegrations(user.tenantId);
  }

  @Get(':provider')
  @Permissions(INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Get specific integration configuration' })
  get(
    @CurrentUser() user: any,
    @Param('provider', IntegrationsController.providerPipe) provider: IntegrationProvider,
  ) {
    return this.integrationsService.getIntegration(user.tenantId, provider);
  }

  @Post(':provider')
  @Permissions(INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Upsert credentials and settings for an integration' })
  upsert(
    @CurrentUser() user: any,
    @Param('provider', IntegrationsController.providerPipe) provider: IntegrationProvider,
    @Body() dto: UpsertIntegrationDto,
  ) {
    return this.integrationsService.upsertIntegration(user.tenantId, provider, dto);
  }

  @Post(':provider/test')
  @HttpCode(HttpStatus.OK)
  @Permissions(INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Test connection with integration credentials' })
  testConnection(
    @CurrentUser() user: any,
    @Param('provider', IntegrationsController.providerPipe) provider: IntegrationProvider,
    @Body() dto: TestConnectionDto,
  ) {
    return this.integrationsService.testConnection(user.tenantId, provider, dto?.credentials);
  }

  @Post('sync/:callId')
  @HttpCode(HttpStatus.OK)
  @Permissions(INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Trigger manual CRM synchronization for a call' })
  syncCallNow(@CurrentUser() user: any, @Param('callId') callId: string) {
    return this.integrationsService.syncCallNow(user.tenantId, callId);
  }
}