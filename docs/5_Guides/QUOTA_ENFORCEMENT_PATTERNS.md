# Quota Enforcement Patterns

**Purpose:** Implement quota-enforced features correctly
**Focus:** Essential patterns for production use

---

## Core Pattern: Check-Then-Track

```typescript
// ✅ CORRECT: Check → Execute → Track (with error handling)
async function quotaEnforcedHandler(request: Request) {
  const profile = await getUserProfile();
  if (!profile) return unauthorized();

  // 1. Check quota (READ ONLY - no tracking yet)
  const quotaCheck = await checkQuota(profile.id, 'chatQuery', profile.tier);
  if (!quotaCheck.allowed) throw new QuotaExceededError(quotaCheck.reason);

  // 2. Execute the operation
  const response = await expensiveOperation();

  // 3. Track usage ONLY if successful (with error handling)
  if (response.status >= 200 && response.status < 300) {
    try {
      await trackUsage(profile.id, 'chatQuery', profile.tier);
    } catch (error) {
      console.error('[Handler] Failed to track usage:', error);
      // Don't fail request - user already got their response
    }
  }

  return response;
}
```

**Why this order:**
- ✅ Users not charged for failures
- ✅ No double-charging on retries
- ✅ Request succeeds even if tracking fails

---

## Using Existing Middleware

Already implemented for common patterns:

```typescript
// Cache-first with quota (AI Chat, Risk Metrics)
export const POST = withCacheAndQuota({
  quotaType: 'chatQuery',
  checkCache: (body, userId) => chatCacheService.get(body, userId),
})(yourHandler);

// Portfolio count quota
export const POST = withPortfolioQuota(yourHandler);

// Stock count quota
export const POST = withStockQuota(yourHandler);
```

---

## Anti-Patterns (Do NOT Use)

### ❌ WRONG: Track-Then-Check
```typescript
await trackUsage(userId, action, tier); // User charged before operation!
const response = await expensiveOperation(); // If this fails, user still charged
return response;
```

### ❌ WRONG: Track Without Error Handling
```typescript
const response = await expensiveOperation();
await trackUsage(userId, action, tier); // If this throws, request fails!
return response;
```

### ❌ WRONG: Unprotected External Calls
```typescript
const portfolios = await portfolioRepository.findAll(); // If DB fails, crashes
if (portfolios.length >= limit) throw new QuotaExceededError();
```

---

## Error Handling

### Wrap External Calls

```typescript
// ✅ CORRECT: Protected repository calls
export function withPortfolioQuota(handler: T): T {
  return async (request, context) => {
    const profile = await requireProfile();

    let portfolios;
    try {
      portfolios = await portfolioRepository.findAll();
    } catch (error) {
      console.error('[Portfolio Quota] Failed to fetch portfolios:', error);
      throw new Error('Unable to verify portfolio quota. Please try again.');
    }

    if (portfolios.length >= tierConfig.maxPortfolios) {
      throw new QuotaExceededError(`Limit reached`);
    }

    return handler(request, context);
  };
}
```

### trackUsage Never Throws

```typescript
// Already implemented - trackUsage logs errors but doesn't throw
export async function trackUsage(userId, action, tier) {
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_action: action,
    p_tier: tier,
  });

  if (error) {
    console.error('[Usage Tracker] Failed to track usage via RPC:', error);
    // Don't throw - allow request to proceed
  }
}

// But still wrap in try-catch for defense-in-depth
try {
  await trackUsage(userId, action, tier);
} catch (error) {
  console.error('[Handler] Tracking failed:', error);
}
```

---

## Testing Requirements

Test these 3 scenarios for each quota feature:

