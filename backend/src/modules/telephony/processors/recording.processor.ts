import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { CloudflareR2StorageProvider } from '../../storage/providers/r2-storage.provider';
import { buildRecordingObjectKey } from '../../storage/storage.interface';
import { RecordingJobData, RecordingQueueService } from '../services/recording-queue.service';

@Injectable()
@Processor('recording-processing')
export class RecordingProcessor implements OnModuleInit {
  private readonly logger = new Logger(RecordingProcessor.name);
  private readonly maxFileSizeBytes = 50 * 1024 * 1024; // 50MB limit

  // Callback hook to post-call analysis pipeline when recording finishes
  private postCallAnalysisTrigger?: (callId: string, tenantId: string) => Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageProvider: CloudflareR2StorageProvider,
    private readonly queueService: RecordingQueueService,
  ) {}

  onModuleInit() {
    this.queueService.setInMemoryProcessor(async (data) => {
      await this.processRecording(data);
    });
  }

  setPostCallAnalysisTrigger(fn: (callId: string, tenantId: string) => Promise<void>) {
    this.postCallAnalysisTrigger = fn;
  }

  @Process()
  async handleBullJob(job: Job<RecordingJobData>): Promise<void> {
    this.logger.log(
      `Processing Bull recording job ${job.id} for call ${job.data.callId} recording ${job.data.providerRecordingId}`,
    );
    await this.processRecording(job.data);
  }

  /**
   * Safe, idempotent recording download from provider and upload to R2.
   */
  async processRecording(
    data: RecordingJobData,
  ): Promise<{ success: boolean; objectKey?: string; reason?: string }> {
    const { recordingId, providerRecordingId, callId, tenantId, sourceUrl, provider } = data;
    this.logger.log(`[RECORDING_DOWNLOAD_STARTED] callId=${callId} providerRecordingId=${providerRecordingId}`);

    // 1. SSRF Safety Validation
    const urlValidation = this.validateProviderUrl(sourceUrl, provider);
    if (!urlValidation.isValid) {
      this.logger.error(`[RECORDING_SSRF_REJECTED] Invalid source URL: ${sourceUrl} (${urlValidation.reason})`);
      await this.markRecordingFailed(recordingId, `SSRF_VALIDATION_FAILED: ${urlValidation.reason}`);
      return { success: false, reason: urlValidation.reason };
    }

    // 2. Check if already uploaded (Idempotency)
    try {
      if (this.prisma.isConnected) {
        const existing = await this.prisma.callRecording.findFirst({
          where: { id: recordingId, tenantId },
        });

        if (existing && existing.status === 'uploaded' && existing.objectKey) {
          this.logger.log(`Recording ${recordingId} already uploaded. Skipping duplicate upload.`);
          return { success: true, objectKey: existing.objectKey };
        }

        await this.prisma.callRecording.update({
          where: { id: recordingId },
          data: { status: 'uploading' },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Database check deferred in recording processor: ${err.message}`);
    }

    // 3. Authenticated Download from Provider
    let audioBuffer: Buffer;
    let mimeType = 'audio/mpeg';

    try {
      // Ensure .mp3 extension is requested if URL doesn't have it
      let downloadUrl = sourceUrl;
      if (provider === 'twilio' && !downloadUrl.endsWith('.mp3') && !downloadUrl.endsWith('.wav')) {
        downloadUrl = `${downloadUrl}.mp3`;
      }

      const headers: Record<string, string> = {};
      if (provider === 'twilio') {
        const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID', '');
        const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
        if (accountSid && authToken) {
          headers.Authorization = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
        }
      }

      const response = await axios.get(downloadUrl, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: this.maxFileSizeBytes,
      });

      audioBuffer = Buffer.from(response.data);
      mimeType = (response.headers['content-type'] as string) || 'audio/mpeg';
      this.logger.log(`Downloaded ${audioBuffer.length} bytes for recording ${providerRecordingId}`);
    } catch (downloadErr: any) {
      this.logger.error(`[RECORDING_DOWNLOAD_FAILED] callId=${callId}: ${downloadErr.message}`);
      await this.markRecordingFailed(recordingId, `DOWNLOAD_FAILED: ${downloadErr.message}`);
      return { success: false, reason: downloadErr.message };
    }

    // 4. Deterministic, Tenant-Isolated Object Key
    const ext = mimeType.includes('wav') ? 'wav' : 'mp3';
    const objectKey = buildRecordingObjectKey(tenantId, callId, providerRecordingId, ext);

    // 5. Upload to Cloudflare R2
    try {
      const uploadResult = await this.storageProvider.upload(objectKey, audioBuffer, {
        mimeType,
        size: audioBuffer.length,
      });

      this.logger.log(`[RECORDING_UPLOADED] key=${objectKey} size=${uploadResult.size} bytes`);

      // 6. Update CallRecording and Call in Database
      if (this.prisma.isConnected) {
        await this.prisma.callRecording.update({
          where: { id: recordingId },
          data: {
            status: 'uploaded',
            objectKey,
            storageUrl: uploadResult.storageUrl,
            size: uploadResult.size,
            mimeType,
            duration: data.duration,
          },
        });

        await this.prisma.call.update({
          where: { id: callId },
          data: {
            recordingUrl: uploadResult.storageUrl || objectKey,
          },
        });
      }

      // 7. Trigger Post-Call Intelligence if Call is completed
      if (this.postCallAnalysisTrigger) {
        this.postCallAnalysisTrigger(callId, tenantId).catch((err) =>
          this.logger.warn(`Post-call analysis trigger error: ${err.message}`),
        );
      }

      return { success: true, objectKey };
    } catch (uploadErr: any) {
      this.logger.error(`[RECORDING_UPLOAD_FAILED] key=${objectKey}: ${uploadErr.message}`);
      await this.markRecordingFailed(recordingId, `R2_UPLOAD_FAILED: ${uploadErr.message}`);
      // Telephony Call status is intentionally PRESERVED and not altered!
      return { success: false, reason: uploadErr.message };
    }
  }

  /**
   * SSRF defense: validates provider URL against trusted provider hostnames.
   */
  validateProviderUrl(urlStr: string, provider: string): { isValid: boolean; reason?: string } {
    try {
      const parsed = new URL(urlStr);

      if (parsed.protocol !== 'https:') {
        return { isValid: false, reason: 'HTTPS_REQUIRED' };
      }

      const host = parsed.hostname.toLowerCase();

      if (provider === 'twilio') {
        if (!host.endsWith('.twilio.com') && host !== 'api.twilio.com') {
          return { isValid: false, reason: 'INVALID_TWILIO_HOSTNAME' };
        }
      } else if (provider === 'mock' || provider === 'dev') {
        // Dev allowed
        return { isValid: true };
      } else {
        // Enforce trusted domains only
        if (!host.endsWith('.twilio.com') && !host.endsWith('.exotel.com')) {
          return { isValid: false, reason: 'UNTRUSTED_TELEPHONY_HOST' };
        }
      }

      return { isValid: true };
    } catch {
      return { isValid: false, reason: 'MALFORMED_URL' };
    }
  }

  private async markRecordingFailed(recordingId: string, errorMessage: string) {
    try {
      if (this.prisma.isConnected) {
        await this.prisma.callRecording.update({
          where: { id: recordingId },
          data: {
            status: 'failed',
            metadata: { error: errorMessage, failedAt: new Date().toISOString() },
          },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Failed to mark recording failed in DB: ${err.message}`);
    }
  }
}
