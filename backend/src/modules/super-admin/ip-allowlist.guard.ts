import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Enforces the platform IP allowlist for sensitive platform routes.
 * When the allowlist is empty (or DB offline) access is unrestricted.
 * Active CIDR entries are matched against the client IP.
 */
@Injectable()
export class IpAllowlistGuard implements CanActivate {
  private static cache: { list: string[]; at: number } | null = null;
  private static readonly CACHE_TTL = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  static invalidate() {
    IpAllowlistGuard.cache = null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.prisma?.isConnected) return true;

    const request = context.switchToHttp().getRequest();
    let ip: string =
      request.ip || request.socket?.remoteAddress || request.headers?.['x-forwarded-for'] || '';
    ip = String(ip).split(',')[0].trim().replace(/^::ffff:/, '');

    const list = await this.loadActiveCidrs();
    if (list.length === 0) return true;
    if (ip && list.includes(ip)) return true;

    throw new ForbiddenException('Access denied: your IP is not allowlisted for platform administration');
  }

  private async loadActiveCidrs(): Promise<string[]> {
    if (IpAllowlistGuard.cache && Date.now() - IpAllowlistGuard.cache.at < IpAllowlistGuard.CACHE_TTL) {
      return IpAllowlistGuard.cache.list;
    }
    try {
      const rows = await this.prisma.ipAllowlist.findMany({ where: { isActive: true }, select: { cidr: true } });
      const list = rows.map((r) => r.cidr.trim());
      IpAllowlistGuard.cache = { list, at: Date.now() };
      return list;
    } catch {
      return [];
    }
  }
}