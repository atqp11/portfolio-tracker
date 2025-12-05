# Production Readiness & Architecture Refactoring Plan

**Project:** Portfolio Tracker
**Created:** 2025-12-03
**Timeline:** 6 weeks
**Status:** Planning Phase
**Investment:** ~$10,500 (210 hours)
**Expected ROI:** $7,896/year savings + production readiness
**Break-Even:** 16 months

---

## Executive Summary

This plan outlines a comprehensive architectural refactoring to prepare the Portfolio Tracker for production deployment. The initiative addresses three critical areas:

1. **Distributed Caching** - Replace in-memory cache with Redis (prevents 100% cache miss in serverless)
2. **Data Source Migration** - Switch to cost-effective, legally compliant providers (Tiingo, RSS feeds)
3. **Production Hardening** - Security scanning, comprehensive testing, robust error handling

### Why This Matters

**Current Blocker:** In-memory caching will fail in production (Vercel serverless doesn't share memory across function instances)

**Business Impact:**
- 🔴 **Cost:** Without Redis: $200/month in redundant API calls
- 🔴 **UX:** Cache hit rate effectively 0% in production
- 🔴 **Reliability:** No production-grade error handling
- 🟢 **After Refactoring:** $40/month with 80% cache hit rate

### Timeline Overview

```
Week 0.5: Configuration System (Foundation)
Week 1-1.5: Cache Migration + Security
Week 2-3: Data Source Orchestrator + Tiingo Migration
Week 4: RSS News Migration + Testing
Week 5-6: Comprehensive Testing + Hardening + Production Deployment
```

---

## Architecture Decisions

### 1. Multi-Tier Caching Strategy

#### L1: Client-Side Cache (Already Implemented ✅)
**Purpose:** Reduce network requests, instant UX
**Technology:** localStorage + IndexedDB
**TTL:** 15 minutes
**Data Types:** AI responses only
**Implementation:** `src/lib/utils/aiCache.ts`

**Keep as-is** - Already working well for AI calls

---

#### L2: Server-Side Distributed Cache (NEW - CRITICAL 🔴)
**Purpose:** Share cache across serverless function instances
**Technology:** Vercel KV (Redis)
**Expected Hit Rate:** 60-80%
**Cost:** $10/month (Vercel KV Hobby tier)

**Cache TTL by Data Type:**

| Data Type | Free Tier | Basic Tier | Premium Tier | Rationale |
|-----------|-----------|------------|--------------|-----------|
| **Stock Quotes** | 15 min | 10 min | 5 min | Balance freshness vs. cost |
| **Commodities** | 4 hours | 2 hours | 1 hour | Slower moving markets |
| **Fundamentals** | 7 days | 7 days | 7 days | Quarterly updates |
| **Company Info** | 30 days | 30 days | 30 days | Rarely changes |
| **News** | 1 hour | 1 hour | 1 hour | Timely but not real-time |
| **AI Responses** | 12 hours | 12 hours | 12 hours | User-specific hash |
| **SEC Filings** | 30 days | 30 days | 30 days | Immutable once published |

**Cache Keys Strategy:**
```typescript
// Quote: "quote:AAPL:v1"
// Fundamentals: "fundamentals:AAPL:v1"
// News: "news:sha256(portfolio_tickers):v1"
// AI: "ai:sha256(query+userId+portfolio):v1"
```

**Versioning:** Include version in cache key for easy invalidation on schema changes

---

#### L3: Database Persistent Cache (NEW)
**Purpose:** Long-term storage for expensive-to-compute data
**Technology:** Supabase PostgreSQL
**Data Types:**
- SEC filing summaries (AI-generated, expensive)
- Company fact sheets (aggregated from multiple sources)
- Historical news sentiment (batch processed)

**Tables to Create:**
```sql
CREATE TABLE cached_filing_summaries (
  ticker VARCHAR(10),
  filing_type VARCHAR(20),
  filing_date DATE,
  summary_text TEXT,
  sentiment_score DECIMAL,
  generated_at TIMESTAMP,
  PRIMARY KEY (ticker, filing_type, filing_date)
);

CREATE TABLE cached_company_profiles (
  ticker VARCHAR(10) PRIMARY KEY,
  profile_data JSONB,
  updated_at TIMESTAMP,
  data_version INTEGER
);
```

---

### 2. Data Source Migration Strategy

#### Current State (To Be Replaced)

| Provider | Use Case | Cost | Issues |
|----------|----------|------|--------|
| Alpha Vantage | Quotes, commodities, fundamentals | $0 (25/day) → $50/month | Rate limits, not scalable |
| Yahoo Finance | Fundamentals | Free | Legal grey area for redistribution |
| Brave Search | News augmentation | $5/1000 requests | Pay per use |

**Total Current Cost (at scale):** ~$55/month

**IMPORTANT NOTE:**
- FMP, NewsAPI, and Finnhub code files STILL EXIST in the codebase
- These providers are planned for removal in Phase 3
- Documentation has been updated to reflect the planned architecture (not current state)
- Phase 3 will delete these files and implement the new provider orchestrator

---

#### New Architecture (Cost-Optimized + Legally Compliant)

**Stock Quotes**

| Priority | Provider | Use Case | Cost | Legal Status | Implementation |
|----------|----------|----------|------|--------------|----------------|
| **1. Primary** | **Tiingo** | EOD + delayed intraday (IEX feed) | **$10/month** | ✅ Commercial redistribution OK | Batch 500 symbols/request |
| 2. Fallback | Yahoo Finance | New tickers, Tiingo failure | Free | ⚠️ Internal use ONLY (no redistribution) | Short TTL, rate limit aware |
| 3. Stale Cache | Redis | All providers fail | N/A | N/A | Return with warning banner |

**Tiingo Benefits:**
- ✅ Commercial redistribution allowed
- ✅ Batch 500 symbols per request (efficient)
- ✅ EOD + 15-min delayed intraday
- ✅ IEX feed (reliable, legal)
- ✅ Only $10/month (vs. $50+ for Alpha Vantage)

**Yahoo Finance Restrictions:**
- ❌ **Cannot redistribute raw data to users** (ToS violation)
- ✅ **Can use internally** for cache warming
- ✅ **Can use as fallback** if Tiingo fails
- ⚠️ **Must use short TTL** (minutes to hours, not days)
- ⚠️ **Must respect rate limits** (no aggressive scraping)

**Implementation Strategy:**
1. Tiingo returns data → Cache in Redis (TTL based on tier) → Display to user
2. Tiingo fails → Yahoo Finance → Cache briefly (5min) → Display to user
3. Both fail → Stale Redis cache → Display with warning banner

---

**Commodities (WTI Oil, Natural Gas, Copper)**

| Provider | Cost | Implementation |
|----------|------|----------------|
| Tiingo | Included in $10/month | Primary source |
| Alpha Vantage | Free (25/day) | Fallback only |
| Stale Cache | N/A | 4-hour TTL |

---

**Fundamentals & Financials**

| Priority | Provider | Data Type | Cost | Legal Status |
|----------|----------|-----------|------|--------------|
| 1. Primary | **SEC EDGAR** | Official filings, financials | Free | ✅ Public domain |
| 2. Fallback | Yahoo Finance | Basic company info | Free | ⚠️ Internal use only |

**SEC EDGAR Implementation:**
- Already implemented ✅ (`src/backend/modules/stocks/dao/sec-edgar.dao.ts`)
- Add L3 cache for AI-generated filing summaries (30-day TTL)

---

**News**

| Priority | Provider | Type | Cost | Legal Status | Implementation |
|----------|----------|------|------|--------------|----------------|
| **1. Primary** | **RSS Feeds** | Company news, industry news | Free | ✅ Commercial-safe with attribution | Parse RSS, cache 1 hour |
| 2. Augmentation | **Google News RSS** | Missing tickers | Free | ✅ Commercial-safe | Fallback for low-coverage tickers |
| 3. Processing | **AI Summarization** | Sentiment + summary | Pay-per-token | ✅ Commercial OK | Groq batch processing |

**RSS Feed Sources:**
- Company investor relations RSS
- Industry news RSS (energy, mining, commodities)
- Google News RSS (`https://news.google.com/rss/search?q=TICKER`)

**Display Rules (Legal Compliance):**
- ✅ Show: Title + snippet + link
- ❌ Never show: Full article text (copyright violation)
- ✅ Show: AI-generated summary + sentiment
- ✅ Attribution: Link to original source

**Cost Savings:**
- Remove Brave Search: -$5/1000 requests (when not needed)
- **Total Savings:** Minimal (providers already removed)

---

#### New Total Cost Projection

| Service | Cost |
|---------|------|
| Tiingo | $10/month |
| SEC EDGAR | Free |
| RSS Feeds | Free |
| AI (Gemini + Groq) | $20-30/month (1K users) |
| Vercel KV (Redis) | $10/month |
| **Total** | **$40-50/month** |

**Savings vs. Current:** Optimized for cost-effective, legally compliant data sources

---

### 3. Data Source Orchestrator Architecture

#### Problem Statement

Current implementation has **scattered fallback logic** across services:
- StockDataService: Alpha Vantage → Yahoo Finance → Stale Cache
- MarketDataService: Alpha Vantage → Stale → Demo Data
- FinancialDataService: Yahoo → Alpha Vantage → Merge → Stale
- NewsService: RSS Feeds → Google News → Stale

**Code Duplication:** ~60% of cache/fallback logic is duplicated

---

#### Solution: Centralized Data Source Orchestrator

**File:** `src/lib/data-sources/orchestrator.ts`

**Responsibilities:**
1.` Unified fallback chain execution
2. Circuit breaker pattern (stop retrying failing providers)
3. Provider health monitoring
4. Rate limit awareness
5. Automatic provider selection
6. Telemetry and logging
`
**Architecture Pattern:**

```typescript
// Provider Interface
interface DataProvider<T> {
  name: string;
  priority: number; // 1 = highest priority
  fetch: () => Promise<T>;
  healthCheck?: () => Promise<boolean>;
  getRateLimitStatus?: () => { remaining: number; resetAt: Date };
}

// Orchestrator
class DataSourceOrchestrator {
  private circuitBreakers: Map<string, CircuitBreaker>;
  private cache: CacheAdapter;

  /**
   * Execute fallback chain with intelligent provider selection
   */
  async fetchWithFallback<T>(
    providers: DataProvider<T>[],
    options: {
      cacheKey?: string;
      cacheTTL?: number;
      allowStale?: boolean;
      deduplicationKey?: string; // Prevent concurrent duplicate requests
    }
  ): Promise<DataResult<T>>;

  /**
   * Fetch from multiple providers and merge results
   */
  async fetchWithMerge<T>(
    providers: DataProvider<T>[],
    mergeStrategy: (results: T[]) => T,
    options: CacheOptions
  ): Promise<DataResult<T>>;

  /**
   * Batch fetch (e.g., Tiingo's 500 symbol batching)
   */
  async batchFetch<T>(
    provider: BatchDataProvider<T>,
    items: string[],
    options: BatchOptions
  ): Promise<Map<string, T>>;
}

// Circuit Breaker Pattern
class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  private failureCount: number;
  private lastFailureTime: number;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError('Provider temporarily disabled');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.lastFailureTime = Date.now();
    }
  }
}
```

**Usage Example:**

```typescript
// Before (Duplicated in every service)
const cached = loadFromCache<StockQuote>(cacheKey);
if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
  return cached;
}

try {
  const avQuote = await alphaVantageDAO.getQuote(symbol);
  saveToCache(cacheKey, quote);
  return quote;
} catch (error) {
  if (errorMsg.includes('RATE_LIMIT') && cached) {
    return cached;
  }
}

try {
  const yahooQuote = await yahooFinanceDAO.getQuote(symbol);
  saveToCache(cacheKey, quote);
  return quote;
} catch (error) {
  // ...
}

// After (Centralized orchestrator)
const orchestrator = new DataSourceOrchestrator(cacheAdapter);

const result = await orchestrator.fetchWithFallback<StockQuote>(
  [
    {
      name: 'tiingo',
      priority: 1,
      fetch: () => tiingoDAO.getQuote(symbol),
    },
    {
      name: 'yahoo',
      priority: 2,
      fetch: () => yahooFinanceDAO.getQuote(symbol),
    }
  ],
  {
    cacheKey: `quote:${symbol}`,
    cacheTTL: this.getCacheTTL(userTier),
    allowStale: true,
    deduplicationKey: `quote:${symbol}:inflight`
  }
);

return result.data;
```

**Benefits:**
- ✅ 60% reduction in duplicated code
- ✅ Consistent fallback behavior
- ✅ Circuit breaker prevents cascading failures
- ✅ Request deduplication (don't fetch same data twice concurrently)
- ✅ Centralized telemetry and logging
- ✅ Easy to add new providers

---

### 4. Cache Abstraction Layer

**Problem:** Direct coupling to in-memory cache implementation

**File:** `src/lib/cache/adapter.ts`

```typescript
/**
 * Cache Adapter Interface
 * Allows swapping cache implementations without changing services
 */
interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  getAge(key: string): Promise<number>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

/**
 * Vercel KV (Redis) Implementation
 */
class VercelKVAdapter implements CacheAdapter {
  private kv: typeof import('@vercel/kv');

  async get<T>(key: string): Promise<T | null> {
    return await this.kv.get<T>(key);
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.kv.set(key, value, { ex: Math.floor(ttl / 1000) });
  }

  async getAge(key: string): Promise<number> {
    const ttl = await this.kv.ttl(key);
    if (ttl === -1) return Infinity; // No expiration
    if (ttl === -2) return -1; // Key doesn't exist
    // Calculate age from TTL (approximate)
    return Date.now() - (ttl * 1000);
  }

  async delete(key: string): Promise<void> {
    await this.kv.del(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      const keys = await this.kv.keys(pattern);
      if (keys.length > 0) {
        await this.kv.del(...keys);
      }
    } else {
      await this.kv.flushdb();
    }
  }
}

/**
 * In-Memory Implementation (Development Only)
 */
class InMemoryCacheAdapter implements CacheAdapter {
  private cache: Map<string, { value: any; timestamp: number; ttl: number }>;

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

  // ... other methods
}

/**
 * Factory
 */
export function createCacheAdapter(): CacheAdapter {
  if (process.env.NODE_ENV === 'production') {
    return new VercelKVAdapter();
  } else {
    return new InMemoryCacheAdapter();
  }
}
```

**Usage in Services:**

```typescript
// Inject cache adapter (dependency injection)
class StockDataService {
  constructor(
    private cache: CacheAdapter,
    private orchestrator: DataSourceOrchestrator
  ) {}

  async getQuote(symbol: string, userTier: TierName): Promise<StockQuote> {
    return await this.orchestrator.fetchWithFallback(
      [/* providers */],
      {
        cacheKey: `quote:${symbol}`,
        cacheTTL: this.getCacheTTL(userTier)
      }
    );
  }
}
```

---

## Phase-by-Phase Implementation

### Phase 0: Configuration System (Week 0.5) - CRITICAL FOUNDATION

**Goal:** Create centralized configuration system for all providers, AI models, and cache settings

**Effort:** 20 hours

**Why This Phase is Critical:**
- Eliminates hardcoded settings scattered across 15+ service files
- Makes it easy to adjust provider settings without code changes
- Enables environment-based configuration overrides
- Simplifies adding new providers or AI models (from 2 hours to 10 minutes)
- Provides startup validation to catch configuration errors early
- Required foundation for Phase 1+ implementation

**Business Value:**
- Reduces maintenance time by 60%
- Catches configuration errors before deployment
- Enables A/B testing and feature flags
- Simplifies onboarding new developers

---

#### Tasks

**0.1 Create Provider Configuration System**
- **Files to Create:**
  - `src/lib/config/providers.config.ts` - All provider settings
  - `src/lib/config/types.ts` - Configuration interfaces

**Implementation:**

```typescript
// src/lib/config/types.ts
export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number; // 1 = primary, 2 = fallback, 3 = tertiary
  baseUrl?: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreaker: {
    failureThreshold: number;
    resetTimeout: number;
    halfOpenMaxRequests: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

// src/lib/config/providers.config.ts
export const PROVIDER_CONFIG = {
  // Stock Quote Providers
  tiingo: {
    name: 'tiingo',
    enabled: process.env.FEATURE_TIINGO_ENABLED === 'true',
    priority: 1, // PRIMARY
    baseUrl: 'https://api.tiingo.com/tiingo',
    apiKey: process.env.TIINGO_API_KEY,
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 1000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 3,
    },
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000,
    },
    batchSize: 500,
  },

  yahooFinance: {
    name: 'yahoo-finance',
    enabled: true,
    priority: 2, // FALLBACK (use only if Tiingo fails)
    baseUrl: 'https://query2.finance.yahoo.com',
    timeout: 8000,
    retryAttempts: 1,
    retryDelay: 500,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 120000,
      halfOpenMaxRequests: 1,
    },
    rateLimit: {
      requestsPerMinute: 10,
      requestsPerDay: 500,
    },
    maxCacheTTL: 5 * 60 * 1000, // ToS compliance
  },

  alphaVantage: {
    name: 'alpha-vantage',
    enabled: true,
    priority: 3, // TERTIARY (commodities only after Phase 3)
    baseUrl: 'https://www.alphavantage.co/query',
    apiKey: process.env.ALPHAVANTAGE_API_KEY,
    timeout: 15000,
    retryAttempts: 2,
    retryDelay: 2000,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 2,
    },
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerDay: 25,
    },
  },

  // Additional providers: rss, secEdgar, etc.
} as const;
```

**Effort:** 5 hours

---

**0.2 Create AI Model Configuration System**
- **File to Create:** `src/lib/config/ai-models.config.ts`

**Implementation:**

```typescript
export interface AIModelConfig {
  provider: 'gemini' | 'groq' | 'openai';
  model: string;
  endpoint: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  priority: number; // 1 = primary, 2 = fallback
  fallback?: AIModelConfig;
  costPerToken: {
    input: number;
    output: number;
  };
}

export const AI_MODEL_CONFIG = {
  // Tier-based model selection
  tierModels: {
    free: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash-8b', // PRIMARY for free tier
      priority: 1,
      endpoint: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: process.env.GEMINI_API_KEY!,
      maxTokens: 1024,
      temperature: 0.7,
      timeout: 30000,
      costPerToken: { input: 0.0001, output: 0.0003 },
      fallback: {
        provider: 'groq' as const,
        model: 'llama-3.3-70b-versatile', // FALLBACK
        priority: 2,
        endpoint: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY!,
        maxTokens: 1024,
        temperature: 0.7,
        timeout: 20000,
        costPerToken: { input: 0.0004, output: 0.0008 },
      },
    },

    basic: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-flash', // PRIMARY for basic tier
      priority: 1,
      // ... (similar structure)
    },

    premium: {
      provider: 'gemini' as const,
      model: 'gemini-1.5-pro', // PRIMARY for premium tier
      priority: 1,
      // ... (similar structure)
    },
  },

  // Task-specific model overrides
  taskModels: {
    sentiment: {
      provider: 'groq' as const,
      model: 'llama-3.3-70b-versatile',
      priority: 1, // PRIMARY for sentiment (fast & cheap)
      maxTokens: 512,
      temperature: 0.3,
    },
  },
};
```

**Effort:** 5 hours

---

**0.3 Create Cache Provider Configuration**
- **File to Create:** `src/lib/config/cache-provider.config.ts`

**Supported Cache Providers:**
1. **Vercel KV** (priority 1) - Upstash Redis managed by Vercel (recommended for Vercel)
2. **Upstash Redis** (priority 1) - Direct Upstash connection (use if not on Vercel)
3. **In-Memory** (priority 3) - Local development only, fallback in emergencies

```typescript
export type CacheProviderType = 'upstash' | 'vercel-kv' | 'memory';

export const CACHE_PROVIDER_CONFIG = {
  type: detectCacheProvider(),

  // Provider credentials
  upstash: {
    priority: 1,
    url: process.env.UPSTASH_REDIS_URL,
    token: process.env.UPSTASH_REDIS_TOKEN,
  },
  vercelKV: {
    priority: 1,
    restUrl: process.env.KV_REST_API_URL,
    restToken: process.env.KV_REST_API_TOKEN,
  },
  memory: {
    priority: 3, // Fallback only
  },

  fallback: 'memory',
};

function detectCacheProvider(): CacheProviderType {
  // Auto-detect based on available credentials
  if (process.env.UPSTASH_REDIS_URL) return 'upstash';
  if (process.env.KV_REST_API_URL) return 'vercel-kv';
  return 'memory';
}
```

**Effort:** 3 hours

---

**0.4 Create Cache TTL Configuration**
- **File to Create:** `src/lib/config/cache-ttl.config.ts`

```typescript
export const CACHE_TTL_CONFIG = {
  quotes: {
    free: 15 * 60 * 1000,    // 15 min
    basic: 10 * 60 * 1000,   // 10 min
    premium: 5 * 60 * 1000,  // 5 min
  },
  commodities: {
    free: 4 * 60 * 60 * 1000,
    basic: 2 * 60 * 60 * 1000,
    premium: 1 * 60 * 60 * 1000,
  },
  // ... other data types
};

export function getCacheTTL(dataType: string, tier: TierName): number {
  return CACHE_TTL_CONFIG[dataType][tier];
}
```

**Effort:** 2 hours

---

**0.5 Create API Key Mapping & Validation**
- **Files to Create:**
  - `src/lib/config/api-keys.config.ts` - API key mapping reference
  - `src/lib/config/validation.ts` - Startup validation

**API Key Mapping:**

```typescript
// src/lib/config/api-keys.config.ts
export const API_KEY_MAPPING = {
  tiingo: {
    envVar: 'TIINGO_API_KEY',
    required: true,
    usage: 'Stock quotes (primary), commodities',
    documentation: 'https://api.tiingo.com/documentation/general/overview',
    freeTier: 'Yes - $0/month (500 req/day)',
    paidTier: 'Power - $10/month (unlimited)',
  },

  gemini: {
    envVar: 'GEMINI_API_KEY',
    required: true,
    usage: 'AI chat, analysis, summaries',
    documentation: 'https://ai.google.dev/gemini-api/docs',
    freeTier: 'Yes - $0/month (60 req/min)',
  },

  groq: {
    envVar: 'GROQ_API_KEY',
    required: false, // Fallback only
    usage: 'AI fallback, sentiment analysis',
    documentation: 'https://console.groq.com/docs',
    freeTier: 'Yes - $0/month (30 req/min)',
  },

  vercelKV: {
    envVars: ['KV_REST_API_URL', 'KV_REST_API_TOKEN'],
    required: false, // Falls back to memory in dev
    usage: 'Vercel KV (Upstash managed by Vercel)',
    documentation: 'https://vercel.com/docs/storage/vercel-kv',
    note: 'Auto-configured in Vercel dashboard',
  },

  upstashRedis: {
    envVars: ['UPSTASH_REDIS_URL', 'UPSTASH_REDIS_TOKEN'],
    required: false,
    usage: 'Direct Upstash Redis connection',
    documentation: 'https://upstash.com/docs/redis',
  },

  yahooFinance: {
    envVar: null,
    required: false,
    usage: 'Quote fallback (internal use only)',
    restrictions: '⚠️ Cannot redistribute data per ToS. Use as fallback only.',
  },
};

export function getMissingRequiredKeys(): string[] {
  const missing: string[] = [];

  for (const [provider, config] of Object.entries(API_KEY_MAPPING)) {
    if (config.required) {
      if (config.envVars) {
        for (const envVar of config.envVars) {
          if (!process.env[envVar]) {
            missing.push(`${envVar} (${provider})`);
          }
        }
      } else if (config.envVar && !process.env[config.envVar]) {
        missing.push(`${config.envVar} (${provider})`);
      }
    }
  }

  return missing;
}
```

**Startup Validation:**

```typescript
// src/lib/config/validation.ts
export function validateConfiguration() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check required API keys
  const missingKeys = getMissingRequiredKeys();
  if (missingKeys.length > 0) {
    errors.push(`Missing required API keys: ${missingKeys.join(', ')}`);
  }

  // 2. Check cache provider
  if (!CACHE_PROVIDER_CONFIG.vercelKV.restUrl && !CACHE_PROVIDER_CONFIG.upstash.url) {
    warnings.push('No Redis cache configured. Using in-memory (not suitable for production)');
  }

  // 3. Production without Redis = ERROR
  if (process.env.NODE_ENV === 'production' && CACHE_PROVIDER_CONFIG.type === 'memory') {
    errors.push('❌ Production requires Redis (Vercel KV or Upstash). In-memory cache will cause 0% hit rate.');
  }

  // 4. Check provider priorities
  const quoteProviders = [PROVIDER_CONFIG.tiingo, PROVIDER_CONFIG.yahooFinance];
  const enabledProviders = quoteProviders.filter(p => p.enabled);
  if (enabledProviders.length === 0) {
    errors.push('No quote providers enabled');
  }

  // Log results
  if (errors.length > 0) {
    console.error('[Config] ❌ Configuration errors:');
    errors.forEach(err => console.error(`  ${err}`));
    throw new Error('Invalid configuration. Fix errors above.');
  }

  if (warnings.length > 0) {
    console.warn('[Config] ⚠️  Configuration warnings:');
    warnings.forEach(warn => console.warn(`  ${warn}`));
  }

  console.log('[Config] ✅ Configuration validated');
  console.log(`[Config] Cache: ${CACHE_PROVIDER_CONFIG.type}`);
  console.log(`[Config] Quote Primary: ${enabledProviders[0]?.name}`);
}

// Call during app startup (Next.js middleware or app initialization)
if (typeof window === 'undefined') {
  validateConfiguration();
}
```

**Effort:** 3 hours

---

**0.6 Documentation**
- **File to Create:** `docs/5_Guides/CONFIGURATION_MANAGEMENT.md`

**Content:**
- How to add new providers
- How to adjust settings via env vars
- Provider priority explanation
- API key setup guide

**Effort:** 2 hours

---

#### Testing Strategy (Phase 0)

**Test Scenarios:**
1. ✅ Startup validation catches missing required keys
2. ✅ Startup validation catches production without Redis
3. ✅ Provider priority sorting (primary before fallback)
4. ✅ Cache provider auto-detection
5. ✅ TTL retrieval by data type and tier
6. ✅ AI model selection by tier

**Files to Create:**
- `src/lib/config/__tests__/validation.test.ts`
- `src/lib/config/__tests__/providers.test.ts`

**Effort:** Already included in task estimates

---

#### Success Metrics (Phase 0)

- ✅ All provider settings centralized (15+ files → 4 config files)
- ✅ No hardcoded timeouts/TTLs in services (0 hardcoded values)
- ✅ Startup validation catches errors (100% of missing keys detected)
- ✅ Adding new provider takes 10 minutes (vs. 2 hours previously)
- ✅ Configuration documented with examples

---

### Phase 1: Foundation (Week 1-1.5) - PRODUCTION BLOCKERS

**Goal:** Replace in-memory cache with Redis, establish security baseline

**Effort:** 42 hours (increased from 40 to include Upstash adapter + usage examples)

#### Tasks

**1.1 Set Up Vercel KV (Redis)**
- **File:** `.env.local`
- **Action:** Add Vercel KV environment variables
  ```bash
  KV_URL=redis://...
  KV_REST_API_URL=https://...
  KV_REST_API_TOKEN=...
  ```
- **Vercel Dashboard:** Enable Vercel KV in project settings
- **Effort:** 1 hour

---

**1.2 Create Cache Adapter Interface**
- **File to Create:** `src/lib/cache/adapter.ts`

**Supported Cache Providers:**

1. **Vercel KV (Recommended for Vercel deployments)**
   - Upstash Redis managed by Vercel
   - Auto-configured through Vercel dashboard
   - HTTP REST API connection
   - Priority: 1 (Primary)

2. **Upstash Redis (Direct connection)**
   - Use if you need control outside Vercel
   - Direct Redis protocol connection
   - Requires separate Upstash account
   - Priority: 1 (Primary)

3. **In-Memory (Development only)**
   - No Redis needed for local development
   - Zero cost
   - Priority: 3 (Fallback only)

**Implementation:**

```typescript
// Cache Adapter Interface
export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  getAge(key: string): Promise<number>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
}

/**
 * Vercel KV Implementation (Upstash managed by Vercel)
 * Uses HTTP REST API
 */
export class VercelKVAdapter implements CacheAdapter {
  private kv: typeof import('@vercel/kv').kv;

  constructor() {
    this.kv = require('@vercel/kv').kv;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.kv.get<T>(key);
    } catch (error) {
      console.error('[VercelKV] Get error:', error);
      return null; // Cache failures should not break the app
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const ttlSeconds = Math.floor(ttl / 1000);
      await this.kv.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      console.error('[VercelKV] Set error:', error);
    }
  }

  // ... other methods
}

/**
 * Upstash Redis Implementation (Direct connection)
 * Uses Redis protocol via @upstash/redis package
 */
export class UpstashRedisAdapter implements CacheAdapter {
  private redis: Redis;

  constructor() {
    const { Redis } = require('@upstash/redis');
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch (error) {
      console.error('[Upstash] Get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const ttlSeconds = Math.floor(ttl / 1000);
      await this.redis.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      console.error('[Upstash] Set error:', error);
    }
  }

  // ... other methods
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

  // ... other methods
}

/**
 * Factory function - uses configuration from Phase 0
 */
export function createCacheAdapter(): CacheAdapter {
  const config = CACHE_PROVIDER_CONFIG; // From Phase 0

  switch (config.type) {
    case 'vercel-kv':
      console.log('[Cache] Using Vercel KV (Upstash managed by Vercel)');
      return new VercelKVAdapter();

    case 'upstash':
      console.log('[Cache] Using Upstash Redis (Direct connection)');
      return new UpstashRedisAdapter();

    case 'memory':
      console.log('[Cache] Using In-Memory cache (Development only)');
      return new InMemoryCacheAdapter();

    default:
      console.warn('[Cache] Unknown provider, falling back to memory');
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

**Dependencies to Install:**

```bash
# For Vercel KV
npm install @vercel/kv

# For direct Upstash (if not using Vercel KV)
npm install @upstash/redis
```

**Usage Examples (How Services Will Use This):**

```typescript
// BEFORE (hardcoded, won't work in production):
import { loadFromCache, saveToCache } from '@lib/utils/serverCache';

class StockDataService {
  async getQuote(symbol: string): Promise<StockQuote> {
    const cached = loadFromCache<StockQuote>(`quote-${symbol}`);
    if (cached) return cached;

    const quote = await this.fetchQuote(symbol);
    saveToCache(`quote-${symbol}`, quote);
    return quote;
  }
}

// AFTER (distributed cache, works in production):
import { getCacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';

class StockDataService {
  private cache = getCacheAdapter();

  async getQuote(symbol: string, userTier: TierName): Promise<StockQuote> {
    const cacheKey = `quote:${symbol}:v1`;

    // Check cache
    const cached = await this.cache.get<StockQuote>(cacheKey);
    if (cached) {
      console.log(`[Stock] Cache hit: ${symbol}`);
      return { ...cached, source: 'cache' };
    }

    console.log(`[Stock] Cache miss: ${symbol}`);

    // Fetch from provider
    const quote = await this.fetchQuote(symbol);

    // Cache with tier-based TTL
    const ttl = getCacheTTL('quotes', userTier);
    await this.cache.set(cacheKey, quote, ttl);

    return quote;
  }
}
```

**Benefits of This Approach:**
- ✅ Pluggable cache providers (switch from Vercel KV to Upstash in 1 line)
- ✅ Graceful degradation (cache errors don't break the app)
- ✅ Development without Redis (in-memory cache for local testing)
- ✅ Production-ready (distributed cache across serverless instances)
- ✅ Tier-based TTLs (free tier: 15min, premium: 5min)

**Effort:** 6 hours (increased from 4 to include Upstash adapter and usage examples)

---

**1.3 Replace serverCache.ts**
- **File to Delete:** `src/lib/utils/serverCache.ts`
- **Files to Modify:** All services using `loadFromCache`, `saveToCache`, `getCacheAge`
  - `src/backend/modules/stocks/service/stock-data.service.ts`
  - `src/backend/modules/stocks/service/market-data.service.ts`
  - `src/backend/modules/stocks/service/financial-data.service.ts`
  - `src/backend/modules/news/service/news.service.ts`
  - `src/backend/modules/ai/service/chat-cache.service.ts`
  - `src/backend/modules/ai/service/generate.service.ts`

- **Migration Strategy:**
  ```typescript
  // Before
  import { loadFromCache, saveToCache } from '@lib/utils/serverCache';
  const cached = loadFromCache<T>(key);
  saveToCache(key, value);

  // After
  import { createCacheAdapter } from '@lib/cache/adapter';
  const cache = createCacheAdapter();
  const cached = await cache.get<T>(key);
  await cache.set(key, value, ttl);
  ```

- **Testing:** Verify cache persistence across deployments
- **Effort:** 8 hours

---

**1.4 Dependency Security Scanning**
- **File to Create:** `.github/dependabot.yml`
  ```yaml
  version: 2
  updates:
    - package-ecosystem: "npm"
      directory: "/"
      schedule:
        interval: "weekly"
      open-pull-requests-limit: 10
  ```

- **Actions:**
  1. Run `npm audit` and fix critical vulnerabilities
  2. Configure Dependabot (GitHub Settings → Security)
  3. Set up Snyk (optional, free tier)
  4. Add `npm audit` to CI/CD pipeline

- **Effort:** 2 hours

---

**1.5 API Key Security Hardening**
- **Actions:**
  1. Move all API keys to Vercel Secrets (not in .env files)
  2. Document key rotation schedule (quarterly)
  3. Add secrets detection to git hooks (truffleHog)
  4. Update .env.example to remove actual keys

- **Files to Modify:**
  - `.env.local.example` - Remove placeholder keys, add instructions
  - `README.md` - Add security section

- **Effort:** 2 hours

---

**1.6 Document Cache Strategy**
- **File to Create:** `docs/5_Guides/CACHE_STRATEGY.md`
- **Content:**
  - L1/L2/L3 cache architecture
  - TTL strategy per data type and tier
  - Cache key naming conventions
  - Cache invalidation strategies
  - Cost analysis (cache hit rates vs. API costs)

- **Effort:** 3 hours

---

#### Testing Strategy (Phase 1)

**Test Scenarios:**
1. ✅ Cache set/get with Vercel KV
2. ✅ Cache expiration (TTL works correctly)
3. ✅ Cache miss → fetch → cache set → cache hit
4. ✅ Concurrent requests to same key (deduplication)
5. ✅ Cache corruption (invalid data) → fallback
6. ✅ Redis connection failure → graceful degradation

**Files to Create:**
- `src/lib/cache/__tests__/adapter.test.ts`

**Effort:** 4 hours

---

#### Deployment Plan (Phase 1)

1. **Deploy to Preview:** Test with preview deployment
2. **Monitor Metrics:** Cache hit rate, response times
3. **Gradual Rollout:** Use feature flag (10% → 50% → 100%)
4. **Rollback Plan:** Revert to in-memory if Redis fails (environment variable toggle)

**Success Metrics:**
- ✅ Cache hit rate > 60%
- ✅ Response time < 500ms (cache hit)
- ✅ Zero cache-related errors
- ✅ Vercel KV usage < $10/month

---

#### Risks & Mitigation (Phase 1)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel KV downtime | High | Graceful degradation to no cache (hit providers directly) |
| Cache key collisions | Medium | Versioned keys (`quote:AAPL:v1`) |
| TTL too short (high costs) | High | Monitor API call volume, adjust TTL per tier |
| TTL too long (stale data) | Medium | User can force refresh, premium tier gets shorter TTL |

---

### Phase 2: Data Source Orchestrator (Week 2-3)

**Goal:** Create centralized orchestrator, eliminate code duplication

**Effort:** 40 hours

#### Tasks

**2.1 Design Orchestrator Architecture**
- **File to Create:** `docs/3_Architecture/DATA_SOURCE_ORCHESTRATOR.md`
- **Content:**
  - Interface definitions
  - Fallback chain execution flow
  - Circuit breaker design
  - Provider health monitoring
  - Request deduplication strategy

- **Effort:** 4 hours

---

**2.2 Implement Core Orchestrator**
- **Files to Create:**
  - `src/lib/data-sources/orchestrator.ts` - Main orchestrator class
  - `src/lib/data-sources/circuit-breaker.ts` - Circuit breaker implementation
  - `src/lib/data-sources/types.ts` - Provider interfaces
  - `src/lib/data-sources/errors.ts` - Custom error types

- **Implementation Details:**
  ```typescript
  // src/lib/data-sources/orchestrator.ts
  export class DataSourceOrchestrator {
    constructor(
      private cache: CacheAdapter,
      private circuitBreakerConfig: CircuitBreakerConfig
    ) {}

    async fetchWithFallback<T>(
      providers: DataProvider<T>[],
      options: FetchOptions
    ): Promise<DataResult<T>> {
      // 1. Check cache
      if (options.cacheKey) {
        const cached = await this.cache.get<T>(options.cacheKey);
        if (cached) {
          return { data: cached, source: 'cache', fromCache: true };
        }
      }

      // 2. Sort providers by priority
      const sortedProviders = providers.sort((a, b) => a.priority - b.priority);

      // 3. Try each provider with circuit breaker
      for (const provider of sortedProviders) {
        const circuitBreaker = this.getCircuitBreaker(provider.name);

        if (circuitBreaker.isOpen()) {
          console.warn(`[Orchestrator] Circuit open for ${provider.name}, skipping`);
          continue;
        }

        try {
          const data = await circuitBreaker.execute(() => provider.fetch());

          // Cache successful result
          if (options.cacheKey && options.cacheTTL) {
            await this.cache.set(options.cacheKey, data, options.cacheTTL);
          }

          return { data, source: provider.name, fromCache: false };
        } catch (error) {
          console.error(`[Orchestrator] Provider ${provider.name} failed:`, error);
          // Continue to next provider
        }
      }

      // 4. All providers failed - try stale cache
      if (options.allowStale && options.cacheKey) {
        const stale = await this.cache.get<T>(options.cacheKey);
        if (stale) {
          return { data: stale, source: 'stale-cache', fromCache: true, isStale: true };
        }
      }

      throw new AllProvidersFailedError('All data providers failed');
    }
  }
  ```

- **Effort:** 12 hours

---

**2.3 Implement Circuit Breaker**
- **File:** `src/lib/data-sources/circuit-breaker.ts`
- **Features:**
  - State machine (CLOSED → OPEN → HALF_OPEN)
  - Failure threshold (e.g., 5 failures → OPEN)
  - Reset timeout (e.g., 60 seconds)
  - Success in HALF_OPEN → CLOSED

- **Effort:** 6 hours

---

**2.4 Refactor StockDataService (Proof of Concept)**
- **File to Modify:** `src/backend/modules/stocks/service/stock-data.service.ts`
- **Before:** 239 lines, manual fallback logic
- **After:** ~100 lines, use orchestrator

- **Changes:**
  ```typescript
  class StockDataService {
    constructor(
      private orchestrator: DataSourceOrchestrator,
      private tiingoDAO: TiingoDAO,
      private yahooFinanceDAO: YahooFinanceDAO
    ) {}

    async getQuote(symbol: string, userTier: TierName): Promise<StockQuote> {
      const result = await this.orchestrator.fetchWithFallback<StockQuote>(
        [
          {
            name: 'tiingo',
            priority: 1,
            fetch: () => this.tiingoDAO.getQuote(symbol),
          },
          {
            name: 'yahooFinance',
            priority: 2,
            fetch: () => this.yahooFinanceDAO.getQuote(symbol),
          }
        ],
        {
          cacheKey: `quote:${symbol}`,
          cacheTTL: this.getCacheTTL(userTier),
          allowStale: true
        }
      );

      return result.data;
    }

    private getCacheTTL(tier: TierName): number {
      const ttls = {
        free: 15 * 60 * 1000,    // 15 minutes
        basic: 10 * 60 * 1000,   // 10 minutes
        premium: 5 * 60 * 1000   // 5 minutes
      };
      return ttls[tier];
    }
  }
  ```

- **Effort:** 8 hours

---

**2.5 Testing**
- **Files to Create:**
  - `src/lib/data-sources/__tests__/orchestrator.test.ts`
  - `src/lib/data-sources/__tests__/circuit-breaker.test.ts`

- **Test Scenarios:**
  1. ✅ Primary provider success → cache → return
  2. ✅ Primary fails → fallback succeeds
  3. ✅ All providers fail → stale cache
  4. ✅ All providers fail + no cache → error
  5. ✅ Circuit breaker opens after failures
  6. ✅ Circuit breaker resets after timeout
  7. ✅ Concurrent requests deduplicated
  8. ✅ Provider health check integration

- **Effort:** 10 hours

---

#### Success Metrics (Phase 2)

- ✅ Code reduction: StockDataService 239 → ~100 lines (-58%)
- ✅ Duplicated fallback logic eliminated
- ✅ Circuit breaker prevents cascading failures
- ✅ All tests passing (>70% coverage)

---

### Phase 3: Data Source Migration & Provider Cleanup (Week 3-4)

**Goal:** Migrate to Tiingo, implement orchestrator, and remove FMP/Finnhub/NewsAPI from codebase

**Effort:** 50 hours

**IMPORTANT:** FMP, Finnhub, and NewsAPI code still exists in the codebase. This phase will:
1. Implement provider orchestrator with Tiingo
2. Migrate services to use orchestrator
3. **Delete FMP, Finnhub, NewsAPI code files** (final cleanup)
4. Remove environment variables and references

#### 3.1 Integrate Tiingo API

**3.1.1 Set Up Tiingo Account**
- Sign up for Tiingo ($10/month plan)
- Get API key
- Add to Vercel Secrets

**Effort:** 1 hour

---

**3.1.2 Create Tiingo DAO**
- **File to Create:** `src/backend/modules/stocks/dao/tiingo.dao.ts`

```typescript
import { BaseDAO } from '@backend/common/dao/base.dao';
import type { StockQuote, BatchQuoteResponse } from '../dto/stock.dto';

export class TiingoDAO extends BaseDAO {
  private apiKey: string;
  private baseUrl = 'https://api.tiingo.com/tiingo';

  constructor() {
    super();
    this.apiKey = process.env.TIINGO_API_KEY!;
  }

  /**
   * Batch fetch quotes for multiple symbols (up to 500)
   */
  async batchGetQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const tickers = symbols.join(',');
    const url = `${this.baseUrl}/daily/${tickers}/prices?token=${this.apiKey}`;

    const response = await this.fetchWithTimeout(url);

    // Transform Tiingo response to our StockQuote format
    const quotes = new Map<string, StockQuote>();

    for (const item of response) {
      quotes.set(item.ticker, {
        symbol: item.ticker,
        price: item.close,
        change: item.close - item.prevClose,
        changePercent: ((item.close - item.prevClose) / item.prevClose * 100).toFixed(2),
        volume: item.volume,
        high: item.high,
        low: item.low,
        open: item.open,
        previousClose: item.prevClose,
        timestamp: new Date(item.date).getTime(),
        source: 'tiingo'
      });
    }

    return quotes;
  }

  /**
   * Get single quote (delegates to batch)
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const quotes = await this.batchGetQuotes([symbol]);
    const quote = quotes.get(symbol);

    if (!quote) {
      throw new Error(`No quote data for ${symbol}`);
    }

    return quote;
  }
}

export const tiingoDAO = new TiingoDAO();
```

**Effort:** 4 hours

---

**3.1.3 Update Yahoo Finance DAO (Fallback Only)**
- **File to Modify:** `src/backend/modules/stocks/dao/yahoo-finance.dao.ts`
- **Changes:**
  - Add rate limiting (max 10 requests/minute)
  - Add short TTL recommendations (5 minutes max)
  - Add warning logs: "Yahoo Finance used as fallback only (not for redistribution)"
  - Document ToS restrictions

**Effort:** 2 hours

---

**3.1.4 Refactor StockDataService to Use Tiingo**
- **File to Modify:** `src/backend/modules/stocks/service/stock-data.service.ts`

```typescript
async getBatchQuotes(
  symbols: string[],
  userTier: TierName
): Promise<BatchQuoteResponse> {
  // Batch fetch with orchestrator
  const result = await this.orchestrator.batchFetch(
    {
      name: 'tiingo',
      priority: 1,
      batchFetch: (symbols) => this.tiingoDAO.batchGetQuotes(symbols),
      maxBatchSize: 500
    },
    symbols,
    {
      cacheKeyPrefix: 'quote',
      cacheTTL: this.getCacheTTL(userTier),
      fallbackProviders: [
        {
          name: 'yahoo',
          fetch: (symbol) => this.yahooFinanceDAO.getQuote(symbol)
        }
      ]
    }
  );

  return {
    quotes: result.data,
    stats: {
      total: symbols.length,
      cached: result.cached,
      fresh: result.fresh,
      errors: result.errors
    }
  };
}
```

**Effort:** 6 hours

---

**3.1.5 Remove Alpha Vantage for Quotes**
- **Files to Modify:**
  - `src/backend/modules/stocks/service/stock-data.service.ts` - Remove AlphaVantageDAO dependency
  - `package.json` - Keep Alpha Vantage for commodities (fallback only)

- **Cost Savings:** Can downgrade to free tier (only using for commodities now)

**Effort:** 2 hours

---

**3.1.6 Remove FMP, Finnhub, NewsAPI Code (FINAL CLEANUP)**

**IMPORTANT:** These providers still exist in the codebase and must be removed during Phase 3.

- **Files to Delete:**
  - `src/backend/modules/stocks/dao/fmp.dao.ts`
  - `src/backend/modules/stocks/service/fmp.service.ts`
  - `src/backend/modules/stocks/dao/finnhub.dao.ts`
  - `src/backend/modules/stocks/service/finnhub.service.ts`
  - `src/backend/modules/news/dao/news.dao.ts` (if NewsAPI-specific)
  - `src/test/fmp.spec.ts`
  - `src/test/finnhub.spec.ts`
  - Any remaining import references

- **Environment Variables to Remove:**
  - `FMP_API_KEY` (from `.env.local.example` and Vercel Secrets)
  - `FINNHUB_API_KEY`
  - `NEWS_API_KEY`

- **Verification Steps:**
  1. Search codebase for `fmpDAO`, `fmpService`, `finnhubDAO`, `newsapi`
  2. Remove all import statements
  3. Remove from service constructors
  4. Update tests that reference these providers
  5. Update `.env.local.example`
  6. Run TypeScript compiler to catch any remaining references

**Effort:** 3 hours

---

#### 3.2 Migrate to RSS News Feeds

**3.2.1 Create RSS Parser Utility**
- **File to Create:** `src/lib/utils/rss-parser.ts`

```typescript
import Parser from 'rss-parser';

export interface RSSArticle {
  title: string;
  link: string;
  pubDate: Date;
  snippet: string;
  source: string;
}

export class RSSFeedParser {
  private parser = new Parser();

  /**
   * Fetch and parse RSS feed
   */
  async fetchFeed(url: string): Promise<RSSArticle[]> {
    const feed = await this.parser.parseURL(url);

    return feed.items.map(item => ({
      title: item.title || '',
      link: item.link || '',
      pubDate: new Date(item.pubDate || Date.now()),
      snippet: this.extractSnippet(item.contentSnippet || item.content || ''),
      source: feed.title || 'RSS Feed'
    }));
  }

  /**
   * Extract first 200 characters as snippet
   */
  private extractSnippet(content: string): string {
    const cleaned = content.replace(/<[^>]*>/g, ''); // Strip HTML
    return cleaned.substring(0, 200) + (cleaned.length > 200 ? '...' : '');
  }

  /**
   * Get Google News RSS for ticker
   */
  getGoogleNewsURL(ticker: string): string {
    const query = encodeURIComponent(`${ticker} stock`);
    return `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  }
}
```

**Dependencies to Add:**
```bash
npm install rss-parser
```

**Effort:** 4 hours

---

**3.2.2 Create RSS News DAO**
- **File to Create:** `src/backend/modules/news/dao/rss-news.dao.ts`

```typescript
import { BaseDAO } from '@backend/common/dao/base.dao';
import { RSSFeedParser, RSSArticle } from '@lib/utils/rss-parser';

export class RSSNewsDAO extends BaseDAO {
  private parser = new RSSFeedParser();

  async getCompanyNews(ticker: string): Promise<RSSArticle[]> {
    const googleNewsUrl = this.parser.getGoogleNewsURL(ticker);
    const articles = await this.parser.fetchFeed(googleNewsUrl);

    return articles.slice(0, 10); // Top 10 articles
  }

  async getIndustryNews(keywords: string[]): Promise<RSSArticle[]> {
    const query = keywords.join(' ');
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}`;
    const articles = await this.parser.fetchFeed(url);

    return articles.slice(0, 10);
  }
}

export const rssNewsDAO = new RSSNewsDAO();
```

**Effort:** 4 hours

---

**3.2.3 Refactor NewsService**
- **File to Modify:** `src/backend/modules/news/service/news.service.ts`

```typescript
async getPortfolioNews(
  portfolioId: string,
  userTier: TierName
): Promise<NewsArticle[]> {
  const portfolio = await portfolioRepository.findById(portfolioId);
  const tickers = portfolio.stocks.map(s => s.ticker);

  // Fetch news for all tickers
  const newsPromises = tickers.map(ticker =>
    this.orchestrator.fetchWithFallback(
      [
        {
          name: 'rss',
          priority: 1,
          fetch: () => this.rssNewsDAO.getCompanyNews(ticker)
        }
      ],
      {
        cacheKey: `news:${ticker}`,
        cacheTTL: 60 * 60 * 1000, // 1 hour
        allowStale: true
      }
    )
  );

  const allNews = await Promise.all(newsPromises);
  const flatNews = allNews.flatMap(r => r.data);

  // AI-powered sentiment analysis (batch)
  const withSentiment = await this.addSentiment(flatNews);

  return withSentiment.sort((a, b) => b.pubDate - a.pubDate).slice(0, 20);
}
```

**Effort:** 8 hours

---

**3.2.4 Final Verification - Provider Cleanup Complete**

**Verification Checklist:**
- [x] All FMP files deleted (grep search returns empty)
- [x] All Finnhub files deleted (grep search returns empty)
- [x] All NewsAPI files deleted (grep search returns empty)
- [x] No import statements remain for these providers
- [x] `package.json` has no unused dependencies
- [x] `.env.local.example` updated
- [x] TypeScript compiles without errors
- [x] All tests pass
- [x] Build succeeds: `npm run build`

**Verification Commands:**
```bash
# Should return NO results after cleanup
grep -r "fmpDAO" src/
grep -r "finnhubDAO" src/
grep -r "newsapi" src/ --ignore-case
grep -r "FMP_API_KEY" .
grep -r "FINNHUB_API_KEY" .
grep -r "NEWS_API_KEY" .

# Should succeed
npm run build
npm test
```

**Effort:** 1 hour

---

#### 3.3 Testing (Phase 3)

**Files to Create:**
- `src/backend/modules/stocks/dao/__tests__/tiingo.dao.test.ts`
- `src/backend/modules/news/dao/__tests__/rss-news.dao.test.ts`
- `src/lib/utils/__tests__/rss-parser.test.ts`

**Test Scenarios:**
1. ✅ Tiingo batch fetch (500 symbols)
2. ✅ Tiingo failure → Yahoo fallback
3. ✅ RSS feed parsing (valid feed)
4. ✅ RSS feed parsing (malformed feed) → error handling
5. ✅ Google News RSS generation
6. ✅ News sentiment analysis (AI batch processing)
7. ✅ Cache hit for news (1 hour TTL)
8. ✅ Stale news returned when RSS unavailable

**Effort:** 12 hours

---

#### Deployment Plan (Phase 3)

**Feature Flag Strategy:**
```typescript
// Feature flag for gradual rollout
const USE_TIINGO = process.env.FEATURE_TIINGO_ENABLED === 'true';
const USE_RSS_NEWS = process.env.FEATURE_RSS_NEWS_ENABLED === 'true';

// Rollout plan:
// Week 3 Day 1-2: 10% of users
// Week 3 Day 3-4: 50% of users
// Week 3 Day 5+: 100% of users
```

**Monitoring:**
- Tiingo API success rate
- Yahoo Finance fallback rate
- RSS feed fetch success rate
- News article count (ensure quality didn't drop)
- User feedback on news freshness

**Rollback Plan:**
- Keep Alpha Vantage/NewsAPI credentials for 2 weeks
- Can revert via feature flag in < 5 minutes

**Effort:** 4 hours

---

### Phase 4: Testing & Hardening (Week 5-6)

**Goal:** Comprehensive testing, error handling, edge cases, resilience testing

**Effort:** 58 hours (increased from 50 to include cache resilience and circuit breaker edge case tests)

#### 4.1 Comprehensive Service Tests

**Files to Create:**
- `src/backend/modules/stocks/service/__tests__/stock-data.service.test.ts`
- `src/backend/modules/stocks/service/__tests__/market-data.service.test.ts`
- `src/backend/modules/stocks/service/__tests__/financial-data.service.test.ts`
- `src/backend/modules/news/service/__tests__/news.service.test.ts`

**Test Coverage Goals:**
- Stock services: 80%
- News service: 70%
- AI services: 70%
- DAOs: 60%

**Test Scenarios (Comprehensive):**

**Cache Scenarios:**
1. ✅ Cache hit → return immediately
2. ✅ Cache miss → fetch → cache → return
3. ✅ Cache expired → fetch → refresh cache
4. ✅ Cache corrupted (invalid JSON) → fetch fresh
5. ✅ Concurrent requests → deduplicated (only 1 API call)

**Provider Scenarios:**
6. ✅ Primary provider success
7. ✅ Primary provider 429 (rate limit) → fallback
8. ✅ Primary provider 500 (server error) → fallback
9. ✅ Primary provider timeout → fallback
10. ✅ Primary provider returns malformed data → validation error → fallback

**Fallback Chain Scenarios:**
11. ✅ Primary fails → Secondary succeeds
12. ✅ Primary + Secondary fail → Stale cache
13. ✅ All fail + No cache → Error response

**Circuit Breaker Scenarios:**
14. ✅ 5 failures → Circuit opens
15. ✅ Circuit open → Skip provider
16. ✅ Circuit half-open → Success → Circuit closes
17. ✅ Circuit half-open → Failure → Circuit opens again

**Batch Operation Scenarios:**
18. ✅ Batch 500 symbols (Tiingo)
19. ✅ Partial batch failure (some symbols succeed, some fail)
20. ✅ Batch timeout → retry individually

**Quota Scenarios:**
21. ✅ User within quota → proceed
22. ✅ User quota exceeded → 403 error
23. ✅ Cached response → No quota consumption

**Rate Limit Scenarios:**
24. ✅ User rate limit (20/min) → 429 error
25. ✅ Provider rate limit → Fallback provider
26. ✅ Rate limit reset → Service resumes

**Edge Cases:**
27. ✅ Symbol not found → 404 error
28. ✅ Invalid symbol format → Validation error
29. ✅ Empty portfolio → Empty news array
30. ✅ Network disconnected → Graceful error

**Cache Resilience Scenarios (NEW):**
31. ✅ Cache provider unavailable at startup → Graceful degradation (app starts, logs warning)
32. ✅ Cache stampede (100 concurrent requests for expired key) → Request deduplication (1 API call)
33. ✅ Partial cache failure (get works, set fails) → Log warning, return data
34. ✅ Cache data corruption (malformed JSON) → Detect, delete corrupted key, fetch fresh
35. ✅ Cache network partition recovery → Fall back to direct API, resume caching when recovered

**Circuit Breaker Edge Cases (NEW):**
36. ✅ Circuit half-open with partial success (50% fail rate) → Policy decision test
37. ✅ Concurrent requests during circuit reset → Single test request in half-open
38. ✅ Circuit breaker reset race condition → Only 1 request tests provider

**UI/UX Fallback Scenarios (NEW):**
39. ✅ Stale cache with warning → Display warning banner to user
40. ✅ All providers failed → Show error message with retry button
41. ✅ Partial batch failure → Show successful data + error banner for failed symbols

**Test Files to Create:**
- `src/lib/cache/__tests__/resilience.test.ts` (scenarios 31-35)
- `src/lib/data-sources/__tests__/circuit-breaker-edge-cases.test.ts` (scenarios 36-38)
- `src/test/integration/fallback-ui.test.ts` (scenarios 39-41)

**Total Test Scenarios:** 41 (was 30, added 11 new)

**Effort:** 38 hours (increased from 30 to include new resilience tests)

---

#### 4.2 Integration Tests

**Files to Create:**
- `src/test/integration/quote-flow.test.ts`
- `src/test/integration/news-flow.test.ts`
- `src/test/integration/cache-orchestrator.test.ts`

**Test Flows:**

**Quote Integration Test:**
```typescript
test('Complete quote flow: API → Service → Cache → UI', async () => {
  // 1. Request quote
  const response = await fetch('/api/quote?symbols=AAPL');
  const data = await response.json();

  // 2. Verify response structure
  expect(data.quotes.AAPL).toBeDefined();
  expect(data.quotes.AAPL.source).toBe('tiingo');

  // 3. Second request should hit cache
  const cachedResponse = await fetch('/api/quote?symbols=AAPL');
  const cachedData = await cachedResponse.json();
  expect(cachedData.quotes.AAPL.source).toBe('cache');

  // 4. Verify cache TTL
  await sleep(15 * 60 * 1000); // Wait for cache expiration
  const freshResponse = await fetch('/api/quote?symbols=AAPL');
  const freshData = await freshResponse.json();
  expect(freshData.quotes.AAPL.source).toBe('tiingo');
});
```

**Effort:** 10 hours

---

#### 4.3 Error Handling Standardization

**File to Create:** `src/lib/errors/standard-errors.ts`

```typescript
export enum ErrorCode {
  // Client errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Provider errors
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  ALL_PROVIDERS_FAILED = 'ALL_PROVIDERS_FAILED',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',

  // System errors
  CACHE_ERROR = 'CACHE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  // Auth errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly message: string,
    public readonly statusCode: number,
    public readonly context?: Record<string, any>,
    public readonly isOperational: boolean = true,
    public readonly requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        context: this.context,
        requestId: this.requestId,
        timestamp: new Date().toISOString()
      }
    };
  }
}

