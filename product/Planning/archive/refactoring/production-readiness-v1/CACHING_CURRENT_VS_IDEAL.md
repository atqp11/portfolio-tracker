# Caching Architecture: Current vs Ideal

**Created:** 2025-12-03
**Purpose:** Clear comparison of current caching vs target architecture

---

## TL;DR - What's Changing

| Aspect | Current | Ideal (After Refactoring) |
|--------|---------|---------------------------|
| **Client Cache** | ✅ localStorage + IndexedDB | ✅ **Keep as-is** (no changes) |
| **Server Cache** | 🔴 In-memory (broken in prod) | ✅ Redis/Vercel KV (distributed) |
| **Cache Hit Rate** | 40% (client only) | 70-80% (client + server) |
| **API Cost** | $200/month | $40/month |
| **Production Ready** | ❌ No (0% server cache) | ✅ Yes |

**Bottom Line:** Client cache works great. Only server cache needs fixing (in-memory → Redis).

---

## Current Architecture (Before Refactoring)

### Client-Side Cache (✅ Works, Keep As-Is)

```
Browser (Client)
├─ localStorage (5-10 MB limit)
│  ├─ AI Data (aiCache.ts)
│  │  ├─ Company profiles: 7 days TTL
│  │  ├─ SEC filings: 24 hours TTL
│  │  ├─ News/Sentiment: 1 hour TTL
│  │  └─ Batch metadata tracking
│  │
│  └─ Financial Data (fundamentalCache.ts)
│     ├─ Stock quotes: 15 min (market) / 1 hour (closed)
│     ├─ Fundamentals: 24 hours TTL
│     └─ Financials (statements): 90 days TTL
│
└─ IndexedDB (50+ MB for large data)
   └─ Large datasets: 24 hours TTL
```

**Files:**
- `src/lib/utils/aiCache.ts` (806 lines) - AI-specific caching
- `src/lib/fundamentalCache.ts` (199 lines) - Quotes/fundamentals
- `src/lib/utils/localStorageCache.ts` (74 lines) - Utilities
- `src/lib/api/shared/cache.ts` (14 lines) - IndexedDB wrapper

**Cache Strategy:**

| Data Type | TTL | Storage | Purpose |
|-----------|-----|---------|---------|
| Stock quotes | 15m / 1h | localStorage | Real-time price data |
| Company profiles | 7 days | localStorage | Static company info |
| SEC filings | 24h | localStorage | Historical filings |
| News/Sentiment | 1h | localStorage | Dynamic market news |
| Fundamentals | 24h | localStorage | Company metrics |
| Financial statements | 90 days | localStorage | Quarterly reports |
| Large datasets | 24h | IndexedDB | Datasets > 5MB |

**Status:** ✅ Works perfectly, no changes needed

---

### Server-Side Cache (🔴 Broken in Production)

```
Server (Next.js API Routes)
└─ In-Memory Cache (serverCache.ts)
   ├─ Technology: JavaScript object {}
   ├─ Scope: Single function instance
   ├─ Problem: Not shared across serverless instances
   │
   └─ What's Cached:
      ├─ Stock quotes (5 min TTL)
      ├─ Commodity prices (4 hour TTL)
      ├─ Fundamentals (1 hour TTL)
      ├─ News articles (15 min TTL)
      └─ AI responses (5-12 hour TTL)
```

**File:** `src/lib/utils/serverCache.ts` (17 lines)

```typescript
// Simple in-memory cache - NOT suitable for production
const cache: Record<string, { value: any; timestamp: number }> = {};

export function loadFromCache<T>(key: string): T | null {
  return cache[key]?.value ?? null;
}

export function saveToCache<T>(key: string, value: T): void {
  cache[key] = { value, timestamp: Date.now() };
}

export function getCacheAge(key: string): number {
  return cache[key] ? Date.now() - cache[key].timestamp : Infinity;
}
```

