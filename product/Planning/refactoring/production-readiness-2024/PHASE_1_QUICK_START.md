# Phase 1 Quick Start Guide

**Timeline:** Week 1 (40 hours)
**Goal:** Resolve production blockers (cache + security)
**Prerequisites:** Plan approved, accounts set up

---

## Pre-Flight Checklist

Before starting implementation, ensure:

- [ ] Plan reviewed and approved (`PRODUCTION_READINESS_PLAN.md`)
- [ ] Budget approved ($2,000 for Phase 1, $9,000 total)
- [ ] Vercel KV account created (https://vercel.com/dashboard)
- [ ] Environment variables ready (KV_URL, KV_REST_API_TOKEN, KV_REST_API_URL)
- [ ] Feature branch created: `feature/cache-refactoring`
- [ ] Team notified (dev deployment may have temporary issues)

---

## Day 1: Vercel KV Setup (8 hours)

### Task 1.1: Enable Vercel KV (1 hour)

**Steps:**
1. Go to Vercel Dashboard → Your Project → Storage
2. Click "Create Database" → Select "KV (Redis)"
3. Choose region (same as deployment region for low latency)
4. Copy connection credentials:
   ```
   KV_URL=redis://...
   KV_REST_API_URL=https://...
   KV_REST_API_TOKEN=...
   ```

5. Add to local `.env.local`:
   ```bash
   # Redis Cache (Vercel KV)
   KV_URL=redis://default:xxx@xxx.upstash.io:6379
   KV_REST_API_URL=https://xxx.upstash.io
   KV_REST_API_TOKEN=xxx
   ```

6. Add to Vercel project (Dashboard → Settings → Environment Variables)

7. **Test connection:**
   ```bash
   npm install @vercel/kv
   ```

   Create test file: `scripts/test-kv.ts`
   ```typescript
   import { kv } from '@vercel/kv';

   async function testKV() {
     await kv.set('test-key', 'Hello Redis!');
     const value = await kv.get('test-key');
     console.log('✅ Vercel KV working:', value);
     await kv.del('test-key');
   }

   testKV().catch(console.error);
   ```

   Run: `npx tsx scripts/test-kv.ts`

**Success Criteria:**
- ✅ Vercel KV enabled in dashboard
- ✅ Environment variables configured
- ✅ Test connection successful

---

### Task 1.2: Create Cache Adapter Interface (4 hours)

**File to Create:** `src/lib/cache/adapter.ts`

**Implementation:**

```typescript
/**
 * Cache Adapter Interface
 * Allows swapping cache implementations (Redis, In-Memory, etc.)
 */

export interface CacheAdapter {
  /**
   * Get value from cache
   * @returns Cached value or null if not found/expired
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time-to-live in milliseconds
   */
  set<T>(key: string, value: T, ttl: number): Promise<void>;

  /**
   * Get cache entry age in milliseconds
   * @returns Age in ms, -1 if not found, Infinity if no expiration
   */
  getAge(key: string): Promise<number>;

  /**
   * Delete key from cache
   */
  delete(key: string): Promise<void>;

  /**
   * Clear cache (optionally by pattern)
   * @param pattern Optional glob pattern (e.g., "quote:*")
   */
  clear(pattern?: string): Promise<void>;
}

/**
 * Vercel KV (Redis) Implementation
 */
export class VercelKVAdapter implements CacheAdapter {
  private kv: typeof import('@vercel/kv').kv;

  constructor() {
    this.kv = require('@vercel/kv').kv;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.kv.get<T>(key);
      return value;
    } catch (error) {
      console.error('[VercelKV] Get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const ttlSeconds = Math.floor(ttl / 1000);
      await this.kv.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      console.error('[VercelKV] Set error:', error);
      // Don't throw - cache failures should not break the app
    }
  }

  async getAge(key: string): Promise<number> {
    try {
      const ttl = await this.kv.ttl(key);

      if (ttl === -2) return -1; // Key doesn't exist
      if (ttl === -1) return Infinity; // No expiration set

      // Approximate age (we don't know original TTL)
      // This is a limitation of Redis - we can only know remaining TTL
      return 0; // Return 0 to indicate "exists but age unknown"
    } catch (error) {
      console.error('[VercelKV] GetAge error:', error);
      return -1;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.del(key);
    } catch (error) {
      console.error('[VercelKV] Delete error:', error);
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        const keys = await this.kv.keys(pattern);
        if (keys.length > 0) {
          await this.kv.del(...keys);
        }
      } else {
        // Clear all keys (use with caution!)
        const allKeys = await this.kv.keys('*');
        if (allKeys.length > 0) {
          await this.kv.del(...allKeys);
        }
      }
    } catch (error) {
      console.error('[VercelKV] Clear error:', error);
    }
  }
}

/**
 * In-Memory Cache (Development Only)
 */
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
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  async getAge(key: string): Promise<number> {
    const entry = this.cache.get(key);
    if (!entry) return -1;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return -1;
    }

    return age;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Factory function to create cache adapter
 * Uses Redis in production, in-memory in development
 */
export function createCacheAdapter(): CacheAdapter {
  const useRedis = process.env.USE_REDIS_CACHE !== 'false'; // Default to true

  if (useRedis && process.env.KV_REST_API_URL) {
    console.log('[Cache] Using Vercel KV (Redis)');
    return new VercelKVAdapter();
  } else {
    console.log('[Cache] Using In-Memory cache (development only)');
    return new InMemoryCacheAdapter();
  }
}

// Singleton instance
let cacheInstance: CacheAdapter | null = null;

export function getCacheAdapter(): CacheAdapter {
  if (!cacheInstance) {
    cacheInstance = createCacheAdapter();
  }
  return cacheInstance;
}
```

**Test File:** `src/lib/cache/__tests__/adapter.test.ts`

```typescript
import { VercelKVAdapter, InMemoryCacheAdapter } from '../adapter';

describe('CacheAdapter', () => {
  describe('InMemoryCacheAdapter', () => {
    let cache: InMemoryCacheAdapter;

    beforeEach(() => {
      cache = new InMemoryCacheAdapter();
    });

    test('should set and get value', async () => {
      await cache.set('test-key', 'test-value', 1000);
      const value = await cache.get('test-key');
      expect(value).toBe('test-value');
    });

    test('should return null for expired key', async () => {
      await cache.set('test-key', 'test-value', 100);
      await new Promise(resolve => setTimeout(resolve, 150));
      const value = await cache.get('test-key');
      expect(value).toBeNull();
    });

    test('should delete key', async () => {
      await cache.set('test-key', 'test-value', 1000);
      await cache.delete('test-key');
      const value = await cache.get('test-key');
      expect(value).toBeNull();
    });

    test('should clear by pattern', async () => {
      await cache.set('quote:AAPL', { price: 150 }, 1000);
      await cache.set('quote:TSLA', { price: 200 }, 1000);
      await cache.set('news:123', { title: 'News' }, 1000);

      await cache.clear('quote:*');

      expect(await cache.get('quote:AAPL')).toBeNull();
      expect(await cache.get('quote:TSLA')).toBeNull();
      expect(await cache.get('news:123')).not.toBeNull();
    });
  });

  // Note: Vercel KV tests require actual KV instance
  // Run these in integration tests with real KV connection
});
```

Run tests: `npm test src/lib/cache/__tests__/adapter.test.ts`

**Success Criteria:**
- ✅ Cache adapter interface created
- ✅ Vercel KV implementation
- ✅ In-memory fallback
- ✅ Tests passing

---

## Day 2: Migrate StockDataService (8 hours)

### Task 2.1: Update StockDataService

**File to Modify:** `src/backend/modules/stocks/service/stock-data.service.ts`

**Before (Current):**
```typescript
import { loadFromCache, saveToCache, getCacheAge } from '@lib/utils/serverCache';

class StockDataService {
  async getQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote-${symbol}`;
    const cached = loadFromCache<StockQuote>(cacheKey);

    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      return { ...cached, source: 'cache' };
    }

    try {
      const quote = await alphaVantageDAO.getQuote(symbol);
      saveToCache(cacheKey, quote);
      return quote;
    } catch (error) {
      // fallback logic...
    }
  }
}
```

**After (New):**
```typescript
import { getCacheAdapter, type CacheAdapter } from '@lib/cache/adapter';

