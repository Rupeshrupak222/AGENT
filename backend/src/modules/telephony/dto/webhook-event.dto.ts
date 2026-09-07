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

  @ApiProperty({ example: 'connected' })
  database: string;

  @ApiProperty({ example: 'telephony_foundation_v1' })
  architecture: string;

  @ApiProperty({ example: 'media_gateway_bound' })
  mediaStreaming: string;

  @ApiProperty({
    example: [
      { name: 'twilio', configured: false },
      { name: 'exotel', configured: false },
    ],
  })
  providers: Array<{ name: string; configured: boolean }>;

  @ApiProperty({ example: false })
  anyProviderConfigured: boolean;

  @ApiProperty({ example: 0 })
  activeSessions: number;

  @ApiProperty({ example: 'configured' })
  redisQueues: string;

  @ApiProperty({ example: 'not_fully_configured' })
  speechPipeline: string;

  @ApiProperty({
    example: {
      stt: 'configured',
      brain: 'configured',
      tts: 'configured',
    },
  })
  speechPipelineDetail: { stt: string; brain: string; tts: string };
}
