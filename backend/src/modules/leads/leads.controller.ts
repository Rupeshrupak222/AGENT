import {
  Controller, Get, Post, Body, Patch, Param,
  Delete, UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { LeadsService }    from './leads.service';
import { CreateLeadDto, UpdateLeadDto, BulkImportLeadsDto, UpdateLeadStatusDto } from './dto/lead.dto';
import { JwtAuthGuard }    from '../../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../../common/guards/roles.guard';
import { CurrentUser }     from '../../common/decorators/current-user.decorator';

@ApiTags('leads')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private leads: LeadsService) {}

  @Post()           create(@CurrentUser() u: any, @Body() dto: CreateLeadDto)               { return this.leads.create(u.tenantId, dto); }
  @Post('bulk')     bulkImport(@CurrentUser() u: any, @Body() dto: BulkImportLeadsDto)      { return this.leads.bulkImport(u.tenantId, dto); }
  @Get('pipeline')  pipeline(@CurrentUser() u: any)                                         { return this.leads.getPipelineStats(u.tenantId); }
  @Get()            findAll(@CurrentUser() u: any, @Query() q: any)                         { return this.leads.findAll(u.tenantId, q); }
  @Get(':id')       findOne(@CurrentUser() u: any, @Param('id') id: string)                 { return this.leads.findOne(u.tenantId, id); }
  @Patch(':id')     update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateLeadDto)       { return this.leads.update(u.tenantId, id, dto); }
  @Patch(':id/status') updateStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: UpdateLeadStatusDto) { return this.leads.updateStatus(u.tenantId, id, dto); }
  @Delete(':id')    remove(@CurrentUser() u: any, @Param('id') id: string)                 { return this.leads.remove(u.tenantId, id); }
}
