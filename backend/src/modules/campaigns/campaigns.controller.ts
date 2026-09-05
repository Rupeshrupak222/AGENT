import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CampaignsService } from './services/campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  AddCampaignLeadsDto,
  CampaignQueryDto,
} from './dto/campaign.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  CAMPAIGN_VIEW,
  CAMPAIGN_CREATE,
  CAMPAIGN_UPDATE,
  CAMPAIGN_EXECUTE,
  CAMPAIGN_PAUSE,
} from '../../common/rbac/permissions';

@ApiTags('campaigns')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Permissions(CAMPAIGN_CREATE)
  @ApiOperation({ summary: 'Create a new campaign' })
  create(@CurrentUser() user: any, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(user.tenantId, user.id, dto);
  }

  @Get()
  @Permissions(CAMPAIGN_VIEW)
  @ApiOperation({ summary: 'List all campaigns in workspace' })
  findAll(@CurrentUser() user: any, @Query() query: CampaignQueryDto) {
    return this.campaignsService.findAll(user.tenantId, query);
  }

  @Get(':id')
  @Permissions(CAMPAIGN_VIEW)
  @ApiOperation({ summary: 'Get campaign details by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.findOne(user.tenantId, id);
  }

  @Patch(':id')
  @Permissions(CAMPAIGN_UPDATE)
  @ApiOperation({ summary: 'Update campaign configuration' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions(CAMPAIGN_UPDATE)
  @ApiOperation({ summary: 'Delete or archive a campaign' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.delete(user.tenantId, id);
  }

  @Post(':id/leads')
  @Permissions(CAMPAIGN_UPDATE)
  @ApiOperation({ summary: 'Enroll target leads into campaign' })
  addLeads(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AddCampaignLeadsDto,
  ) {
    return this.campaignsService.addLeads(user.tenantId, id, dto.leadIds);
  }

  @Get(':id/leads')
  @Permissions(CAMPAIGN_VIEW)
  @ApiOperation({ summary: 'List leads enrolled in campaign' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getLeads(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.campaignsService.getLeads(user.tenantId, id, { status, page, limit });
  }

  @Get(':id/metrics')
  @Permissions(CAMPAIGN_VIEW)
  @ApiOperation({ summary: 'Get real-time campaign performance metrics' })
  getMetrics(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.getCampaignMetrics(user.tenantId, id);
  }

  @Post(':id/start')
  @Permissions(CAMPAIGN_EXECUTE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start campaign execution and enqueue eligible leads' })
  start(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.startCampaign(user.tenantId, id);
  }

  @Post(':id/pause')
  @Permissions(CAMPAIGN_PAUSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause campaign execution' })
  pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.pauseCampaign(user.tenantId, id);
  }

  @Post(':id/resume')
  @Permissions(CAMPAIGN_EXECUTE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume paused campaign execution' })
  resume(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.resumeCampaign(user.tenantId, id);
  }

  @Post(':id/cancel')
  @Permissions(CAMPAIGN_PAUSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel campaign and mark pending leads skipped' })
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.campaignsService.cancelCampaign(user.tenantId, id);
  }
}
