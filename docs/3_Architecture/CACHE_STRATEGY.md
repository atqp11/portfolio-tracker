# Cache Strategy Architecture

**Version**: 1.0
**Last Updated**: 2024-12-05
**Status**: Production

---

## Table of Contents

1. [Overview](#overview)
2. [Multi-Level Cache Architecture](#multi-level-cache-architecture)
3. [Cache Providers](#cache-providers)
4. [TTL Strategy](#ttl-strategy)
5. [Cache Key Design](#cache-key-design)
6. [Cache Invalidation](#cache-invalidation)
7. [Performance Metrics](#performance-metrics)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Portfolio Tracker implements a **3-level cache hierarchy** designed for serverless environments (Vercel) with aggressive caching to minimize API costs and maximize performance.

### Design Goals

1. **80%+ cache hit rate** in production
2. **<200ms response time** for cached data
3. **70%+ API cost reduction** through smart caching
4. **Serverless compatible** (distributed cache across function instances)
5. **Graceful degradation** when cache unavailable

### Key Principles

- **Cache-first strategy**: Check cache before any external API call
- **Quota-aware caching**: Cached responses don't count against user quotas
- **Stale-while-revalidate**: Serve stale data during cache refresh
- **Lazy loading**: Generate cache entries on-demand, not upfront
- **Versioned keys**: Include version in cache keys for safe schema changes

---

## Multi-Level Cache Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Request Flow                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   L1: Browser       │
                    │   (IndexedDB)       │
                    │   TTL: 15min-1hr    │
                    │   Hit Rate: 40-50%  │
                    └──────────┬──────────┘
                              │ Cache Miss
                              ▼
                    ┌─────────────────────┐
                    │   L2: Server        │
                    │   (Redis/Vercel KV) │
                    │   TTL: 5min-24hr    │
                    │   Hit Rate: 60-80%  │
                    └──────────┬──────────┘
                              │ Cache Miss
                              ▼
                    ┌─────────────────────┐
                    │   L3: Database      │
                    │   (Supabase)        │
                    │   TTL: 7-30 days    │
                    │   Hit Rate: 90-95%  │
                    └──────────┬──────────┘
                              │ Cache Miss
                              ▼
                    ┌─────────────────────┐
                    │   External APIs     │
                    │   (Tiingo, SEC,     │
                    │    Gemini, etc.)    │
                    └─────────────────────┘
```

### L1: Client-Side Cache (Browser)

**Implementation**: `src/lib/utils/aiCache.ts`

**Technology**: IndexedDB (via `idb` library)

**Purpose**: 
- Reduce network requests
- Instant response for repeat queries
- Offline capability

**Data Cached**:
- AI chat responses
- Stock sentiment analysis
- Portfolio analysis results
- News summaries

**TTL by Data Type**:
| Data Type | TTL | Reason |
|-----------|-----|--------|
| AI chat responses | 1 hour | Conversations change with context |
| Stock sentiment | 15 minutes | Market sentiment shifts quickly |
| Portfolio analysis | 6 hours | Portfolio updates throughout day |
| News summaries | 1 hour | News freshness matters |

**Cache Key Pattern**:
```typescript
// Format: {dataType}:{identifier}
"sentiment:AAPL"
"analysis:portfolio_123"
"news:TSLA"
```

**Implementation Example**:
```typescript
import { aiCache } from '@lib/utils/aiCache';

// Get from L1 cache
const cached = await aiCache.get('sentiment', 'AAPL');
if (cached) {
  return cached.data; // Instant return, no network call
}

// Cache miss - fetch from API
const data = await fetchSentiment('AAPL');

// Store in L1 cache
await aiCache.set('sentiment', 'AAPL', data);
```

**Benefits**:
- ✅ Zero network latency
- ✅ Works offline
- ✅ No server load
- ✅ No quota consumption

**Limitations**:
- ❌ Per-device only (not shared across user's devices)
- ❌ Can be cleared by user
- ❌ Storage limits (~50MB typical)

---

### L2: Server-Side Cache (Redis)

**Implementation**: `src/lib/cache/adapter.ts`

**Technology**: 
- **Primary**: Vercel KV (Upstash Redis managed by Vercel)
- **Alternative**: Upstash Redis (direct connection)
- **Fallback**: In-memory (development only)

**Purpose**:
- Share cache across serverless function instances
- Persist cache across deployments
- High-performance distributed cache

**Data Cached**:
- API responses (stock quotes, fundamentals, news)
- AI-generated content
- User portfolio snapshots
- Query results

**TTL by Data Type & Tier**:

| Data Type | Free Tier | Basic Tier | Premium Tier | Rationale |
|-----------|-----------|------------|--------------|-----------|
| Stock quotes | 15 min | 10 min | 5 min | Balance freshness vs cost |
| Commodities | 4 hours | 2 hours | 1 hour | Slower moving markets |
| Fundamentals | 7 days | 7 days | 7 days | Quarterly updates |
| Company info | 30 days | 30 days | 30 days | Rarely changes |
| News | 1 hour | 1 hour | 1 hour | Timely but not real-time |
| AI responses | 12 hours | 12 hours | 12 hours | Context-dependent |
| SEC filings | 30 days | 30 days | 30 days | Immutable once published |

**Cache Key Pattern**:
```typescript
// Format: {dataType}:{identifier}:v{version}
"quote:AAPL:v1"
"fundamentals:MSFT:v1"
"news:TSLA:v2"
"ai:sha256(query+context):v1"
```

**Implementation Example**:
```typescript
import { getCacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';

const cache = getCacheAdapter();

// Get from L2 cache
const cacheKey = `quote:${ticker}:v1`;
const cached = await cache.get<StockQuote>(cacheKey);

if (cached) {
  console.log(`[Cache] L2 hit: ${ticker}`);
  return { ...cached, source: 'cache' };
}

// Cache miss - fetch from provider
console.log(`[Cache] L2 miss: ${ticker}`);
const data = await fetchFromProvider(ticker);

// Store in L2 cache with tier-based TTL
const ttl = getCacheTTL('quotes', userTier);
await cache.set(cacheKey, data, ttl);

return data;
```

**Benefits**:
- ✅ Shared across all serverless instances
- ✅ Persists across deployments
- ✅ High performance (~1-5ms latency)
- ✅ Automatic expiration (TTL)
- ✅ Pattern-based invalidation

**Cost**:
- Vercel KV Hobby: $10/month (512MB storage, 30K requests/day)
- Vercel KV Pro: $40/month (2GB storage, 500K requests/day)

---

### L3: Database Cache (Supabase)

**Implementation**: Direct Supabase queries

**Technology**: PostgreSQL (Supabase)

**Purpose**:
- Long-term storage of expensive computations
- Persistent cache for AI-generated summaries
- Historical data that doesn't expire

**Data Cached**:
- SEC filing summaries (AI-generated)
- Company fact sheets
- Historical news sentiment
- Portfolio snapshots

**TTL Strategy**:
| Data Type | TTL | Storage |
|-----------|-----|---------|
| Filing summaries | 30 days | `filing_summaries` table |
| Company fact sheets | Until new filing | `company_facts` table |
| Historical sentiment | Permanent | `sentiment_history` table |
| Portfolio snapshots | Until portfolio changes | `portfolio_snapshots` table |

**Schema Example**:
```sql
CREATE TABLE filing_summaries (
  id UUID PRIMARY KEY,
  cik VARCHAR(10) NOT NULL,
  filing_type VARCHAR(20) NOT NULL,
  period_end DATE NOT NULL,
  summary_text TEXT NOT NULL,
  kpis_json JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE(cik, filing_type, period_end)
);

CREATE INDEX idx_filing_summaries_lookup
ON filing_summaries(cik, filing_type, period_end);
```

**Implementation Example**:
```typescript
// Check L3 cache
const { data: cached } = await supabase
  .from('filing_summaries')
  .select('*')
  .eq('cik', cik)
  .eq('filing_type', '10-K')
  .gte('expires_at', new Date().toISOString())
  .single();

if (cached) {
  console.log(`[Cache] L3 hit: ${cik} 10-K`);
  return cached.summary_text;
}

// Cache miss - fetch and summarize filing
const filing = await fetchFromEdgar(cik, '10-K');
const summary = await summarizeWithAI(filing);

// Store in L3 cache
await supabase.from('filing_summaries').upsert({
  cik,
  filing_type: '10-K',
  period_end: filing.period_end,
  summary_text: summary,
  cached_at: new Date(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
});
```

**Benefits**:
- ✅ Persistent across all servers
- ✅ SQL queries for complex lookups
- ✅ Structured data storage
- ✅ Built-in RLS security
- ✅ Automatic backups

**Limitations**:
- ❌ Slower than Redis (~10-50ms latency)
- ❌ Requires database schema changes
- ❌ Storage costs scale with data volume

---

## Cache Providers

### Vercel KV (Recommended)

**Configuration**:
```bash
# Auto-configured in Vercel dashboard
KV_REST_API_URL=https://your-instance.upstash.io
KV_REST_API_TOKEN=your-token
```

**When to Use**:
- Deploying to Vercel
- Want managed Redis
- Need automatic connection pooling
- Prefer zero-config setup

**Pros**:
- ✅ Zero configuration in Vercel
- ✅ Automatic scaling
- ✅ Built-in monitoring
- ✅ Low latency (edge locations)

**Cons**:
- ❌ Vendor lock-in to Vercel
- ❌ Slightly more expensive than direct Upstash

---

### Upstash Redis (Alternative)

**Configuration**:
```bash
UPSTASH_REDIS_URL=redis://your-instance.upstash.io:6379
UPSTASH_REDIS_TOKEN=your-token
```

**When to Use**:
- Not deploying to Vercel
- Want more control
- Need Redis features not in Vercel KV
- Cost optimization

**Pros**:
- ✅ Platform-agnostic
- ✅ Full Redis feature set
- ✅ Slightly cheaper
- ✅ Direct control

**Cons**:
- ❌ Manual configuration required
- ❌ Self-managed connection pooling

---

### In-Memory (Development Only)

**Configuration**: No configuration needed (auto-detected)

**When to Use**:
- Local development
- Testing
- CI/CD pipelines
- **NEVER in production**

**Pros**:
- ✅ Zero setup
- ✅ Fast (no network)
- ✅ No external dependencies

**Cons**:
- ❌ Not shared across processes
- ❌ Lost on restart
- ❌ Limited memory
- ❌ **0% hit rate in serverless**

---

## TTL Strategy

### TTL Selection Guidelines

**Data Freshness Requirements**:

| Update Frequency | Example Data | TTL Range |
|-----------------|--------------|-----------|
| Real-time | Live quotes (paid tiers) | 1-5 minutes |
| Near real-time | Free tier quotes | 10-15 minutes |
| Hourly | News, commodity prices | 1-4 hours |
| Daily | Fundamentals, sentiment | 6-24 hours |
| Weekly | Company profiles | 7-30 days |
| Quarterly | SEC filings | 30-90 days |
| Static | Historical data | Permanent |

**Tier-Based TTL Differentiation**:

```typescript
// Premium users get fresher data
function getCacheTTL(dataType: string, tier: TierName): number {
  const TTL_CONFIG = {
    quotes: {
      free: 15 * 60 * 1000,    // 15 minutes
      basic: 10 * 60 * 1000,   // 10 minutes
      premium: 5 * 60 * 1000   // 5 minutes
    },
    news: {
      free: 2 * 60 * 60 * 1000,    // 2 hours
      basic: 1 * 60 * 60 * 1000,   // 1 hour
      premium: 30 * 60 * 1000      // 30 minutes
    },
    // ... more data types
  };

  return TTL_CONFIG[dataType][tier];
}
```

**Cost-Benefit Analysis**:

| TTL | Cache Hit Rate | API Calls | Cost | Freshness |
|-----|----------------|-----------|------|-----------|
| 5 min | 60% | 40% | $$ | Excellent |
| 15 min | 75% | 25% | $ | Good |
| 1 hour | 85% | 15% | $ | Fair |
| 6 hours | 92% | 8% | $ | Limited |
| 24 hours | 95% | 5% | $ | Poor |

**Recommendation**: 
- **Free tier**: 15-30 min quotes, 2-4 hour news
- **Paid tiers**: 5-10 min quotes, 1 hour news
- **All tiers**: 7-day fundamentals, 30-day filings

---

## Cache Key Design

### Naming Convention

**Format**: `{scope}:{identifier}:{version}`

**Examples**:
```
quote:AAPL:v1           # Stock quote for Apple
fundamentals:MSFT:v1    # Fundamentals for Microsoft
news:TSLA:v2            # News for Tesla (v2 = schema change)
portfolio:user123:v1    # User's portfolio
ai:abc123def:v1         # AI response (hashed query)
```

### Key Components

1. **Scope**: Data category (quote, news, ai, etc.)
2. **Identifier**: Unique identifier (ticker, user ID, query hash)
3. **Version**: Schema version for safe updates

### Versioning Strategy

**When to increment version**:
- ✅ Data structure changes (add/remove fields)
- ✅ Business logic changes (calculation methods)
- ✅ Provider changes (switching from Alpha Vantage to Tiingo)
- ❌ Bug fixes (invalidate manually instead)

**Version increment pattern**:
```typescript
// Old: quote:AAPL:v1 → { price: 150, change: 2 }
// New: quote:AAPL:v2 → { price: 150, change: 2, percentChange: 1.35 }

// Old keys auto-expire (different key)
// No need to manually invalidate
```

### Hash-Based Keys (AI Queries)

**Problem**: AI queries with same intent but different wording

**Solution**: Hash query + context for deduplication

```typescript
function generateAICacheKey(query: string, context: any): string {
  const cacheableContent = {
    // Normalize query
    message: query.toLowerCase().trim().replace(/\s+/g, ' '),
    // Include only deterministic context
    tickers: context.tickers?.sort(),
    tier: context.tier,
    // Exclude: timestamps, user IDs, random factors
  };

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(cacheableContent))
    .digest('hex')
    .substring(0, 16); // First 16 chars

  return `ai:${hash}:v1`;
}

// "What's AAPL's sentiment?" → ai:abc123def456:v1
// "what is aapl's sentiment" → ai:abc123def456:v1 (same key!)
// "What's AAPL sentiment?"   → ai:abc123def456:v1 (same key!)
```

---

## Cache Invalidation

### Strategies

#### 1. Time-Based (TTL)

**Default approach** - Let entries expire naturally

**Pros**:
- ✅ Simple
- ✅ Automatic
- ✅ No manual intervention

**Cons**:
- ❌ Can serve stale data before expiration

**Use when**: Data freshness has a known shelf-life

---

#### 2. Event-Based

**Invalidate on specific events**

```typescript
// New filing published → invalidate related cache
async function onNewFiling(cik: string, filingType: string) {
  await cache.delete(`fundamentals:${cik}:v1`);
  await cache.delete(`filings:${cik}:${filingType}:v1`);
  await cache.clear(`ai:*${cik}*`); // Clear all AI queries mentioning this company
}

// Portfolio updated → invalidate user's cache
async function onPortfolioUpdate(userId: string) {
  await cache.delete(`portfolio:${userId}:v1`);
  await cache.clear(`analysis:${userId}:*`);
}
```

**Use when**: Data changes in response to user actions or external events

---

#### 3. Manual Invalidation

**Admin or user-triggered refresh**

```typescript
// User clicks "Refresh" button
async function forceRefresh(ticker: string) {
  await cache.delete(`quote:${ticker}:v1`);
  await cache.delete(`news:${ticker}:v1`);
  
  // Fetch fresh data
  const fresh = await fetchFreshData(ticker);
  
  // Re-cache
  await cache.set(`quote:${ticker}:v1`, fresh, TTL);
}
```

**Use when**: Users need immediate fresh data

---

#### 4. Pattern-Based

**Clear multiple related keys**

```typescript
// Clear all quote caches
await cache.clear('quote:*');

// Clear user-specific caches
await cache.clear(`*:${userId}:*`);

// Clear old versions
await cache.clear('*:v1'); // When migrating to v2
```

**Use when**: Schema changes or mass invalidation needed

---

### Invalidation Best Practices

1. **Prefer TTL over manual**: Let expiration handle most cases
2. **Use versioned keys**: Avoid manual invalidation on schema changes
3. **Batch invalidations**: Clear related keys together
4. **Log invalidations**: Track what was cleared and why
5. **Gradual rollout**: Test invalidation logic in staging first

---

## Performance Metrics

### Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **L1 Cache Hit Rate** | 40-50% | Browser analytics |
| **L2 Cache Hit Rate** | 60-80% | Server logs |
| **L3 Cache Hit Rate** | 90-95% | Database queries |
| **Overall Hit Rate** | 95%+ | Combined |
| **Cache Response Time** | <200ms | Server-side timer |
| **API Cost Reduction** | 70%+ | Before/after comparison |

### Monitoring

**Key Metrics to Track**:

```typescript
interface CacheMetrics {
  l1_hits: number;
  l1_misses: number;
  l1_hit_rate: number;
  
  l2_hits: number;
  l2_misses: number;
  l2_hit_rate: number;
  
  l3_hits: number;
  l3_misses: number;
  l3_hit_rate: number;
  
  overall_hit_rate: number;
  avg_response_time_ms: number;
  cache_errors: number;
  api_calls_saved: number;
  estimated_cost_saved: number;
}
```

**Logging Example**:
```typescript
console.log(`[Cache Metrics] ${JSON.stringify({
  request_id: 'abc123',
  cache_key: 'quote:AAPL:v1',
  l1_result: 'miss',
  l2_result: 'hit',
  response_time_ms: 45,
  api_call_saved: true,
  estimated_cost_saved: 0.001
})}`);
```

**Dashboard Queries** (Example):
```sql
-- Daily cache hit rate
SELECT 
  DATE(timestamp) as date,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as hit_rate
FROM cache_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

-- Most expensive cache misses
SELECT 
  cache_key_prefix,
  COUNT(*) as miss_count,
  AVG(api_response_time_ms) as avg_api_time,
  SUM(estimated_api_cost) as total_cost
FROM cache_logs
WHERE cache_hit = false
GROUP BY cache_key_prefix
ORDER BY total_cost DESC
LIMIT 10;
```

---

## Best Practices

### 1. Cache-Before-Quota Pattern

**Always check cache BEFORE quota tracking**:

```typescript
// ✅ CORRECT
const cached = await cache.get(key);
if (cached) return cached; // FREE (no quota used)

const quota = await checkAndTrackQuota(userId, action);
if (!quota.allowed) return error429();

const data = await fetchFromAPI();
await cache.set(key, data, ttl);
return data;

// ❌ WRONG
const quota = await checkAndTrackQuota(userId, action); // Charges quota
const cached = await cache.get(key); // Then checks cache
if (cached) return cached; // User already charged!
```

---

### 2. Stale-While-Revalidate

**Serve stale data while refreshing in background**:

```typescript
async function getWithSWR(key: string) {
  // Try to get fresh data
  const cached = await cache.get(key);
  const age = await cache.getAge(key);
  
  if (cached && age < TTL) {
    // Fresh - return immediately
    return cached;
  }
  
  if (cached && age < TTL * 2) {
    // Stale but recent - return and refresh in background
    refreshInBackground(key); // Non-blocking
    return { ...cached, stale: true };
  }
  
  // Too stale or missing - fetch fresh
  return await fetchFresh(key);
}
```

---

### 3. Graceful Degradation

**Handle cache failures without breaking the app**:

```typescript
async function getCached<T>(key: string): Promise<T | null> {
  try {
    return await cache.get<T>(key);
  } catch (error) {
    console.error('[Cache] Get failed:', error);
    
    // Log error but don't throw
    logTelemetry('cache_error', { operation: 'get', key, error });
    
    // Return null (cache miss)
    return null;
  }
}
```

---

### 4. Request Deduplication

**Prevent concurrent duplicate requests**:

```typescript
const inflightRequests = new Map<string, Promise<any>>();

async function fetchWithDedup(key: string) {
  // Check if request already in flight
  if (inflightRequests.has(key)) {
    console.log(`[Dedup] Waiting for inflight request: ${key}`);
    return await inflightRequests.get(key);
  }
  
  // Start new request
  const promise = (async () => {
    try {
      const data = await fetchFromAPI();
      await cache.set(key, data, ttl);
      return data;
    } finally {
      inflightRequests.delete(key);
    }
  })();
  
  inflightRequests.set(key, promise);
  return await promise;
}
```

---

### 5. Warming Critical Cache

**Pre-populate cache for high-traffic data**:

```typescript
// Daily job to warm cache
async function warmPopularStocks() {
  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
  
  for (const ticker of popularTickers) {
    // Check if already cached
    const cached = await cache.get(`quote:${ticker}:v1`);
    if (cached) continue;
    
    // Fetch and cache
    const quote = await fetchQuote(ticker);
    await cache.set(`quote:${ticker}:v1`, quote, TTL);
    
    console.log(`[Warm] Cached ${ticker}`);
  }
}
```

---

## Troubleshooting

### Low Cache Hit Rate

**Symptoms**: Hit rate <50%

**Possible Causes**:
1. TTL too short
2. Cache keys not normalized (e.g., "AAPL" vs "aapl")
3. High traffic for unique queries
4. Cache provider issues

**Solutions**:
- Increase TTL for less time-sensitive data
- Normalize cache keys (lowercase, trim whitespace)
- Implement query deduplication
- Check Redis/Vercel KV status

---

### Cache Stampede

**Symptoms**: Many requests hit API simultaneously when cache expires

**Cause**: Popular cache entry expires, all concurrent requests miss

**Solution**: Stale-while-revalidate + request deduplication

```typescript
async function getCached(key: string) {
  const cached = await cache.get(key, allowExpired: true);
  
  if (cached) {
    // Return stale immediately
    if (needsRefresh(cached)) {
      refreshInBackground(key); // One request refreshes
    }
    return cached;
  }
  
  // Only one request fetches
  return await fetchWithDedup(key);
}
```

---

### Cache Memory Issues

**Symptoms**: Redis running out of memory

**Possible Causes**:
1. TTLs too long
2. Too much data per entry
3. Not using eviction policy

**Solutions**:
- Review and reduce TTLs
- Compress large payloads
- Configure Redis eviction policy: `maxmemory-policy allkeys-lru`
- Upgrade Redis tier

---

### Stale Data Served

**Symptoms**: Users see outdated information

**Causes**:
1. TTL too long
2. Event-based invalidation not triggered
3. Version mismatch

**Solutions**:
- Reduce TTL for that data type
- Add event-based invalidation
- Force refresh for premium users
- Implement manual refresh button

---

## References

- [Implementation: Cache Adapter](../../src/lib/cache/adapter.ts)
- [Configuration: Cache TTLs](../../src/lib/config/cache-ttl.config.ts)
- [Configuration: Cache Providers](../../src/lib/config/cache-provider.config.ts)
- [Guide: Configuration Management](../4_Feature_Deep_Dives/CONFIGURATION_MANAGEMENT.md)
- [Architecture: Multi-tenant System](./ARCHITECTURE.md)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Upstash Redis Documentation](https://upstash.com/docs/redis)

---

**Last Updated**: 2024-12-05
**Next Review**: 2025-01-05 (or when cache hit rate drops below 60%)
