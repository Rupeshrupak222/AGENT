import {
  IsString,
  IsOptional,
  IsObject,
  NotEquals,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @NotEquals('')
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: '+91 98765 12345' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    example: {
      title: 'VP of Voice Operations',
      department: 'Sales',
      bio: 'Leading the voice AI fleet',
      timezone: 'Asia/Kolkata (IST)',
    },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}