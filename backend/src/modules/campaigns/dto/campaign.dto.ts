import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsDateString,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CampaignLeadStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  CALLING = 'calling',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRY_PENDING = 'retry_pending',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Q4 Outbound SaaS Sales' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Outbound qualification for B2B enterprise leads' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'cuid-agent-123' })
  @IsString()
  agentId: string;

  @ApiPropertyOptional({ example: 500, description: 'Overall maximum calls limit' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxCalls?: number;

  @ApiPropertyOptional({ example: 100, description: 'Max calls allowed per calendar day' })
  @IsInt()
  @Min(1)
  @IsOptional()
  callsPerDay?: number;

  @ApiPropertyOptional({ example: 5, default: 5, description: 'Maximum active parallel calls' })
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxConcurrentCalls?: number = 5;

  @ApiPropertyOptional({ example: 3, default: 3, description: 'Max attempts per lead on busy/no-answer' })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  maxAttempts?: number = 3;

  @ApiPropertyOptional({ example: '09:00', description: 'Window start time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm 24-hour format' })
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: '18:00', description: 'Window end time (HH:mm)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm 24-hour format' })
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], description: 'Active days (0=Sun..6=Sat)' })
  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: '2026-09-10T09:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Optional list of initial Lead IDs to attach' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  leadIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}

export class AddCampaignLeadsDto {
  @ApiProperty({ description: 'Array of Lead IDs to enroll in campaign', example: ['lead-1', 'lead-2'] })
  @IsArray()
  @IsString({ each: true })
  leadIds: string[];
}

export class CampaignQueryDto {
  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ example: 'sales' })
  @IsString()
  @IsOptional()
  search?: string;
}
