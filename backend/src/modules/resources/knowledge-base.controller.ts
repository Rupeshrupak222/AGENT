import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AI_AGENT_VIEW, AI_KNOWLEDGE_MANAGE } from '../../common/rbac/permissions';

@ApiTags('knowledge-base')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private svc: KnowledgeBaseService) {}

  @Get()
  @Permissions(AI_AGENT_VIEW)
  @ApiOperation({ summary: 'List knowledge sources for the company' })
  list(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.list(u.tenantId, q);
  }

  @Get(':id')
  @Permissions(AI_AGENT_VIEW)
  @ApiOperation({ summary: 'Get a single knowledge source' })
  findOne(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.findOne(u.tenantId, id);
  }

  @Post()
  @Permissions(AI_KNOWLEDGE_MANAGE)
  @ApiOperation({ summary: 'Create a knowledge source' })
  create(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.create(u.tenantId, u.id, dto);
  }

  @Patch(':id')
  @Permissions(AI_KNOWLEDGE_MANAGE)
  @ApiOperation({ summary: 'Update a knowledge source' })
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) {
    return this.svc.update(u.tenantId, id, u.id, dto);
  }

  @Delete(':id')
  @Permissions(AI_KNOWLEDGE_MANAGE)
  @ApiOperation({ summary: 'Delete a knowledge source' })
  remove(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.remove(u.tenantId, id, u.id);
  }
}