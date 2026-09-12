import { Prisma } from '@prisma/client';

export interface ScopedActor {
  id: string;
  role: string;
  tenantId?: string;
}

export const isManager = (actor?: ScopedActor | null): boolean =>
  !!actor && actor.role === 'manager';

const managerIdOf = (actor?: ScopedActor | null): { managerId: string } | null =>
  isManager(actor) ? { managerId: actor!.id } : null;

/**
 * Spreadable Prisma where-fragment scoping Calls by their agent.
 * Managers only see calls belonging to agents they supervise (`AIAgent.managerId`).
 * Returns {} for non-managers (unscoped across the whole tenant).
 */
export const callScope = (actor?: ScopedActor | null): Prisma.CallWhereInput => {
  const agent = managerIdOf(actor);
  return agent ? { agent } : {};
};

/**
 * Spreadable Prisma where-fragment scoping Campaigns by their agent.
 */
export const campaignScope = (actor?: ScopedActor | null): Prisma.CampaignWhereInput => {
  const agent = managerIdOf(actor);
  return agent ? { agent } : {};
};

/**
 * Spreadable Prisma where-fragment scoping Leads by their assigned agent.
 */
export const leadScope = (actor?: ScopedActor | null): Prisma.LeadWhereInput => {
  const assignedAgent = managerIdOf(actor);
  return assignedAgent ? { assignedAgent } : {};
};

/**
 * Spreadable Prisma where-fragment scoping AIAgents to those assigned to the actor.
 */
export const agentScope = (actor?: ScopedActor | null): Prisma.AIAgentWhereInput =>
  isManager(actor) ? { manager: { id: actor!.id } } : {};