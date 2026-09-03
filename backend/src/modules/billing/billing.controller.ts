import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  BILLING_VIEW, BILLING_MANAGE,
} from '../../common/rbac/permissions';

@ApiTags('billing')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('billing')
export class BillingController {
  constructor(private svc: BillingService) {}

  @Public()
  @Get('plans')
  getPlans() {
    return this.svc.getPlans();
  }

  @Get('subscription')
  @Permissions(BILLING_VIEW)
  subscription(@CurrentUser() u: any) {
    return this.svc.getSubscription(u.tenantId);
  }

  @Post('order/:plan')
  @Permissions(BILLING_MANAGE)
  createOrder(@CurrentUser() u: any, @Param('plan') plan: any) {
    return this.svc.createOrder(u.tenantId, plan);
  }

  @Post('verify')
  @Permissions(BILLING_MANAGE)
  verify(@CurrentUser() u: any, @Body() dto: any) {
    return this.svc.verifyPayment(u.tenantId, dto);
  }
}
