import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AgentsService } from './agents.service';
import { CreateAgentDto, UpdateAgentDto } from './dto/agent.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AI_AGENT_VIEW, AI_AGENT_CREATE, AI_AGENT_UPDATE, AI_AGENT_DELETE,
} from '../../common/rbac/permissions';

@ApiTags('agents')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('agents')
export class AgentsController {
  constructor(private agents: AgentsService) {}

  @Post()
  @Permissions(AI_AGENT_CREATE)
  @ApiOperation({ summary: 'Create a new AI agent' })
  create(@CurrentUser() user: any, @Body() dto: CreateAgentDto) {
    return this.agents.create(user.tenantId, user.id, dto);
  }

  @Get()
  @Permissions(AI_AGENT_VIEW)
  @ApiOperation({ summary: 'List all agents in tenant' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'role', required: false })
  findAll(@CurrentUser() user: any, @Query('status') status?: string, @Query('role') role?: string) {
    return this.agents.findAll(user.tenantId, { status, role });
  }

  @Get(':id')
  @Permissions(AI_AGENT_VIEW)
  @ApiOperation({ summary: 'Get single agent by ID' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.findOne(user.tenantId, id);
  }

  @Get(':id/stats')
  @Permissions(AI_AGENT_VIEW)
  @ApiOperation({ summary: 'Get agent performance stats' })
  getStats(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.getStats(user.tenantId, id);
  }

  @Patch(':id')
  @Permissions(AI_AGENT_UPDATE)
  @ApiOperation({ summary: 'Update agent configuration' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agents.update(user.tenantId, id, dto);
  }

  @Post(':id/activate')
  @Permissions(AI_AGENT_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate agent' })
  activate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.activate(user.tenantId, id);
  }

  @Post(':id/pause')
  @Permissions(AI_AGENT_UPDATE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause agent' })
  pause(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.pause(user.tenantId, id);
  }

  @Post(':id/duplicate')
  @Permissions(AI_AGENT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Duplicate an agent' })
  duplicate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.duplicate(user.tenantId, id, user.id);
  }

  @Delete(':id')
  @Permissions(AI_AGENT_DELETE)
  @ApiOperation({ summary: 'Soft-delete an agent' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.agents.remove(user.tenantId, id);
  }
}
