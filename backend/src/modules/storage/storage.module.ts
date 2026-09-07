import { Module, Global } from '@nestjs/common';
import { CloudflareR2StorageProvider } from './providers/r2-storage.provider';

@Global()
@Module({
  providers: [
    CloudflareR2StorageProvider,
    {
      provide: 'OBJECT_STORAGE_PROVIDER',
      useExisting: CloudflareR2StorageProvider,
    },
  ],
  exports: [CloudflareR2StorageProvider, 'OBJECT_STORAGE_PROVIDER'],
})
export class StorageModule {}
