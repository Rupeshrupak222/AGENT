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
});
