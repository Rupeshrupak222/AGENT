import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DispatchOutboundCallDto {
  @ApiProperty({ description: 'ID of the database Call record' })
  @IsString()
  @IsNotEmpty()
  callId: string;

  @ApiProperty({ description: 'Destination E.164 phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Specific telephony provider to use (e.g. twilio, exotel)' })
  @IsString()
  @IsOptional()
  provider?: string;
}
