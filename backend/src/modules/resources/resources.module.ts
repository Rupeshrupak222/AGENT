import { Module } from '@nestjs/common';
import { PhoneNumbersService } from './phone-numbers.service';
import { PhoneNumbersController } from './phone-numbers.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [PhoneNumbersService, KnowledgeBaseService],
  controllers: [PhoneNumbersController, KnowledgeBaseController],
  exports: [PhoneNumbersService, KnowledgeBaseService],
})
export class ResourcesModule {}