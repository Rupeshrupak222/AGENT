import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SuperAdminController, AnnouncementsController, SupportController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { IpAllowlistGuard } from './ip-allowlist.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [SuperAdminController, AnnouncementsController, SupportController],
  providers: [SuperAdminService, IpAllowlistGuard],
  exports: [SuperAdminService, IpAllowlistGuard],
})
export class SuperAdminModule {}