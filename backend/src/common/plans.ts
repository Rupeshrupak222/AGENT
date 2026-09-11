import { Plan } from '@prisma/client';

/**
 * Centralized plan limits for AgentCall AI.
 * Mirrors the pricing published in billing.service.ts (PLANS).
 * -1 means unlimited.
 */
export const PLAN_LIMITS: Record<Plan, {
  name: string;
  price: number;
  agents: number;
  callsPerMonth: number;
  members: number;
}> = {
  starter:    { name: 'Starter',    price: 299900,  agents: 2,   callsPerMonth: 500,   members: 3   },
  growth:     { name: 'Growth',     price: 999900,  agents: 10,  callsPerMonth: 5000,  members: 10  },
  business:   { name: 'Business',   price: 2999900, agents: -1,  callsPerMonth: 50000, members: 50  },
  enterprise: { name: 'Enterprise', price: -1,      agents: -1,  callsPerMonth: -1,    members: -1  },
};

export function isUnlimited(limit: number): boolean {
  return limit === -1;
}