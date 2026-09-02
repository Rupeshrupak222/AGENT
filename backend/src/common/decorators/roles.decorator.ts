import { SetMetadata } from '@nestjs/common';

export type Role = 'super_admin' | 'company_admin' | 'manager' | 'agent' | 'viewer';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
