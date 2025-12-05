# Quota System vs. Rate Limiting

**Created:** 2025-12-03

---

## TL;DR

Your portfolio tracker has **excellent quota enforcement** ✅ but is **missing user-level rate limiting** ⚠️.

- **Quota** = Long-term limits (daily/monthly)
- **Rate Limiting** = Short-term burst protection (requests per minute)

**Verdict:** Rate limiting is **MEDIUM priority** (not critical) since your quota system already prevents catastrophic costs. However, it's **recommended** for better UX and DDoS protection.

> NOTE: User-level rate limiting is intended as a later-phase / post‑MVP enhancement — it's documented here for planning and prioritization but is not required for an immediate MVP rollout.

---

## What You Already Have ✅

### Quota System (Daily/Monthly Limits)

**Implementation:**
- `src/backend/common/middleware/quota.middleware.ts`
- `src/backend/modules/user/service/usage.service.ts`
- `src/lib/tiers/usage-tracker.ts`

**What it does:**
```typescript
Free Tier:
  - 50 AI chat queries per DAY
  - 100 portfolio changes per DAY
  - 200 portfolio analysis per DAY
  - Tracked in database
  - Resets daily at midnight UTC

Premium Tier:
  - 1000 AI queries per DAY
  - Unlimited portfolio changes
```

**Protection:**
- ✅ Prevents users exceeding subscription limits
- ✅ Blocks users after daily quota exhausted
- ✅ Enforced via `withCacheAndQuota` middleware
- ✅ Cached responses don't count against quota

**Example:**
```typescript
// User makes 51st AI query (Free tier = 50/day limit)
→ Quota check fails
→ Returns 403 with upgrade prompt
→ User blocked until tomorrow
```

---

### Provider Rate Limit Handling ✅

**Implementation:**
- `src/backend/modules/ai/service/generate.service.ts:164-174`

**What it does:**
```typescript
// When Gemini API returns 429 (rate limited)
if (err.status === 429) {
  this.markRateLimited(60); // Back off for 60 seconds
  throw new RateLimitError('AI rate limit exceeded');
}
```

**Protection:**
- ✅ Detects when AI provider (Gemini) rate limits us
- ✅ Backs off for 60 seconds (prevents hammering)
- ✅ Returns 429 to user with retry time

---

## What's Missing ❌

### User-Level Rate Limiting (Burst Protection)

**What it is:**
```typescript
Rate Limit: 20 requests per MINUTE (any tier)

Example:
  - User has 1000 AI queries remaining (plenty of quota)
  - Makes 50 requests in 10 seconds (bug or malicious)
  - WITHOUT rate limit: All 50 succeed → quota burned
  - WITH rate limit: 20 succeed, 30 blocked → user has time to fix bug
```

**Implementation (From Docs):**
- Documented in `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md:167`
- **Status:** ❌ Not Implemented (targeted for later phase / post‑MVP)
- **Designed:** Upstash rate limiter (20 req/min per user)

---

## Comparison Table

| Feature | Quota System ✅ | Provider Rate Limit ✅ | User Rate Limiting ❌ |
|---------|----------------|----------------------|---------------------|
| **Purpose** | Long-term usage enforcement | Reactive backoff from providers | Short-term burst protection |
| **Time Window** | Daily/Monthly | Event-driven (when provider returns 429) | Per minute/second |
| **Storage** | Database (PostgreSQL) | In-memory flag | Redis/Upstash |
| **Example Limit** | 50 AI queries/day | Back off when Gemini returns 429 | 20 requests/minute |
| **Protects Against** | Exceeding subscription | Hammering failed provider | Infinite loops, DDoS, quota burn |
| **Status** | ✅ Implemented | ✅ Implemented | ❌ Not Implemented |

---

## Do You Need User-Level Rate Limiting?

### ✅ **YES** - If You Have Unlimited Tiers

**Scenario:** Premium user with unlimited AI quota
```typescript
Premium Tier: Infinity AI queries/day

Bug in client code:
  → Makes 1000 requests in 1 minute
  → Cost: $3-5 per incident
  → No quota protection (unlimited)

With Rate Limiting (20/min):
  → Makes 20 requests
  → Blocked for remainder of minute
  → Cost: $0.06 per incident
  → ✅ Prevents runaway costs
```

**Priority:** 🔴 **CRITICAL** (implement before launching unlimited plans)

---

### 🟡 **RECOMMENDED** - If All Tiers Have Finite Quotas

**Scenario:** Free user with 50 AI queries/day
```typescript
Free Tier: 50 AI queries/day

Bug in client code:
  → Makes 100 requests in 30 seconds
  → WITHOUT rate limit: 50 succeed, 50 blocked (quota exhausted in 30 seconds)
  → WITH rate limit: 20 succeed in first minute, throttled
  → ✅ User has time to notice bug before quota gone

Impact:
  - WITHOUT: User frustrated, entire quota burned instantly
  - WITH: Smoother quota burn, user can fix bug before total exhaustion
```

