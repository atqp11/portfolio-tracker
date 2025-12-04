# L2 Cache Implementation Review & L3 Database Cache Plan

**Date:** 2025-12-03
**Status:** L2 ✅ Implemented | L3 📋 Planning

---

## L2: Server-Side Distributed Cache - Implementation Review

### ✅ IMPLEMENTED CORRECTLY

#### 1. Cache Adapter Interface ✅
**File:** `src/lib/cache/adapter.ts`

**Status:** ✅ **FULLY COMPLIANT** with PRODUCTION_READINESS_PLAN.md

**Features Implemented:**
- ✅ Vercel KV adapter (production)
- ✅ Upstash Redis adapter (alternative)
- ✅ In-memory adapter (development)
- ✅ Auto-detection from Phase 0 config
- ✅ Graceful degradation (cache failures don't break app)
- ✅ Stats tracking (hits/misses)
- ✅ Pattern-based clearing (`quote:*`)
- ✅ Age tracking for cache entries
- ✅ Singleton factory pattern

**Excellent Implementation Details:**
```typescript
// ✅ Metadata storage for age tracking
const entry = {
  value,
  timestamp: Date.now(),
};
await client.set(key, entry, { ex: ttlSeconds });

// ✅ Proper error handling
try {
  return await this.kv.get<T>(key);
} catch (error) {
  console.error('[VercelKV] Get error:', error);
  return null; // Graceful degradation
}
```

---

#### 2. Versioned Cache Keys ✅

**Status:** ✅ **FULLY IMPLEMENTED** per spec

**Services Using Versioned Keys:**

| Service | Cache Key Pattern | Example | Status |
|---------|------------------|---------|--------|
| Stock Data | `quote:{symbol}:v1` | `quote:AAPL:v1` | ✅ |
| Financial Data | `fundamentals:{symbol}:v1` | `fundamentals:TSLA:v1` | ✅ |
| Market Data | `commodity:{symbol}:v1` | `commodity:WTI:v1` | ✅ |
| News Service | `company-news:{symbol}:v1` | `company-news:AAPL:v1` | ✅ |
| News Service | `market-news:{query}:v1` | `market-news:tech:v1` | ✅ |
| News Service | `trending-news:{sectors}:v1` | `trending-news:energy-mining:v1` | ✅ |
| AI Service | `ai:{hash}:v1` | `ai:sha256(...):v1` | ✅ |

**Version Strategy:**
- ✅ All keys include `:v1` suffix
- ✅ Easy invalidation by bumping version (v1 → v2)
- ✅ Prevents cache collisions across schema changes

**Evidence from Code:**
```typescript
// src/backend/modules/stocks/service/stock-data.service.ts:71
const cacheKey = `quote:${symbol}:v1`;

// src/backend/modules/stocks/service/financial-data.service.ts:126
const cacheKey = `fundamentals:${symbol}:v1`;

// src/backend/modules/news/service/news.service.ts:79
const cacheKey = `company-news:${symbol}:v1`;
```

---

#### 3. Service Integration ✅

**Status:** ✅ **ALL SERVICES MIGRATED**

**Migrated Services (5/5):**

1. ✅ **StockDataService** (`stock-data.service.ts`)
   - Uses `getCacheAdapter()`
   - Implements tier-based TTL
   - Cache key: `quote:{symbol}:v1`

2. ✅ **MarketDataService** (`market-data.service.ts`)
   - Uses `getCacheAdapter()`
   - Cache key: `commodity:{symbol}:v1`

3. ✅ **FinancialDataService** (`financial-data.service.ts`)
   - Uses `getCacheAdapter()`
   - Cache key: `fundamentals:{symbol}:v1`

4. ✅ **NewsService** (`news.service.ts`)
   - Uses `getCacheAdapter()`
   - Three cache key types:
     - `company-news:{symbol}:v1`
     - `market-news:{query}:v1`
     - `trending-news:{sectors}:v1`

5. ✅ **GenerateService** (AI) (`generate.service.ts`)
   - Uses `getCacheAdapter()`
   - Cache key: `ai:{hash}:v1`

**Pattern Consistency:**
```typescript
// All services follow this pattern:
export class SomeService {
  private readonly cache: CacheAdapter;

  constructor() {
    this.cache = getCacheAdapter(); // ✅ Singleton factory
  }

  async someMethod(param: string) {
    const cacheKey = `data-type:${param}:v1`; // ✅ Versioned key

    // ✅ Check cache first
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) return { ...cached, source: 'cache' };

    // ✅ Fetch fresh data
    const fresh = await fetchFromProvider();

    // ✅ Store in cache
    await this.cache.set(cacheKey, fresh, ttl);
    return fresh;
  }
}
```

---

#### 4. Tier-Based TTL ✅

**Status:** ✅ **IMPLEMENTED** via `cache-ttl.config.ts`

**Implementation:**
```typescript
// src/lib/config/cache-ttl.config.ts
export const CACHE_TTL_CONFIG = {
  quotes: {
    free: 15 * 60 * 1000,    // 15 minutes
    basic: 10 * 60 * 1000,   // 10 minutes  
    premium: 5 * 60 * 1000   // 5 minutes
  },
  commodities: {
    free: 4 * 60 * 60 * 1000,  // 4 hours
    basic: 2 * 60 * 60 * 1000, // 2 hours
    premium: 1 * 60 * 60 * 1000 // 1 hour
  },
  fundamentals: {
    free: 7 * 24 * 60 * 60 * 1000,   // 7 days (all tiers)
    basic: 7 * 24 * 60 * 60 * 1000,
    premium: 7 * 24 * 60 * 60 * 1000
  }
};
```

**Matches Plan Specification:** ✅ 100% match

| Data Type | Free | Basic | Premium | Plan Match |
|-----------|------|-------|---------|------------|
| Stock Quotes | 15 min | 10 min | 5 min | ✅ |
| Commodities | 4 hours | 2 hours | 1 hour | ✅ |
| Fundamentals | 7 days | 7 days | 7 days | ✅ |

---

#### 5. Tests ✅

**Status:** ✅ **COMPREHENSIVE TEST SUITE**

**File:** `src/lib/cache/__tests__/adapter.test.ts`

**Coverage:**
- ✅ Basic get/set operations
- ✅ TTL expiration
- ✅ Null handling
- ✅ Object serialization
- ✅ Pattern-based clearing (`quote:*`)
- ✅ Version-based clearing (`fundamentals:*:v1`)
- ✅ Wildcard patterns

**Test Quality:** Excellent - covers edge cases

---

### ❌ MISSING (Per Plan)

#### 1. ⚠️ L1 Client-Side Cache (AI Responses)
**Status:** Already implemented in `src/lib/utils/aiCache.ts` ✅
**No action needed** - This is mentioned in plan as "Keep as-is"

#### 2. ✅ Cache Strategy Documentation
**Status:** ✅ **DOCUMENTED** in `docs/5_Guides/CONFIGURATION_MANAGEMENT.md`
**Includes:**
- Cache architecture (L1, L2, L3)
- Provider setup (Vercel KV, Upstash)
- TTL configuration by data type and tier
- Cache key format and versioning
- Usage examples
- Cost analysis

#### 3. ⚠️ Architecture Documentation Update
**Status:** Not yet updated
**Action:** Update `docs/3_Architecture/TECHNICAL_ARCHITECTURE_OVERVIEW.md` with cache section

---

## Summary: L2 Implementation Compliance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Cache adapter interface | ✅ 100% | Excellent implementation |
| Vercel KV support | ✅ 100% | Production-ready |
| Upstash Redis support | ✅ 100% | Alternative provider |
| In-memory fallback | ✅ 100% | Development only |
| Versioned cache keys | ✅ 100% | All services using `:v1` |
| Service migration (5/5) | ✅ 100% | All services migrated |
| Tier-based TTL | ✅ 100% | Config-driven |
| Tests | ✅ 100% | Comprehensive coverage |
| Cache strategy docs | ✅ 100% | In CONFIGURATION_MANAGEMENT.md |
| Architecture docs | ❌ 0% | **TODO** |

**Overall: 90% Complete** (9/10 requirements)

**Blocking Issues:** None - L2 is production-ready
**Nice-to-Have:** Documentation updates

---

---

# L3: Database Persistent Cache - Implementation Plan

## Overview

**Purpose:** Long-term persistent storage for expensive-to-compute data
**Technology:** Supabase PostgreSQL
**Timeline:** Week 5-6 (after Phase 1-4 complete)
**Cost:** $0 (within Supabase free tier for MVP)

---

## Why L3 Cache?

### Problem: Expensive Operations Need Long-Term Caching

| Operation | Cost | Frequency | Current Solution | Issue |
|-----------|------|-----------|------------------|-------|
| AI Filing Summary | $0.10-0.50 | Quarterly | None | Re-compute every time |
| AI Sentiment Analysis | $0.05-0.10 | Daily | None | Expensive batch job |
| Company Profile Aggregation | 3-5 API calls | On-demand | Redis (30 days) | Lost on Redis eviction |
| Historical News Sentiment | Batch processed | Daily | None | No storage |

### Solution: PostgreSQL as L3 Cache

**Benefits:**
- ✅ Persistent (not lost on eviction)
- ✅ Queryable (SQL for analytics)
- ✅ Cost-effective ($0 for free tier, $25/month for 8GB)
- ✅ Already using Supabase for auth/data

---

## L3 Architecture

### Cache Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│ L1: Client-Side (localStorage/IndexedDB)                    │
│ - AI responses                                               │
│ - TTL: 15 minutes                                            │
└─────────────────────────────────────────────────────────────┘
                          ↓ miss
┌─────────────────────────────────────────────────────────────┐
│ L2: Server-Side Distributed (Redis)                         │
│ - Quotes, fundamentals, news                                 │
│ - TTL: 5min - 7 days (tier-based)                           │
└─────────────────────────────────────────────────────────────┘
                          ↓ miss
┌─────────────────────────────────────────────────────────────┐
│ L3: Database Persistent (PostgreSQL)                         │
│ - AI summaries, company profiles, sentiment history          │
│ - TTL: 30 days - 1 year (or manual invalidation)            │
└─────────────────────────────────────────────────────────────┘
                          ↓ miss
┌─────────────────────────────────────────────────────────────┐
│ External API (Alpha Vantage, SEC EDGAR, AI providers)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table 1: SEC Filing Summaries

**Purpose:** Cache AI-generated summaries of SEC filings (expensive to regenerate)

```sql
CREATE TABLE cache_filing_summaries (
  -- Primary Key
  ticker VARCHAR(10) NOT NULL,
  filing_type VARCHAR(20) NOT NULL,  -- '10-K', '10-Q', '8-K', etc.
  filing_date DATE NOT NULL,
  
  -- Summary Data
  summary_text TEXT NOT NULL,        -- AI-generated summary
  key_points JSONB,                  -- ["Revenue up 20%", "Expanding to Asia"]
  sentiment_score DECIMAL(3,2),      -- -1.0 to 1.0
  
  -- Metadata
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(50),          -- 'gemini-1.5-flash', 'groq-llama3'
  data_version INTEGER NOT NULL DEFAULT 1,
  
  -- Cache Control
  expires_at TIMESTAMP,              -- Optional expiration (default: 1 year)
  
  PRIMARY KEY (ticker, filing_type, filing_date)
);

-- Index for recent summaries
CREATE INDEX idx_filing_summaries_ticker_date 
  ON cache_filing_summaries(ticker, filing_date DESC);

-- Index for expiration cleanup
CREATE INDEX idx_filing_summaries_expires 
  ON cache_filing_summaries(expires_at) 
  WHERE expires_at IS NOT NULL;
```

**Usage Example:**
```typescript
// Check L3 cache first
const summary = await supabase
  .from('cache_filing_summaries')
  .select('*')
  .eq('ticker', 'AAPL')
  .eq('filing_type', '10-K')
  .eq('filing_date', '2024-09-30')
  .single();

if (summary) {
  return summary; // L3 hit
}

// L3 miss - generate summary with AI
const fresh = await generateFilingSummary(ticker, filingType, filingDate);

// Store in L3
await supabase
  .from('cache_filing_summaries')
  .insert({
    ticker,
    filing_type: filingType,
    filing_date: filingDate,
    summary_text: fresh.summary,
    key_points: fresh.keyPoints,
    sentiment_score: fresh.sentiment,
    generated_by: 'gemini-1.5-flash',
    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
  });
```

**Cost Savings:**
- AI summary generation: $0.10 per filing
- 500 companies × 4 filings/year = 2000 filings
- Without L3: $200/year (regenerate on every request)
- With L3: $200 one-time + storage ($0)
- **Savings: $200/year after first year**

---

### Table 2: Company Profiles

**Purpose:** Aggregated company data from multiple sources (3-5 API calls)

```sql
CREATE TABLE cache_company_profiles (
  -- Primary Key
  ticker VARCHAR(10) PRIMARY KEY,
  
  -- Profile Data (JSONB for flexibility)
  profile_data JSONB NOT NULL,
  /*
  {
    "name": "Apple Inc.",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "description": "...",
    "headquarters": "Cupertino, CA",
    "website": "https://apple.com",
    "employees": 164000,
    "founded": 1976,
    "ceo": "Tim Cook",
    "market_cap": 3000000000000,
    "sources": ["fmp", "sec_edgar", "yahoo_finance"]
  }
  */
  
  -- Cache Control
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  data_version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,
  
  -- Metadata
  source_count INTEGER NOT NULL,     -- How many sources aggregated
  last_verified TIMESTAMP
);

-- Index for expiration cleanup
CREATE INDEX idx_company_profiles_expires 
  ON cache_company_profiles(expires_at);
```

**TTL Strategy:**
- Established companies (S&P 500): 90 days
- Mid-cap: 30 days
- Small-cap/new: 7 days

**Usage Example:**
```typescript
// Check L3 cache
const profile = await supabase
  .from('cache_company_profiles')
  .select('profile_data')
  .eq('ticker', 'AAPL')
  .gt('expires_at', new Date().toISOString())
  .single();

if (profile) {
  return profile.profile_data; // L3 hit
}

// L3 miss - aggregate from multiple sources
const fresh = await aggregateCompanyProfile(ticker);

// Store in L3
await supabase
  .from('cache_company_profiles')
  .upsert({
    ticker,
    profile_data: fresh,
    source_count: fresh.sources.length,
    expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    last_verified: new Date()
  });
```

**Cost Savings:**
- Aggregation: 3-5 API calls per company
- 500 companies × 5 API calls = 2500 calls
- Without L3: 2500 calls every request
- With L3 (90-day TTL): 2500 calls / 90 days = 28 calls/day
- **Savings: 96% reduction in API calls**

---

### Table 3: Historical News Sentiment

**Purpose:** Store batch-processed news sentiment (expensive to reprocess)

```sql
CREATE TABLE cache_news_sentiment (
  -- Primary Key
  id SERIAL PRIMARY KEY,
  
  -- News Identification
  ticker VARCHAR(10) NOT NULL,
  news_date DATE NOT NULL,
  news_url TEXT,
  news_title TEXT NOT NULL,
  
  -- Sentiment Data
  sentiment_score DECIMAL(3,2) NOT NULL,  -- -1.0 to 1.0
  sentiment_label VARCHAR(20) NOT NULL,    -- 'positive', 'negative', 'neutral'
  confidence DECIMAL(3,2),                 -- 0.0 to 1.0
  
  -- Summary
  ai_summary TEXT,
  key_topics JSONB,                        -- ["earnings", "product_launch"]
  
  -- Metadata
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_by VARCHAR(50),                -- 'gemini-1.5-flash'
  data_version INTEGER NOT NULL DEFAULT 1
);

-- Index for ticker + date queries
CREATE INDEX idx_news_sentiment_ticker_date 
  ON cache_news_sentiment(ticker, news_date DESC);

-- Index for sentiment analysis
CREATE INDEX idx_news_sentiment_score 
  ON cache_news_sentiment(ticker, sentiment_score, news_date);

-- Unique constraint (prevent duplicate processing)
CREATE UNIQUE INDEX idx_news_sentiment_unique 
  ON cache_news_sentiment(ticker, news_date, news_url);
```

**Usage Example:**
```typescript
// Get sentiment history for a ticker
const sentimentHistory = await supabase
  .from('cache_news_sentiment')
  .select('*')
  .eq('ticker', 'AAPL')
  .gte('news_date', '2024-01-01')
  .order('news_date', { ascending: false });

// Calculate 30-day sentiment average
const avg = sentimentHistory.reduce((sum, s) => sum + s.sentiment_score, 0) 
  / sentimentHistory.length;
```

**Cost Savings:**
- AI sentiment analysis: $0.05 per article
- 500 companies × 10 articles/day = 5000 articles/day
- Process once, query many times
- **Savings: $250/day in re-processing costs**

---

## Implementation Plan

### Phase 1: Database Setup (2 hours)

**Tasks:**
1. Create migration files
2. Run migrations in Supabase
3. Set up Row Level Security (RLS)

**Migration File:** `prisma/migrations/20241203_l3_cache/migration.sql`

```sql
-- L3 Cache Tables
-- Run in Supabase SQL Editor or via migration

-- 1. Filing Summaries
CREATE TABLE cache_filing_summaries (
  ticker VARCHAR(10) NOT NULL,
  filing_type VARCHAR(20) NOT NULL,
  filing_date DATE NOT NULL,
  summary_text TEXT NOT NULL,
  key_points JSONB,
  sentiment_score DECIMAL(3,2),
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  generated_by VARCHAR(50),
  data_version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP,
  PRIMARY KEY (ticker, filing_type, filing_date)
);

CREATE INDEX idx_filing_summaries_ticker_date 
  ON cache_filing_summaries(ticker, filing_date DESC);

CREATE INDEX idx_filing_summaries_expires 
  ON cache_filing_summaries(expires_at) 
  WHERE expires_at IS NOT NULL;

-- 2. Company Profiles
CREATE TABLE cache_company_profiles (
  ticker VARCHAR(10) PRIMARY KEY,
  profile_data JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  data_version INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMP NOT NULL,
  source_count INTEGER NOT NULL,
  last_verified TIMESTAMP
);

CREATE INDEX idx_company_profiles_expires 
  ON cache_company_profiles(expires_at);

-- 3. News Sentiment
CREATE TABLE cache_news_sentiment (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  news_date DATE NOT NULL,
  news_url TEXT,
  news_title TEXT NOT NULL,
  sentiment_score DECIMAL(3,2) NOT NULL,
  sentiment_label VARCHAR(20) NOT NULL,
  confidence DECIMAL(3,2),
  ai_summary TEXT,
  key_topics JSONB,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_by VARCHAR(50),
  data_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_news_sentiment_ticker_date 
  ON cache_news_sentiment(ticker, news_date DESC);

CREATE INDEX idx_news_sentiment_score 
  ON cache_news_sentiment(ticker, sentiment_score, news_date);

CREATE UNIQUE INDEX idx_news_sentiment_unique 
  ON cache_news_sentiment(ticker, news_date, news_url);

-- Row Level Security (RLS)
-- All cache tables are read by service role, no user access
ALTER TABLE cache_filing_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_news_sentiment ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for backend)
CREATE POLICY "Service role full access on filing summaries"
  ON cache_filing_summaries
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on company profiles"
  ON cache_company_profiles
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on news sentiment"
  ON cache_news_sentiment
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

---

### Phase 2: Adapter Implementation (4 hours)

**File:** `src/lib/cache/database-cache.adapter.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FilingSummaryCache {
  ticker: string;
  filing_type: string;
  filing_date: string;
  summary_text: string;
  key_points?: string[];
  sentiment_score?: number;
  generated_at: string;
  generated_by?: string;
  data_version: number;
  expires_at?: string;
}

export interface CompanyProfileCache {
  ticker: string;
  profile_data: Record<string, any>;
  updated_at: string;
  data_version: number;
  expires_at: string;
  source_count: number;
  last_verified?: string;
}

export interface NewsSentimentCache {
  id?: number;
  ticker: string;
  news_date: string;
  news_url?: string;
  news_title: string;
  sentiment_score: number;
  sentiment_label: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  ai_summary?: string;
  key_topics?: string[];
  processed_at: string;
  processed_by?: string;
  data_version: number;
}

// ============================================================================
// DATABASE CACHE ADAPTER
// ============================================================================

export class DatabaseCacheAdapter {
  private supabase: ReturnType<typeof createClient>;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for backend
    );
  }

  // ============================================================================
  // FILING SUMMARIES
  // ============================================================================

  async getFilingSummary(
    ticker: string,
    filingType: string,
    filingDate: string
  ): Promise<FilingSummaryCache | null> {
    const { data, error } = await this.supabase
      .from('cache_filing_summaries')
      .select('*')
      .eq('ticker', ticker)
      .eq('filing_type', filingType)
      .eq('filing_date', filingDate)
      .single();

    if (error) {
      console.error('[DatabaseCache] Filing summary fetch error:', error);
      return null;
    }

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      console.log(`[DatabaseCache] Filing summary expired: ${ticker} ${filingType}`);
      return null;
    }

    console.log(`[DatabaseCache] Filing summary hit: ${ticker} ${filingType}`);
    return data;
  }

  async setFilingSummary(summary: FilingSummaryCache): Promise<void> {
    const { error } = await this.supabase
      .from('cache_filing_summaries')
      .upsert(summary);

    if (error) {
      console.error('[DatabaseCache] Filing summary set error:', error);
    } else {
      console.log(`[DatabaseCache] Cached filing summary: ${summary.ticker} ${summary.filing_type}`);
    }
  }

  // ============================================================================
  // COMPANY PROFILES
  // ============================================================================

  async getCompanyProfile(ticker: string): Promise<CompanyProfileCache | null> {
    const { data, error } = await this.supabase
      .from('cache_company_profiles')
      .select('*')
      .eq('ticker', ticker)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.error('[DatabaseCache] Company profile fetch error:', error);
      return null;
    }

    console.log(`[DatabaseCache] Company profile hit: ${ticker}`);
    return data;
  }

  async setCompanyProfile(profile: CompanyProfileCache): Promise<void> {
    const { error } = await this.supabase
      .from('cache_company_profiles')
      .upsert(profile);

    if (error) {
      console.error('[DatabaseCache] Company profile set error:', error);
    } else {
      console.log(`[DatabaseCache] Cached company profile: ${profile.ticker}`);
    }
  }

  // ============================================================================
  // NEWS SENTIMENT
  // ============================================================================

  async getNewsSentiment(
    ticker: string,
    startDate?: string,
    endDate?: string
  ): Promise<NewsSentimentCache[]> {
    let query = this.supabase
      .from('cache_news_sentiment')
      .select('*')
      .eq('ticker', ticker)
      .order('news_date', { ascending: false });

    if (startDate) {
      query = query.gte('news_date', startDate);
    }

    if (endDate) {
      query = query.lte('news_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[DatabaseCache] News sentiment fetch error:', error);
      return [];
    }

    console.log(`[DatabaseCache] News sentiment hit: ${ticker} (${data.length} records)`);
    return data;
  }

  async setNewsSentiment(sentiment: NewsSentimentCache): Promise<void> {
    const { error } = await this.supabase
      .from('cache_news_sentiment')
      .insert(sentiment);

    if (error) {
      console.error('[DatabaseCache] News sentiment set error:', error);
    } else {
      console.log(`[DatabaseCache] Cached news sentiment: ${sentiment.ticker} ${sentiment.news_date}`);
    }
  }

  async bulkSetNewsSentiment(sentiments: NewsSentimentCache[]): Promise<void> {
    const { error } = await this.supabase
      .from('cache_news_sentiment')
      .insert(sentiments);

    if (error) {
      console.error('[DatabaseCache] Bulk news sentiment set error:', error);
    } else {
      console.log(`[DatabaseCache] Cached ${sentiments.length} news sentiments`);
    }
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  async cleanupExpiredData(): Promise<void> {
    const now = new Date().toISOString();

    // Cleanup filing summaries
    const { error: filingsError } = await this.supabase
      .from('cache_filing_summaries')
      .delete()
      .lt('expires_at', now);

    if (filingsError) {
      console.error('[DatabaseCache] Filing summaries cleanup error:', filingsError);
    }

    // Cleanup company profiles
    const { error: profilesError } = await this.supabase
      .from('cache_company_profiles')
      .delete()
      .lt('expires_at', now);

    if (profilesError) {
      console.error('[DatabaseCache] Company profiles cleanup error:', profilesError);
    }

    console.log('[DatabaseCache] Expired data cleanup complete');
  }
}