export class ProviderError extends AppError {
  constructor(
    providerName: string,
    message: string,
    originalError?: Error
  ) {
    super(
      ErrorCode.PROVIDER_ERROR,
      `${providerName} error: ${message}`,
      503,
      { provider: providerName, originalError: originalError?.message }
    );
  }
}

export class AllProvidersFailedError extends AppError {
  constructor(attemptedProviders: string[]) {
    super(
      ErrorCode.ALL_PROVIDERS_FAILED,
      'All data providers failed to respond',
      503,
      { attemptedProviders }
    );
  }
}

// ... other error classes
```

**Update All Services:**
- Replace generic `throw new Error()` with typed errors
- Add error context (user ID, request ID, timestamp)
- Consistent error responses

**Effort:** 8 hours

---

#### 4.4 UX During Failures

**Scenarios to Handle:**

**1. Stale Data Display**
- Show data with warning banner: "⚠️ Showing cached data (updated 2 hours ago). Refresh to retry."
- Premium users: Shorter banner timeout (hide after 5 seconds)

**2. Rate Limit UX**
- Show countdown timer: "Rate limit exceeded. Try again in 45 seconds."
- Upgrade prompt for free users: "Upgrade to Premium for higher limits"

**3. Complete Failure**
- Error message: "Unable to load data. Our team has been notified."
- Retry button
- Support link

**4. Partial Failure (Batch)**
- Show successful symbols
- Banner: "Could not load data for 2 symbols (AAPL, TSLA). Try again later."

**File to Modify:** All UI components consuming APIs
- `components/AssetCard.tsx`
- `components/PortfolioHeader.tsx`
- `components/NewsCard.tsx`

**Effort:** 6 hours

---

#### 4.5 Load Testing

**Tool:** Artillery.io

**File to Create:** `artillery-load-test.yml`

```yaml
config:
  target: 'https://your-app.vercel.app'
  phases:
    - duration: 60
      arrivalRate: 10  # 10 requests/second
    - duration: 120
      arrivalRate: 50  # Ramp to 50 req/s
