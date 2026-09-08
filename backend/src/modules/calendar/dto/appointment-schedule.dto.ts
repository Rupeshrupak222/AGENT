import {
  IsString, IsEnum, IsOptional, IsDateString, IsInt, Min, Max, IsBoolean,
  MinLength, MaxLength, Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ScheduleSourceEnum {
  MANUAL = 'manual',
  AI = 'ai',
  WHATSAPP = 'whatsapp',
  CALL = 'call',
}

export enum CalendarProviderRequestEnum {
  AUTO = 'auto',
  NATIVE = 'native',
  CALCOM = 'calcom',
  MOCK = 'mock',
}

export class AvailabilityQueryDto {
  @ApiProperty({ example: '2026-09-09T00:00:00.000Z' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2026-09-11T00:00:00.000Z' })
  @IsDateString()
  to: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Duration in minutes' })
  @IsInt() @Min(5) @Max(480)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({ enum: CalendarProviderRequestEnum })
  @IsEnum(CalendarProviderRequestEnum)
  @IsOptional()
  provider?: CalendarProviderRequestEnum;

  @ApiPropertyOptional({ description: 'filter by topic keyword' })
  @IsString()
  @IsOptional()
  topic?: string;
}

export class ScheduleAppointmentDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString() @MinLength(1) @MaxLength(100)
  leadName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString() @MinLength(5)
  phone: string;

  @ApiPropertyOptional({ example: 'rahul@example.com' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Product demo' })
  @IsString() @MaxLength(200)
  @IsOptional()
  topic?: string;

  @ApiPropertyOptional({ example: '2026-09-10T04:00:00.000Z', description: 'UTC slot start (preferred)' })
  @IsDateString()
  @IsOptional()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-09-10T04:00:00.000Z', description: 'Legacy alias of startAt' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Duration in minutes' })
  @IsInt() @Min(5) @Max(480)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', default: 'UTC' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ example: 'Zoom' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ enum: CalendarProviderRequestEnum })
  @IsEnum(CalendarProviderRequestEnum)
  @IsOptional()
  provider?: CalendarProviderRequestEnum;

  @ApiPropertyOptional({ example: 'req_20260910_001', description: 'Idempotency key — retries return the same booking' })
  @IsString() @MaxLength(128)
  @Matches(/^[a-zA-Z0-9\-_.:]{3,128}$/)
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({ enum: ScheduleSourceEnum })
  @IsEnum(ScheduleSourceEnum)
  @IsOptional()
  source?: ScheduleSourceEnum;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  callId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  createdByEmail?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-09-12T04:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ example: 'Client requested a later slot' })
  @IsString() @MaxLength(200)
  @IsOptional()
  reason?: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Client cancelled via WhatsApp' })
  @IsString() @MaxLength(200)
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ description: 'Cancel the external provider booking even if the local copy is missing' })
  @IsBoolean()
  @IsOptional()
  force?: boolean;

  @ApiPropertyOptional({ enum: CalendarProviderRequestEnum })
  @IsEnum(CalendarProviderRequestEnum)
  @IsOptional()
  provider?: CalendarProviderRequestEnum;
}

export class AppointmentQueryDto {
  @ApiPropertyOptional({ enum: ['scheduled', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled', 'failed'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  to?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  leadId?: string;

  @ApiPropertyOptional({ description: 'Only return upcoming appointments' })
  @IsBoolean()
  @IsOptional()
  upcoming?: boolean;
}