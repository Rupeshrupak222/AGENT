import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService }  from './billing.service';
import { JwtAuthGuard }    from '../../common/guards/jwt-auth.guard';
import { RolesGuard }      from '../../common/guards/roles.guard';
import { Roles }           from '../../common/decorators/roles.decorator';
import { CurrentUser }     from '../../common/decorators/current-user.decorator';
import { Public }          from '../../common/decorators/public.decorator';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private svc: BillingService) {}

  @Public()
  @Get('plans')
  getPlans() { return this.svc.getPlans(); }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('subscription')
  subscription(@CurrentUser() u: any) { return this.svc.getSubscription(u.tenantId); }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin')
  @Post('order/:plan')
  createOrder(@CurrentUser() u: any, @Param('plan') plan: any) { return this.svc.createOrder(u.tenantId, plan); }

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('company_admin')
  @Post('verify')
  verify(@CurrentUser() u: any, @Body() dto: any) { return this.svc.verifyPayment(u.tenantId, dto); }
}
