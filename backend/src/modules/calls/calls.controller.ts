import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation }  from '@nestjs/swagger';
import { CallsService, InitiateCallDto } from './calls.service';
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard';
import { CurrentUser }   from '../../common/decorators/current-user.decorator';

@ApiTags('calls')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('calls')
export class CallsController {
  constructor(private calls: CallsService) {}

  @Post()          initiate(@CurrentUser() u: any, @Body() dto: InitiateCallDto) { return this.calls.initiateCall(u.tenantId, dto); }
  @Get('metrics')  metrics(@CurrentUser()  u: any, @Query('range') range: any)   { return this.calls.getMetrics(u.tenantId, range); }
  @Get()           findAll(@CurrentUser()  u: any, @Query() q: any)              { return this.calls.findAll(u.tenantId, q); }
  @Get(':id')      findOne(@CurrentUser()  u: any, @Param('id') id: string)      { return this.calls.findOne(u.tenantId, id); }
}
