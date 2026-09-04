import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogEntry {
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
  userId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create an audit log entry. Never throws — audit failures are logged but do not block operations.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: entry.details ?? {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          tenantId: entry.tenantId,
          userId: entry.userId,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to write audit log: ${err.message}`);
    }
  }

  /**
   * Query audit logs for a tenant.
   */
  async findAll(tenantId: string, query: {
    action?: string;
    resource?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const pageNum = Math.max(1, Number(query?.page) || 1);
    const limitNum = Math.max(1, Math.min(100, Number(query?.limit) || 50));
    const skip = (pageNum - 1) * limitNum;
    const { action, resource, userId } = query;

    const where: any = { tenantId };
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          details: true,
          ipAddress: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) };
  }
}
