/**
 * Cache Middleware
 *
 * Unified caching layer consolidating multiple cache implementations.
 * Supports both client-side (localStorage) and server-side (in-memory) caching.
 */

import crypto from 'crypto';

/**
 * Cache entry structure
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

/**
 * Cache options
 */
export interface CacheOptions {
  ttl?: number;              // Time-to-live in milliseconds
  namespace?: string;         // Cache namespace for key prefixing
  metadata?: Record<string, any>;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

/**
 * Abstract cache adapter interface
 */
export interface ICacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * In-memory cache adapter (server-side)
 */
export class InMemoryCacheAdapter implements ICacheAdapter {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = { hits: 0, misses: 0 };

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      metadata: options?.metadata,
    };

    if (options?.ttl) {
      entry.expiresAt = Date.now() + options.ttl;
    }

    this.cache.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(namespace?: string): Promise<void> {
    if (namespace) {
      // Delete all keys with namespace prefix
      const keysToDelete: string[] = [];
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${namespace}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

/**
 * Cache service with unified interface
 */
export class CacheService {
  private adapter: ICacheAdapter;
  private defaultNamespace: string;
  private defaultTTL: number;

  constructor(
    adapter: ICacheAdapter,
    options: {
      defaultNamespace?: string;
      defaultTTL?: number;
    } = {}
  ) {
    this.adapter = adapter;
    this.defaultNamespace = options.defaultNamespace || 'app';
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Build cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    const ns = namespace || this.defaultNamespace;
    return `${ns}:${key}`;
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string, namespace?: string): Promise<T | null> {
    const fullKey = this.buildKey(key, namespace);
    return this.adapter.get<T>(fullKey);
  }

  /**
   * Get value with metadata (age, etc.)
   */
  async getWithMeta<T>(
    key: string,
    namespace?: string
  ): Promise<{ data: T; age: number } | null> {
    const fullKey = this.buildKey(key, namespace);
    const entry = (this.adapter as InMemoryCacheAdapter)['cache']?.get(fullKey);

    if (!entry) {
      return null;
    }

    return {
      data: entry.data as T,
      age: Date.now() - entry.timestamp,
    };
  }

  /**
   * Set value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const fullKey = this.buildKey(key, options?.namespace);
    const opts = {
      ttl: options?.ttl || this.defaultTTL,
      metadata: options?.metadata,
    };

    await this.adapter.set(fullKey, value, opts);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, namespace?: string): Promise<void> {
    const fullKey = this.buildKey(key, namespace);
    await this.adapter.delete(fullKey);
  }

  /**
   * Clear all cache or namespace
   */
  async clear(namespace?: string): Promise<void> {
    await this.adapter.clear(namespace);
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string, namespace?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, namespace);
    return this.adapter.has(fullKey);
  }

  /**
   * Get or set pattern - fetch from cache or execute function and cache result
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options?.namespace);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const data = await fetchFn();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Remember pattern - cache function result for future calls
   */
  remember<T>(
    key: string,
    options?: CacheOptions
  ): (fn: () => Promise<T>) => Promise<T> {
    return async (fn: () => Promise<T>) => {
      return this.getOrSet(key, fn, options);
    };
  }
}

/**
 * Cache key generator
 */
export class CacheKeyGenerator {
  /**
   * Generate cache key from object
   */
  static fromObject(obj: Record<string, any>, prefix?: string): string {
    const sorted = Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        acc[key] = obj[key];
        return acc;
      }, {} as Record<string, any>);

    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(sorted))
      .digest('hex')
      .substring(0, 16);

    return prefix ? `${prefix}:${hash}` : hash;
  }

  /**
   * Generate cache key from string array
   */
  static fromStrings(...parts: string[]): string {
    return parts.join(':');
  }

  /**
   * Generate cache key from request parameters
   */
  static fromRequest(params: Record<string, any>, prefix?: string): string {
    return this.fromObject(params, prefix);
  }
}

/**
 * Global cache instance (singleton)
 */
let globalCacheInstance: CacheService | null = null;

/**
 * Get global cache instance
 */
export function getCacheService(): CacheService {
  if (!globalCacheInstance) {
    const adapter = new InMemoryCacheAdapter();
    globalCacheInstance = new CacheService(adapter, {
      defaultNamespace: 'portfolio-tracker',
      defaultTTL: 5 * 60 * 1000, // 5 minutes
    });

    // Clean expired entries every 10 minutes
    if (adapter instanceof InMemoryCacheAdapter) {
      setInterval(() => {
        adapter.cleanExpired();
      }, 10 * 60 * 1000);
    }
  }

  return globalCacheInstance;
}

/**
 * Cache decorator for methods
 */
export function Cacheable(options?: CacheOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cache = getCacheService();
      const key = CacheKeyGenerator.fromObject(
        { method: propertyKey, args },
        target.constructor.name
      );

      return cache.getOrSet(key, () => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
