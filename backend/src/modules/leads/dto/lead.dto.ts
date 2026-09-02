import { IsString, IsEmail, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum LeadStatus {
  NEW         = 'new',
  CONTACTED   = 'contacted',
  INTERESTED  = 'interested',
  QUALIFIED   = 'qualified',
  APPOINTMENT = 'appointment',
  CLOSED_WON  = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export class CreateLeadDto {
  @ApiProperty()  @IsString()  name:    string;
  @ApiProperty()  @IsString()  phone:   string;
  @ApiPropertyOptional() @IsEmail()   @IsOptional() email?:    string;
  @ApiPropertyOptional() @IsString()  @IsOptional() company?:  string;
  @ApiPropertyOptional() @IsString()  @IsOptional() source?:   string;
  @ApiPropertyOptional() @IsString()  @IsOptional() agentId?:  string;
  @ApiPropertyOptional() @IsString()  @IsOptional() notes?:    string;
  @ApiPropertyOptional() @IsEnum(LeadStatus) @IsOptional() status?: LeadStatus;
}

export class UpdateLeadDto extends PartialType(CreateLeadDto) {}

export class BulkImportLeadsDto {
  @ApiProperty({ type: [CreateLeadDto] })
  leads: CreateLeadDto[];
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status: LeadStatus;
}
