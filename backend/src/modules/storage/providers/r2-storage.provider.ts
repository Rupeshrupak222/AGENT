import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as AWS from 'aws-sdk';
import { Readable } from 'stream';
import {
  ObjectStorageProvider,
  StorageUploadResult,
  buildRecordingObjectKey,
} from '../storage.interface';

@Injectable()
export class CloudflareR2StorageProvider implements ObjectStorageProvider {
  readonly name = 'cloudflare_r2';
  private readonly logger = new Logger(CloudflareR2StorageProvider.name);

  private readonly accountId: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly publicBaseUrl?: string;

  private s3Client?: AWS.S3;

  // In-memory mock storage fallback for local development / testing when R2 is unconfigured
  private readonly mockStore = new Map<
    string,
    { data: Buffer; mimeType: string; size: number }
  >();

  constructor(private readonly configService: ConfigService) {
    this.accountId = this.configService.get<string>('R2_ACCOUNT_ID', '');
    this.accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', '');
    this.secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY', '');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'agentcall-recordings');
    this.publicBaseUrl = this.configService.get<string>('R2_PUBLIC_BASE_URL', '');

    const explicitEndpoint = this.configService.get<string>('R2_ENDPOINT', '');
    if (explicitEndpoint) {
      this.endpoint = explicitEndpoint;
    } else if (this.accountId) {
      this.endpoint = `https://${this.accountId}.r2.cloudflarestorage.com`;
    } else {
      this.endpoint = '';
    }

    if (this.isConfigured) {
      this.s3Client = new AWS.S3({
        endpoint: this.endpoint,
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        signatureVersion: 'v4',
        region: 'auto',
        s3ForcePathStyle: true,
      });
      this.logger.log(`Cloudflare R2 storage initialized with bucket [${this.bucketName}]`);
    } else {
      this.logger.warn(
        'Cloudflare R2 credentials unconfigured. Operating in safe offline mock storage mode.',
      );
    }
  }

  get isConfigured(): boolean {
    return Boolean(
      (this.accountId || this.endpoint) &&
        this.accessKeyId &&
        this.secretAccessKey &&
        this.bucketName,
    );
  }

  /**
   * Uploads an audio recording or binary artifact to Cloudflare R2 (or mock in-memory store in dev).
   */
  async upload(
    key: string,
    body: Buffer | Readable,
    options: { mimeType?: string; size?: number } = {},
  ): Promise<StorageUploadResult> {
    const mimeType = options.mimeType || 'audio/mpeg';

    if (this.s3Client && this.isConfigured) {
      try {
        const uploadParams: AWS.S3.PutObjectRequest = {
          Bucket: this.bucketName,
          Key: key,
          Body: body,
          ContentType: mimeType,
          ContentLength: options.size,
        };

        const result = await this.s3Client.upload(uploadParams).promise();
        this.logger.log(`[R2_UPLOAD_SUCCESS] key=${key} bucket=${this.bucketName}`);

        return {
          key,
          storageUrl: this.publicBaseUrl ? `${this.publicBaseUrl}/${key}` : result.Location,
          size: options.size || (Buffer.isBuffer(body) ? body.length : 0),
          mimeType,
          etag: result.ETag,
        };
      } catch (err: any) {
        this.logger.error(`[R2_UPLOAD_FAILED] key=${key}: ${err.message}`);
        throw err;
      }
    }

    // Offline / Mock fallback execution
    let buffer: Buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else {
      // Consume stream into buffer for mock storage
      const chunks: Buffer[] = [];
      for await (const chunk of body) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      buffer = Buffer.concat(chunks);
    }

    this.mockStore.set(key, { data: buffer, mimeType, size: buffer.length });
    this.logger.log(`[R2_MOCK_UPLOAD] key=${key} size=${buffer.length} bytes (in-memory dev mode)`);

    return {
      key,
      storageUrl: `mock-r2://${this.bucketName}/${key}`,
      size: buffer.length,
      mimeType,
      etag: `"mock-etag-${Date.now()}"`,
    };
  }

  /**
   * Generates a time-limited signed URL for secure, authorized audio access.
   * Default expiration is 15 minutes (900 seconds).
   */
  async getSignedUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    if (this.s3Client && this.isConfigured) {
      try {
        const url = await this.s3Client.getSignedUrlPromise('getObject', {
          Bucket: this.bucketName,
          Key: key,
          Expires: expiresInSeconds,
        });
        return url;
      } catch (err: any) {
        this.logger.error(`Failed to generate R2 signed URL for key=${key}: ${err.message}`);
        throw err;
      }
    }

    // Return deterministic mock signed URL
    return `https://mock-r2.local/${this.bucketName}/${key}?expires=${Date.now() + expiresInSeconds * 1000}&sig=mock_hmac_signature`;
  }

  /**
   * Deletes an object from storage.
   */
  async delete(key: string): Promise<void> {
    if (this.s3Client && this.isConfigured) {
      await this.s3Client
        .deleteObject({
          Bucket: this.bucketName,
          Key: key,
        })
        .promise();
      return;
    }

    this.mockStore.delete(key);
  }

  /**
   * Checks if an object exists in storage.
   */
  async exists(key: string): Promise<boolean> {
    if (this.s3Client && this.isConfigured) {
      try {
        await this.s3Client
          .headObject({
            Bucket: this.bucketName,
            Key: key,
          })
          .promise();
        return true;
      } catch (err: any) {
        if (err.statusCode === 404 || err.code === 'NotFound') {
          return false;
        }
        throw err;
      }
    }

    return this.mockStore.has(key);
  }

  /**
   * Helper to retrieve mock buffer (used by unit tests).
   */
  getMockBuffer(key: string): Buffer | undefined {
    return this.mockStore.get(key)?.data;
  }
}
