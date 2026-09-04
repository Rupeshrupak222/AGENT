import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VoicesService } from './voices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AI_VOICE_MANAGE } from '../../common/rbac/permissions';

@ApiTags('voices')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('voices')
export class VoicesController {
  constructor(private readonly voices: VoicesService) {}

  @Get()
  @Permissions(AI_VOICE_MANAGE)
  @ApiOperation({ summary: 'List available voice profiles' })
  list(@CurrentUser() _u: any) {
    return this.voices.list();
  }
}
