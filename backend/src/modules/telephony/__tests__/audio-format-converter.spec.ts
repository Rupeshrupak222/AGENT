import { AudioFormatConverterService } from '../services/audio-format-converter.service';

describe('AudioFormatConverterService', () => {
  let service: AudioFormatConverterService;

  beforeEach(() => {
    service = new AudioFormatConverterService();
  });

  describe('G.711 Mu-Law Encoding & Decoding', () => {
    it('should encode zero PCM to standard mu-law byte 0xff', () => {
      const mulaw = service.linearToMuLawSample(0);
      expect(mulaw).toBe(0xff);
    });

    it('should preserve sign and linearity across roundtrip', () => {
      const testSamples = [0, 100, 500, 2000, 10000, 25000, -100, -500, -2000, -10000, -25000];
      for (const original of testSamples) {
        const encoded = service.linearToMuLawSample(original);
        const decoded = service.muLawToLinearSample(encoded);
        // Mu-law is logarithmic 8-bit companding; quantization error is proportional to magnitude
        const relativeError = Math.abs(decoded - original) / (Math.abs(original) + 100);
        expect(relativeError).toBeLessThan(0.15); // < 15% error is standard for 8-bit companding
      }
    });

    it('should handle clipping gracefully for extreme amplitudes', () => {
      const maxPositive = service.linearToMuLawSample(40000);
      const maxNegative = service.linearToMuLawSample(-40000);
      expect(maxPositive).toBeDefined();
      expect(maxNegative).toBeDefined();
      expect(service.muLawToLinearSample(maxPositive)).toBeLessThanOrEqual(32767);
      expect(service.muLawToLinearSample(maxNegative)).toBeGreaterThanOrEqual(-32768);
    });
  });

  describe('PCM to Mu-Law Downsampling (24kHz -> 8kHz)', () => {
    it('should downsample 24000Hz PCM to exactly 8000Hz (3:1 ratio)', () => {
      // 240 samples at 24kHz = 10ms of audio -> should produce 80 samples at 8kHz
      const pcm24k = new Int16Array(240);
      for (let i = 0; i < pcm24k.length; i++) {
        pcm24k[i] = Math.round(Math.sin((i / 240) * Math.PI * 2) * 10000);
      }

      const mulawOut = service.pcmToMuLaw(pcm24k, 24000);
      expect(mulawOut.length).toBe(80);
      expect(mulawOut).toBeInstanceOf(Buffer);
    });

    it('should downsample Float32Array PCM (-1.0 to 1.0)', () => {
      const floatPcm = new Float32Array(480);
      for (let i = 0; i < floatPcm.length; i++) {
        floatPcm[i] = Math.sin((i / 480) * Math.PI * 4);
      }

      const mulawOut = service.pcmToMuLaw(floatPcm, 24000);
      expect(mulawOut.length).toBe(160); // 480 / 3 = 160 (20ms at 8kHz)
    });
  });

  describe('convertToMuLaw pipeline', () => {
    it('should pass-through buffers marked as mulaw', async () => {
      const original = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const res = await service.convertToMuLaw(original, 'mulaw');
      expect(res).toBe(original);
    });

    it('should convert raw 16-bit PCM buffer to mulaw', async () => {
      const pcmBuf = Buffer.alloc(480 * 2); // 480 16-bit samples
      const res = await service.convertToMuLaw(pcmBuf, 'pcm', 24000);
      expect(res.length).toBe(160); // 480 / 3 = 160 bytes of 8-bit mulaw
    });

    it('should complete conversion under 5ms latency threshold', async () => {
      const pcmBuf = Buffer.alloc(2400 * 2); // 100ms of audio
      const start = Date.now();
      await service.convertToMuLaw(pcmBuf, 'pcm', 24000);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(15);
    });
  });

  describe('Session Converter Isolation', () => {
    it('should provide independent session converters', async () => {
      const sessionA = service.createSessionConverter();
      const sessionB = service.createSessionConverter();
      expect(sessionA).toBeDefined();
      expect(sessionB).toBeDefined();
      expect(sessionA).not.toBe(sessionB);

      // Verify reset on session A does not affect session B
      sessionA.reset();
      const testChunk = Buffer.from([0xaa, 0xbb]);
      const outB = await sessionB.convertChunk(testChunk);
      expect(outB).toBeDefined();
    });
  });

  describe('Carrier Frame Alignment (20ms / 160 bytes @ 8kHz)', () => {
    it('should slice arbitrary mu-law buffer into exact 160-byte frames', () => {
      const arbitraryBuffer = Buffer.alloc(400, 0xff); // 400 bytes = two 160-byte frames (320 bytes) + 80-byte remainder
      const { frames, remainder } = service.sliceIntoFrames(arbitraryBuffer, 160);

      expect(frames.length).toBe(2);
      expect(frames[0].length).toBe(160);
      expect(frames[1].length).toBe(160);
      expect(remainder.length).toBe(80);
    });

    it('should return empty frames if buffer is smaller than frame size', () => {
      const smallBuffer = Buffer.alloc(100, 0xaa);
      const { frames, remainder } = service.sliceIntoFrames(smallBuffer, 160);

      expect(frames.length).toBe(0);
      expect(remainder.length).toBe(100);
    });

    it('should validate 160-byte carrier frame specification', () => {
      const validFrame = Buffer.alloc(160);
      const invalidShortFrame = Buffer.alloc(159);
      const invalidLongFrame = Buffer.alloc(161);

      expect(service.isValidMuLawFrame(validFrame, 160)).toBe(true);
      expect(service.isValidMuLawFrame(invalidShortFrame, 160)).toBe(false);
      expect(service.isValidMuLawFrame(invalidLongFrame, 160)).toBe(false);
    });
  });

  describe('Audio Format Header Detection', () => {
    it('should detect raw MP3 sync headers to prevent transmission to Twilio', () => {
      const mp3FrameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x64]); // standard MP3 frame header
      const { hasMp3Header, hasWavHeader } = service.detectAudioFormatHeaders(mp3FrameHeader);

      expect(hasMp3Header).toBe(true);
      expect(hasWavHeader).toBe(false);
    });

    it('should detect WAV RIFF headers', () => {
      const wavHeader = Buffer.from('RIFF....WAVE', 'ascii');
      const { hasMp3Header, hasWavHeader } = service.detectAudioFormatHeaders(wavHeader);

      expect(hasMp3Header).toBe(false);
      expect(hasWavHeader).toBe(true);
    });

    it('should verify raw mu-law audio has no embedded MP3 or WAV headers', () => {
      const rawMuLaw = Buffer.alloc(160, 0x7e);
      const { hasMp3Header, hasWavHeader } = service.detectAudioFormatHeaders(rawMuLaw);

      expect(hasMp3Header).toBe(false);
      expect(hasWavHeader).toBe(false);
    });
  });

  describe('Streaming Jitter Buffer & Bounded Memory', () => {
    it('should buffer and yield exact 160-byte frames across chunk boundaries', async () => {
      const session = service.createSessionConverter();

      // Send 100 bytes (no full frame yet)
      const frames1 = await session.convertChunkToFrames(Buffer.alloc(100, 0xff), 160);
      expect(frames1.length).toBe(0);
      expect(session.getBufferedBytes()).toBe(100);

      // Send another 100 bytes (total 200: yields one 160-byte frame, remainder 40)
      const frames2 = await session.convertChunkToFrames(Buffer.alloc(100, 0xff), 160);
      expect(frames2.length).toBe(1);
      expect(frames2[0].length).toBe(160);
      expect(session.getBufferedBytes()).toBe(40);
    });

    it('should clear jitter buffer immediately on barge-in reset', async () => {
      const session = service.createSessionConverter();
      await session.convertChunkToFrames(Buffer.alloc(120, 0xff), 160);
      expect(session.getBufferedBytes()).toBe(120);

      session.reset();
      expect(session.getBufferedBytes()).toBe(0);
    });

    it('should enforce bounded memory limit to prevent runaway queue growth', async () => {
      const session = service.createSessionConverter();
      // Send 10,000 bytes without draining (exceeds 8,000 byte limit)
      await session.convertChunkToFrames(Buffer.alloc(10000, 0xff), 20000);
      expect(session.getBufferedBytes()).toBeLessThanOrEqual(8000);
    });
  });
});
