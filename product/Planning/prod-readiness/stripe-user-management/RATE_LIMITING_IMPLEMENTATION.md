# Rate Limiting Implementation Plan

**Status:** 📋 Planning  
**Created:** December 5, 2025  
**Priority:** 🟡 Medium (Recommended for UX and Protection)

---

## Overview

This document outlines the implementation plan for user-level rate limiting. Based on the existing analysis in `QUOTA_VS_RATE_LIMITING.md`, this is a **medium priority** enhancement that provides burst protection and DDoS mitigation.

---

## Quota System vs. Rate Limiting (Merged Analysis)

**Quota** = Long-term limits (daily/monthly)
**Rate Limiting** = Short-term burst protection (requests per minute)

| Feature | Quota System ✅ | Provider Rate Limit ✅ | User Rate Limiting ❌ |
|---------|----------------|----------------------|---------------------|
| **Purpose** | Long-term usage enforcement | Reactive backoff from providers | Short-term burst protection |
| **Time Window** | Daily/Monthly | Event-driven (when provider returns 429) | Per minute/second |
| **Storage** | Database (PostgreSQL) | In-memory flag | Redis/Upstash |
| **Example Limit** | 50 AI queries/day | Back off when Gemini returns 429 | 20 requests/minute |
| **Protects Against** | Exceeding subscription | Hammering failed provider | Infinite loops, DDoS, quota burn |
| **Status** | ✅ Implemented | ✅ Implemented | ❌ Not Implemented |

### What Already Exists ✅

- **Quota System:** Enforced via middleware, tracked in DB, resets daily. Prevents users exceeding subscription limits. Cached responses don't count against quota.
- **Provider Rate Limit Handling:** Detects when AI provider (Gemini) rate limits us, backs off for 60 seconds, returns 429 to user with retry time.

### What's Missing ❌

- **User-level rate limiting (burst protection):** Not implemented yet. Recommended for smoother UX and DDoS protection.

#### Example Scenarios

- **Without rate limiting:** Buggy client can burn quota instantly, frustrating UX.
- **With rate limiting:** Smoother quota burn, user can fix bug before total exhaustion.
- **Unlimited tier:** Rate limiting becomes critical safety net to prevent runaway costs.

---

## Implementation Recommendation

- **Current Setup:** Quota system is excellent; rate limiting is a post-MVP enhancement unless unlimited tier is planned.
- **If unlimited tier planned:** Rate limiting is critical and must be implemented before launch.

---

## Implementation Options

### Option A: Upstash Rate Limiter (Recommended)

**Pros:**
- Already using Vercel KV (same infrastructure)
- Sliding window algorithm
- Built-in analytics
- Simple API

**Cons:**
- Additional Redis calls (~10ms latency)
- Cost increases with usage

**Cost:** ~$0 (included in Vercel KV quota)

### Option B: In-Memory Rate Limiter

**Pros:**
- Zero latency
- No external dependencies
- Free

**Cons:**
- Not shared across serverless instances
- Resets on cold starts
- Not suitable for Vercel

### Option C: Database-Based Rate Limiter

**Pros:**
- Persistent
- Works across all instances
- Audit trail

**Cons:**
- Higher latency (~50ms)
- Database load
- More complex

---

## Recommended Implementation: Upstash Rate Limiter

### Phase 1: Core Rate Limiting Service

**File:** `src/lib/rate-limit/rate-limiter.ts`

```typescript
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
```

### Phase 2: Rate Limit Middleware

**File:** `src/lib/rate-limit/middleware.ts`