**Used By:**
- `StockDataService` - Stock quotes
- `MarketDataService` - Commodities
- `FinancialDataService` - Fundamentals
- `NewsService` - News articles
- `ChatCacheService` - AI chat
- `GenerateService` - AI generation

**Why It Fails:**

```
Development (Single Process):
Request 1 → Server (cache empty)
            └─ Fetch from API → Save to cache ✅
Request 2 → SAME Server (cache has data)
            └─ Cache hit ✅ No API call

Production (Serverless):
Request 1 → Function Instance A (cache empty)
            └─ Fetch from API → Save to cache
            └─ Function terminates → cache lost ❌
Request 2 → Function Instance B (NEW instance, cache empty)
            └─ Cache miss ❌ → Fetch from API again (redundant!)
```

**Status:** 🔴 Cache hit rate = 0% in production

---

## Ideal Architecture (After Refactoring)

### Multi-Tier Caching Strategy

```
┌──────────────────────────────────────────────────────────┐
│ L1: Client Cache (Browser)                               │
│                                                           │
│ localStorage + IndexedDB                                 │
│ ├─ AI data: 1h - 7d TTL                                  │
│ ├─ Quotes: 15m - 1h TTL                                  │
│ └─ Fundamentals: 24h - 90d TTL                          │
│                                                           │
│ Status: ✅ Keep as-is                                    │
└──────────────┬───────────────────────────────────────────┘
               │ Cache miss → API request
               ▼
┌──────────────────────────────────────────────────────────┐
│ L2: Server Cache (Redis/Vercel KV)                       │
│                                                           │
│ Distributed Redis Cache                                  │
│ ├─ Shared across ALL serverless instances               │
│ ├─ Persistent (survives function termination)           │
│ ├─ Fast (<50ms access)                                   │
│ └─ TTL per tier:                                         │
│    ├─ Free: 15m (quotes), 1h (news)                     │
│    ├─ Basic: 10m (quotes), 1h (news)                    │
│    └─ Premium: 5m (quotes), 1h (news)                   │
│                                                           │
│ Status: 🔴 Must implement (Week 1)                      │
└──────────────┬───────────────────────────────────────────┘
               │ Cache miss → External API
               ▼
┌──────────────────────────────────────────────────────────┐
│ L3: Database Cache (Future - Optional)                   │
│                                                           │
│ PostgreSQL Persistent Cache                              │
│ ├─ SEC filing summaries (AI-generated): 30d TTL         │
│ ├─ Company fact sheets: 30d TTL                         │
│ └─ Historical aggregations: 90d TTL                     │
│                                                           │
│ Status: ⏸️  Phase 4 (optional)                          │
└──────────────────────────────────────────────────────────┘
```

---

## L2 Server Cache: Implementation Details

### Cache Adapter Interface

**File:** `src/lib/cache/adapter.ts` (new file)

```typescript
/**
 * Cache Adapter Interface
 * Allows swapping implementations (Redis, In-Memory, etc.)
 */
export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}
```

---

### Production Implementation (Vercel KV)

```typescript
import { kv } from '@vercel/kv';

export class VercelKVAdapter implements CacheAdapter {
  async get<T>(key: string): Promise<T | null> {
    try {
      return await kv.get<T>(key);
    } catch (error) {
      console.error('[Cache] Get error:', error);
      return null; // Graceful degradation
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const ttlSeconds = Math.floor(ttl / 1000);
      await kv.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      console.error('[Cache] Set error:', error);
      // Don't throw - cache failures shouldn't break app
    }
  }

  async delete(key: string): Promise<void> {
    await kv.del(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const keys = await kv.keys(pattern);
      if (keys.length > 0) await kv.del(...keys);
    }
  }
}
```

**Features:**
- ✅ Shared across all serverless instances
- ✅ Persistent (survives restarts)
- ✅ Native TTL support
- ✅ Graceful error handling
- ✅ Pattern-based cache clearing

---

### Development Fallback (In-Memory)

