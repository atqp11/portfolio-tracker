/**
 * Cache Provider Configuration
 *
 * Supported Providers:
 * 1. Vercel KV - Upstash Redis managed by Vercel (recommended for Vercel)
 * 2. Upstash Redis - Direct Upstash connection (for non-Vercel deployments)
 * 3. In-Memory - Local development only (not production-safe)
 *
 * Auto-Detection Priority:
 * 1. Check for UPSTASH_REDIS_URL → use 'upstash'
 * 2. Check for KV_REST_API_URL → use 'vercel-kv'
 * 3. Default to 'memory' in development
 */

import type { CacheProviderConfig } from './types';

/**
 * Auto-detect cache provider based on available credentials
 *
 * @returns Detected cache provider type
 */
function detectCacheProvider(): 'upstash' | 'vercel-kv' | 'memory' {
  // Priority 1: Direct Upstash
  if (process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN) {
    return 'upstash';
  }

  // Priority 2: Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return 'vercel-kv';
  }

  // Fallback: In-Memory (dev only)
  if (process.env.NODE_ENV === 'development') {
    return 'memory';
  }

  console.warn('[Cache] No Redis provider configured. Using in-memory cache.');
  return 'memory';
}

export const CACHE_PROVIDER_CONFIG: CacheProviderConfig = {
  type: detectCacheProvider(),

  // Direct Upstash Redis
  upstash: {
    priority: 1,
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  },

  // Vercel KV (Upstash managed by Vercel)
  vercelKV: {
    priority: 1,
    restUrl: process.env.KV_REST_API_URL,
    restToken: process.env.KV_REST_API_TOKEN,
  },

  // In-Memory (Development only)
  memory: {
    priority: 3,
  },

  fallback: 'memory',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable cache provider name
 *
 * @returns Formatted cache provider name
 *
 * @example
 * ```ts
 * console.log(getCacheProviderName()); // "Vercel KV (Upstash)"
 * ```
 */
export function getCacheProviderName(): string {
  const type = CACHE_PROVIDER_CONFIG.type;
  switch (type) {
    case 'upstash':
      return 'Upstash Redis (Direct)';
    case 'vercel-kv':
      return 'Vercel KV (Upstash)';
    case 'memory':
      return 'In-Memory Cache (Dev Only)';
    default:
      return 'Unknown';
  }
}

/**
 * Check if Redis cache is available
 *
 * @returns True if using Redis (Vercel KV or Upstash)
 */
export function isRedisCacheAvailable(): boolean {
  return (
    CACHE_PROVIDER_CONFIG.type === 'upstash' ||
    CACHE_PROVIDER_CONFIG.type === 'vercel-kv'
  );
}

/**
 * Get cache provider configuration details
 *
 * @returns Cache provider details
 */
export function getCacheProviderDetails() {
  return {
    type: CACHE_PROVIDER_CONFIG.type,
    name: getCacheProviderName(),
    isRedis: isRedisCacheAvailable(),
    isProduction: process.env.NODE_ENV === 'production',
    hasCredentials: {
      upstash: !!(
        CACHE_PROVIDER_CONFIG.upstash.url &&
        CACHE_PROVIDER_CONFIG.upstash.token
      ),
      vercelKV: !!(
        CACHE_PROVIDER_CONFIG.vercelKV.restUrl &&
        CACHE_PROVIDER_CONFIG.vercelKV.restToken
      ),
    },
  };
}
