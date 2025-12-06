/**
 * Rate Limiting Service
 * 
 * Uses Upstash Redis for distributed rate limiting across serverless instances.
 * Implements sliding window algorithm for smooth limit enforcement.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limit configurations by endpoint type
export const RATE_LIMITS = {
  // General API endpoints
  default: {
    requests: 60,
    window: '1 m',
    description: '60 requests per minute',
  },
  
  // AI endpoints (expensive)
  ai: {
    requests: 20,
    window: '1 m',
    description: '20 AI requests per minute',
  },
  
  // Auth endpoints (prevent brute force)
  auth: {
    requests: 10,
    window: '1 m',
    description: '10 auth attempts per minute',
  },
  
  // Webhook endpoints (Stripe)
  webhook: {
    requests: 100,
    window: '1 m',
    description: '100 webhook events per minute',
  },
  
  // Admin endpoints
  admin: {
    requests: 30,
    window: '1 m',
    description: '30 admin requests per minute',
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

// Initialize Redis (lazy-loaded)
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (!url || !token) {
      throw new Error('Redis configuration missing for rate limiting');
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

// Rate limiter instances (lazy-loaded by type)
const rateLimiters: Map<RateLimitType, Ratelimit> = new Map();

function getRateLimiter(type: RateLimitType): Ratelimit {
  if (!rateLimiters.has(type)) {
    const config = RATE_LIMITS[type];
    const limiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(
        config.requests,
        config.window as '1 m' | '1 h' | '1 d'
      ),
      analytics: true,
      prefix: `ratelimit:${type}`,
    });
    rateLimiters.set(type, limiter);
  }
  return rateLimiters.get(type)!;
}

// ============================================================================
// Rate Limit Check
// ============================================================================

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds until retry allowed
}

/**
 * Check if request is within rate limit
 * 
 * @param identifier - User ID, IP address, or other unique identifier
 * @param type - Type of endpoint for limit selection
 * @returns Rate limit result with headers info
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType = 'default'
): Promise<RateLimitResult> {
  try {
    const limiter = getRateLimiter(type);
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success ? undefined : Math.ceil((result.reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow request if rate limiter is down
    return {
      success: true,
      limit: RATE_LIMITS[type].requests,
      remaining: RATE_LIMITS[type].requests,
      reset: Date.now() + 60000,
    };
  }
}

/**
 * Check rate limit with fallback to IP if no user
 */
export async function checkRateLimitWithFallback(
  userId: string | null,
  ipAddress: string,
  type: RateLimitType = 'default'
): Promise<RateLimitResult> {
  const identifier = userId || `ip:${ipAddress}`;
  return checkRateLimit(identifier, type);
}

// ============================================================================
// Rate Limit Headers
// ============================================================================

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
  [key: string]: string | undefined;  // Index signature for HeadersInit compatibility
}

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.reset),
  };
  
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }
  
  return headers;
}
