import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

const ROLE_HIERARCHY: Record<Role, number> = {
  manager:         3,
  company_admin:   4,
  super_admin:     5,
};

const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true, email: true, role: true, createdAt: true, lastLoginAt: true, avatar: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true, email: true, role: true, createdAt: true, avatar: true },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  /**
   * Update the signed-in user's own profile photo (avatar).
   * Any authenticated dashboard role (super_admin / company_admin / manager)
   * may update their own photo — no @Permissions decorator on the route.
   * The image is stored as a base64 data URL in the existing `avatar` column.
   */
  async updateAvatar(userId: string, tenantId: string, file?: Express.Multer.File) {
    if (!file || !file.buffer?.length) {
      throw new BadRequestException('Profile photo file is required');
    }
    if (!ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WebP or GIF images are allowed');
    }
    if (file.size > MAX_AVATAR_BYTES) {
      throw new BadRequestException('Profile photo must be 2MB or smaller');
    }

    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const updated = await this.prisma.tenantUpdate(
      this.prisma.user,
      tenantId,
      userId,
      { avatar: dataUrl },
    );

    this.auditService.log({
      action: 'PROFILE_PHOTO_UPDATED',
      resource: 'user',
      resourceId: userId,
      details: { size: file.size, mimeType: file.mimetype },
      tenantId,
      userId,
    });

    const { password: _pw, ...safe } = updated as any;
    return safe;
  }

  /**
   * Update the signed-in user's own profile (name, phone, settings).
   * Any authenticated dashboard role may update their own profile —
   * no @Permissions decorator on the route.
   */
  async updateProfile(
    userId: string,
    tenantId: string,
    data: { name?: string; phone?: string; settings?: Record<string, any> },
  ) {
    const update: { name?: string; phone?: string; settings?: Record<string, any> } = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.settings !== undefined) update.settings = data.settings;

    if (Object.keys(update).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    const updated = await this.prisma.tenantUpdate(
      this.prisma.user,
      tenantId,
      userId,
      update,
    );

    this.auditService.log({
      action: 'PROFILE_UPDATED',
      resource: 'user',
      resourceId: userId,
      details: { fields: Object.keys(update) },
      tenantId,
      userId,
    });

    const { password: _pw, ...safe } = updated as any;
    return safe;
  }

  /**
   * Invite a new team member.
   * The actor can only assign roles strictly below their own hierarchy level.
   * super_admin itself can never be created through tenant-level invites.
   */
  async invite(
    tenantId: string,
    actorRole: Role,
    data: { name: string; email: string; role: string },
  ) {
    const targetRole = this.validateAssignableRole(actorRole, data.role);

    const tempPwd = Math.random().toString(36).slice(-10);
    const hashed = await bcrypt.hash(tempPwd, 12);
    const user = await this.prisma.user.create({
      data: {
        name:     data.name,
        email:    data.email,
        password: hashed,
        role:     targetRole,
        tenantId,
      },
    });

    this.auditService.log({
      action: 'USER_INVITED',
      resource: 'user',
      resourceId: user.id,
      details: { name: user.name, email: user.email, role: user.role },
      tenantId,
    });

    const { password: _pw, ...safe } = user;
    return { ...safe, tempPassword: tempPwd };
  }

  /**
   * Change a user's role.
   * Rules:
   *  - Actor cannot modify users at the same or higher hierarchy level.
   *  - Actor cannot assign a target role at the same or higher level than themselves.
   *  - super_admin cannot be created, promoted to, or demoted from within a tenant context.
   */
  async updateRole(
    tenantId: string,
    id: string,
    role: string,
    performedBy: string,
    actorRole: Role,
  ) {
    const targetRole = this.validateAssignableRole(actorRole, role);

    const existing = await this.prisma.user.findFirst({
      where:   { id, tenantId },
      select:  { id: true, role: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (existing.role === 'super_admin' || targetRole === 'super_admin') {
      throw new ForbiddenException('super_admin role can only be managed by the platform');
    }
    if (ROLE_HIERARCHY[existing.role] >= ROLE_HIERARCHY[actorRole]) {
      throw new ForbiddenException('You cannot modify a user with an equal or higher role');
    }

    const result = await this.prisma.tenantUpdate(
      this.prisma.user,
      tenantId,
      id,
      { role: targetRole },
    );

    this.auditService.log({
      action: 'ROLE_CHANGED',
      resource: 'user',
      resourceId: id,
      details: { newRole: targetRole, previousRole: existing.role },
      tenantId,
      userId: performedBy,
    });

    const { password: _pw, ...safe } = result as any;
    return safe;
  }

  /**
   * Deactivate a user.
   * Rules:
   *  - Actor cannot deactivate themselves.
   *  - Actor cannot deactivate a user at the same or higher hierarchy level.
   *  - The last active company_admin cannot be deactivated (prevents tenant lockout).
   */
  async deactivate(tenantId: string, id: string, performedBy: string, actorRole: Role) {
    if (id === performedBy) throw new ForbiddenException('You cannot deactivate your own account');

    const existing = await this.prisma.user.findFirst({
      where:   { id, tenantId },
      select:  { id: true, role: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    if (ROLE_HIERARCHY[existing.role] >= ROLE_HIERARCHY[actorRole]) {
      throw new ForbiddenException('You cannot deactivate a user with an equal or higher role');
    }

    if (existing.role === 'company_admin') {
      const activeAdmins = await this.prisma.user.count({
        where: { tenantId, role: 'company_admin', isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new ForbiddenException('Cannot deactivate the last active company admin');
      }
    }

    const result = await this.prisma.tenantUpdate(
      this.prisma.user,
      tenantId,
      id,
      { isActive: false },
    );

    this.auditService.log({
      action: 'USER_REVOKED',
      resource: 'user',
      resourceId: id,
      tenantId,
      userId: performedBy,
    });

    const { password: _pw, ...safe } = result as any;
    return safe;
  }

  /**
   * Validates that the actor is allowed to assign `role` and returns it as a Role.
   * super_admin is never assignable via tenant-scoped operations.
   */
  private validateAssignableRole(actorRole: Role, role: string): Role {
    const validRoles = Object.keys(ROLE_HIERARCHY) as Role[];
    if (!validRoles.includes(role as Role)) {
      throw new BadRequestException(`Invalid role: ${role}`);
    }

    if (role === 'super_admin') {
      throw new ForbiddenException('super_admin role can only be managed by the platform');
    }

    if (ROLE_HIERARCHY[role as Role] >= ROLE_HIERARCHY[actorRole]) {
      throw new ForbiddenException('You cannot assign a role equal to or higher than your own');
    }

    return role as Role;
  }
}