```typescript
export class InMemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<string, { value: any; timestamp: number; ttl: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    this.cache.set(key, { value, timestamp: Date.now(), ttl });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.cache.keys()) {
        if (regex.test(key)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }
}
```

---

### Factory (Auto-Selects Based on Environment)

```typescript
export function createCacheAdapter(): CacheAdapter {
  const useRedis = process.env.USE_REDIS_CACHE !== 'false'; // Default true

  if (useRedis && process.env.KV_REST_API_URL) {
    console.log('[Cache] Using Vercel KV (Redis)');
    return new VercelKVAdapter();
  } else {
    console.log('[Cache] Using In-Memory (development only)');
    return new InMemoryCacheAdapter();
  }
}

// Singleton
let instance: CacheAdapter | null = null;

export function getCacheAdapter(): CacheAdapter {
  if (!instance) {
    instance = createCacheAdapter();
  }
  return instance;
}
```

**Usage:**
```typescript
import { getCacheAdapter } from '@lib/cache/adapter';

const cache = getCacheAdapter();
const data = await cache.get<Quote>('quote:AAPL');
await cache.set('quote:AAPL', quote, 5 * 60 * 1000);
```

---

## Cache TTL Strategy by Tier

### Current (No Tier Differentiation)

All users get same cache TTL:
- Quotes: 5 minutes
- Commodities: 4 hours
- Fundamentals: 1 hour
- News: 15 minutes

**Problem:** Premium users pay for faster updates but get same stale cache as free users.

---

### Ideal (Tier-Based TTL)

| Data Type | Free Tier | Basic Tier | Premium Tier | Rationale |
|-----------|-----------|------------|--------------|-----------|
| **Stock Quotes** | 15 min | 10 min | 5 min | Premium gets fresher prices |
| **Commodities** | 4 hours | 2 hours | 1 hour | Premium for active traders |
| **Fundamentals** | 7 days | 7 days | 7 days | Quarterly updates (same for all) |
| **News** | 1 hour | 1 hour | 1 hour | News freshness not tier-based |
| **AI Responses** | 12 hours | 12 hours | 12 hours | Same for all |

**Implementation:**

```typescript
class StockDataService {
  private getCacheTTL(userTier: TierName): number {
    const ttls: Record<TierName, number> = {
      free: 15 * 60 * 1000,    // 15 minutes
      basic: 10 * 60 * 1000,   // 10 minutes
      premium: 5 * 60 * 1000   // 5 minutes
    };
    return ttls[userTier] || ttls.free;
  }

  async getQuote(symbol: string, userTier: TierName): Promise<Quote> {
    const cacheKey = `quote:${symbol}`;
    const ttl = this.getCacheTTL(userTier);

    const cached = await this.cache.get<Quote>(cacheKey);
    if (cached) return cached;

    const fresh = await this.fetchQuote(symbol);
    await this.cache.set(cacheKey, fresh, ttl);
    return fresh;
  }
}
```

**Benefits:**
- ✅ Premium users get fresher data (value prop)
- ✅ Free users still get good UX (15min is reasonable)
- ✅ Same infrastructure, different TTLs

---

## Cache Key Naming Convention

### Current (Inconsistent)

```typescript
// Different services use different patterns
'quote-AAPL'              // StockDataService
'commodity-WTI'           // MarketDataService
'fundamentals-TSLA'       // FinancialDataService
'AV:QUOTE:AAPL'          // fundamentalCache.ts (client)
'ai_company_profile_AAPL_' // aiCache.ts (client)
```

**Problem:** Inconsistent, hard to clear by pattern

---

### Ideal (Versioned, Consistent)

```typescript
// Format: {type}:{identifier}:v{version}
'quote:AAPL:v1'
'commodity:WTI:v1'
'fundamentals:TSLA:v1'
'news:sha256(portfolio):v1'
'ai:sha256(query+user):v1'
```

**Pattern-Based Operations:**
```typescript
// Clear all quotes
await cache.clear('quote:*');

// Clear specific ticker (all types)
await cache.clear('*:AAPL:*');

// Version bump (schema change)
'quote:AAPL:v2' // Old v1 keys auto-expire
```

