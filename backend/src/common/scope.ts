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

const operatorIdOf = (actor?: ScopedActor | null): { operatorUser: { id: string } } | null =>
  !!actor && actor.role === 'agent' ? { operatorUser: { id: actor.id } } : null;

/**
 * Spreadable Prisma where-fragment scoping Calls by their agent.
 * Managers see calls of agents they supervise; agent-role users see calls of
 * agents they operate. Returns {} for other roles (unscoped across the tenant).
 */
export const callScope = (actor?: ScopedActor | null): Prisma.CallWhereInput => {
  const manager = managerIdOf(actor);
  if (manager) return { agent: manager };
  const operator = operatorIdOf(actor);
  if (operator) return { agent: operator };
  return {};
};

/**
 * Spreadable Prisma where-fragment scoping Campaigns by their agent.
 */
export const campaignScope = (actor?: ScopedActor | null): Prisma.CampaignWhereInput => {
  const manager = managerIdOf(actor);
  if (manager) return { agent: manager };
  const operator = operatorIdOf(actor);
  if (operator) return { agent: operator };
  return {};
};

/**
 * Spreadable Prisma where-fragment scoping Leads by their assigned agent.
 */
export const leadScope = (actor?: ScopedActor | null): Prisma.LeadWhereInput => {
  const manager = managerIdOf(actor);
  if (manager) return { assignedAgent: manager };
  const operator = operatorIdOf(actor);
  if (operator) return { assignedAgent: operator };
  return {};
};

/**
 * Spreadable Prisma where-fragment scoping AIAgents to those assigned to the actor.
 */
export const agentScope = (actor?: ScopedActor | null): Prisma.AIAgentWhereInput => {
  if (isManager(actor)) return { manager: { id: actor!.id } };
  if (actor?.role === 'agent') return { operatorUser: { id: actor.id } };
  return {};
};