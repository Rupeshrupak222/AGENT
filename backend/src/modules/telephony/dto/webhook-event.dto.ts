import { ApiProperty } from '@nestjs/swagger';

export class WebhookAcknowledgementDto {
  @ApiProperty({ example: 'acknowledged' })
  status: string;

  @ApiProperty({ example: true })
  processed: boolean;

  @ApiProperty({ example: 'DUPLICATE_EVENT', required: false })
  reason?: string;
}

export class TelephonySystemStatusDto {
  @ApiProperty({ example: 'ready' })
  status: string;

  @ApiProperty({ example: 'telephony_foundation_v1' })
  architecture: string;

  @ApiProperty({ example: 'ready_for_provider' })
  mediaStreaming: string;

  @ApiProperty({
    example: [
      { name: 'twilio', isConfigured: false },
      { name: 'exotel', isConfigured: false },
    ],
  })
  providers: Array<{ name: string; isConfigured: boolean }>;

  @ApiProperty({ example: 0 })
  activeSessions: number;

  @ApiProperty({ example: 'deferred_day7' })
  redisQueues: string;

  @ApiProperty({ example: 'day8_ready' })
  speechPipeline: string;
}