```typescript
/**
 * Rate Limit Middleware
 * 
 * Higher-order function that wraps API route handlers with rate limiting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  checkRateLimitWithFallback, 
  getRateLimitHeaders,
  RateLimitType 
} from './rate-limiter';
import { getUserProfile } from '@lib/supabase/server';

export interface RateLimitedHandlerOptions {
  type?: RateLimitType;
  skipAuth?: boolean; // For public endpoints
}

type ApiHandler = (
  req: NextRequest,
  context?: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Wrap an API handler with rate limiting
 */
export function withRateLimit(
  handler: ApiHandler,
  options: RateLimitedHandlerOptions = {}
): ApiHandler {
  const { type = 'default', skipAuth = false } = options;

  return async (req: NextRequest, context?: { params: Record<string, string> }) => {
    // Get identifier
    let userId: string | null = null;
    if (!skipAuth) {
      try {
        const profile = await getUserProfile();
        userId = profile?.id || null;
      } catch {
        userId = null;
      }
    }

    // Get IP address (handle Vercel proxy)
    const ipAddress = 
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';

    // Check rate limit
    const result = await checkRateLimitWithFallback(userId, ipAddress, type);

    // Add rate limit headers to all responses
    const headers = getRateLimitHeaders(result);

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Call the actual handler
    const response = await handler(req, context);

    // Add rate limit headers to successful response
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Simplified rate limit check for use within handlers
 */
export async function enforceRateLimit(
  req: NextRequest,
  type: RateLimitType = 'default'
): Promise<NextResponse | null> {
  const profile = await getUserProfile().catch(() => null);
  const userId = profile?.id || null;
  
  const ipAddress = 
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const result = await checkRateLimitWithFallback(userId, ipAddress, type);

  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      },
      {
        status: 429,
        headers: getRateLimitHeaders(result),
      }
    );
  }

  return null; // No error, continue
}
```

### Phase 3: Integration with AI Endpoint

**File:** `app/api/ai/generate/route.ts` (Updated)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@lib/rate-limit/middleware';
import { withCacheAndQuota } from '@lib/middleware/cache-quota';

async function handleGenerate(req: NextRequest): Promise<NextResponse> {
  // Existing generate logic...
}

