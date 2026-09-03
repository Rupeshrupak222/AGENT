import { ConfigService } from '@nestjs/config';
import { TenantCacheService } from '../tenant-cache.service';

describe('TenantCacheService', () => {
  let cache: TenantCacheService;

  const TENANT_A = 'tenant-a';
  const TENANT_B = 'tenant-b';

  beforeEach(() => {
    cache = new TenantCacheService({
      get: jest.fn(),
    } as any);
  });

  describe('Basic operations', () => {
    it('should set and get a value', () => {
      cache.set(TENANT_A, 'leads', 'lead-1', { name: 'Test Lead' });
      const result = cache.get(TENANT_A, 'leads', 'lead-1');
      expect(result).toEqual({ name: 'Test Lead' });
    });

    it('should return null for non-existent key', () => {
      const result = cache.get(TENANT_A, 'leads', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should delete a value', () => {
      cache.set(TENANT_A, 'leads', 'lead-1', { name: 'Test Lead' });
      const deleted = cache.delete(TENANT_A, 'leads', 'lead-1');
      expect(deleted).toBe(true);
      expect(cache.get(TENANT_A, 'leads', 'lead-1')).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set(TENANT_A, 'leads', 'lead-1', { name: 'Test Lead' });
      expect(cache.has(TENANT_A, 'leads', 'lead-1')).toBe(true);
      expect(cache.has(TENANT_A, 'leads', 'lead-2')).toBe(false);
    });
  });

  describe('Tenant isolation', () => {
    it('should NOT leak Tenant A data to Tenant B', () => {
      cache.set(TENANT_A, 'leads', 'lead-1', { name: 'Tenant A Lead' });

      const result = cache.get(TENANT_B, 'leads', 'lead-1');
      expect(result).toBeNull();
    });

    it('should NOT leak Tenant B data to Tenant A', () => {
      cache.set(TENANT_B, 'leads', 'lead-1', { name: 'Tenant B Lead' });

      const result = cache.get(TENANT_A, 'leads', 'lead-1');
      expect(result).toBeNull();
    });

    it('should allow same key in different tenants', () => {
      cache.set(TENANT_A, 'leads', 'lead-1', { name: 'A Lead' });
      cache.set(TENANT_B, 'leads', 'lead-1', { name: 'B Lead' });

      expect(cache.get(TENANT_A, 'leads', 'lead-1')).toEqual({ name: 'A Lead' });
      expect(cache.get(TENANT_B, 'leads', 'lead-1')).toEqual({ name: 'B Lead' });
    });

    it('should isolate namespaces within same tenant', () => {
      cache.set(TENANT_A, 'leads', 'key-1', { from: 'leads' });
      cache.set(TENANT_A, 'calls', 'key-1', { from: 'calls' });

      expect(cache.get(TENANT_A, 'leads', 'key-1')).toEqual({ from: 'leads' });
      expect(cache.get(TENANT_A, 'calls', 'key-1')).toEqual({ from: 'calls' });
    });
  });

  describe('Namespace invalidation', () => {
    it('should invalidate only specified namespace for tenant', () => {
      cache.set(TENANT_A, 'leads', 'k1', 'v1');
      cache.set(TENANT_A, 'leads', 'k2', 'v2');
      cache.set(TENANT_A, 'calls', 'k1', 'v1');

      const invalidated = cache.invalidateNamespace(TENANT_A, 'leads');
      expect(invalidated).toBe(2);
      expect(cache.get(TENANT_A, 'leads', 'k1')).toBeNull();
      expect(cache.get(TENANT_A, 'leads', 'k2')).toBeNull();
      expect(cache.get(TENANT_A, 'calls', 'k1')).toBe('v1'); // not affected
    });

    it('should NOT invalidate other tenant namespaces', () => {
      cache.set(TENANT_A, 'leads', 'k1', 'v1');
      cache.set(TENANT_B, 'leads', 'k1', 'v1');

      cache.invalidateNamespace(TENANT_A, 'leads');
      expect(cache.get(TENANT_A, 'leads', 'k1')).toBeNull();
      expect(cache.get(TENANT_B, 'leads', 'k1')).toBe('v1'); // preserved
    });
  });

  describe('Tenant invalidation', () => {
    it('should invalidate ALL entries for a tenant', () => {
      cache.set(TENANT_A, 'leads', 'k1', 'v1');
      cache.set(TENANT_A, 'calls', 'k1', 'v1');
      cache.set(TENANT_A, 'analytics', 'k1', 'v1');
      cache.set(TENANT_B, 'leads', 'k1', 'v1');

      const invalidated = cache.invalidateTenant(TENANT_A);
      expect(invalidated).toBe(3);
      expect(cache.get(TENANT_A, 'leads', 'k1')).toBeNull();
      expect(cache.get(TENANT_B, 'leads', 'k1')).toBe('v1'); // preserved
    });
  });

  describe('getOrCompute', () => {
    it('should compute and cache on first call', async () => {
      const compute = jest.fn().mockResolvedValue({ name: 'Computed' });

      const result = await cache.getOrCompute(TENANT_A, 'leads', 'k1', compute);
      expect(result).toEqual({ name: 'Computed' });
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('should return cached value on second call', async () => {
      const compute = jest.fn().mockResolvedValue({ name: 'Computed' });

      await cache.getOrCompute(TENANT_A, 'leads', 'k1', compute);
      const result = await cache.getOrCompute(TENANT_A, 'leads', 'k1', compute);
      expect(result).toEqual({ name: 'Computed' });
      expect(compute).toHaveBeenCalledTimes(1); // not called again
    });

    it('should compute separately for different tenants', async () => {
      const computeA = jest.fn().mockResolvedValue('A');
      const computeB = jest.fn().mockResolvedValue('B');

      const resultA = await cache.getOrCompute(TENANT_A, 'leads', 'k1', computeA);
      const resultB = await cache.getOrCompute(TENANT_B, 'leads', 'k1', computeB);

      expect(resultA).toBe('A');
      expect(resultB).toBe('B');
      expect(computeA).toHaveBeenCalledTimes(1);
      expect(computeB).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('should report correct stats for tenant', () => {
      cache.set(TENANT_A, 'leads', 'k1', 'v1');
      cache.set(TENANT_A, 'calls', 'k1', 'v1');
      cache.set(TENANT_B, 'leads', 'k1', 'v1');

      const stats = cache.getStats(TENANT_A);
      expect(stats.totalKeys).toBe(2);
      expect(stats.namespaces).toContain('leads');
      expect(stats.namespaces).toContain('calls');
    });
  });
});