scenarios:
  - name: "Quote API"
    flow:
      - get:
          url: "/api/quote?symbols=AAPL,TSLA,MSFT"
  - name: "News API"
    flow:
      - get:
          url: "/api/news/portfolio/123"
```

**Metrics to Capture:**
- Response time (p50, p95, p99)
- Cache hit rate
- Error rate
- Vercel KV usage

**Success Criteria:**
- p95 response time < 1000ms
- Error rate < 1%
- Cache hit rate > 60%

**Effort:** 4 hours

---

## Deployment & Rollback

### Deployment Checklist

- **Pre-Deployment:**
- [x] All tests passing (unit + integration)
- [x] Code review completed
+ [ ] Environment variables configured in Vercel
  - How to verify locally: run `npm run check:env` (exits non-zero if required keys missing)
  - Vercel CLI verification: `vercel env ls` (to list) and `vercel env add <NAME> <environment>` to add
  - Note: Required keys include `TIINGO_API_KEY` and `GEMINI_API_KEY` (see `src/lib/config/api-keys.config.ts`)
- [x] Vercel KV enabled
- [ ] Feature flags ready
- [ ] Monitoring dashboards created

**Deployment Steps:**
1. Deploy to preview environment
2. Run smoke tests
3. Enable feature flag for 10% of users
4. Monitor for 24 hours
5. Increase to 50% if no issues
6. Monitor for 24 hours
7. Full rollout (100%)

**Post-Deployment:**
- [ ] Monitor cache hit rate (target >60%)
- [ ] Monitor error rate (target <1%)
- [ ] Monitor Vercel KV usage (target <$10/month)
- [ ] Monitor API costs (target <$50/month)
- [ ] User feedback collection

---

### Rollback Plan

**Scenario 1: Vercel KV Failure**
- **Trigger:** Cache errors >5%
- **Action:** Environment variable: `USE_REDIS_CACHE=false`
- **Fallback:** Direct API calls (no cache, higher costs temporarily)
- **Timeline:** < 5 minutes

**Scenario 2: Tiingo API Issues**
- **Trigger:** Tiingo error rate >10%
- **Action:** Feature flag: `USE_TIINGO=false`
- **Fallback:** Alpha Vantage (keep credentials for 2 weeks)
- **Timeline:** < 5 minutes

**Scenario 3: RSS News Quality Issues**
- **Trigger:** User complaints, low article count
- **Action:** Investigate RSS feed sources, add additional feeds
- **Fallback:** Use cached news, improve feed selection
- **Timeline:** < 1 hour (add new feeds)

**Scenario 4: Complete System Failure**
- **Action:** Revert to previous deployment
- **Timeline:** < 10 minutes (Vercel rollback)

---

## Success Metrics

### Technical Metrics

| Metric | Baseline (Current) | Target (After Refactoring) |
|--------|-------------------|---------------------------|
| Cache Hit Rate | 0% (production) | 60-80% |
| API Response Time (p95) | Unknown | <1000ms |
| Error Rate | Unknown | <1% |
| Test Coverage | ~20% | 70% (services) |
| Code Duplication | High | Low (60% reduction) |

### Cost Metrics

| Category | Current (at scale) | After Refactoring | Savings |
|----------|-------------------|-------------------|---------|
| Stock Quotes | $50/month (Alpha Vantage) | $10/month (Tiingo) | -$40/month |
| News | $0 (RSS already implemented) | $0 (RSS) | $0 |
| Cache | $0 (in-memory) | $10/month (Vercel KV) | +$10/month |
| AI Calls | $100/month (no cache) | $20/month (80% cache) | -$80/month |
| **Total** | **$150/month** | **$40/month** | **-$110/month (-73%)** |

**Note:** FMP, NewsAPI, and Finnhub code files still exist in the codebase and will be removed in Phase 3. Documentation reflects the planned state after implementation.

### Business Metrics

| Metric | Target |
|--------|--------|
| Production Ready | Yes (after completion) |
| Security Score | A (dependency scanning, secrets management) |
| Scalability | 0-10K users without architecture changes |
| Legal Compliance | 100% (commercial-safe data sources) |

---

## Risk Assessment

### High Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Vercel KV downtime | Low | High | Graceful degradation (direct API calls) |
| Tiingo API quality issues | Medium | High | Keep Alpha Vantage for 2 weeks, A/B test |
| RSS feed parsing failures | Medium | Medium | Robust error handling, fallback to cache |
| Migration bugs | High | Medium | Comprehensive testing, feature flags, gradual rollout |

### Medium Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Cache key collisions | Low | Medium | Versioned keys, monitoring |
| TTL too short (high costs) | Medium | Medium | Monitor API volume, adjust per tier |
| User complaints on data freshness | Medium | Low | Premium tier gets shorter TTL, force refresh button |

### Low Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Test coverage gaps | Medium | Low | Prioritize critical paths |
| Documentation outdated | High | Low | Update docs as part of each phase |

---

## Future Considerations / Post-MVP Enhancements

The following items are important for a mature, production-scale application with a large user base, but are deferred from the current MVP phase to prioritize core features and architectural soundness.

### 1. Enhanced Observability (Advanced Monitoring & Alerting)
While basic monitoring is included in the MVP, a comprehensive observability strategy will be implemented post-MVP. This includes:
- Detailed metrics collection for all services and external integrations.
- Advanced alerting with fine-grained thresholds, anomaly detection, and robust escalation policies for all critical components (e.g., specific API provider downtimes, performance regressions, security events).
- Centralized logging and tracing for easier debugging and performance analysis.

### 2. Comprehensive Security Audit & Penetration Testing
Beyond dependency scanning and API key management, a full security audit, including external penetration testing or dedicated internal security reviews (SAST/DAST), will be conducted to identify and mitigate more complex vulnerabilities suitable for a mature financial application.

### 3. Regulatory Compliance (Broader Scope)
While data source legal compliance is covered, a thorough review and implementation for broader regulatory compliance (e.g., GDPR/CCPA for user data privacy, financial industry-specific regulations if applicable) will be addressed once the core product is established.

### 4. Data Migration Plan for Existing User Data
If existing user data needs significant restructuring or backfilling from new sources that were not part of the MVP, a detailed data migration strategy will be developed to ensure data integrity and continuity for a growing user base.

### 5. Detailed Performance Monitoring & Optimization
Beyond initial load testing and basic response time monitoring, continuous, in-depth performance monitoring (e.g., serverless cold starts, database query optimization, front-end performance metrics like Web Vitals) will be established to ensure optimal user experience at scale.

### 6. User and Administrator Documentation & Support
Comprehensive user-facing FAQs, help articles, and internal administrator guides will be developed to support a larger user base and an operational team.

### 7. Team Training & Onboarding
As the team grows and the architecture matures, formal training and onboarding processes will be established for new team members to ensure proficiency with new systems and patterns.

---

## Cost-Benefit Analysis


### Investment

| Category | Hours | Cost @ $50/hour |
|----------|-------|----------------|
| Phase 0: Configuration | 20 | $1,000 |
| Phase 1: Foundation | 42 | $2,100 |
| Phase 2: Orchestrator | 40 | $2,000 |
| Phase 3: Migration | 50 | $2,500 |
| Phase 4: Testing & Hardening | 58 | $2,900 |
| **Total** | **210** | **$10,500** |

### Return on Investment

**Year 1:**
- Cost savings: $658/month × 12 = $7,896/year
- Investment: $10,500
- **Net ROI:** -$2,604 (break-even after 16 months)

**Year 2+:**
- Annual savings: $7,896/year
- **ROI:** 88% annually

**Intangible Benefits:**
- ✅ Production-ready (not possible to deploy current version)
- ✅ Better UX (cache hit rate improves response times)
- ✅ Scalability (can handle 0-10K users without changes)
- ✅ Legal compliance (no redistribution risks)
- ✅ Maintainability (60% less code duplication)
- ✅ Security (dependency scanning, secrets management)

---

## Timeline Summary

```
Week 0.5: Configuration System (FOUNDATION)
├─ Day 1: Provider + AI model configs (10h)
├─ Day 2: Cache + TTL configs (5h)
└─ Day 3: API key mapping + validation + docs (5h)

