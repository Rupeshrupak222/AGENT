import {
  IsString, IsEnum, IsOptional, IsBoolean, IsObject,
  MinLength, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum AgentRole {
  TELECALLER         = 'telecaller',
  RECRUITER          = 'recruiter',
  RECEPTIONIST       = 'receptionist',
  COLLECTION         = 'collection',
  SALES              = 'sales',
  SUPPORT            = 'support',
  APPOINTMENT_SETTER = 'appointment_setter',
}

export enum AgentLanguage {
  HINDI     = 'hindi',
  ENGLISH   = 'english',
  HINGLISH  = 'hinglish',
  TAMIL     = 'tamil',
  TELUGU    = 'telugu',
  MARATHI   = 'marathi',
  BENGALI   = 'bengali',
  GUJARATI  = 'gujarati',
  KANNADA   = 'kannada',
  PUNJABI   = 'punjabi',
}

export class CreateAgentDto {
  @ApiProperty({ example: 'Priya AI' })
  @IsString() @MinLength(2) @MaxLength(50)
  name: string;

  @ApiProperty({ enum: AgentRole })
  @IsEnum(AgentRole)
  role: AgentRole;

  @ApiProperty({ enum: AgentLanguage })
  @IsEnum(AgentLanguage)
  language: AgentLanguage;

  @ApiProperty({ example: 'priya-warm' })
  @IsString()
  voiceId: string;

  @ApiProperty({ example: 'Qualify inbound leads and book appointments' })
  @IsString() @MinLength(10)
  businessGoal: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  openingScript?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  qualificationRules?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  knowledgeBase?: string;

  @ApiPropertyOptional({ type: Object })
  @IsObject() @IsOptional()
  settings?: Record<string, any>;
}

export class UpdateAgentDto extends PartialType(CreateAgentDto) {}

export class DeployAgentDto {
  @ApiProperty({ description: 'Comma-separated lead IDs or campaign ID' })
  @IsString()
  targetLeads: string;

  @ApiPropertyOptional({ example: '2026-08-30T10:00:00Z' })
  @IsString() @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ example: 100 })
  maxCalls?: number;
}
