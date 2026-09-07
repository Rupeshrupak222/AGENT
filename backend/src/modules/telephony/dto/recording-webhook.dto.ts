import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TwilioRecordingWebhookDto {
  @ApiProperty({ description: 'Unique identifier of the recording', example: 'RE1234567890abcdef1234567890abcdef' })
  RecordingSid: string;

  @ApiProperty({ description: 'Twilio Call identifier', example: 'CA1234567890abcdef1234567890abcdef' })
  CallSid: string;

  @ApiProperty({ description: 'URL to access the audio recording file', example: 'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Recordings/RExxx.mp3' })
  RecordingUrl: string;

  @ApiPropertyOptional({ description: 'Recording status from Twilio', example: 'completed' })
  RecordingStatus?: string;

  @ApiPropertyOptional({ description: 'Recording duration in seconds', example: '42' })
  RecordingDuration?: string;

  @ApiPropertyOptional({ description: 'Number of channels recorded', example: '1' })
  RecordingChannels?: string;

  @ApiPropertyOptional({ description: 'Source of the recording', example: 'DialVerb' })
  RecordingSource?: string;

  @ApiPropertyOptional({ description: 'Sequence number for event ordering' })
  SequenceNumber?: string;
}

export class RecordingAcknowledgementDto {
  @ApiProperty({ example: 'acknowledged' })
  status: string;

  @ApiProperty({ example: true })
  processed: boolean;

  @ApiPropertyOptional({ example: 'rec-cuid-123' })
  recordingId?: string;

  @ApiPropertyOptional({ example: 'DUPLICATE_EVENT' })
  reason?: string;
}
