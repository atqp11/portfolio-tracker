/**
 * Chat Cache Service
 * 
 * Handles caching of AI chat responses to reduce costs and improve performance.
 * Server-side in-memory cache with TTL-based expiration.
 */

import crypto from 'crypto';
import { ChatCacheEntry } from '@backend/modules/ai/dto/chat.dto';

export class ChatCacheService {
  private cache: Map<string, ChatCacheEntry>;
  private readonly CACHE_TTL: number;

  constructor(cacheTtlMs: number = 12 * 60 * 60 * 1000) {
    this.cache = new Map();
    this.CACHE_TTL = cacheTtlMs; // Default: 12 hours
  }

  /**
   * Generate cache key from user message and portfolio context
   */
  generateCacheKey(message: string, portfolioId?: string): string {
    const cacheableContent = {
      message: message.toLowerCase().trim(),
      portfolioId: portfolioId || 'default',
    };
    return crypto.createHash('sha256').update(JSON.stringify(cacheableContent)).digest('hex');
  }

  /**
   * Get cached response if exists and not expired
   */
  get(cacheKey: string): { entry: ChatCacheEntry; age: number } | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const age = Date.now() - cached.timestamp;
    if (age >= this.CACHE_TTL) {
      // Expired, remove from cache
      this.cache.delete(cacheKey);
      return null;
    }

    return { entry: cached, age };
  }

  /**
   * Store response in cache
   */
  set(cacheKey: string, entry: ChatCacheEntry): void {
    this.cache.set(cacheKey, entry);
  }

  /**
   * Get cache size (number of entries)
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries (cleanup)
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Export singleton instance
export const chatCacheService = new ChatCacheService();
