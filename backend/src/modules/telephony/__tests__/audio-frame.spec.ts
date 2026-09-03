import { AudioFrame } from '../interfaces/audio-frame.interface';

describe('AudioFrame Contract', () => {
  it('should construct a valid normalized AudioFrame from mu-law payload', () => {
    // 160 bytes of mu-law 8kHz = 20ms of audio
    const rawBuffer = Buffer.alloc(160, 0xff);
    const frame: AudioFrame = {
      sessionId: 'sess-test-1',
      sequenceNumber: 1,
      timestamp: Date.now(),
      payload: rawBuffer,
      encoding: 'audio/x-mulaw',
      sampleRate: 8000,
      channels: 1,
    };

    expect(frame.payload.length).toBe(160);
    expect(frame.encoding).toBe('audio/x-mulaw');
    expect(frame.sampleRate).toBe(8000);
    expect(frame.channels).toBe(1);
    expect(frame.sequenceNumber).toBe(1);
  });

  it('should verify base64 decoding integrity matches raw audio frame payload', () => {
    const originalText = 'telephony-audio-chunk-simulation';
    const originalBuffer = Buffer.from(originalText, 'utf-8');
    const base64String = originalBuffer.toString('base64');

    const decodedBuffer = Buffer.from(base64String, 'base64');
    expect(decodedBuffer).toEqual(originalBuffer);
    expect(decodedBuffer.toString('utf-8')).toBe(originalText);
  });
});
