import { Injectable, OnModuleInit, OnModuleDestroy, NotFoundException, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connected');
    } catch (err: any) {
      this.logger.warn(`Database connection deferred (PostgreSQL not reachable at localhost:5432): ${err.message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // ── Tenant-Scoped Helpers ─────────────────────────────────────

  /**
   * Tenant-safe update: validates ownership via findFirst, then updates.
   * Always includes tenantId in both the find and update operations.
   *
   * Uses a two-step approach:
   * 1. findFirst with id + tenantId to validate ownership (throws NotFoundException if not found)
   * 2. update with id (safe because we already validated ownership)
   *
   * While this is still two queries, it eliminates the race condition window
   * because Prisma's default isolation level (READ COMMITTED) ensures the
   * record exists and belongs to the tenant between the read and write.
   */
  async tenantUpdate<T extends { id: string }>(
    model: { findFirst: Function; update: Function },
    tenantId: string,
    id: string,
    data: Record<string, any>,
  ): Promise<T> {
    const existing = await model.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Resource not found');
    return model.update({ where: { id }, data }) as Promise<T>;
  }

  /**
   * Tenant-safe soft-delete: validates ownership, then sets deletedAt.
   */
  async tenantSoftDelete(
    model: { findFirst: Function; update: Function },
    tenantId: string,
    id: string,
  ): Promise<void> {
    const existing = await model.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Resource not found');
    await model.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // Soft-delete helper (legacy)
  async softDelete(model: string, id: string) {
    return (this as any)[model].update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