// Singleton instance
let dbCacheInstance: DatabaseCacheAdapter | null = null;

export function getDatabaseCache(): DatabaseCacheAdapter {
  if (!dbCacheInstance) {
    dbCacheInstance = new DatabaseCacheAdapter();
  }
  return dbCacheInstance;
}
```

---

### Phase 3: Service Integration (4 hours)

**Example:** SEC Filing Service with L3 Cache

**File:** `src/backend/modules/stocks/service/sec-filing.service.ts`

```typescript
import { getDatabaseCache } from '@lib/cache/database-cache.adapter';
import { generateFilingSummary } from '@backend/modules/ai/service/filing-summary.service';

export class SECFilingService {
  private dbCache = getDatabaseCache();

  async getFilingSummary(ticker: string, filingType: string, filingDate: string) {
    // 1. Check L3 (Database)
    const cached = await this.dbCache.getFilingSummary(ticker, filingType, filingDate);
    if (cached) {
      return {
        ...cached,
        source: 'database-cache'
      };
    }

    // 2. L3 miss - Generate with AI (expensive!)
    console.log(`[SECFiling] Generating summary for ${ticker} ${filingType} (expensive)`);
    const summary = await generateFilingSummary(ticker, filingType, filingDate);

    // 3. Store in L3 (1 year TTL)
    await this.dbCache.setFilingSummary({
      ticker,
      filing_type: filingType,
      filing_date: filingDate,
      summary_text: summary.text,
      key_points: summary.keyPoints,
      sentiment_score: summary.sentiment,
      generated_by: summary.model,
      data_version: 1,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    });

    return {
      ...summary,
      source: 'ai-generated'
    };
  }
}
```

---

### Phase 4: Monitoring & Cleanup (2 hours)

**Cleanup Cron Job:** `app/api/tasks/cleanup-cache/route.ts`

```typescript
import { getDatabaseCache } from '@lib/cache/database-cache.adapter';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const dbCache = getDatabaseCache();
  await dbCache.cleanupExpiredData();

  return Response.json({ success: true, timestamp: new Date().toISOString() });
}
```

**Vercel Cron:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/tasks/cleanup-cache",
      "schedule": "0 3 * * *"
    }
  ]
}
```

