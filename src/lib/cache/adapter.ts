/**
 * Cache Adapter Interface
 *
 * Provides a unified interface for different cache implementations:
 * 1. Vercel KV (Upstash managed by Vercel) - Recommended for Vercel deployments
 * 2. Upstash Redis (Direct connection) - For non-Vercel deployments
 * 3. In-Memory (Development only) - Not suitable for production
 *
 * @module lib/cache/adapter
 */

import { CACHE_PROVIDER_CONFIG } from '@lib/config/cache-provider.config';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Cache Adapter Interface
 * All cache implementations must implement this interface
 */
export interface CacheAdapter {
  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Get the age of a cached entry in milliseconds
   * @param key - Cache key
   * @returns Age in milliseconds, or Infinity if not found
   */
  getAge(key: string): Promise<number>;

  /**
   * Delete a specific key from cache
   * @param key - Cache key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Clear cache entries matching a pattern
   * @param pattern - Glob pattern (e.g., "quote:*")
   */
  clear(pattern?: string): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;
}

export interface CacheStats {
  type: 'vercel-kv' | 'upstash' | 'memory';
  size: number;
  hits: number;
  misses: number;
}

// ============================================================================
// VERCEL KV IMPLEMENTATION
// ============================================================================

/**
 * Vercel KV Implementation (Upstash managed by Vercel)
 *
 * Uses Vercel's KV storage which is Upstash Redis under the hood.
 * Best for Vercel deployments with automatic connection management.
 */
export class VercelKVAdapter implements CacheAdapter {
  private kv: any = null;
  private stats = { hits: 0, misses: 0 };

  private async getClient() {
    if (!this.kv) {
      const { kv } = await import('@vercel/kv');
      this.kv = kv;
    }
    return this.kv;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      const entry = await (client.get as (key: string) => Promise<{ value: T; timestamp: number } | null>)(key);

      if (entry?.value !== null && entry?.value !== undefined) {
        this.stats.hits++;
        console.log(`[VercelKV] Cache hit: ${key}`);
        return entry.value;
      }

      this.stats.misses++;
      console.log(`[VercelKV] Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('[VercelKV] Get error:', error);
      this.stats.misses++;
      return null; // Cache failures should not break the app
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const client = await this.getClient();
      const ttlSeconds = Math.max(1, Math.floor(ttl / 1000));

      // Store value with metadata for age tracking
      const entry = {
        value,
        timestamp: Date.now(),
      };

      await client.set(key, entry, { ex: ttlSeconds });
      console.log(`[VercelKV] Cached: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      console.error('[VercelKV] Set error:', error);
    }
  }

