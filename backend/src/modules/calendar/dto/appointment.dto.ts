import {
  IsString, IsEnum, IsOptional, IsDateString, IsInt, Min, Max,
  MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum AppointmentStatusEnum {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export class CreateAppointmentDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString() @MinLength(1) @MaxLength(100)
  leadName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString() @MinLength(5)
  phone: string;

  @ApiPropertyOptional({ example: 'rahul@example.com' })
  @IsString() @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Product demo' })
  @IsString() @IsOptional()
  topic?: string;

  @ApiProperty({ example: '2026-09-10T10:00:00.000Z' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 30, description: 'Duration in minutes' })
  @IsInt() @Min(5) @Max(480) @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ enum: AppointmentStatusEnum })
  @IsEnum(AppointmentStatusEnum) @IsOptional()
  status?: AppointmentStatusEnum;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  leadId?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  agentId?: string;
}

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {}
