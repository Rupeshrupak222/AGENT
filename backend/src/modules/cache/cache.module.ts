import { Module, Global } from '@nestjs/common';
import { TenantCacheService } from './tenant-cache.service';

@Global()
@Module({
  providers: [TenantCacheService],
  exports: [TenantCacheService],
})
export class CacheModule {}
