# Data Source Orchestrator Implementation Guide

**Version:** 0.2.0 | **Last Updated:** 2025-12-04 | **Status:** Phase 2 Complete

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [When to Use the Orchestrator](#when-to-use-the-orchestrator)
4. [Integration Guide](#integration-guide)
5. [Provider Implementation](#provider-implementation)
6. [Best Practices](#best-practices)
7. [Migration Strategy](#migration-strategy)
8. [Monitoring & Observability](#monitoring--observability)
9. [Troubleshooting](#troubleshooting)
10. [References](#references)

---

## Overview

The Data Source Orchestrator is a centralized framework for managing all external data fetching operations in the portfolio tracker application. It provides intelligent fallback mechanisms, caching, circuit breaking, and telemetry to ensure reliable and efficient data access.

### Problem Statement

Before the orchestrator, our services had:

- **58% code duplication** across 4 services (StockDataService, FinancialDataService, MarketDataService, NewsService)
- **Inconsistent error handling** - Each service implemented its own retry logic
- **No centralized observability** - Difficult to track API usage and failures
- **Duplicate request waste** - Concurrent requests for the same data hit APIs multiple times
- **No stale data fallback** - Hard failures when APIs went down

**Result:** ~700 lines of duplicated code, poor user experience during API outages, and wasted API quota.

### Solution

A single orchestrator that provides three core fetch strategies:

1. **`fetchWithFallback()`** - Sequential provider fallback (Primary → Secondary → Stale Cache)
2. **`fetchWithMerge()`** - Multi-source data merging (Yahoo + AlphaVantage = Complete Data)
3. **`batchFetch()`** - Batch optimization (100 symbols → 10 batches of 10)

### Key Benefits

| Feature | Before | After | Impact |
|---------|--------|-------|--------|
| Code Duplication | 58% | <5% | ~700 lines eliminated |
| Cache Hit Rate | 40% | 60-80% (target) | Faster response times |
| API Call Savings | 0% | 10%+ (dedup) + 70% (batch) | Lower costs |
| Circuit Breaking | None | Automatic | >90% failing call prevention |
| Observability | Per-service logs | Centralized telemetry | Easy monitoring |
| Stale Fallback | Hard failures | Graceful degradation | Better UX |

---

## Architecture

### Component Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                   Application Services                            │
│  StockDataService │ FinancialDataService │ NewsService           │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                  DataSourceOrchestrator (Singleton)               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐ │
│  │ fetchWith      │  │ fetchWith      │  │ batchFetch         │ │
│  │ Fallback()     │  │ Merge()        │  │ ()                 │ │
│  └────────┬───────┘  └────────┬───────┘  └────────┬───────────┘ │
└───────────┼──────────────────┼─────────────────────┼─────────────┘
            │                  │                     │
            ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Support Systems (Phase 1)                      │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────────────┐│
│  │ Circuit      │ │ Request      │ │ Telemetry                 ││
│  │ Breaker      │ │ Deduplication│ │ Logger                    ││
│  │ Manager      │ │ Manager      │ │ (Structured Events)       ││
│  └──────┬───────┘ └──────┬───────┘ └───────────┬───────────────┘│
└─────────┼────────────────┼─────────────────────┼─────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Cache Adapter (L1/L2/L3)                       │
│  Memory (dev) │ Vercel KV (prod L1) │ Upstash (prod L2)          │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│               Provider Adapters (Phase 3 - Planned)               │
│  Tiingo │ Yahoo Finance │ AlphaVantage │ FMP │ NewsAPI           │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    External APIs                                  │
│  Tiingo API │ Yahoo Finance │ Alpha Vantage │ FMP │ NewsAPI      │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

#### fetchWithFallback Flow

```
Request (symbol: 'AAPL')
    │
    ├──> 1. Check Cache
    │         ├─> HIT  → Return cached data ✅
    │         └─> MISS → Continue to providers
    │
    ├──> 2. Try Provider 1 (Tiingo)
    │         ├─> Circuit Open? → Skip, try next
    │         ├─> Success? → Cache + Return ✅
    │         └─> Failure → Try next
    │
    ├──> 3. Try Provider 2 (Yahoo Finance)
    │         ├─> Circuit Open? → Skip, try next
    │         ├─> Success? → Cache + Return ✅
    │         └─> Failure → Try stale cache
    │
    └──> 4. Stale Cache Fallback
              ├─> Expired cache exists? → Return stale ⚠️
              └─> No cache → Return null + errors ❌
```

#### fetchWithMerge Flow

```
Request (symbol: 'AAPL')
    │
    ├──> 1. Check Cache
    │         ├─> HIT  → Return cached merged data ✅
    │         └─> MISS → Continue
    │
    ├──> 2. Parallel Fetch (Yahoo + AlphaVantage)
    │         ├─> Yahoo: { marketCap, PE, dividendYield }
    │         └─> AlphaVantage: { beta, eps, revenue }
    │
    ├──> 3. Merge Strategy
    │         └─> Combine: { marketCap, PE, dividendYield, beta, eps, revenue }
    │
    └──> 4. Cache Merged Result → Return ✅
```

#### batchFetch Flow

```
Request (symbols: ['AAPL', 'MSFT', ...98 more])
    │
    ├──> 1. Check Cache for All 100 Symbols
    │         ├─> 60 cached ✅
    │         └─> 40 uncached
    │
    ├──> 2. Split Uncached into Batches (maxBatchSize: 10)
    │         ├─> Batch 1: [Symbol 1-10]
    │         ├─> Batch 2: [Symbol 11-20]
    │         ├─> Batch 3: [Symbol 21-30]
    │         └─> Batch 4: [Symbol 31-40]
    │
    ├──> 3. Parallel Fetch All Batches
    │         └─> 4 API calls instead of 40
    │
    └──> 4. Cache All Results → Return Combined ✅
          (60 from cache + 40 fresh = 100 total)
```

### File Structure

```
src/lib/data-sources/
├── index.ts                    # Public API exports
├── types.ts                    # Core type definitions
├── circuit-breaker.ts          # Circuit breaker pattern (300 LOC)
├── deduplication.ts            # Request deduplication (150 LOC)
├── telemetry.ts                # Structured logging (250 LOC)
├── orchestrator.ts             # Core orchestrator (690 LOC) ⭐
├── provider-adapters.ts        # Provider wrappers (Phase 3)
├── __tests__/
│   ├── circuit-breaker.test.ts       # 20 tests
│   ├── deduplication.test.ts         # 18 tests
│   ├── telemetry.test.ts             # 23 tests
│   └── orchestrator.integration.test.ts  # 20 tests
├── CHANGELOG.md                # Version history
└── README.md                   # API reference
```

---

## When to Use the Orchestrator

### Use Cases

| Scenario | Recommended Method | Why |
|----------|-------------------|-----|
| Stock quote (single symbol) | `fetchWithFallback` | Try Tiingo → Yahoo → Stale cache |
| Company fundamentals | `fetchWithMerge` | Combine Yahoo + AlphaVantage for complete data |
| Portfolio quotes (100 symbols) | `batchFetch` | 10 batches instead of 100 API calls |
| News articles (multiple sources) | `fetchWithMerge` | Aggregate NewsAPI + Benzinga + MarketWatch |
| Commodity prices (oil, gas) | `fetchWithFallback` | Try FMP → AlphaVantage → Stale |
| SEC filings | `fetchWithFallback` | Try SEC Edgar → Cache (rare changes) |

### Decision Tree

```
Do you need data from ONE source?
├─> YES: Use fetchWithFallback
│         └─> Try providers in order: Primary → Secondary → Stale
│
└─> NO: Do you need to COMBINE multiple sources?
    ├─> YES: Use fetchWithMerge
    │         └─> Fetch all in parallel → Merge → Cache
    │
    └─> NO: Do you need MANY resources (>10)?
        └─> YES: Use batchFetch
                  └─> Split into batches → Fetch in parallel → Cache
```

### When NOT to Use the Orchestrator

- **Internal database queries** - Use Prisma directly
- **Server-side calculations** - No external API needed
- **Real-time WebSocket data** - Use dedicated WebSocket handlers
- **File uploads** - Use Next.js API routes directly

---

## Integration Guide

### Phase 3: Provider Adapters (Planned)

Before services can use the orchestrator, we need to create provider adapters that wrap existing DAOs.

#### Example: Stock Quote Provider

```typescript
// src/lib/data-sources/provider-adapters.ts

import { DataProvider, BatchDataProvider } from './types';
import { getTiingoDAO } from '@/backend/external/tiingo/TiingoDAO';
import { getYahooFinanceDAO } from '@/backend/external/yahoo/YahooFinanceDAO';
import type { StockQuote } from '@/types';

/**
 * Tiingo Stock Quote Provider (Batch-capable)
 */
export class TiingoQuoteProvider implements BatchDataProvider<StockQuote> {
  readonly name = 'tiingo';
  readonly maxBatchSize = 10;

  async fetch(symbol: string): Promise<StockQuote> {
    const dao = getTiingoDAO();
    const rawQuote = await dao.getQuote(symbol);

    // Transform to standard format
    return {
      symbol,
      price: rawQuote.last,
      change: rawQuote.change,
      changePercent: rawQuote.changePercent,
      volume: rawQuote.volume,
      timestamp: new Date(rawQuote.timestamp).getTime(),
      source: 'tiingo',
    };
  }

  async batchFetch(symbols: string[]): Promise<Record<string, StockQuote>> {
    const dao = getTiingoDAO();
    const rawQuotes = await dao.getQuotes(symbols);

    const results: Record<string, StockQuote> = {};
    for (const symbol of symbols) {
      const raw = rawQuotes[symbol];
      if (raw) {
        results[symbol] = {
          symbol,
          price: raw.last,
          change: raw.change,
          changePercent: raw.changePercent,
          volume: raw.volume,
          timestamp: new Date(raw.timestamp).getTime(),
          source: 'tiingo',
        };
      }
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('AAPL');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Yahoo Finance Quote Provider (Single fetch only)
 */
export class YahooFinanceQuoteProvider implements DataProvider<StockQuote> {
  readonly name = 'yahooFinance';

  async fetch(symbol: string): Promise<StockQuote> {
    const dao = getYahooFinanceDAO();
    const rawQuote = await dao.getQuote(symbol);

    return {
      symbol,
      price: rawQuote.regularMarketPrice,
      change: rawQuote.regularMarketChange,
      changePercent: rawQuote.regularMarketChangePercent,
      volume: rawQuote.regularMarketVolume,
      timestamp: rawQuote.regularMarketTime * 1000,
      source: 'yahooFinance',
    };
  }
}

// Export provider instances
export const tiingoQuoteProvider = new TiingoQuoteProvider();
export const yahooFinanceQuoteProvider = new YahooFinanceQuoteProvider();
```

### Phase 4: Service Migration

Once providers are created, migrate services to use the orchestrator.

#### Before (Legacy)

```typescript
// src/backend/modules/stock-data/StockDataService.ts (BEFORE)

import { getTiingoDAO } from '@/backend/external/tiingo/TiingoDAO';
import { getYahooFinanceDAO } from '@/backend/external/yahoo/YahooFinanceDAO';
import { getCacheAdapter } from '@lib/cache/adapter';

export class StockDataService {
  async getQuote(symbol: string, tier: TierName): Promise<StockQuote | null> {
    const cache = getCacheAdapter();
    const cacheKey = `quotes:${symbol}:v1`;

    // Check cache (code duplication #1)
    const cached = await cache.get<StockQuote>(cacheKey);
    if (cached) return cached;

    // Try Tiingo (code duplication #2)
    try {
      const tiingo = getTiingoDAO();
      const quote = await tiingo.getQuote(symbol);
      await cache.set(cacheKey, quote, 60000);
      return quote;
    } catch (error) {
      console.error('Tiingo failed', error);
    }

    // Try Yahoo Finance (code duplication #3)
    try {
      const yahoo = getYahooFinanceDAO();
      const quote = await yahoo.getQuote(symbol);
      await cache.set(cacheKey, quote, 60000);
      return quote;
    } catch (error) {
      console.error('Yahoo failed', error);
    }

    // Return stale cache (code duplication #4)
    const stale = await cache.get<StockQuote>(cacheKey, true);
    if (stale) return stale;

    return null; // Hard failure
  }
}
```

#### After (With Orchestrator)

```typescript
// src/backend/modules/stock-data/StockDataService.ts (AFTER)

import { DataSourceOrchestrator } from '@lib/data-sources';
import { tiingoQuoteProvider, yahooFinanceQuoteProvider } from '@lib/data-sources/provider-adapters';
import type { StockQuote } from '@/types';

export class StockDataService {
  private orchestrator = DataSourceOrchestrator.getInstance();

  async getQuote(symbol: string, tier: TierName): Promise<StockQuote | null> {
    const result = await this.orchestrator.fetchWithFallback<StockQuote>({
      key: symbol,
      providers: [tiingoQuoteProvider, yahooFinanceQuoteProvider],
      cacheKeyPrefix: 'quotes',
      tier,
      allowStale: true, // Graceful degradation
    });

    if (result.data === null) {
      // Log errors for debugging
      console.error(`Failed to fetch quote for ${symbol}:`, result.errors);
    }

    return result.data;
  }

  async getQuotes(symbols: string[], tier: TierName): Promise<Record<string, StockQuote>> {
    const result = await this.orchestrator.batchFetch<StockQuote>({
      keys: symbols,
      provider: tiingoQuoteProvider, // Batch-capable
      cacheKeyPrefix: 'quotes',
      tier,
    });

    return Object.fromEntries(
      Object.entries(result.results)
        .filter(([_, r]) => r.data !== null)
        .map(([symbol, r]) => [symbol, r.data!])
    );
  }
}
```

**Code Reduction:** 40 lines → 15 lines (62% reduction)

---

## Provider Implementation

### Provider Interface Requirements

All providers must implement one of these interfaces:

```typescript
// Single-resource provider
interface DataProvider<T> {
  readonly name: string;  // Must match PROVIDER_CONFIG key
  fetch(key: string, options?: FetchOptions): Promise<T>;
  healthCheck?(): Promise<boolean> | boolean;
}

// Batch-capable provider
interface BatchDataProvider<T> extends DataProvider<T> {
  readonly maxBatchSize: number;
  batchFetch(keys: string[], options?: FetchOptions): Promise<Record<string, T>>;
}
```

### Provider Checklist

When creating a new provider:

- [ ] Implement `DataProvider<T>` or `BatchDataProvider<T>`
- [ ] Set `name` to match `PROVIDER_CONFIG` key (e.g., `'tiingo'`, `'yahooFinance'`)
- [ ] Transform DAO response to standard application type
- [ ] Add error handling (throw `ProviderError` with appropriate code)
- [ ] Implement optional `healthCheck()` for circuit breaker testing
- [ ] Add provider configuration to `PROVIDER_CONFIG`:
  ```typescript
  // src/lib/config/providers.config.ts
  export const PROVIDER_CONFIG = {
    tiingo: {
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000,
        halfOpenMaxRequests: 3,
      },
    },
  };
  ```
- [ ] Write integration tests for the provider
- [ ] Update documentation with usage examples

### Example: News Provider with Merge

```typescript
// Multiple news sources merged into single result

import { DataProvider, MergeStrategy, DataResult } from '@lib/data-sources';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: number;
  source: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
}

class NewsAPIProvider implements DataProvider<NewsResponse> {
  readonly name = 'newsapi';

  async fetch(symbol: string): Promise<NewsResponse> {
    const dao = getNewsAPIDAO();
    const rawArticles = await dao.getNews(symbol);

    return {
      articles: rawArticles.map(a => ({
        title: a.title,
        description: a.description,
        url: a.url,
        publishedAt: new Date(a.publishedAt).getTime(),
        source: 'newsapi',
      })),
      totalResults: rawArticles.length,
    };
  }
}

class BenzingaProvider implements DataProvider<NewsResponse> {
  readonly name = 'benzinga';

  async fetch(symbol: string): Promise<NewsResponse> {
    const dao = getBenzingaDAO();
    const rawArticles = await dao.getNews(symbol);

    return {
      articles: rawArticles.map(a => ({
        title: a.headline,
        description: a.body,
        url: a.url,
        publishedAt: new Date(a.created).getTime(),
        source: 'benzinga',
      })),
      totalResults: rawArticles.length,
    };
  }
}

// Merge strategy: Combine all articles and sort by date
const mergeNews: MergeStrategy<NewsResponse> = (results) => {
  const allArticles = results.flatMap(r => r.data.articles);

  // Sort by publishedAt (newest first)
  allArticles.sort((a, b) => b.publishedAt - a.publishedAt);

  return {
    articles: allArticles.slice(0, 50), // Top 50 articles
    totalResults: allArticles.length,
  };
};

// Usage in NewsService
async getNewsForSymbol(symbol: string, tier: TierName): Promise<NewsResponse | null> {
  const result = await this.orchestrator.fetchWithMerge<NewsResponse>({
    key: symbol,
    providers: [newsAPIProvider, benzingaProvider],
    mergeStrategy: mergeNews,
    minProviders: 1, // At least one source must succeed
    cacheKeyPrefix: 'news',
    tier,
  });

  return result.data;
}
```

---

## Best Practices

### 1. Cache Key Prefixes

Always use descriptive, consistent cache key prefixes:

```typescript
// ✅ GOOD - Matches CACHE_TTL_CONFIG keys
cacheKeyPrefix: 'quotes'
cacheKeyPrefix: 'fundamentals'
cacheKeyPrefix: 'filings'
cacheKeyPrefix: 'news'

// ❌ BAD - Inconsistent/typos
cacheKeyPrefix: 'quote'  // Should be 'quotes'
cacheKeyPrefix: 'stockQuote'  // Too specific
cacheKeyPrefix: 'data'  // Too generic
```

### 2. Provider Ordering

Order providers by reliability and cost:

```typescript
// ✅ GOOD - Most reliable first
providers: [
  tiingoProvider,        // Paid, reliable
  yahooFinanceProvider,  // Free, less reliable
  alphaVantageProvider   // Backup
]

// ❌ BAD - Free provider first (wastes paid API on failures)
providers: [
  yahooFinanceProvider,
  tiingoProvider
]
```

### 3. Error Handling

Always check for null data and log errors:

```typescript
// ✅ GOOD
const result = await orchestrator.fetchWithFallback({ ... });

if (result.data === null) {
  console.error(`Failed to fetch ${key}:`, result.errors);
  // Show error toast to user
  return null;
}

// Check if data is stale
if (result.cached && result.age > 300000) { // 5 minutes
  console.warn(`Showing stale data for ${key} (age: ${result.age}ms)`);
  // Show warning banner to user
}

return result.data;
```

### 4. Stale Cache Usage

Use `allowStale: true` for non-critical data:

```typescript
// ✅ GOOD - Graceful degradation for stock quotes
await orchestrator.fetchWithFallback({
  key: 'AAPL',
  providers: [tiingoProvider],
  allowStale: true, // Show old quote better than nothing
});

// ❌ BAD - Hard failure for news (stale news is misleading)
await orchestrator.fetchWithFallback({
  key: 'AAPL',
  providers: [newsProvider],
  allowStale: false, // Old news is worse than no news
});
```

### 5. Batch Size Optimization

Choose batch sizes based on provider limits:

```typescript
// ✅ GOOD - Respects Tiingo's limit
class TiingoProvider implements BatchDataProvider<StockQuote> {
  readonly maxBatchSize = 10; // Tiingo supports max 10 symbols per request
}

// ❌ BAD - Exceeds provider limit (will fail)
class TiingoProvider implements BatchDataProvider<StockQuote> {
  readonly maxBatchSize = 100; // Tiingo will reject this
}
```

### 6. Merge Strategy Design

Keep merge strategies simple and defensive:

```typescript
// ✅ GOOD - Defensive, handles missing data
const mergeFundamentals: MergeStrategy<Fundamentals> = (results) => {
  const yahoo = results.find(r => r.source === 'yahooFinance')?.data;
  const av = results.find(r => r.source === 'alphaVantage')?.data;

  if (!yahoo && !av) return null; // No data from any source

  return {
    symbol: yahoo?.symbol ?? av?.symbol ?? '',
    marketCap: yahoo?.marketCap ?? av?.marketCap ?? 0,
    pe: yahoo?.pe ?? av?.pe ?? null,
    // Prioritize Yahoo, fallback to AlphaVantage
  };
};

// ❌ BAD - Assumes data exists (will crash)
const mergeFundamentals: MergeStrategy<Fundamentals> = (results) => {
  return {
    marketCap: results[0].data.marketCap, // Crashes if results[0] is undefined
  };
};
```

### 7. Telemetry Context

Add custom context for debugging:

```typescript
// ✅ GOOD - Adds user context for debugging
await orchestrator.fetchWithFallback({
  key: 'AAPL',
  providers: [tiingoProvider],
  context: {
    userId: user.id,
    tier: user.tier,
    route: '/api/quotes',
  },
});

// Check telemetry later
const stats = orchestrator.getStats();
console.log('Provider success rate:', stats.telemetry.providerSuccesses);
```

---

## Migration Strategy

### Rollout Plan

**Phase 3: Provider Adapters** (Current)
- [ ] Create provider adapter wrappers for all DAOs
- [ ] Test each provider independently
- [ ] Update `PROVIDER_CONFIG` with circuit breaker settings

**Phase 4: Gradual Service Migration** (Next)
- [ ] Add feature flag: `FEATURE_ORCHESTRATOR_ENABLED`
- [ ] Migrate one service at a time (StockDataService first)
- [ ] Run A/B testing (50% legacy, 50% orchestrator)
- [ ] Monitor telemetry for errors
- [ ] Full rollout after 1 week of stable operation

**Phase 5: Observability Dashboard** (Future)
- [ ] Build admin dashboard showing:
  - Cache hit rates per data type
  - Provider success rates
  - Circuit breaker states
  - API quota usage
- [ ] Set up alerts for:
  - Cache hit rate < 50%
  - Provider failure rate > 10%
  - Circuit breakers opening

**Phase 6: Legacy Code Removal** (Final)
- [ ] Remove old fallback logic from services
- [ ] Delete duplicate code (~700 lines)
- [ ] Update tests to use orchestrator mocks

### Feature Flag Pattern

```typescript
// src/backend/modules/stock-data/StockDataService.ts

export class StockDataService {
  async getQuote(symbol: string, tier: TierName): Promise<StockQuote | null> {
    // Feature flag for gradual rollout
    if (process.env.FEATURE_ORCHESTRATOR_ENABLED === 'true') {
      return this.getQuoteWithOrchestrator(symbol, tier);
    } else {
      return this.getQuoteLegacy(symbol, tier);
    }
  }

  private async getQuoteWithOrchestrator(symbol: string, tier: TierName): Promise<StockQuote | null> {
    const orchestrator = DataSourceOrchestrator.getInstance();
    const result = await orchestrator.fetchWithFallback({ ... });
    return result.data;
  }

  private async getQuoteLegacy(symbol: string, tier: TierName): Promise<StockQuote | null> {
    // Old implementation (to be removed in Phase 6)
    // ...
  }
}
```

---

## Monitoring & Observability

### Telemetry Events

The orchestrator logs structured events for all operations:

```typescript
// Get telemetry statistics
const orchestrator = DataSourceOrchestrator.getInstance();
const stats = orchestrator.getStats();

console.log('Cache Performance:', {
  hitRate: stats.telemetry.cacheHitRate,
  hits: stats.telemetry.cacheHits,
  misses: stats.telemetry.cacheMisses,
  staleUsed: stats.telemetry.staleCacheUsed,
});

console.log('Provider Performance:', {
  attempts: stats.telemetry.providerAttempts,
  successes: stats.telemetry.providerSuccesses,
  failures: stats.telemetry.providerFailures,
});

console.log('Circuit Breakers:', stats.circuitBreakers);
/*
{
  tiingo: { state: 'CLOSED', failureCount: 0, successCount: 152 },
  yahooFinance: { state: 'OPEN', failureCount: 5, nextRetry: 1701234567890 },
  alphaVantage: { state: 'HALF_OPEN', failureCount: 3, successCount: 1 }
}
*/
```

### Health Check Endpoint

Create an admin endpoint to monitor orchestrator health:

```typescript
// src/app/api/admin/orchestrator-health/route.ts

import { NextResponse } from 'next/server';
import { DataSourceOrchestrator } from '@lib/data-sources';

export async function GET() {
  const orchestrator = DataSourceOrchestrator.getInstance();
  const stats = orchestrator.getStats();

  return NextResponse.json({
    timestamp: Date.now(),
    cache: {
      hitRate: stats.telemetry.cacheHitRate,
      totalHits: stats.telemetry.cacheHits,
      totalMisses: stats.telemetry.cacheMisses,
    },
    providers: Object.entries(stats.telemetry.providerSuccesses).map(([provider, successes]) => ({
      name: provider,
      successes,
      failures: stats.telemetry.providerFailures[provider] || 0,
      successRate: (successes / (successes + (stats.telemetry.providerFailures[provider] || 0))) * 100,
      circuitState: stats.circuitBreakers[provider]?.state || 'UNKNOWN',
    })),
    circuitBreakers: stats.circuitBreakers,
  });
}
```

### Monitoring Alerts

Set up monitoring alerts for:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Cache hit rate | < 50% | Investigate cache configuration |
| Provider failure rate | > 10% | Check provider API status |
| Circuit breaker open | Any | Alert engineering team |
| Stale cache usage | > 5% | Indicates provider issues |
| API quota usage | > 80% | Upgrade plan or optimize |

---

## Troubleshooting

### Issue: All Providers Failing

**Symptoms:**
- `result.data === null`
- `result.errors` has multiple entries
- Circuit breakers opening

**Diagnosis:**
```typescript
const result = await orchestrator.fetchWithFallback({ ... });

if (result.data === null) {
  console.error('All providers failed:');
  result.errors.forEach(error => {
    console.error(`- ${error.provider}: ${error.code} - ${error.message}`);
  });
  console.error('Providers attempted:', result.metadata.providersAttempted);
}
```

**Solutions:**
1. Check provider API dashboards for outages
2. Verify API keys are valid
3. Check rate limits (look for `RATE_LIMIT` error codes)
4. Review circuit breaker thresholds in `PROVIDER_CONFIG`
5. Temporarily disable circuit breakers for testing:
   ```typescript
   const breaker = CircuitBreakerManager.getInstance().getCircuitBreaker('tiingo');
   breaker.reset(); // Force to CLOSED state
   ```

### Issue: Stale Data Being Shown

**Symptoms:**
- `result.cached === true`
- `result.age > expected TTL`
- Users seeing old data

**Diagnosis:**
```typescript
const result = await orchestrator.fetchWithFallback({ ... });

if (result.cached && result.age > 300000) { // 5 minutes
  console.warn(`Stale cache returned (age: ${result.age}ms)`);
  console.warn('This means all providers failed');
}
```

**Solutions:**
1. Check if `allowStale: true` is appropriate for this data type
2. Show warning banner to users when `result.age` is high
3. Investigate why providers are failing (see above)
4. Consider disabling stale cache for critical data:
   ```typescript
   allowStale: false // Return null instead of stale data
   ```

### Issue: Circuit Breaker Stuck Open

**Symptoms:**
- Provider circuit breaker in `OPEN` state
- `CircuitOpenError` in `result.errors`
- Requests not reaching provider

**Diagnosis:**
```typescript
const stats = orchestrator.getStats();
const tiingoBreaker = stats.circuitBreakers.tiingo;

if (tiingoBreaker.state === 'OPEN') {
  console.log('Circuit is open. Next retry:', new Date(tiingoBreaker.nextRetry));
  console.log('Failure count:', tiingoBreaker.failureCount);
}
```

**Solutions:**
1. Wait for `resetTimeout` to elapse (circuit will enter `HALF_OPEN`)
2. Manually reset circuit breaker:
   ```typescript
   const manager = CircuitBreakerManager.getInstance();
   manager.getCircuitBreaker('tiingo').reset();
   ```
3. Adjust thresholds if too sensitive:
   ```typescript
   // PROVIDER_CONFIG
   tiingo: {
     circuitBreaker: {
       failureThreshold: 10, // Increase from 5
       resetTimeout: 30000,  // Decrease from 60000
     }
   }
   ```

### Issue: Low Cache Hit Rate

**Symptoms:**
- `cacheHitRate < 50%`
- Many provider calls
- Slow response times

**Diagnosis:**
```typescript
const stats = orchestrator.getStats();
console.log('Cache hit rate:', stats.telemetry.cacheHitRate);
console.log('Cache hits:', stats.telemetry.cacheHits);
console.log('Cache misses:', stats.telemetry.cacheMisses);
```

**Solutions:**
1. Verify cache key prefix matches `CACHE_TTL_CONFIG`:
   ```typescript
   cacheKeyPrefix: 'quotes' // Must match config key
   ```
2. Check if `skipCache: true` is being used unnecessarily
3. Increase TTL for stable data:
   ```typescript
   cacheTTL: 3600000 // 1 hour instead of tier-based TTL
   ```
4. Verify cache adapter is working:
   ```typescript
   const cache = getCacheAdapter();
   const stats = await cache.getStats();
   console.log('Cache type:', stats.type); // 'memory', 'vercel-kv', or 'upstash'
   ```

### Issue: Batch Fetches Failing

**Symptoms:**
- `batchFetch` returning many errors
- Some symbols missing from results

**Diagnosis:**
```typescript
const result = await orchestrator.batchFetch({ ... });

console.log('Summary:', result.summary);
// { total: 100, successful: 60, failed: 40, cached: 30, fresh: 30 }

// Check which symbols failed
Object.entries(result.errors).forEach(([symbol, errors]) => {
  console.error(`${symbol} failed:`, errors);
});
```

**Solutions:**
1. Check if `maxBatchSize` is too large:
   ```typescript
   class TiingoProvider {
     readonly maxBatchSize = 10; // Reduce if provider rejects large batches
   }
   ```
2. Handle partial failures gracefully:
   ```typescript
   const successfulQuotes = Object.fromEntries(
     Object.entries(result.results)
       .filter(([_, r]) => r.data !== null)
       .map(([symbol, r]) => [symbol, r.data!])
   );
   ```
3. Retry failed symbols individually:
   ```typescript
   const failedSymbols = Object.keys(result.errors);
   for (const symbol of failedSymbols) {
     const retry = await orchestrator.fetchWithFallback({
       key: symbol,
       providers: [fallbackProvider],
       cacheKeyPrefix: 'quotes',
     });
   }
   ```

---

## References

### Related Documentation

- **API Reference:** [`src/lib/data-sources/README.md`](../../src/lib/data-sources/README.md)
- **Changelog:** [`src/lib/data-sources/CHANGELOG.md`](../../src/lib/data-sources/CHANGELOG.md)
- **Cache Adapter Guide:** [`src/lib/cache/README.md`](../../src/lib/cache/README.md)
- **Configuration Guide:** [`CONFIGURATION_MANAGEMENT.md`](./CONFIGURATION_MANAGEMENT.md)
- **Development Guidelines:** [`DEVELOPMENT_GUIDELINES.md`](./DEVELOPMENT_GUIDELINES.md)

### External Resources

- **Circuit Breaker Pattern:** [Microsoft Azure Patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- **Request Deduplication:** [HTTP Request Coalescing](https://en.wikipedia.org/wiki/HTTP_request_coalescing)
- **Stale-While-Revalidate:** [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#stale-while-revalidate)

### Test Files

- **Circuit Breaker Tests:** [`src/lib/data-sources/__tests__/circuit-breaker.test.ts`](../../src/lib/data-sources/__tests__/circuit-breaker.test.ts)
- **Deduplication Tests:** [`src/lib/data-sources/__tests__/deduplication.test.ts`](../../src/lib/data-sources/__tests__/deduplication.test.ts)
- **Telemetry Tests:** [`src/lib/data-sources/__tests__/telemetry.test.ts`](../../src/lib/data-sources/__tests__/telemetry.test.ts)
- **Integration Tests:** [`src/lib/data-sources/__tests__/orchestrator.integration.test.ts`](../../src/lib/data-sources/__tests__/orchestrator.integration.test.ts)

---

**Last Updated:** 2025-12-04
**Maintainer:** Portfolio Tracker Development Team
**Version:** 0.2.0 (Phase 2 Complete)
**Next Phase:** Provider Adapters (Phase 3)
