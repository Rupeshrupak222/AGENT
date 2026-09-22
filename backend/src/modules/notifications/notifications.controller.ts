import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NOTIFICATIONS_VIEW } from '../../common/rbac/permissions';

@ApiTags('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiBearerAuth('JWT')
  @Permissions(NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'List notifications for the current tenant' })
  list(@CurrentUser() u: any, @Query() q: any) {
    return this.notifications.list(u.tenantId, q);
  }

  @Get('unread-count')
  @ApiBearerAuth('JWT')
  @Permissions(NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Get unread notification count' })
  unread(@CurrentUser() u: any) {
    return this.notifications.unreadCount(u.tenantId);
  }

  @Post('read-all')
  @ApiBearerAuth('JWT')
  @Permissions(NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() u: any) {
    return this.notifications.markAllRead(u.tenantId);
  }

  @Post(':id/read')
  @ApiBearerAuth('JWT')
  @Permissions(NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  markRead(@CurrentUser() u: any, @Param('id') id: string) {
    return this.notifications.markRead(id, u.tenantId);
  }

  @Delete()
  @ApiBearerAuth('JWT')
  @Permissions(NOTIFICATIONS_VIEW)
  @ApiOperation({ summary: 'Clear all notifications for the tenant' })
  clearAll(@CurrentUser() u: any) {
    return this.notifications.clearAll(u.tenantId);
  }
}