import { ConfigService } from '@nestjs/config';
import { CloudflareR2StorageProvider } from '../providers/r2-storage.provider';
import { buildRecordingObjectKey, sanitizeKeySegment } from '../storage.interface';

describe('Cloudflare R2 Storage Abstraction & Tenant Isolation', () => {
  let provider: CloudflareR2StorageProvider;
  let configService: ConfigService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string, defaultVal?: string) => {
        if (key === 'R2_BUCKET_NAME') return 'test-recordings-bucket';
        return defaultVal;
      }),
    } as any;

    provider = new CloudflareR2StorageProvider(configService);
  });

  describe('Key Design & Path Sanitization', () => {
    it('should generate deterministic, tenant-safe object key', () => {
      const key = buildRecordingObjectKey('tenant-alpha', 'call-101', 'RE123456789', 'mp3');
      expect(key).toBe('tenants/tenant-alpha/calls/call-101/recordings/RE123456789.mp3');
    });

    it('should sanitize directory traversal sequences and malicious characters', () => {
      const maliciousTenant = '../../etc/passwd';
      const maliciousCall = 'call/../../system';
      const maliciousRec = 'rec;rm -rf /;';

      const key = buildRecordingObjectKey(maliciousTenant, maliciousCall, maliciousRec, 'wav');
      expect(key).not.toContain('..');
      expect(key).not.toContain(';');
      expect(key).toBe('tenants/._._etc_passwd/calls/call_._._system/recordings/rec_rm_-rf___.wav');
    });

    it('should handle undefined or empty key segments safely', () => {
      expect(sanitizeKeySegment('')).toBe('unknown');
    });
  });

  describe('Storage Operations (In-Memory Dev / Mock Mode)', () => {
    it('should store and verify existence of uploaded audio recording buffer', async () => {
      const key = buildRecordingObjectKey('tenant-1', 'call-1', 'rec-1', 'mp3');
      const testBuffer = Buffer.from('FAKE_AUDIO_MP3_DATA_12345');

      expect(await provider.exists(key)).toBe(false);

      const result = await provider.upload(key, testBuffer, {
        mimeType: 'audio/mpeg',
        size: testBuffer.length,
      });

      expect(result.key).toBe(key);
      expect(result.size).toBe(testBuffer.length);
      expect(result.mimeType).toBe('audio/mpeg');
      expect(await provider.exists(key)).toBe(true);
      expect(provider.getMockBuffer(key)).toEqual(testBuffer);
    });

    it('should generate short-lived signed URL for authorized access', async () => {
      const key = buildRecordingObjectKey('tenant-1', 'call-1', 'rec-1', 'mp3');
      const signedUrl = await provider.getSignedUrl(key, 900);

      expect(signedUrl).toBeDefined();
      expect(signedUrl).toContain(key);
      expect(signedUrl).toContain('expires=');
    });

    it('should delete stored audio recordings cleanly', async () => {
      const key = buildRecordingObjectKey('tenant-1', 'call-1', 'rec-delete', 'mp3');
      await provider.upload(key, Buffer.from('delete-me'));
      expect(await provider.exists(key)).toBe(true);

      await provider.delete(key);
      expect(await provider.exists(key)).toBe(false);
    });

    it('should report isConfigured false when live R2 credentials are missing', () => {
      expect(provider.isConfigured).toBe(false);
    });
  });
});
