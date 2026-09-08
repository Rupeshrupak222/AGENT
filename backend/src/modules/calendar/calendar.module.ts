import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './services/appointment.service';
import { AppointmentAgentTools } from './services/appointment-agent-tools.service';
import { AppointmentReminderQueueService } from './services/appointment-reminder-queue.service';
import { AppointmentReminderProcessor } from './processors/appointment-reminder.processor';
import { CalendarProviderRegistry } from './providers/calendar-provider-registry.service';
import { CalendarErrorFactory } from './providers/calendar-errors';
import { MockCalendarAdapter } from './providers/mock-calendar.adapter';
import { CalComCalendarAdapter } from './providers/calcom.adapter';
import { AuditModule } from '../audit/audit.module';
import { AutomationsModule } from '../automations/automations.module';

@Module({
  imports: [
    AuditModule,
    forwardRef(() => AutomationsModule),
    BullModule.registerQueue({
      name: 'appointment-reminders',
    }),
  ],
  controllers: [CalendarController, AppointmentController],
  providers: [
    CalendarService,
    AppointmentService,
    AppointmentAgentTools,
    AppointmentReminderQueueService,
    AppointmentReminderProcessor,
    CalendarProviderRegistry,
    CalendarErrorFactory,
    MockCalendarAdapter,
    CalComCalendarAdapter,
  ],
  exports: [
    CalendarService,
    AppointmentService,
    AppointmentAgentTools,
    CalendarErrorFactory,
    CalendarProviderRegistry,
    MockCalendarAdapter,
    CalComCalendarAdapter,
  ],
})
export class CalendarModule {}