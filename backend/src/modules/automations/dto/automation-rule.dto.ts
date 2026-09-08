import {
  IsString, IsEnum, IsOptional, MinLength, MaxLength, IsArray, IsObject, IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum AutomationTriggerEnum {
  CALL_COMPLETED = 'call_completed',
  CALL_MISSED = 'call_missed',
  LEAD_QUALIFIED = 'lead_qualified',
  DEAL_CLOSED = 'deal_closed',
  CALL_ANALYSIS_COMPLETED = 'call_analysis_completed',
  LEAD_DISQUALIFIED = 'lead_disqualified',
  APPOINTMENT_DETECTED = 'appointment_detected',
  CAMPAIGN_LEAD_COMPLETED = 'campaign_lead_completed',
}

export enum AutomationActionEnum {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  CRM_UPDATE = 'crm_update',
  SEND_WHATSAPP = 'send_whatsapp',
  SEND_EMAIL = 'send_email',
}

export enum AutomationRuleStatusEnum {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

export class CreateAutomationRuleDto {
  @ApiProperty({ example: 'WhatsApp follow-up on high intent lead' })
  @IsString() @MinLength(2) @MaxLength(100)
  name: string;

  @ApiProperty({ enum: AutomationTriggerEnum })
  @IsEnum(AutomationTriggerEnum)
  trigger: AutomationTriggerEnum;

  @ApiProperty({ enum: AutomationActionEnum })
  @IsEnum(AutomationActionEnum)
  action: AutomationActionEnum;

  @ApiPropertyOptional({ example: 'Hi {{lead.name}}, thanks for your interest in our solutions!' })
  @IsString() @IsOptional()
  template?: string;

  @ApiPropertyOptional({ example: [{ field: 'leadScore', operator: '>=', value: 75 }] })
  @IsArray() @IsOptional()
  conditions?: Array<{
    field: string;
    operator: string;
    value?: any;
  }>;

  @ApiPropertyOptional()
  @IsArray() @IsOptional()
  actions?: Array<{
    type: string;
    template?: string;
    subject?: string;
    variables?: Record<string, any>;
  }>;

  @ApiPropertyOptional({ enum: AutomationRuleStatusEnum })
  @IsEnum(AutomationRuleStatusEnum) @IsOptional()
  status?: AutomationRuleStatusEnum;
}

export class UpdateAutomationRuleDto extends PartialType(CreateAutomationRuleDto) {}

export class DryRunDto {
  @ApiProperty({ example: 'call_analysis_completed' })
  @IsString()
  trigger: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  leadId?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  template?: string;

  @ApiPropertyOptional()
  @IsArray() @IsOptional()
  conditions?: any[];

  @ApiPropertyOptional()
  @IsObject() @IsOptional()
  sampleData?: Record<string, any>;
}

export class TestActionDto {
  @ApiProperty({ example: 'send_whatsapp' })
  @IsString()
  actionType: 'send_whatsapp' | 'send_email';

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ example: 'Hello from AgentCall AI test automation!' })
  @IsString() @IsOptional()
  message?: string;

  @ApiPropertyOptional({ example: 'AgentCall AI Test Notification' })
  @IsString() @IsOptional()
  subject?: string;
}
