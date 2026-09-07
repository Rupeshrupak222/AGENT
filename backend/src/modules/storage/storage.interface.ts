import { Readable } from 'stream';

export interface StorageUploadResult {
  key: string;
  storageUrl?: string;
  size: number;
  mimeType: string;
  etag?: string;
}

export interface ObjectStorageProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  upload(
    key: string,
    body: Buffer | Readable,
    options?: { mimeType?: string; size?: number },
  ): Promise<StorageUploadResult>;

  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;
}

/**
 * Sanitizes path segments to prevent directory traversal or delimiter injection.
 * Strips all characters except alphanumeric, hyphen, underscore, and dot.
 */
export function sanitizeKeySegment(segment: string): string {
  if (!segment) return 'unknown';
  // Replace illegal chars and prevent path traversal ('..' or '/')
  return segment.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/\.+/g, '.');
}

/**
 * Deterministic, tenant-isolated object key for call audio recordings.
 * Structure: tenants/{tenantId}/calls/{callId}/recordings/{recordingId}.{ext}
 */
export function buildRecordingObjectKey(
  tenantId: string,
  callId: string,
  recordingId: string,
  extension: string = 'mp3',
): string {
  const safeTenant = sanitizeKeySegment(tenantId);
  const safeCall = sanitizeKeySegment(callId);
  const safeRecording = sanitizeKeySegment(recordingId);
  const safeExt = sanitizeKeySegment(extension.replace(/^\./, '')) || 'mp3';

  return `tenants/${safeTenant}/calls/${safeCall}/recordings/${safeRecording}.${safeExt}`;
}