```typescript
// 1. Check-then-track separation
it('should NOT track usage when handler fails', async () => {
  mockHandler.mockRejectedValue(new Error('Failed'));
  await quotaEnforcedHandler(request);
  expect(trackUsage).not.toHaveBeenCalled(); // Critical!
});

// 2. Resiliency - tracking failure doesn't crash
it('should succeed even if usage tracking fails', async () => {
  mockHandler.mockResolvedValue({ status: 200, data: 'success' });
  mockTrackUsage.mockRejectedValue(new Error('DB connection lost'));

  const response = await quotaEnforcedHandler(request);

  expect(response.status).toBe(200); // Still succeeds!
});

// 3. Concurrency - race conditions prevented
it('should handle concurrent requests without exceeding quota', async () => {
  const requests = Array(10).fill(null).map(() => makeRequest());
  const responses = await Promise.all(requests);

  const successCount = responses.filter(r => r.status === 200).length;
  expect(successCount).toBeLessThanOrEqual(QUOTA_LIMIT);
});
```

---

## Response Status Checking

Use explicit status code ranges:

```typescript
// ✅ CORRECT: Explicit range check
if (response.status >= 200 && response.status < 300) {
  await trackUsage(userId, action, tier);
}

// ⚠️ ACCEPTABLE but less explicit
if (response.ok) {
  await trackUsage(userId, action, tier);
}
```

---

## Cache Integration

Cache checks bypass quota entirely:

```typescript
// ✅ CORRECT: Cache bypass
export function withCacheAndQuota(options) {
  return (handler) => async (request, context) => {
    const profile = await authenticate();

    // 1. Check cache FIRST (no quota check needed)
    if (checkCache && context.body) {
      const cached = await checkCache(context.body, profile.id);
      if (cached) {
        return NextResponse.json(cached); // No quota consumed
      }
    }

    // 2. Cache miss - now check quota
    const quotaCheck = await checkQuota(profile.id, action, profile.tier);
    if (!quotaCheck.allowed) throw new QuotaExceededError();

    // 3. Execute handler
    const response = await handler(request, context);

    // 4. Track if successful
    if (response.status >= 200 && response.status < 300) {
      try {
        await trackUsage(profile.id, action, profile.tier);
      } catch (error) {
        console.error('[Cache-Quota] Tracking failed:', error);
      }
    }

    return response;
  };
}
```

---

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Users charged for failures | Track AFTER operation succeeds |
| Requests fail on tracking error | Wrap trackUsage in try-catch |
| Race conditions allow quota bypass | Use atomic DB operations (already implemented) |
| DB failures crash requests | Wrap repository calls in try-catch |
| Missing test coverage | Test all 3 scenarios above |

---

## Quick Reference

### Usage Actions
```typescript
type UsageAction =
  | 'chatQuery'         // Daily limit
  | 'portfolioAnalysis' // Daily limit
  | 'secFiling'         // Monthly limit
  | 'portfolioChange';  // Daily limit
```

### Core Functions
```typescript
checkQuota(userId, action, tier): Promise<{ allowed, remaining, limit, reason? }>
trackUsage(userId, action, tier): Promise<void> // Never throws
getUserUsage(userId, tier): Promise<UsageStats>
```

### Middleware
```typescript
withCacheAndQuota({ quotaType, checkCache })  // Cache-first with quota
withPortfolioQuota(handler)                   // Portfolio count limit
withStockQuota(handler)                       // Stock count limit
```

### Files
| File | Purpose |
|------|---------|
| `src/backend/common/middleware/cache-quota.middleware.ts` | Cache-first quota enforcement |
| `src/backend/common/middleware/quota.middleware.ts` | Portfolio/stock quota checks |
| `src/lib/tiers/usage-tracker.ts` | Core tracking functions |
| `prisma/migrations/20251202120000_atomic_track_usage/` | Atomic DB function |

---

## Related Documentation

- **Architecture:** `docs/3_Architecture/ARCHITECTURE.md` (Quota Enforcement section)
- **Development Guidelines:** `docs/5_Guides/DEVELOPMENT_GUIDELINES.md` (Quota section)
- **Test Examples:** `src/backend/modules/ai/__tests__/concurrent-requests.test.ts`

---

**Last Updated:** 2025-12-03
**Status:** Production Ready