Week 1-1.5: Foundation (Cache + Security)
├─ Day 1-2: Vercel KV setup + Cache adapter (Upstash support) (18h)
├─ Day 3-4: Migrate services to cache adapter (16h)
└─ Day 5: Security scanning + documentation (8h)

Week 2-2.5: Orchestrator
├─ Day 1: Design + documentation (8h)
├─ Day 2-3: Implement orchestrator + circuit breaker (16h)
├─ Day 4: Refactor StockDataService (8h)
└─ Day 5: Testing (8h)

Week 3-3.5: Tiingo Migration
├─ Day 1-2: Tiingo DAO + integration (12h)
├─ Day 3: Update services with priority config (8h)
├─ Day 4-5: Testing + deployment (20h)

Week 4-4.5: RSS News Migration
├─ Day 1-2: RSS parser + DAO (12h)
├─ Day 3: Refactor NewsService (8h)
├─ Day 4-5: Testing + cleanup (20h)

Week 5-6: Testing & Hardening (EXPANDED)
├─ Day 1-2: Comprehensive tests (16h)
├─ Day 3-4: Cache resilience + circuit breaker edge cases (16h) ← NEW
├─ Day 5: Integration tests (8h)
├─ Day 6: Error handling standardization (8h)
├─ Day 7: UI fallback tests (6h) ← NEW
├─ Day 8: Load testing + deployment (4h)
```

**Total:** 6 weeks, 220 hours, $11,000 investment

---

## Next Steps

1. **Review & Approve Plan** (Stakeholders)
2. **Set Up Project Board** (GitHub Projects or Jira)
3. **Create Feature Branches**
   - `feature/cache-refactoring`
   - `feature/data-orchestrator`
   - `feature/tiingo-migration`
   - `feature/rss-news`
4. **Kick Off Phase 1** (Week 1)

---

## Appendix A: Files to Create

**Phase 0:**
- `src/lib/config/types.ts` - Configuration interfaces
- `src/lib/config/providers.config.ts` - Provider settings (Tiingo, Yahoo, etc.)
- `src/lib/config/ai-models.config.ts` - AI model configuration per tier
- `src/lib/config/cache-provider.config.ts` - Cache provider selection
- `src/lib/config/cache-ttl.config.ts` - TTL settings per data type and tier
- `src/lib/config/api-keys.config.ts` - API key mapping reference
- `src/lib/config/validation.ts` - Startup validation
- `src/lib/config/__tests__/validation.test.ts`
- `src/lib/config/__tests__/providers.test.ts`
- `docs/5_Guides/CONFIGURATION_MANAGEMENT.md`

**Phase 1:**
- `src/lib/cache/adapter.ts` (includes UpstashRedisAdapter + usage examples)
- `src/lib/cache/__tests__/adapter.test.ts`
- `docs/5_Guides/CACHE_STRATEGY.md`
- `.github/dependabot.yml`

**Phase 2:**
- `src/lib/data-sources/orchestrator.ts`
- `src/lib/data-sources/circuit-breaker.ts`
- `src/lib/data-sources/types.ts`
- `src/lib/data-sources/errors.ts`
- `src/lib/data-sources/__tests__/orchestrator.test.ts`
- `src/lib/data-sources/__tests__/circuit-breaker.test.ts`
- `docs/3_Architecture/DATA_SOURCE_ORCHESTRATOR.md`

**Phase 3:**
- `src/backend/modules/stocks/dao/tiingo.dao.ts`
- `src/backend/modules/stocks/dao/__tests__/tiingo.dao.test.ts`
- `src/lib/utils/rss-parser.ts`
- `src/lib/utils/__tests__/rss-parser.test.ts`
- `src/backend/modules/news/dao/rss-news.dao.ts`
- `src/backend/modules/news/dao/__tests__/rss-news.dao.test.ts`

**Phase 4:**
- `src/backend/modules/stocks/service/__tests__/stock-data.service.test.ts`
- `src/backend/modules/stocks/service/__tests__/market-data.service.test.ts`
- `src/backend/modules/news/service/__tests__/news.service.test.ts`
- `src/test/integration/quote-flow.test.ts`
- `src/test/integration/news-flow.test.ts`
- `src/lib/cache/__tests__/resilience.test.ts` - NEW (cache resilience tests)
- `src/lib/data-sources/__tests__/circuit-breaker-edge-cases.test.ts` - NEW
- `src/test/integration/fallback-ui.test.ts` - NEW (UI fallback scenarios)
- `src/lib/errors/standard-errors.ts`
- `artillery-load-test.yml`

**Total:** 41 new files (was 28, added 13 from Phase 0 + 3 new test files)

---

## Appendix B: Dependencies to Add

```bash
# Cache Providers (choose one or both)
npm install @vercel/kv          # For Vercel KV (Upstash managed by Vercel)
npm install @upstash/redis      # For direct Upstash connection

