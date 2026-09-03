import { SetMetadata } from '@nestjs/common';
import { Permission } from '../rbac/permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require the authenticated user to have ALL of the specified permissions.
 * Usage: @Permissions(PERMISSION.AI_AGENT_CREATE, PERMISSION.AI_PROMPT_UPDATE)
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