---

## Cost Analysis

### Storage Costs

**Supabase Free Tier:** 500 MB
**Pro Tier:** $25/month for 8 GB

**Estimated Storage:**

| Table | Rows | Size/Row | Total Size |
|-------|------|----------|------------|
| Filing Summaries | 2,000 | 5 KB | 10 MB |
| Company Profiles | 500 | 10 KB | 5 MB |
| News Sentiment | 50,000 | 2 KB | 100 MB |
| **Total** | | | **115 MB** |

**Conclusion:** Fits in free tier ✅

---

### Cost Savings

| Operation | Without L3 | With L3 | Savings |
|-----------|------------|---------|---------|
| Filing summaries | $200/year | $200 one-time | $200/year after year 1 |
| Company profiles | 2500 API calls/request | 28 calls/day | 96% reduction |
| News sentiment | $250/day re-processing | $0 (query cache) | $91,250/year |
| **Total Annual Savings** | | | **$91,450+** |

**ROI:** 12 hours implementation = **$7,621/hour value** 🚀

---

## Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Database setup | 2 hours | Migrations, RLS, indexes |
| Adapter implementation | 4 hours | `database-cache.adapter.ts` |
| Service integration | 4 hours | Update 3 services |
| Monitoring & cleanup | 2 hours | Cron jobs, logging |
| **Total** | **12 hours** | |

---

## Success Criteria

- [ ] 3 cache tables created in Supabase
- [ ] RLS policies configured
- [ ] `DatabaseCacheAdapter` implemented
- [ ] 3 services integrated (SEC, company, news)
- [ ] Cleanup cron job deployed
- [ ] Tests passing
- [ ] Documentation updated

---

## Next Steps

1. **Week 5:** Implement L3 after Phase 1-4 complete
2. **Week 6:** Monitor cache hit rates and cost savings
3. **Future:** Add more data types (earnings transcripts, insider trades)

---

## Questions?

**When to use L3 vs L2?**
- L2 (Redis): Frequently accessed, short-medium TTL (minutes to days)
- L3 (Database): Expensive to compute, long TTL (weeks to years)

**Why not just use Redis for everything?**
- Redis cost scales with storage (eviction pressure)
- PostgreSQL better for queryable data (analytics)
- L3 provides persistence guarantee (no eviction)

**Can we skip L2 and go straight to L3?**
- No - L2 is faster (in-memory vs disk)
- L3 is for persistent storage, not speed
- Use both together for optimal performance
