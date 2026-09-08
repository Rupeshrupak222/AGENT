import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { CallsModule } from '../calls/calls.module';
import { CalendarModule } from '../calendar/calendar.module';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { AutomationQueueService } from './services/automation-queue.service';
import { AutomationActionProcessor } from './processors/automation-action.processor';
import { AutomationProviderRegistry } from './providers/provider-registry.service';
import { WhatsAppAppointmentRouter } from './services/whatsapp-appointment.router';
import { MetaWhatsAppAdapter } from './providers/whatsapp/whatsapp.adapter';
import { MockWhatsAppAdapter } from './providers/whatsapp/mock-whatsapp.adapter';
import { ResendEmailAdapter } from './providers/email/resend.adapter';
import { MockEmailAdapter } from './providers/email/mock-email.adapter';
import { ConditionEngine } from './engine/condition.engine';
import { TemplateEngine } from './engine/template.engine';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => CallsModule),
    forwardRef(() => CalendarModule),
    BullModule.registerQueue({
      name: 'automation-actions',
    }),
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationQueueService,
    AutomationActionProcessor,
    AutomationProviderRegistry,
    WhatsAppAppointmentRouter,
    MetaWhatsAppAdapter,
    MockWhatsAppAdapter,
    ResendEmailAdapter,
    MockEmailAdapter,
    ConditionEngine,
    TemplateEngine,
  ],
  exports: [
    AutomationsService,
    AutomationQueueService,
    AutomationProviderRegistry,
    WhatsAppAppointmentRouter,
    MetaWhatsAppAdapter,
    MockWhatsAppAdapter,
    ResendEmailAdapter,
    MockEmailAdapter,
    ConditionEngine,
    TemplateEngine,
  ],
})
export class AutomationsModule {}