  async getAge(key: string): Promise<number> {
    try {
      const client = await this.getClient();
      const entry = await (client.get as (key: string) => Promise<{ timestamp: number } | null>)(key);

      if (entry?.timestamp) {
        return Date.now() - entry.timestamp;
      }

      return Infinity;
    } catch (error) {
      console.error('[VercelKV] GetAge error:', error);
      return Infinity;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
      console.log(`[VercelKV] Deleted: ${key}`);
    } catch (error) {
      console.error('[VercelKV] Delete error:', error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      const client = await this.getClient();

      if (pattern) {
        // Use SCAN to find and delete matching keys
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
          await client.del(...keys);
          console.log(`[VercelKV] Cleared ${keys.length} keys matching: ${pattern}`);
        }
      } else {
        // Clear all keys (use with caution!)
        await client.flushdb();
        console.log('[VercelKV] Cleared all keys');
      }
    } catch (error) {
      console.error('[VercelKV] Clear error:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    return {
      type: 'vercel-kv',
      size: -1, // KV doesn't expose size easily
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }
}

// ============================================================================
// UPSTASH REDIS IMPLEMENTATION
// ============================================================================

/**
 * Upstash Redis Implementation (Direct connection)
 *
 * Direct connection to Upstash Redis via REST API.
 * Use this for non-Vercel deployments or when you need more control.
 */
export class UpstashRedisAdapter implements CacheAdapter {
  private redis: any = null;
  private stats = { hits: 0, misses: 0 };

  private async getClient() {
    if (!this.redis) {
      const { Redis } = await import('@upstash/redis');
      this.redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL!,
        token: process.env.UPSTASH_REDIS_TOKEN!,
      });
    }
    return this.redis;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await this.getClient();
      const entry = await (client.get as (key: string) => Promise<{ value: T; timestamp: number } | null>)(key);

      if (entry?.value !== undefined) {
        this.stats.hits++;
        console.log(`[Upstash] Cache hit: ${key}`);
        return entry.value;
      }

      this.stats.misses++;
      console.log(`[Upstash] Cache miss: ${key}`);
      return null;
    } catch (error) {
      console.error('[Upstash] Get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const client = await this.getClient();
      const ttlSeconds = Math.max(1, Math.floor(ttl / 1000));

      // Store value with metadata for age tracking
      const entry = {
        value,
        timestamp: Date.now(),
      };

      await client.set(key, entry, { ex: ttlSeconds });
      console.log(`[Upstash] Cached: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      console.error('[Upstash] Set error:', error);
    }
  }

  async getAge(key: string): Promise<number> {
    try {
      const client = await this.getClient();
      const entry = await (client.get as (key: string) => Promise<{ timestamp: number } | null>)(key);

      if (entry?.timestamp) {
        return Date.now() - entry.timestamp;
      }

      return Infinity;
    } catch (error) {
      console.error('[Upstash] GetAge error:', error);
      return Infinity;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = await this.getClient();
      await client.del(key);
      console.log(`[Upstash] Deleted: ${key}`);
    } catch (error) {
      console.error('[Upstash] Delete error:', error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      const client = await this.getClient();

      if (pattern) {
        // Use SCAN to find and delete matching keys
        let cursor = 0;
        const keysToDelete: string[] = [];

        do {
          const [nextCursor, keys] = await client.scan(cursor, {
            match: pattern,
            count: 100,
          });
          cursor = parseInt(nextCursor as string, 10);
          keysToDelete.push(...(keys as string[]));
        } while (cursor !== 0);

        if (keysToDelete.length > 0) {
          await client.del(...keysToDelete);
          console.log(`[Upstash] Cleared ${keysToDelete.length} keys matching: ${pattern}`);
        }
      } else {
        await client.flushdb();
        console.log('[Upstash] Cleared all keys');
      }
    } catch (error) {
      console.error('[Upstash] Clear error:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    return {
      type: 'upstash',
      size: -1,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }
}

// ============================================================================
// IN-MEMORY IMPLEMENTATION (Development Only)
// ============================================================================

/**
 * In-Memory Cache Implementation
 *
 * Simple Map-based cache for local development.
 * NOT suitable for production - cache is lost on each serverless invocation.
 */
export class InMemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();
  private stats = { hits: 0, misses: 0 };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log(`[Memory] Cache miss: ${key}`);
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age >= entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`[Memory] Cache expired: ${key} (age: ${age}ms, TTL: ${entry.ttl}ms)`);
      return null;
    }

    this.stats.hits++;
    console.log(`[Memory] Cache hit: ${key} (age: ${age}ms)`);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
    });
    console.log(`[Memory] Cached: ${key} (TTL: ${ttl}ms, entries: ${this.cache.size})`);
  }

  async getAge(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return Infinity;
    return Date.now() - entry.timestamp;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
    console.log(`[Memory] Deleted: ${key}`);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      // Convert glob pattern to regex
      const regex = new RegExp(
        '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
      );

      let cleared = 0;
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          cleared++;
        }
      }
      console.log(`[Memory] Cleared ${cleared} keys matching: ${pattern}`);
    } else {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[Memory] Cleared all ${size} keys`);
    }
  }

  async getStats(): Promise<CacheStats> {
    return {
      type: 'memory',
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
    };
  }

  /**
   * Clean up expired entries (for memory management)
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Memory] Cleaned ${cleaned} expired entries`);
    }

    return cleaned;
  }
}

// ============================================================================
// FACTORY & SINGLETON
// ============================================================================

/**
 * Create a cache adapter based on Phase 0 configuration
 *
 * Auto-detects the appropriate cache provider from environment variables.
 *
 * @returns CacheAdapter implementation
 */
export function createCacheAdapter(): CacheAdapter {
  const config = CACHE_PROVIDER_CONFIG;

  switch (config.type) {
    case 'vercel-kv':
      console.log('[Cache] Using Vercel KV (Upstash managed by Vercel)');
      return new VercelKVAdapter();

    case 'upstash':
      console.log('[Cache] Using Upstash Redis (Direct connection)');
      return new UpstashRedisAdapter();

    case 'memory':
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[Cache] ⚠️ WARNING: Using in-memory cache in production! ' +
            'This will result in 0% cache hit rate in serverless environments. ' +
            'Configure Vercel KV or Upstash Redis for production.'
        );
      } else {
        console.log('[Cache] Using In-Memory cache (Development only)');
      }
      return new InMemoryCacheAdapter();

    default:
      console.warn('[Cache] Unknown provider, falling back to memory');
      return new InMemoryCacheAdapter();
  }
}

// Singleton instance
let cacheInstance: CacheAdapter | null = null;

/**
 * Get the singleton cache adapter instance
 *
 * @returns CacheAdapter singleton
 *
 * @example
 * ```ts
 * import { getCacheAdapter } from '@lib/cache/adapter';
 *
 * const cache = getCacheAdapter();
 * await cache.set('key', 'value', 60000);
 * const value = await cache.get('key');
 * ```
 */
export function getCacheAdapter(): CacheAdapter {
  if (!cacheInstance) {
    cacheInstance = createCacheAdapter();
  }
  return cacheInstance;
}

/**
 * Reset the cache adapter singleton (useful for testing)
 */
export function resetCacheAdapter(): void {
  cacheInstance = null;
}
