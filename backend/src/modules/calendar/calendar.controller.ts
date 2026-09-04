import {
  Controller, Get, Post, Body, Patch, Delete, Query, Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CalendarService } from './calendar.service';
import { CreateAppointmentDto, UpdateAppointmentDto } from './dto/appointment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CALENDAR_VIEW, CALENDAR_MANAGE } from '../../common/rbac/permissions';

@ApiTags('calendar')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Post('appointments')
  @Permissions(CALENDAR_MANAGE)
  @ApiOperation({ summary: 'Create a new appointment' })
  create(@CurrentUser() user: any, @Body() dto: CreateAppointmentDto) {
    return this.calendar.create(user.tenantId, user.id, dto);
  }

  @Get('appointments')
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'List appointments' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  findAll(@CurrentUser() user: any, @Query() q: any) {
    return this.calendar.findAll(user.tenantId, q);
  }

  @Get('overview')
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'Appointment overview stats' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  overview(@CurrentUser() user: any, @Query() q: any) {
    return this.calendar.overview(user.tenantId, q);
  }

  @Patch('appointments/:id')
  @Permissions(CALENDAR_MANAGE)
  @ApiOperation({ summary: 'Update an appointment' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.calendar.update(user.tenantId, id, dto);
  }

  @Delete('appointments/:id')
  @Permissions(CALENDAR_MANAGE)
  @ApiOperation({ summary: 'Delete an appointment' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.calendar.remove(user.tenantId, id);
  }
}
