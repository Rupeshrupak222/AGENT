import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AgentsService }  from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard';
import { RolesGuard }     from '../../common/guards/roles.guard';
import { Roles }          from '../../common/decorators/roles.decorator';
import { CurrentUser }    from '../../common/decorators/current-user.decorator';

@ApiTags('agents')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Post()
  @Roles('company_admin', 'manager')
  @ApiOperation({ summary: 'Create a new AI agent' })
  create(@CurrentUser() user: any, @Body() dto: CreateAgentDto) {
    return this.agents.create(user.tenantId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all agents in tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'role',   required: false })
  findAll(@CurrentUser() user: any, @Query('status') status?: string, @Query('role') role?: string) {
    return this.agents.findAll(user.tenantId, { status, role });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single agent by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.findOne(user.tenantId, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get agent performance stats' })
  getStats(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.getStats(user.tenantId, id);
  }

  @Patch(':id')
  @Roles('company_admin', 'manager')
  @ApiOperation({ summary: 'Update agent configuration' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agents.update(user.tenantId, id, dto);
  }

  @Post(':id/activate')
  @Roles('company_admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate agent' })
  activate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.activate(user.tenantId, id);
  }

  @Post(':id/pause')
  @Roles('company_admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause agent' })
  pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.pause(user.tenantId, id);
  }

  @Post(':id/duplicate')
  @Roles('company_admin', 'manager')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate an agent' })
  duplicate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.duplicate(user.tenantId, id, user.id);
  }

  @Delete(':id')
  @Roles('company_admin')
  @ApiOperation({ summary: 'Soft-delete an agent' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.remove(user.tenantId, id);
  }
}