**Priority:** 🟡 **MEDIUM** (UX improvement, not cost-critical)

**Benefits:**
- ✅ Better UX (prevents instant quota burn)
- ✅ DDoS protection (100 users × 20/min = controlled)
- ✅ Industry best practice
- ❌ Not cost-critical (quota already limits total cost)

---

## Implementation Recommendation

### Option A: All Tiers Have Finite Quotas (Your Current Setup)

**Timeline:**
- **Week 1:** Focus on cache refactoring (production blocker)
- **Month 2-3:** Add user-level rate limiting (UX improvement)

**Rationale:**
- Your quota system already prevents catastrophic costs ✅
- Cache is more critical (0% hit rate in production without Redis)
- Rate limiting is "nice to have" but not blocking production

---

### Option B: Planning Unlimited Tier

**Timeline:**
- **Week 1:** Cache refactoring + Rate limiting (both critical)

**Rationale:**
- Unlimited quotas + no rate limiting = high cost risk 🔴
- Rate limiting becomes critical safety net

---

## Risk Analysis

### Without User-Level Rate Limiting

| Scenario | Risk Level | Impact |
|----------|-----------|--------|
| Free user (50/day limit) with bug | 🟡 Low | Burns quota instantly, frustrating UX |
| Premium user (1000/day) with bug | 🟡 Medium | Burns quota fast, costs ~$3 |
| Premium unlimited with bug | 🔴 **HIGH** | No protection, runaway costs |
| DDoS attack (100 users) | 🟡 Medium | Quota limits per user, but service degradation |

### With User-Level Rate Limiting (20/min)

| Scenario | Risk Level | Impact |
|----------|-----------|--------|
| Any user with bug | 🟢 Very Low | Throttled, can't burn quota instantly |
| DDoS attack | 🟢 Low | 100 users × 20/min = 2000/min (controlled) |
| Legitimate burst usage | 🟡 Medium | May hit limit, but can retry |

---

## Code Example: What You're Missing

### Documented Implementation (Not Built Yet)

**File:** `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md:181-213`

```typescript
// lib/rateLimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true
});

export async function checkRateLimit(userId: string): Promise<boolean> {
  const { success } = await ratelimit.limit(userId);
  return success;
}

// app/api/ai/generate/route.ts
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id') || 'anonymous';

  // Check rate limit BEFORE quota
  if (!await checkRateLimit(userId)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', rateLimitExceeded: true },
      { status: 429 }
    );
  }

  // Then check quota (your existing system)
  await QuotaMiddleware.enforce(userId, 'chatQuery', userTier);

  // Process request...
}
```

**Cost:** $10/month (Upstash Redis, included in Vercel KV)

---

## Recommendation

### For Your Current Architecture (Finite Quotas)

**Priority Order:**
1. 🔴 **Week 1:** Cache refactoring (production blocker)
2. 🔴 **Week 1:** Dependency security scanning (security)
3. 🟡 **Month 2:** User-level rate limiting (UX improvement)
4. 🟡 **Month 3:** Data source orchestrator (code quality)

**Rationale:**
- Your quota system is already excellent ✅
- Cache is more critical (prevents 0% hit rate in production)
- Rate limiting is valuable but not blocking

---

### If You Plan to Add Unlimited Tier

**Priority Order:**
1. 🔴 **Week 1:** Cache refactoring + Rate limiting (both critical)
2. 🔴 **Week 1:** Security scanning
3. 🟡 **Week 2+:** Continue with data source migration

**Rationale:**
- Unlimited tier + no rate limiting = unacceptable cost risk
- Must have rate limiting before launching unlimited plans

---

## Next Steps

1. **Review this analysis** with product/business team
2. **Decide on tier strategy** (will you offer unlimited plans?)
3. **If unlimited planned:** Add rate limiting to Week 1 of production readiness plan
4. **If finite quotas only:** Keep rate limiting as Month 2 nice-to-have

---

## Roadmap / Scheduling

User-level rate limiting is planned as a later-phase enhancement (post‑MVP). Linking and prioritization are intentionally deferred so MVP launch focuses on cache refactor and quota enforcement.

- Target: Post‑MVP / Month 2 (unless unlimited-tier is introduced earlier) 
- Docs: Details and implementation notes live in `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md`


---

**References:**
- Production Readiness Plan: `docs/5_Guides/PRODUCTION_READINESS_PLAN.md`
- AI System Design: `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md`
- Quota Middleware: `src/backend/common/middleware/quota.middleware.ts`
- Usage Service: `src/backend/modules/user/service/usage.service.ts`