**Benefits:**
- ✅ Consistent across all services
- ✅ Easy cache invalidation
- ✅ Version control for schema changes
- ✅ Pattern matching for bulk operations

---

## Cache Hit Rate Comparison

### Current (Client-Only Cache)

```
Scenario: 100 users request AAPL quote

User 1 (First request):
  └─ Client cache: MISS → Server API → Alpha Vantage → $0.001
     └─ Saves to client localStorage

User 1 (1 min later):
  └─ Client cache: HIT ✅ → No API call

User 2 (1 min after User 1):
  └─ Client cache: MISS (different browser) → Server API
     └─ Server cache: MISS (serverless) → Alpha Vantage → $0.001
     └─ Saves to client localStorage

User 3, 4, 5... (each in different browser):
  └─ Client cache: MISS → Server API → Server cache: MISS → API → $0.001

Total API Calls: 100 (one per user)
Total Cost: $0.10
Cache Hit Rate: 0% (across users)
```

**Problem:** Each user hits external API once. No shared cache.

---

### Ideal (Client + Server Cache)

```
Scenario: 100 users request AAPL quote

User 1 (First request):
  └─ Client cache: MISS → Server API
     └─ Server Redis: MISS → Alpha Vantage → $0.001
        └─ Saves to Redis (5 min TTL)
     └─ Saves to client localStorage

User 1 (1 min later):
  └─ Client cache: HIT ✅ → No server call

User 2 (1 min after User 1):
  └─ Client cache: MISS → Server API
     └─ Server Redis: HIT ✅ → Return cached
     └─ No API call, $0 cost
     └─ Saves to client localStorage

User 3, 4, 5... (within 5 min):
  └─ Client cache: MISS → Server API
     └─ Server Redis: HIT ✅ → $0 cost

User 50 (6 min later, Redis expired):
  └─ Client cache: MISS → Server API
     └─ Server Redis: MISS (expired) → Alpha Vantage → $0.001
        └─ Refresh Redis cache

Users 51-100 (within next 5 min):
  └─ Server Redis: HIT ✅ → $0 cost

Total API Calls: 2 (User 1 + User 50)
Total Cost: $0.002
Cache Hit Rate: 98%
Savings: 98% fewer API calls
```

---

## Migration Path

### Step 1: Implement Cache Adapter (Week 1, Day 1-2)

**New Files:**
```
src/lib/cache/
├── adapter.ts           (Interface + implementations)
└── __tests__/
    └── adapter.test.ts  (Unit tests)
```

**Changes:**
- Create `CacheAdapter` interface
- Implement `VercelKVAdapter` (production)
- Implement `InMemoryCacheAdapter` (dev fallback)
- Factory function `getCacheAdapter()`

---

### Step 2: Migrate Services (Week 1, Day 2-3)

**For Each Service:**

```typescript
// Before
import { loadFromCache, saveToCache, getCacheAge } from '@lib/utils/serverCache';

const cached = loadFromCache<T>(key);
if (cached && getCacheAge(key) < TTL) {
  return cached;
}

const fresh = await fetchData();
saveToCache(key, fresh);
return fresh;

// After
import { getCacheAdapter } from '@lib/cache/adapter';

const cache = getCacheAdapter();

const cached = await cache.get<T>(key);
if (cached) return cached;

const fresh = await fetchData();
await cache.set(key, fresh, TTL);
return fresh;
```

**Services to Update:**
1. `StockDataService` ✅
2. `MarketDataService` ✅
3. `FinancialDataService` ✅
4. `NewsService` ✅
5. `ChatCacheService` ✅
6. `GenerateService` ✅

---

### Step 3: Delete Old Cache (Week 1, Day 3)

```bash
git rm src/lib/utils/serverCache.ts
git commit -m "Remove in-memory cache (replaced with Redis)"
```

---

