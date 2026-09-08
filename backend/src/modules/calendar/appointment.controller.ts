import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentService } from './services/appointment.service';
import {
  AvailabilityQueryDto,
  ScheduleAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment-schedule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CALENDAR_VIEW, CALENDAR_MANAGE, INTEGRATIONS_VIEW, INTEGRATIONS_MANAGE } from '../../common/rbac/permissions';

@ApiTags('appointments')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard, TenantGuard)
@Controller('appointments')
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Get()
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'List appointments (Day 17 scheduling)' })
  findAll(@CurrentUser() user: any, @Query() q: AppointmentQueryDto) {
    return this.appointments.findAll(user.tenantId, q);
  }

  @Get('overview')
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'Appointment overview stats including new states' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  overview(@CurrentUser() user: any, @Query() q: { from?: string; to?: string }) {
    return this.appointments.overview(user.tenantId, q);
  }

  @Get('availability')
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'Live slot availability from the configured calendar provider' })
  availability(@CurrentUser() user: any, @Query() q: AvailabilityQueryDto) {
    return this.appointments.getAvailability(user.tenantId, q);
  }

  @Get('provider/status')
  @Permissions(INTEGRATIONS_VIEW)
  @ApiOperation({ summary: 'Current calendar provider status for the tenant' })
  providerStatus(@CurrentUser() user: any) {
    return this.appointments.providerStatus(user.tenantId);
  }

  @Post('provider/test')
  @Permissions(INTEGRATIONS_MANAGE)
  @ApiOperation({ summary: 'Test the configured calendar provider connection' })
  async providerTest(@CurrentUser() user: any) {
    return this.appointments.providerStatus(user.tenantId);
  }

  @Post()
  @Permissions(CALENDAR_MANAGE)
  @ApiOperation({ summary: 'Book an appointment (idempotent when idempotencyKey provided)' })
  create(@CurrentUser() user: any, @Body() dto: ScheduleAppointmentDto) {
    return this.appointments.create(user.tenantId, user.id, dto);
  }

  @Get(':id/reminders')
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'Reminder schedule status for an appointment' })
  reminderStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.appointments.reminderStatus(user.tenantId, id);
  }

  @Get(':id')
  @Permissions(CALENDAR_VIEW)
  @ApiOperation({ summary: 'Get a single appointment' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.appointments.findOne(user.tenantId, id);
  }

  @Post(':id/reschedule')
  @Permissions(CALENDAR_MANAGE)
  @ApiOperation({ summary: 'Reschedule an appointment (provider + reminders updated)' })
  reschedule(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RescheduleAppointmentDto) {
    return this.appointments.reschedule(user.tenantId, user.id, id, dto);
  }

  @Post(':id/cancel')
  @Permissions(CALENDAR_MANAGE)
  @ApiOperation({ summary: 'Cancel an appointment (idempotent, provider + reminders cleaned)' })
  cancel(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelAppointmentDto) {
    return this.appointments.cancel(user.tenantId, user.id, id, dto);
  }
}