class StockDataService {
  private cache: CacheAdapter;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.cache = getCacheAdapter();
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote:${symbol}:v1`;

    // Check cache
    const cached = await this.cache.get<StockQuote>(cacheKey);
    if (cached) {
      console.log(`[StockData] Cache hit: ${symbol}`);
      return { ...cached, source: 'cache' };
    }

    console.log(`[StockData] Cache miss: ${symbol}`);

    // Try primary provider
    try {
      const quote = await alphaVantageDAO.getQuote(symbol);
      await this.cache.set(cacheKey, quote, this.CACHE_TTL);
      return quote;
    } catch (error) {
      console.error(`[StockData] AlphaVantage failed: ${error}`);

      // Try fallback
      try {
        const fmpQuote = await fmpDAO.getQuote(symbol);
        await this.cache.set(cacheKey, fmpQuote, this.CACHE_TTL);
        return fmpQuote;
      } catch (fallbackError) {
        console.error(`[StockData] FMP failed: ${fallbackError}`);
        throw new Error(`Failed to fetch quote for ${symbol}`);
      }
    }
  }

  // Add method to customize TTL based on user tier
  private getCacheTTL(tier?: string): number {
    const ttls: Record<string, number> = {
      free: 15 * 60 * 1000,    // 15 minutes
      basic: 10 * 60 * 1000,   // 10 minutes
      premium: 5 * 60 * 1000   // 5 minutes
    };
    return ttls[tier || 'free'] || this.CACHE_TTL;
  }
}
```

**Repeat for Other Methods:**
- `getBatchQuotes()`
- `getHistoricalData()`

**Success Criteria:**
- ✅ StockDataService uses cache adapter
- ✅ Cache keys versioned (`quote:AAPL:v1`)
- ✅ TTL customizable by tier
- ✅ Tests passing

---

### Task 2.2: Migrate Other Services

**Files to Update:**
1. `src/backend/modules/stocks/service/market-data.service.ts`
2. `src/backend/modules/stocks/service/financial-data.service.ts`
3. `src/backend/modules/news/service/news.service.ts`
4. `src/backend/modules/ai/service/chat-cache.service.ts`
5. `src/backend/modules/ai/service/generate.service.ts`

**Pattern (Same for All):**
```typescript
// Before
import { loadFromCache, saveToCache } from '@lib/utils/serverCache';

// After
import { getCacheAdapter } from '@lib/cache/adapter';

class SomeService {
  private cache = getCacheAdapter();

  async someMethod() {
    const cached = await this.cache.get<T>(key);
    if (cached) return cached;

    const fresh = await fetchFresh();
    await this.cache.set(key, fresh, ttl);
    return fresh;
  }
}
```

**Success Criteria:**
- ✅ All 5 services migrated
- ✅ Old `serverCache.ts` imports removed
- ✅ All tests passing

---

## Day 3: Testing & Verification (8 hours)

### Task 3.1: Integration Testing

**Create:** `src/test/integration/cache-integration.test.ts`

```typescript
import { getCacheAdapter } from '@lib/cache/adapter';
import { stockDataService } from '@backend/modules/stocks/service/stock-data.service';

describe('Cache Integration', () => {
  const cache = getCacheAdapter();

  beforeEach(async () => {
    // Clear cache before each test
    await cache.clear('quote:*');
  });

  test('Cache miss → fetch → cache set → cache hit', async () => {
    // First request (cache miss)
    const quote1 = await stockDataService.getQuote('AAPL');
    expect(quote1.source).not.toBe('cache');

    // Second request (cache hit)
    const quote2 = await stockDataService.getQuote('AAPL');
    expect(quote2.source).toBe('cache');
    expect(quote2.price).toBe(quote1.price);
  });

  test('Cache expires after TTL', async () => {
    const shortTTL = 100; // 100ms
    await cache.set('test-key', 'test-value', shortTTL);

    const value1 = await cache.get('test-key');
    expect(value1).toBe('test-value');

    await new Promise(resolve => setTimeout(resolve, 150));

    const value2 = await cache.get('test-key');
    expect(value2).toBeNull();
  });

  test('Batch quotes use cache', async () => {
    const symbols = ['AAPL', 'TSLA', 'MSFT'];

    // First batch (all cache misses)
    const batch1 = await stockDataService.getBatchQuotes(symbols);

    // Second batch (all cache hits)
    const batch2 = await stockDataService.getBatchQuotes(symbols);

    for (const symbol of symbols) {
      expect(batch2.quotes[symbol].source).toBe('cache');
    }
  });
});
```

Run: `npm test src/test/integration/cache-integration.test.ts`

---

### Task 3.2: Manual Testing in Development

**Steps:**
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3000`
3. Load portfolio (triggers quote API)
4. Check console logs for cache hits/misses
5. Refresh page → Should see cache hits
6. Wait 15 minutes → Refresh → Cache should refresh

**Verify:**
- ✅ First load: Cache misses logged
- ✅ Second load: Cache hits logged
- ✅ Response times faster on cache hits
- ✅ No errors in console

---

### Task 3.3: Deploy to Preview

**Steps:**
1. Commit changes:
   ```bash
   git add .
   git commit -m "feat: implement Redis cache adapter"
   git push origin feature/cache-refactoring
   ```

2. Create PR on GitHub
3. Vercel auto-deploys preview
4. Test preview deployment

**Verify:**
- ✅ Preview deployment successful
- ✅ Cache working in preview (check Vercel KV dashboard for keys)
- ✅ No errors in Vercel logs
- ✅ Response times acceptable

---

## Day 4: Security Scanning (8 hours)

### Task 4.1: Dependency Scanning

**Create:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-github-username"
    labels:
      - "dependencies"
      - "security"
```

**Run npm audit:**
```bash
npm audit

# Fix critical vulnerabilities
npm audit fix

# If breaking changes, review carefully
npm audit fix --force  # Use with caution
```

**Set up Snyk (Optional):**
1. Go to https://snyk.io
2. Sign up with GitHub
3. Connect repository
4. Configure scan settings

**Success Criteria:**
- ✅ Dependabot configured
- ✅ No critical vulnerabilities in `npm audit`
- ✅ Snyk connected (optional)

---

### Task 4.2: API Key Security

**Update:** `.env.local.example`

```bash
# SECURITY: Never commit actual API keys to git
# Add all keys to Vercel dashboard: Settings → Environment Variables

# Redis Cache (Vercel KV)
# Get from: Vercel Dashboard → Storage → KV
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Stock Data Providers
ALPHAVANTAGE_API_KEY=
FMP_API_KEY=

# AI Providers
GEMINI_API_KEY=
GROQ_API_KEY=

# News (to be removed in Phase 3)
NEWS_API_KEY=
FINNHUB_API_KEY=
```

**Verify Vercel Secrets:**
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Ensure all production keys are set
3. Ensure keys are scoped to correct environments (Production, Preview, Development)

**Add to README:**
```markdown
## Security

- Never commit `.env.local` to git
- All production keys stored in Vercel Secrets
- Rotate keys quarterly
- Use Dependabot for dependency updates
```

**Success Criteria:**
- ✅ .env.local.example updated
- ✅ Actual keys removed from example
- ✅ All keys in Vercel dashboard
- ✅ README security section added

---

## Day 5: Documentation & Cleanup (8 hours)

### Task 5.1: Create Cache Strategy Document

**File:** `docs/5_Guides/CACHE_STRATEGY.md`

**Content:**
```markdown
# Cache Strategy

## Overview

Multi-tier caching for cost optimization and performance.

## L1: Client-Side Cache
- **Technology:** localStorage + IndexedDB
- **TTL:** 15 minutes
- **Data:** AI responses only
- **Purpose:** Instant UX, reduce network requests

## L2: Server-Side Distributed Cache (Redis)
- **Technology:** Vercel KV (Redis)
- **Expected Hit Rate:** 60-80%
- **Purpose:** Share cache across serverless instances

### TTL by Data Type and Tier

| Data Type | Free | Basic | Premium | Rationale |
|-----------|------|-------|---------|-----------|
| Stock Quotes | 15 min | 10 min | 5 min | Balance cost vs freshness |
| Commodities | 4 hours | 2 hours | 1 hour | Slower moving |
| Fundamentals | 7 days | 7 days | 7 days | Quarterly updates |
| News | 1 hour | 1 hour | 1 hour | Timely content |
| AI Responses | 12 hours | 12 hours | 12 hours | User-specific |

### Cache Key Format

```
{data_type}:{identifier}:v{version}

Examples:
- quote:AAPL:v1
- fundamentals:TSLA:v1
- news:sha256(portfolio_tickers):v1
```

## Cost Analysis

### Without Cache (Current in Production)
- Cache hit rate: 0%
- API calls: 100% of requests
- Monthly cost: $200 (1K users)

### With Redis Cache
- Cache hit rate: 70%
- API calls: 30% of requests
- Monthly cost: $60 (1K users)
- **Savings:** $140/month
```

---

### Task 5.2: Update Architecture Documentation

**File to Update:** `docs/3_Architecture/TECHNICAL_ARCHITECTURE_OVERVIEW.md`

Add section:
```markdown
## Caching Architecture

### Multi-Tier Strategy

1. **L1 (Client):** localStorage/IndexedDB (15min TTL, AI only)
2. **L2 (Server):** Vercel KV Redis (distributed cache)
3. **L3 (Future):** PostgreSQL (long-term persistent cache)

### Implementation

- **Interface:** `src/lib/cache/adapter.ts`
- **Implementations:**
  - `VercelKVAdapter` (production)
  - `InMemoryCacheAdapter` (development)
- **Factory:** `getCacheAdapter()` - auto-selects based on environment

### Migration from In-Memory

**Before (Week 1):**
- In-memory cache (`src/lib/utils/serverCache.ts`)
- 0% hit rate in production (serverless)

**After (Week 1):**
- Redis distributed cache
- 60-80% hit rate in production
- $140/month cost savings
```

---

### Task 5.3: Delete Old Cache Implementation

**File to Delete:** `src/lib/utils/serverCache.ts`

**Before deleting:**
1. Verify all services migrated
2. Search for remaining imports:
   ```bash
   grep -r "from '@lib/utils/serverCache'" src/
   ```
3. Should return 0 results

**Delete:**
```bash
git rm src/lib/utils/serverCache.ts
git commit -m "chore: remove old in-memory cache (replaced with Redis)"
```

---

### Task 5.4: Update CHANGELOG

**File:** `CHANGELOG.md` (Create if doesn't exist)

```markdown
# Changelog

## [Unreleased]

### Added
- Redis distributed cache (Vercel KV) for production deployment
- Cache adapter interface for pluggable cache implementations
- Tier-based cache TTL (Free: 15min, Basic: 10min, Premium: 5min)
- Dependency security scanning (Dependabot)

### Changed
- Migrated all services from in-memory cache to Redis
- Updated cache key format with versioning (e.g., `quote:AAPL:v1`)

### Removed
- In-memory cache implementation (incompatible with serverless)

### Fixed
- Cache hit rate in production (was 0%, now 60-80%)
- Cost issue: Reduced API calls by 70%

## [Previous versions...]
```

---

## Verification Checklist

Before merging to main:

**Code:**
- [ ] All services migrated to cache adapter
- [ ] Old `serverCache.ts` deleted
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors (`npm run tsc`)
- [ ] No ESLint errors (if configured)

**Infrastructure:**
- [ ] Vercel KV enabled and working
- [ ] Environment variables configured (local + Vercel)
- [ ] Cache keys visible in Vercel KV dashboard

**Security:**
- [ ] Dependabot configured
- [ ] npm audit shows no critical vulnerabilities
- [ ] API keys not in .env.local.example
- [ ] All production keys in Vercel Secrets

**Documentation:**
- [ ] Cache strategy documented
- [ ] Architecture overview updated
- [ ] CHANGELOG updated
- [ ] README security section added

**Testing:**
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing in dev completed
- [ ] Preview deployment tested

**Metrics:**
- [ ] Cache hit rate > 60% in preview
- [ ] Response times < 1000ms
- [ ] No errors in Vercel logs

---

## Deployment to Production

Once Phase 1 complete and verified:

```bash
# Merge to main
git checkout main
git merge feature/cache-refactoring

# Push to production
git push origin main

# Vercel auto-deploys to production
```

**Monitor for 24 hours:**
- Vercel KV usage (should be < $10/month)
- Cache hit rate (target >60%)
- Error rate (target <1%)
- Response times (target <1000ms)

---

## Rollback Plan

If issues in production:

**Quick Rollback (< 5 minutes):**
1. Go to Vercel Dashboard → Deployments
2. Find previous deployment (before Phase 1)
3. Click "..." → Promote to Production

**OR via Environment Variable:**
```bash
# Vercel Dashboard → Settings → Environment Variables
USE_REDIS_CACHE=false
```
This falls back to in-memory cache (no cache in production, but app still works)

---

## Next Steps

After Phase 1 complete:

1. **Merge to main**
2. **Monitor production for 3-5 days**
3. **Start Phase 2:** Data Source Orchestrator (Week 2-3)

---

## Questions / Issues?

**Cache not working:**
- Check Vercel KV dashboard for keys
- Check environment variables are set
- Look for errors in Vercel logs

**Tests failing:**
- Clear cache before tests: `await cache.clear()`
- Check async/await usage
- Verify mock implementations

**Performance issues:**
- Check cache hit rate (should be >60%)
- Verify TTL not too short
- Check Vercel KV latency (should be <50ms)

**Need help?**
- Review full plan: `docs/5_Guides/PRODUCTION_READINESS_PLAN.md`
- Check architecture docs: `docs/3_Architecture/`
- Consult senior engineer

---

**Good luck! 🚀**

Phase 1 is the most critical - once cache is working in production, everything else builds on top of it.
