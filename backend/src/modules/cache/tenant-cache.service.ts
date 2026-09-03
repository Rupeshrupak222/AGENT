import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Tenant-aware cache service.
 * All cache keys are prefixed with tenant:{tenantId}: to prevent cross-tenant cache poisoning.
 *
 * Currently wraps in-memory Map. When Redis caching is activated,
 * this service should be the ONLY interface for cache access.
 */
@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);
  private store = new Map<string, { value: any; expiresAt: number }>();
  private readonly prefix = 'tenant';

  constructor(private config: ConfigService) {
    // Periodic cleanup of expired entries
    setInterval(() => this.cleanup(), 60_000);
  }

  /**
   * Build a tenant-scoped cache key.
   * Format: tenant:{tenantId}:{namespace}:{key}
   */
  private buildKey(tenantId: string, namespace: string, key: string): string {
    return `${this.prefix}:${tenantId}:${namespace}:${key}`;
  }

  /**
   * Set a cache entry with TTL.
   */
  set(tenantId: string, namespace: string, key: string, value: any, ttlSeconds: number = 300): void {
    const cacheKey = this.buildKey(tenantId, namespace, key);
    this.store.set(cacheKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Get a cached value. Returns null if not found or expired.
   */
  get<T = any>(tenantId: string, namespace: string, key: string): T | null {
    const cacheKey = this.buildKey(tenantId, namespace, key);
    const entry = this.store.get(cacheKey);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(cacheKey);
      return null;
    }
    return entry.value as T;
  }

  /**
   * Get or compute: returns cached value if present, otherwise computes, caches, and returns.
   */
  async getOrCompute<T>(
    tenantId: string,
    namespace: string,
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number = 300,
  ): Promise<T> {
    const cached = this.get<T>(tenantId, namespace, key);
    if (cached !== null) return cached;

    const value = await compute();
    this.set(tenantId, namespace, key, value, ttlSeconds);
    return value;
  }

  /**
   * Delete a specific cache entry.
   */
  delete(tenantId: string, namespace: string, key: string): boolean {
    const cacheKey = this.buildKey(tenantId, namespace, key);
    return this.store.delete(cacheKey);
  }

  /**
   * Invalidate all cached entries for a tenant and namespace.
   */
  invalidateNamespace(tenantId: string, namespace: string): number {
    const prefix = `${this.prefix}:${tenantId}:${namespace}:`;
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate ALL cached entries for a tenant.
   */
  invalidateTenant(tenantId: string): number {
    const prefix = `${this.prefix}:${tenantId}:`;
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(tenantId: string, namespace: string, key: string): boolean {
    const cacheKey = this.buildKey(tenantId, namespace, key);
    const entry = this.store.get(cacheKey);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(cacheKey);
      return false;
    }
    return true;
  }

  /**
   * Get cache stats for a tenant (for monitoring).
   */
  getStats(tenantId: string): { totalKeys: number; expiredKeys: number; namespaces: string[] } {
    const prefix = `${this.prefix}:${tenantId}:`;
    const namespaces = new Set<string>();
    let totalKeys = 0;
    let expiredKeys = 0;

    for (const [key, entry] of this.store.entries()) {
      if (key.startsWith(prefix)) {
        totalKeys++;
        const parts = key.slice(prefix.length).split(':');
        if (parts[0]) namespaces.add(parts[0]);
        if (Date.now() > entry.expiresAt) expiredKeys++;
      }
    }

    return { totalKeys, expiredKeys, namespaces: Array.from(namespaces) };
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }
}
