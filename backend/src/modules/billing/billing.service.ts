import { Injectable, BadRequestException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export const PLANS = {
  starter:    { name: 'Starter',    price: 299900,  agents: 2,   callsPerMonth: 500,   members: 3   },
  growth:     { name: 'Growth',     price: 999900,  agents: 10,  callsPerMonth: 5000,  members: 10  },
  business:   { name: 'Business',   price: 2999900, agents: -1,  callsPerMonth: 50000, members: 50  },
  enterprise: { name: 'Enterprise', price: -1,      agents: -1,  callsPerMonth: -1,    members: -1  },
} as const;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private razorpay: any;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    // Lazily initialise Razorpay when keys are present
    const keyId  = config.get('RAZORPAY_KEY_ID');
    const secret = config.get('RAZORPAY_KEY_SECRET');
    if (keyId && secret) {
      const Razorpay = require('razorpay');
      this.razorpay  = new Razorpay({ key_id: keyId, key_secret: secret });
    }
  }

  getPlans() { return PLANS; }

  async createOrder(tenantId: string, plan: keyof typeof PLANS) {
    const planData = PLANS[plan];
    if (!planData || planData.price === -1) throw new BadRequestException('Contact sales for Enterprise plan');

    if (!this.razorpay) {
      if (this.isProduction()) {
        throw new ServiceUnavailableException('Payments are not configured. Please contact support.');
      }
      // Local dev without live Razorpay keys → explicit simulation, never available in production.
      this.logger.warn('Razorpay keys not configured. Creating simulated local order (dev only).');
      return {
        id: `order_dev_${Date.now()}`,
        amount: planData.price,
        currency: 'INR',
        receipt: `${tenantId}-${plan}-${Date.now()}`,
        status: 'created',
        notes: { tenantId, plan, mode: 'simulation' },
      };
    }

    const order = await this.razorpay.orders.create({
      amount:   planData.price,
      currency: 'INR',
      receipt:  `${tenantId}-${plan}-${Date.now()}`,
      notes:    { tenantId, plan },
    });

    this.logger.log(`Order created: ${order.id} for tenant ${tenantId}`);
    return order;
  }

  async verifyPayment(tenantId: string, data: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    plan: keyof typeof PLANS;
  }) {
    const planData = PLANS[data.plan];
    if (!planData || planData.price === -1) throw new BadRequestException('Invalid plan for purchase');

    const isSimulation = data.razorpayOrderId.startsWith('order_dev_');
    if (isSimulation && this.isProduction()) {
      throw new BadRequestException('Payment verification failed');
    }

    if (!isSimulation) {
      if (!this.razorpay) {
        throw new ServiceUnavailableException('Payments are not configured. Please contact support.');
      }
      const crypto     = await import('crypto');
      const body       = `${data.razorpayOrderId}|${data.razorpayPaymentId}`;
      const expected   = crypto.createHmac('sha256', this.config.get('RAZORPAY_KEY_SECRET', ''))
                               .update(body).digest('hex');

      if (expected !== data.razorpaySignature) throw new BadRequestException('Payment verification failed');
    }

    // Upgrade tenant plan (simulated orders are only accepted outside production)
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data:  {
        plan:            data.plan,
        subscriptionId:  isSimulation ? null : data.razorpayPaymentId,
        planExpiresAt:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    this.logger.log(`Tenant ${tenantId} upgraded to ${data.plan}${isSimulation ? ' (dev simulation)' : ''}`);
    return { success: true, plan: tenant.plan };
  }

  private isProduction(): boolean {
    return this.config.get<string>('NODE_ENV') === 'production';
  }

  async getSubscription(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where:  { id: tenantId },
      select: { plan: true, subscriptionId: true, planExpiresAt: true, isActive: true },
    });
  }
}
