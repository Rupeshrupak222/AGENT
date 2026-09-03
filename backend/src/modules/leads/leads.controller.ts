import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, BulkImportLeadsDto, UpdateLeadStatusDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  LEAD_VIEW, LEAD_CREATE, LEAD_UPDATE, LEAD_DELETE, LEAD_IMPORT,
} from '../../common/rbac/permissions';

@ApiTags('leads')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Post()
  @Permissions(LEAD_CREATE)
  @ApiOperation({ summary: 'Create a lead' })
  create(@CurrentUser() u: any, @Body() dto: CreateLeadDto) {
    return this.leads.create(u.tenantId, dto);
  }

  @Post('bulk')
  @Permissions(LEAD_IMPORT)
  @ApiOperation({ summary: 'Bulk import leads' })
  bulkImport(@CurrentUser() u: any, @Body() dto: BulkImportLeadsDto) {
    return this.leads.bulkImport(u.tenantId, dto);
  }

  @Get('pipeline')
  @Permissions(LEAD_VIEW)
  @ApiOperation({ summary: 'Get lead pipeline stats' })
  pipeline(@CurrentUser() u: any) {
    return this.leads.getPipelineStats(u.tenantId);
  }

  @Get()
  @Permissions(LEAD_VIEW)
  @ApiOperation({ summary: 'List leads' })
  findAll(@CurrentUser() u: any, @Query() q: any) {
    return this.leads.findAll(u.tenantId, q);
  }

  @Get(':id')
  @Permissions(LEAD_VIEW)
  @ApiOperation({ summary: 'Get lead by ID' })
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.leads.findOne(u.tenantId, id);
  }

  @Patch(':id')
  @Permissions(LEAD_UPDATE)
  @ApiOperation({ summary: 'Update lead' })
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateLeadDto) {
    return this.leads.update(u.tenantId, id, dto);
  }

  @Patch(':id/status')
  @Permissions(LEAD_UPDATE)
  @ApiOperation({ summary: 'Update lead status' })
  updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateLeadStatusDto) {
    return this.leads.updateStatus(u.tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions(LEAD_DELETE)
  @ApiOperation({ summary: 'Soft-delete lead' })
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.leads.remove(u.tenantId, id);
  }
}