### Step 4: Deploy & Test (Week 1, Day 4-5)

**Deployment:**
1. Enable Vercel KV in dashboard
2. Set environment variables
3. Deploy to preview
4. Monitor cache hit rate
5. Gradual rollout (10% → 50% → 100%)

**Success Metrics:**
- Cache hit rate > 60%
- Response time < 500ms
- Zero cache-related errors
- Vercel KV usage < $10/month

---

## Cost Impact

### Current (Client-Only Cache)

```
1000 active users × 100 requests/day = 100,000 requests/day

Client cache hit rate: 40% (same user, repeated requests)
Server cache hit rate: 0% (serverless)

Effective cache hits: 40,000 requests
API calls: 60,000 requests/day
Monthly API calls: 1.8M requests

Cost:
- Alpha Vantage: $50/month (500 req/min)
- NewsAPI: $449/month (unlimited)
- AI (Gemini): $100/month (no cache)
Total: $599/month
```

---

### Ideal (Client + Server Cache)

```
1000 active users × 100 requests/day = 100,000 requests/day

Client cache hit rate: 40% (same user)
Server cache hit rate: 50% (shared across users)

Effective cache hits: 40% + (60% × 50%) = 70%
API calls: 30,000 requests/day
Monthly API calls: 900K requests (-50%)

Cost:
- Alpha Vantage: $25/month (reduced usage)
- NewsAPI: $0 (migrated to RSS)
- AI (Gemini): $20/month (80% cache hit)
- Vercel KV: $10/month
Total: $55/month

Savings: $544/month (-91%)
```

---

## Rollback Plan

### If Redis Fails in Production

**Option 1: Environment Variable Toggle**
```bash
# Vercel Dashboard → Settings → Environment Variables
USE_REDIS_CACHE=false
```
Result: Falls back to in-memory (no cache, but works)

**Option 2: Revert Deployment**
```
Vercel Dashboard → Deployments → Previous (before Week 1) → Promote
```
Result: Back to old code (< 5 minutes)

**Option 3: Redis Connection Failure Handling**
```typescript
// Already built into VercelKVAdapter
async get<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch (error) {
    console.error('[Cache] Redis unavailable, degrading gracefully');
    return null; // Cache miss → fetch fresh
  }
}
```
Result: App continues working, just no cache

---

## FAQ

### Q: Do I need to change client-side cache?
**A:** No. Client cache (`aiCache.ts`, `fundamentalCache.ts`) works perfectly. Only server cache needs fixing.

### Q: Will this affect users?
**A:** Positively! Faster response times (cache hits < 50ms vs API calls 500-2000ms).

### Q: What if Vercel KV is down?
**A:** App gracefully degrades to no cache (fetch fresh each time). Still works, just slower.

### Q: Can I test locally without Redis?
**A:** Yes. Development automatically uses in-memory cache (same as current). Redis only in production.

### Q: What about cache invalidation?
**A:** Redis TTL handles expiration automatically. Manual clear: `cache.clear('quote:*')`.

### Q: How much will Vercel KV cost?
**A:** $10/month for 1K-10K users (Hobby tier). Scales with usage.

---

## Next Steps

1. ✅ Read this document (you are here)
2. ⬜ Understand: Client cache = keep, Server cache = replace with Redis
3. ⬜ Review [Phase 1 Quick Start](./PHASE_1_QUICK_START.md)
4. ⬜ Set up Vercel KV account
5. ⬜ Start Week 1 implementation

**Estimated Time:** 40 hours (Week 1)
**Investment:** $2,000
**ROI:** $544/month savings (break-even in 4 months)

---

**References:**
- Full Plan: [PRODUCTION_READINESS_PLAN.md](./PRODUCTION_READINESS_PLAN.md)
- Quick Start: [PHASE_1_QUICK_START.md](./PHASE_1_QUICK_START.md)
- Quota vs Rate Limiting: [QUOTA_VS_RATE_LIMITING.md](./QUOTA_VS_RATE_LIMITING.md)
