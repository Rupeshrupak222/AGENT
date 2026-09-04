import {
  IsString, IsEnum, IsOptional, MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum AutomationTriggerEnum {
  CALL_COMPLETED = 'call_completed',
  CALL_MISSED = 'call_missed',
  LEAD_QUALIFIED = 'lead_qualified',
  DEAL_CLOSED = 'deal_closed',
}

export enum AutomationActionEnum {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  CRM_UPDATE = 'crm_update',
}

export enum AutomationRuleStatusEnum {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

export class CreateAutomationRuleDto {
  @ApiProperty({ example: 'WhatsApp follow-up on qualified lead' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiProperty({ enum: AutomationTriggerEnum })
  @IsEnum(AutomationTriggerEnum)
  trigger: AutomationTriggerEnum;

  @ApiProperty({ enum: AutomationActionEnum })
  @IsEnum(AutomationActionEnum)
  action: AutomationActionEnum;

  @ApiPropertyOptional({ example: 'Hi {{name}}, thanks for your interest!' })
  @IsString() @IsOptional()
  template?: string;

  @ApiPropertyOptional({ enum: AutomationRuleStatusEnum })
  @IsEnum(AutomationRuleStatusEnum) @IsOptional()
  status?: AutomationRuleStatusEnum;
}

export class UpdateAutomationRuleDto extends PartialType(CreateAutomationRuleDto) {}
