import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { ROLE_PERMISSIONS } from '../rbac/role-permissions';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * PermissionsGuard enforces required permissions per route.
 *
 * Roles can have their permission set overridden by a super admin through
 * the platform role-matrix. Overrides are stored in the RoleOverride table
 * and cached in-memory for a short TTL. When the database is offline the
 * static ROLE_PERMISSIONS map is used as a fallback.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private static overrideCache: Map<string, { perms: Set<string>; at: number }> = new Map();
  private static readonly CACHE_TTL = 30_000;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  /** Force-refresh the override cache (called after role matrix updates). */
  static invalidateOverrides(role?: string) {
    if (role) {
      PermissionsGuard.overrideCache.delete(role);
    } else {
      PermissionsGuard.overrideCache.clear();
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permissions required → allow
    if (!requiredPermissions?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) {
      throw new ForbiddenException('No role found for authenticated user');
    }

    const granted = await this.resolvePermissions(user.role);
    const missing = requiredPermissions.filter((p) => !granted.has(p));
    if (missing.length) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${missing.join(', ')}`,
      );
    }

    return true;
  }

  private async resolvePermissions(role: string): Promise<Set<string>> {
    const base = ROLE_PERMISSIONS[role];

    // super_admin keeps full static platform access — never overridden.
    if (role === 'super_admin') {
      return new Set<string>(base ?? []);
    }

    if (!this.prisma?.isConnected) {
      return new Set<string>(base ?? []);
    }

    const cached = PermissionsGuard.overrideCache.get(role);
    if (cached && Date.now() - cached.at < PermissionsGuard.CACHE_TTL) {
      return cached.perms;
    }

    try {
      const override = await this.prisma.roleOverride.findUnique({ where: { role } });
      const perms = override
        ? new Set<string>((override.permissions as string[]) || [])
        : new Set<string>(base ?? []);
      PermissionsGuard.overrideCache.set(role, { perms, at: Date.now() });
      return perms;
    } catch {
      return new Set<string>(base ?? []);
    }
  }
}