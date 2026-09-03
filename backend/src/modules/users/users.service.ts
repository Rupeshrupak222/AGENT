import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

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

  async invite(tenantId: string, data: { name: string; email: string; role: string }) {
    const tempPwd = Math.random().toString(36).slice(-10);
    const hashed = await bcrypt.hash(tempPwd, 12);
    const user = await this.prisma.user.create({
      data: { ...data, password: hashed, tenantId, role: data.role as any },
    });

    this.auditService.log({
      action: 'USER_INVITED',
      resource: 'user',
      resourceId: user.id,
      details: { name: user.name, email: user.email, role: user.role },
      tenantId,
    });

    return { ...user, tempPassword: tempPwd };
  }

  async updateRole(tenantId: string, id: string, role: string, performedBy?: string) {
    const result = await this.prisma.tenantUpdate(
      this.prisma.user,
      tenantId,
      id,
      { role: role as any },
    );

    this.auditService.log({
      action: 'ROLE_CHANGED',
      resource: 'user',
      resourceId: id,
      details: { newRole: role },
      tenantId,
      userId: performedBy,
    });

    return result;
  }

  async deactivate(tenantId: string, id: string, performedBy?: string) {
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

    return result;
  }
}