// Wrap with rate limit AND quota
export const POST = withRateLimit(
  withCacheAndQuota(handleGenerate, { quotaType: 'chatQuery' }),
  { type: 'ai' }
);
```

### Phase 4: Integration Order

| Priority | Endpoint | Limit | Reason |
|----------|----------|-------|--------|
| 1 | `/api/ai/generate` | 20/min | Most expensive |
| 2 | `/api/auth/*` | 10/min | Brute force protection |
| 3 | `/api/stripe/checkout` | 10/min | Prevent checkout abuse |
| 4 | `/api/admin/*` | 30/min | Admin protection |
| 5 | All other APIs | 60/min | General protection |

---

## Database Logging (Optional)

For audit and monitoring, log rate limit violations:

```typescript
// src/lib/rate-limit/logging.ts

import { createAdminClient } from '@lib/supabase/admin';

export async function logRateLimitViolation(
  userId: string | null,
  ipAddress: string,
  endpoint: string,
  type: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('rate_limit_log').insert({
      user_id: userId,
      ip_address: ipAddress,
      endpoint,
      blocked: true,
      blocked_until: new Date(Date.now() + 60000).toISOString(),
    });
  } catch (error) {
    console.error('Failed to log rate limit violation:', error);
  }
}
```

---

## Environment Variables

```env
# Upstash Redis (same as Vercel KV)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Or Vercel KV
KV_REST_API_URL=https://xxx.vercel-storage.com
KV_REST_API_TOKEN=xxx
```

---

## Testing

### Unit Tests

```typescript
// src/lib/rate-limit/__tests__/rate-limiter.test.ts

import { checkRateLimit, RATE_LIMITS } from '../rate-limiter';

describe('Rate Limiter', () => {
  const testUserId = 'test-user-123';

  it('should allow requests within limit', async () => {
    const result = await checkRateLimit(testUserId, 'default');
    expect(result.success).toBe(true);
    expect(result.remaining).toBeLessThan(result.limit);
  });

  it('should block requests over limit', async () => {
    // Make 61 requests (limit is 60)
    for (let i = 0; i < 61; i++) {
      await checkRateLimit(`burst-test-${Date.now()}`, 'default');
    }
    
    const result = await checkRateLimit(`burst-test-${Date.now()}`, 'default');
    expect(result.success).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should use correct limits for AI endpoints', async () => {
    const result = await checkRateLimit(testUserId, 'ai');
    expect(result.limit).toBe(RATE_LIMITS.ai.requests);
  });
});
```

### Integration Tests

```typescript
// e2e/rate-limiting.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Rate Limiting', () => {
  test('should return 429 when rate limit exceeded', async ({ request }) => {
    // Make requests until rate limited
    let rateLimited = false;
    
    for (let i = 0; i < 100; i++) {
      const response = await request.post('/api/ai/generate', {
        data: { prompt: 'test' },
      });
      
      if (response.status() === 429) {
        rateLimited = true;
        
        // Verify rate limit headers
        expect(response.headers()['x-ratelimit-remaining']).toBe('0');
        expect(response.headers()['retry-after']).toBeDefined();
        
        // Verify error response
        const body = await response.json();
        expect(body.error).toBe('Rate limit exceeded');
        expect(body.retryAfter).toBeGreaterThan(0);
        
        break;
      }
    }
    
    expect(rateLimited).toBe(true);
  });

  test('should include rate limit headers on success', async ({ request }) => {
    const response = await request.get('/api/quote?symbols=AAPL');
    
    expect(response.headers()['x-ratelimit-limit']).toBeDefined();
    expect(response.headers()['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers()['x-ratelimit-reset']).toBeDefined();
  });
});
```

---

## File Structure

```
src/lib/rate-limit/
├── index.ts              # Barrel export
├── rate-limiter.ts       # Core rate limiting
├── middleware.ts         # Next.js middleware
├── logging.ts            # Database logging
└── __tests__/
    ├── rate-limiter.test.ts
    └── middleware.test.ts
```

---

## Rollout Plan

### Phase 1: Foundation (Day 1)
- [ ] Create rate limiter service
- [ ] Create middleware wrapper
- [ ] Add unit tests

### Phase 2: AI Endpoint (Day 2)
- [ ] Add rate limiting to `/api/ai/generate`
- [ ] Test with load testing tool
- [ ] Monitor Redis usage

### Phase 3: Auth & Checkout (Day 3)
- [ ] Add to `/api/auth/*` endpoints
- [ ] Add to `/api/stripe/checkout`
- [ ] Add to `/api/stripe/portal`

### Phase 4: All Endpoints (Day 4)
- [ ] Add to remaining API routes
- [ ] Add to admin endpoints
- [ ] Update documentation

### Phase 5: Monitoring (Day 5)
- [ ] Add rate limit violation logging
- [ ] Create monitoring dashboard
- [ ] Set up alerts

---

## Success Criteria

- [ ] AI endpoint limited to 20 req/min per user
- [ ] Auth endpoints limited to 10 req/min per IP
- [ ] All responses include rate limit headers
- [ ] 429 responses include retry-after guidance
- [ ] Rate limiter fails open (allows requests if Redis down)
- [ ] Violations logged to database
- [ ] Unit test coverage > 80%

---

## Cost Analysis

| Scenario | Redis Commands/Day | Cost/Month |
|----------|-------------------|------------|
| 100 users, normal usage | ~50,000 | $0 (free tier) |
| 1,000 users, normal usage | ~500,000 | $0-10 |
| 10,000 users, normal usage | ~5,000,000 | $10-25 |
| DDoS attack (blocked) | ~10,000,000 | $25-50 |

**Verdict:** Cost is minimal and well within Vercel KV free tier for MVP.

---

## References

- Production Readiness Plan: `docs/5_Guides/PRODUCTION_READINESS_PLAN.md`
- AI System Design: `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md`
- Quota Middleware: `src/backend/common/middleware/quota.middleware.ts`
- Usage Service: `src/backend/modules/user/service/usage.service.ts`