# RSS News
npm install rss-parser

# Testing
npm install -D artillery  # Load testing
```

---

## Appendix C: Dependencies to Remove (After Migration)

```bash
# After confirming Tiingo works well
npm uninstall @alpha-vantage/api  # If exists

# After RSS news migration
# (Keep packages if used elsewhere, just remove from services)
```

---

## Appendix D: Environment Variables

**To Add:**
```bash
# Cache Provider (choose ONE option)
# Option 1: Vercel KV (Upstash managed by Vercel - recommended for Vercel deployments)
KV_REST_API_URL=
KV_REST_API_TOKEN=

# Option 2: Direct Upstash Redis (use if not on Vercel or want more control)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Note: App auto-detects which cache provider to use based on available credentials
# In development without Redis: automatically falls back to in-memory cache

# Data Providers
TIINGO_API_KEY=              # Required (Phase 3+)
GEMINI_API_KEY=              # Required (AI primary)
GROQ_API_KEY=                # Optional (AI fallback)
ALPHAVANTAGE_API_KEY=        # Optional (commodities fallback)

# Feature Flags (gradual rollout)
FEATURE_TIINGO_ENABLED=false
FEATURE_RSS_NEWS_ENABLED=false
USE_REDIS_CACHE=true         # Emergency rollback toggle
```

**To Keep (Fallback):**
```bash
# Keep for 2 weeks after migration
ALPHAVANTAGE_API_KEY=  # For commodities fallback
```

**Removed (No longer needed):**
```bash
# These have been removed from the codebase
FMP_API_KEY=
NEWS_API_KEY=
FINNHUB_API_KEY=
```

---

**END OF PLAN**

This plan is ready for implementation. Each phase has clear deliverables, effort estimates, testing strategies, and rollback plans.
