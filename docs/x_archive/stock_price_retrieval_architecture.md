# Stock Price Retrieval Architecture

**Created:** 2025-11-21
**Last Updated:** 2025-11-21

## Executive Summary

This document provides a comprehensive technical specification of the stock price retrieval system, including the complete request flow, caching strategy, fallback logic, error handling, and all conditions where prices are treated as unavailable (N/A).

**Key Characteristics:**
- **Primary Provider:** Alpha Vantage (free tier: 25 requests/day, 5 requests/minute)
- **Fallback Provider:** Financial Modeling Prep (FMP)
- **Cache Strategy:** In-memory cache with 5-minute TTL
- **Fallback Strategy:** 4-level waterfall with stale cache as last resort
- **Error Handling:** Graceful degradation with detailed error logging
- **Timeout:** 5 seconds per API request

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Complete Request Flow](#complete-request-flow)
3. [API Lookup Order & Decision Tree](#api-lookup-order--decision-tree)
4. [Caching Strategy](#caching-strategy)
5. [Fallback Logic](#fallback-logic)
6. [Error Conditions & Handling](#error-conditions--handling)
7. [When Price is Treated as N/A](#when-price-is-treated-as-na)
8. [Component-Level Specifications](#component-level-specifications)
9. [Performance Characteristics](#performance-characteristics)
10. [Production Readiness Assessment](#production-readiness-assessment)

---

## System Architecture Overview

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ lib/utils/priceUpdater.ts                            │   │
│  │  - fetchStockPrice(symbol, shares)                   │   │
│  │  - updateStockPrice(stockId, price, value)           │   │
│  │  - fetchAndUpdateStockPrice(...)                     │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↓ HTTP GET                          │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    API LAYER                                 │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │ app/api/quote/route.ts                              │   │
│  │  - GET /api/quote?symbols=AAPL,MSFT                 │   │
│  │  - Calls stockDataService.getBatchQuotes()          │   │
│  │  - Returns quotes + errors in unified format        │   │
│  └──────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                 SERVICE LAYER                                │
│  ┌──────────────────────┴──────────────────────────────┐   │
│  │ lib/services/stock-data.service.ts                  │   │
│  │  - getQuote(symbol): StockQuote                     │   │
│  │  - getBatchQuotes(symbols[]): BatchQuoteResult      │   │
│  │  - getPriceMap(symbols[]): Record<symbol, price>    │   │
│  │                                                      │   │
│  │ Implements 4-level fallback:                        │   │
│  │  1. Cache (5min TTL)                                │   │
│  │  2. Alpha Vantage (primary)                         │   │
│  │  3. FMP (fallback)                                  │   │
│  │  4. Stale cache (emergency)                         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│    ┌────────────────────┼────────────────────┐              │
│    ↓                    ↓                    ↓              │
│  Cache              Alpha Vantage           FMP              │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    DAO LAYER                                 │
│  ┌─────────────────────┬┴────────────────┬──────────────┐   │
│  │ serverCache.ts      │ alpha-vantage.  │  fmp.dao.ts  │   │
│  │                     │   dao.ts        │              │   │
│  │ - loadFromCache()   │ - getQuote()    │ - getQuote() │   │
│  │ - saveToCache()     │ - getQuotes()   │ - getQuotes()│   │
│  │ - getCacheAge()     │ - timeout: 5s   │ - timeout:5s │   │
│  └─────────────────────┴─────────────────┴──────────────┘   │
│                           │                      │           │
│               extends BaseDAO (base.dao.ts)      │           │
│                  - fetchWithTimeout()            │           │
│                  - isRateLimitError()            │           │
│                  - hasApiError()                 │           │
└──────────────────────────┼──────────────────────┼───────────┘
                           │                      │
                           ↓                      ↓
                   Alpha Vantage API      FMP API
                   (external service)   (external service)
```

### Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `lib/utils/priceUpdater.ts` | 140 | Client-side price fetching & DB update logic |
| `app/api/quote/route.ts` | 71 | API endpoint for quote requests |
| `lib/services/stock-data.service.ts` | 239 | Business logic: caching, fallback, error handling |
| `lib/dao/alpha-vantage.dao.ts` | 464 | Alpha Vantage HTTP client |
| `lib/dao/fmp.dao.ts` | 100 | FMP HTTP client (fallback provider) |
| `lib/dao/base.dao.ts` | 134 | Base HTTP client with timeout & error handling |
| `lib/serverCache.ts` | 17 | Simple in-memory cache (dev only) |

---

## Complete Request Flow

### Step-by-Step Flow (Success Case)

```
1. User Action (e.g., page load, manual refresh)
   ↓
2. Client calls: fetchStockPrice('AAPL', 100)
   ↓ lib/utils/priceUpdater.ts:15

3. Strip .TO suffix for Canadian stocks
   - 'AAPL.TO' → 'AAPL'
   ↓ priceUpdater.ts:18

4. HTTP GET → /api/quote?symbols=AAPL
   ↓ priceUpdater.ts:20

5. API Route Handler: app/api/quote/route.ts:8
   ↓

6. Parse query params, validate symbols
   ↓ route.ts:10-27

7. Call stockDataService.getBatchQuotes(['AAPL'])
   ↓ route.ts:32

8. Service Layer: lib/services/stock-data.service.ts:136
   ↓

9. For each symbol, call getQuote(symbol)
   ↓ stock-data.service.ts:50

10. Check cache: loadFromCache('quote-AAPL')
    ↓ stock-data.service.ts:54

11a. CACHE HIT (age < 5min)?
     → Return cached quote immediately
     ↓ stock-data.service.ts:55-61

11b. CACHE MISS or EXPIRED?
     → Continue to step 12

12. Try Alpha Vantage (primary provider)
    ↓ stock-data.service.ts:66

13. alphaVantageDAO.getQuote('AAPL')
    ↓ alpha-vantage.dao.ts:104

14. Build URL: https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=***
    ↓ alpha-vantage.dao.ts:105-109

15. fetchWithTimeout(url, 5000ms)
    ↓ base.dao.ts:16-44

16. HTTP GET with 5-second timeout
    ↓

17a. SUCCESS?
     - Parse response
     - Extract: symbol, price, change, changePercent
     - Save to cache
     - Return quote
     ↓ alpha-vantage.dao.ts:136-145
     → Go to step 26

17b. ERROR? (rate limit, timeout, HTTP error)
     → Continue to fallback (step 18)

18. Check if rate limited AND cache exists
    ↓ stock-data.service.ts:81-87

18a. Rate limited + cache exists?
     → Return stale cache immediately

18b. Other error?
     → Continue to FMP fallback (step 19)

19. Try FMP (fallback provider)
    ↓ stock-data.service.ts:93

20. fmpDAO.getQuote('AAPL')
    ↓ fmp.dao.ts:40

21. Build URL: https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=***
    ↓ fmp.dao.ts:41-44

22. fetchWithTimeout(url, 5000ms)
    ↓

23a. SUCCESS?
     - Parse FMP response (array format)
     - Save to cache
     - Return quote
     ↓ fmp.dao.ts:54-70
     → Go to step 26

23b. ERROR?
     → Continue to step 24

24. Both providers failed. Check for stale cache.
    ↓ stock-data.service.ts:109-115

24a. Stale cache exists?
     → Return stale cache with warning

24b. No cache at all?
     → Return null price object (step 25)

25. Return StockQuote with price: null
    ↓ stock-data.service.ts:118-126
    {
      symbol: 'AAPL',
      price: null,
      change: null,
      changePercent: 'N/A',
      source: 'cache',
      timestamp: Date.now()
    }

26. API route formats response
    ↓ app/api/quote/route.ts:35-57

27. Return JSON to client
    {
      "AAPL": {
        "symbol": "AAPL",
        "price": 189.25,
        "change": 2.15,
        "changePercent": "1.15%",
        "source": "alphavantage",
        "timestamp": 1700000000000
      }
    }

28. Client receives response
    ↓ priceUpdater.ts:33-44

29. Validate response data
    - Check for error field
    - Check price is number > 0
    ↓ priceUpdater.ts:37-56

30a. Valid price?
     - Calculate actualValue = price * shares
     - Return { currentPrice, actualValue, success: true }
     ↓ priceUpdater.ts:58-64

30b. Invalid price?
     - Return { currentPrice: null, actualValue: null, success: false, error: '...' }
     ↓ priceUpdater.ts:38-43, 49-55
```

---

## API Lookup Order & Decision Tree

### Decision Tree (Detailed)

```
User requests price for symbol "AAPL"
    ↓
┌─────────────────────────────────────────────┐
│ STEP 1: Cache Lookup                        │
│ Key: 'quote-AAPL'                           │
│ Check: getCacheAge('quote-AAPL') < 5min?   │
└─────────────────────────────────────────────┘
    ↓
    ├─ YES (Cache hit, fresh) ─────────────→ Return cached quote
    │                                         [Source: 'cache']
    │                                         [Latency: ~1ms]
    │
    └─ NO (Cache miss or expired)
       ↓
┌─────────────────────────────────────────────┐
│ STEP 2: Alpha Vantage (Primary Provider)    │
│ API: GET https://alphavantage.co/query      │
│ Function: GLOBAL_QUOTE                      │
│ Timeout: 5 seconds                          │
└─────────────────────────────────────────────┘
       ↓
       ├─ SUCCESS ───────────────────────────→ Parse quote
       │                                        Save to cache
       │                                        Return quote
       │                                        [Source: 'alphavantage']
       │                                        [Latency: 200-2000ms]
       │
       ├─ RATE LIMIT ERROR + Cache exists ───→ Return stale cache
       │                                        [Source: 'cache']
       │                                        [Note: Rate limited, using stale data]
       │
       └─ ERROR (timeout, network, HTTP, etc.)
          ↓
┌─────────────────────────────────────────────┐
│ STEP 3: FMP (Fallback Provider)             │
│ API: GET https://financialmodelingprep.com  │
│ Endpoint: /stable/quote                     │
│ Timeout: 5 seconds                          │
└─────────────────────────────────────────────┘
          ↓
          ├─ SUCCESS ──────────────────────→ Parse FMP quote
          │                                   Save to cache
          │                                   Return quote
          │                                   [Source: 'fmp']
          │                                   [Latency: 200-2000ms]
          │
          └─ ERROR (both providers failed)
             ↓
┌─────────────────────────────────────────────┐
│ STEP 4: Stale Cache (Emergency Fallback)    │
│ Check: Does any cached value exist?         │
│ (Ignore TTL, use any cache regardless age) │
└─────────────────────────────────────────────┘
             ↓
             ├─ Stale cache exists ──────────→ Return stale cache
             │                                  [Source: 'cache']
             │                                  [Warning: All providers failed]
             │
             └─ No cache at all
                ↓
┌─────────────────────────────────────────────┐
│ STEP 5: Return Null Price (N/A)             │
│ Return:                                     │
│  {                                          │
│    symbol: 'AAPL',                          │
│    price: null,                             │
│    change: null,                            │
│    changePercent: 'N/A',                    │
│    source: 'cache',                         │
│    timestamp: Date.now()                    │
│  }                                          │
└─────────────────────────────────────────────┘
                ↓
         UI displays "N/A" or "Unavailable"
```

### Lookup Order Table

| Step | Source | Priority | Latency | Freshness | Error Handling |
|------|--------|----------|---------|-----------|----------------|
| 1 | **Cache** | Highest | ~1ms | 0-5 min | If miss, try step 2 |
| 2 | **Alpha Vantage** | High | 200-2000ms | Real-time | If fail, try step 3 |
| 2.5 | **Stale Cache** (rate limit only) | Medium | ~1ms | >5 min | If available on rate limit |
| 3 | **FMP** | Medium | 200-2000ms | Real-time | If fail, try step 4 |
| 4 | **Stale Cache** (all fail) | Low | ~1ms | Any age | If available, use it |
| 5 | **Null/N/A** | Lowest | 0ms | N/A | No data available |

---

## Caching Strategy

### Cache Configuration

**File:** `lib/serverCache.ts`

```typescript
const cache: Record<string, { value: any; timestamp: number }> = {};

// TTL defined in stock-data.service.ts
private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

**Cache Key Format:** `quote-{SYMBOL}`
**Example:** `quote-AAPL`, `quote-MSFT`, `quote-GOOGL`

### Cache Operations

#### 1. Load from Cache

```typescript
loadFromCache<StockQuote>(cacheKey)
// Returns: StockQuote | null
```

**Logic:**
- Check if `cache[key]` exists
- Return `cache[key].value` if exists
- Return `null` if not exists

**Note:** Does NOT check age/TTL (caller's responsibility)

#### 2. Save to Cache

```typescript
saveToCache(cacheKey, quote)
```

**Logic:**
- Save quote to `cache[key] = { value: quote, timestamp: Date.now() }`
- No expiration logic (items never deleted, only replaced)

#### 3. Get Cache Age

```typescript
getCacheAge(cacheKey)
// Returns: milliseconds since cached, or Infinity if not cached
```

**Logic:**
- If cached: `Date.now() - cache[key].timestamp`
- If not cached: `Infinity`

### Cache Lifecycle

#### When Cache is Written

| Event | Location | Cache Key | Value |
|-------|----------|-----------|-------|
| Alpha Vantage success | stock-data.service.ts:74 | `quote-{symbol}` | StockQuote with source='alphavantage' |
| FMP success | stock-data.service.ts:101 | `quote-{symbol}` | StockQuote with source='fmp' |

#### When Cache is Read

| Scenario | Location | Age Check | Result |
|----------|----------|-----------|--------|
| Fresh cache (age < 5min) | stock-data.service.ts:55 | Yes | Return cached quote, skip API calls |
| Stale cache on rate limit | stock-data.service.ts:82 | No | Return stale cache if Alpha Vantage rate limited |
| Stale cache on all fail | stock-data.service.ts:109 | No | Return stale cache if all providers fail |

#### Cache TTL Logic

```typescript
// Check cache age
const cached = loadFromCache<StockQuote>(cacheKey);
if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
  // Fresh cache: use it
  return { ...cached, source: 'cache' };
}
// Stale cache: continue to API providers
```

### Cache Invalidation

**Current Implementation:** No explicit invalidation. Stale entries remain in memory until:
1. Process restart (all cache lost)
2. Overwritten by new API response

**Production Consideration:** In-memory cache is NOT suitable for production. Recommend:
- Redis with automatic TTL expiration
- Distributed cache for multi-instance deployments
- Persistent cache to survive restarts

---

## Fallback Logic

### Fallback Strategy Overview

The system implements a **4-level waterfall fallback** strategy to maximize availability and minimize user-facing errors.

### Level 1: Fresh Cache (5-minute TTL)

**Trigger:** Always attempted first
**Condition:** Cache exists AND age < 5 minutes
**Action:** Return cached quote immediately
**Source Label:** `'cache'`

**Code:** `lib/services/stock-data.service.ts:54-61`

```typescript
const cached = loadFromCache<StockQuote>(cacheKey);
if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
  console.log(`Cache hit for ${symbol} (age: ${getCacheAge(cacheKey)}ms)`);
  return {
    ...cached,
    source: 'cache'
  };
}
```

**Advantages:**
- Zero latency (~1ms)
- No API rate limit consumption
- No network dependency

**Disadvantages:**
- Data up to 5 minutes old
- Not suitable for real-time trading

### Level 2: Alpha Vantage (Primary Provider)

**Trigger:** Cache miss or stale
**Condition:** Alpha Vantage API key configured
**Action:** HTTP GET to Alpha Vantage GLOBAL_QUOTE
**Source Label:** `'alphavantage'`

**Code:** `lib/services/stock-data.service.ts:64-88`

```typescript
try {
  console.log(`Fetching ${symbol} from Alpha Vantage`);
  const avQuote = await alphaVantageDAO.getQuote(symbol);

  const quote: StockQuote = {
    ...avQuote,
    source: 'alphavantage',
    timestamp: Date.now()
  };

  saveToCache(cacheKey, quote);
  return quote;
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  console.warn(`Alpha Vantage failed for ${symbol}: ${errorMsg}`);

  // Special handling for rate limits
  if (errorMsg.includes('RATE_LIMIT') && cached) {
    console.log(`Rate limited, returning stale cache for ${symbol}`);
    return {
      ...cached,
      source: 'cache'
    };
  }
  // Continue to FMP fallback
}
```

**Advantages:**
- Real-time data
- High reliability (established provider)
- Free tier available

**Disadvantages:**
- Rate limits (25 req/day, 5 req/min on free tier)
- ~200-2000ms latency
- Network dependency

**Special Behavior:** If rate limited AND cache exists, return stale cache immediately (don't wait for FMP)

### Level 3: FMP (Fallback Provider)

**Trigger:** Alpha Vantage failure (except rate limit with cache)
**Condition:** FMP API key configured
**Action:** HTTP GET to FMP quote endpoint
**Source Label:** `'fmp'`

**Code:** `lib/services/stock-data.service.ts:90-106`

```typescript
try {
  console.log(`Fetching ${symbol} from FMP (fallback)`);
  const fmpQuote = await fmpDAO.getQuote(symbol);

  const quote: StockQuote = {
    ...fmpQuote,
    source: 'fmp',
    timestamp: Date.now()
  };

  saveToCache(cacheKey, quote);
  return quote;
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : 'Unknown error';
  console.error(`FMP also failed for ${symbol}: ${errorMsg}`);
  // Continue to stale cache fallback
}
```

**Advantages:**
- Second chance after Alpha Vantage failure
- Different provider = uncorrelated failures
- Real-time data

**Disadvantages:**
- Additional API key required
- Additional rate limits
- ~200-2000ms latency

### Level 4: Stale Cache (Emergency Fallback)

**Trigger:** Both Alpha Vantage AND FMP failed
**Condition:** Any cached value exists (regardless of age)
**Action:** Return stale cache with warning
**Source Label:** `'cache'`

**Code:** `lib/services/stock-data.service.ts:108-115`

```typescript
// Return stale cache if available
if (cached) {
  console.log(`All providers failed, returning stale cache for ${symbol}`);
  return {
    ...cached,
    source: 'cache'
  };
}
```

**Advantages:**
- Better than nothing
- User sees some data (with staleness indication)

**Disadvantages:**
- Data could be hours/days old
- No freshness guarantee
- Misleading if not properly indicated in UI

### Level 5: Null Price (N/A)

**Trigger:** All providers failed AND no cache exists
**Condition:** First-ever request for symbol, or cache evicted
**Action:** Return StockQuote with price: null
**Source Label:** `'cache'` (misleading, should be 'unavailable')

**Code:** `lib/services/stock-data.service.ts:117-126`

```typescript
// Return a StockQuote with price: null and error info for UI to handle gracefully
return {
  symbol,
  price: null as any, // UI should check for null
  change: null as any,
  changePercent: 'N/A',
  source: 'cache',
  timestamp: Date.now(),
};
```

**Advantages:**
- Prevents crash
- UI can display "N/A" or "Unavailable"

**Disadvantages:**
- User has no data
- Poor user experience

**Improvement Needed:**
- Should have source: 'unavailable' or 'error'
- Should include error message for debugging

---

## Error Conditions & Handling

### Error Classification

| Error Type | Detected At | Thrown By | Message Format | Retry Strategy |
|------------|-------------|-----------|----------------|----------------|
| **Network Timeout** | DAO Layer | base.dao.ts:38 | `"Request timeout after 5000ms"` | Try next provider |
| **HTTP Error** | DAO Layer | base.dao.ts:28-30 | `"HTTP {status}: {statusText}"` | Try next provider |
| **Rate Limit** | DAO Layer | alpha-vantage.dao.ts:124-126 | `"RATE_LIMIT: {message}"` | Return stale cache if available |
| **API Error** | DAO Layer | alpha-vantage.dao.ts:128 | `"API_ERROR: {message}"` | Try next provider |
| **No Quote Data** | DAO Layer | alpha-vantage.dao.ts:133, fmp.dao.ts:56 | `"No quote data for {symbol}"` | Try next provider |
| **Invalid Price** | Client | priceUpdater.ts:49 | `"Invalid price value"` | Return error to UI |
| **Missing Symbol** | API | app/api/quote/route.ts:14 | `"Missing symbols parameter"` | HTTP 400 |
| **Fetch Failed** | Client | priceUpdater.ts:65-72 | `{error.message}` or `"Unknown error"` | Return error to UI |

### Error Handling by Layer

#### DAO Layer (base.dao.ts, alpha-vantage.dao.ts, fmp.dao.ts)

**Network Timeout:**
```typescript
// base.dao.ts:20-44
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(url, { signal: controller.signal });
  // ...
} catch (error) {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
  }
  throw error;
}
```

**HTTP Errors:**
```typescript
// base.dao.ts:26-30
if (!response.ok) {
  const bodyText = await response.text().catch(() => '');
  throw new Error(
    `HTTP ${response.status}: ${response.statusText}${bodyText ? ` | ${bodyText}` : ''}`
  );
}
```

**Rate Limit Detection:**
```typescript
// base.dao.ts:87-95
protected isRateLimitError(data: any): boolean {
  const msg =
    data?.['Note'] ||
    data?.['Information'] ||
    data?.['Error Message'] ||
    data?.message ||
    '';
  return msg.toLowerCase().includes('rate limit');
}
```

**Alpha Vantage Error Handling:**
```typescript
// alpha-vantage.dao.ts:118-129
if (this.hasApiError(data)) {
  const errorMsg = this.getApiErrorMessage(data);
  console.warn(`Alpha Vantage error for ${symbol}:`, errorMsg);

  // Throw specific error for rate limits
  if (this.isRateLimitError(data)) {
    throw new Error(`RATE_LIMIT: ${errorMsg}`);
  }

  throw new Error(`API_ERROR: ${errorMsg}`);
}
```

#### Service Layer (stock-data.service.ts)

**Rate Limit Special Handling:**
```typescript
// stock-data.service.ts:80-87
if (errorMsg.includes('RATE_LIMIT') && cached) {
  console.log(`Rate limited, returning stale cache for ${symbol}`);
  return {
    ...cached,
    source: 'cache'
  };
}
```

**All Providers Failed:**
```typescript
// stock-data.service.ts:108-126
// Return stale cache if available
if (cached) {
  console.log(`All providers failed, returning stale cache for ${symbol}`);
  return {
    ...cached,
    source: 'cache'
  };
}

// Return null price as last resort
return {
  symbol,
  price: null as any,
  change: null as any,
  changePercent: 'N/A',
  source: 'cache',
  timestamp: Date.now(),
};
```

**Batch Quote Error Handling:**
```typescript
// stock-data.service.ts:145-172
const promises = symbols.map(async (symbol) => {
  try {
    const quote = await this.getQuote(symbol);
    return { symbol, quote, error: null };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to fetch ${symbol}:`, errorMsg);
    return { symbol, quote: null, error: errorMsg };
  }
});

// Process results
settled.forEach((result) => {
  if (result.quote) {
    results[result.symbol] = result.quote;
  } else if (result.error) {
    errors[result.symbol] = result.error;
  }
});
```

#### API Layer (app/api/quote/route.ts)

**Missing Parameters:**
```typescript
// route.ts:13-18
if (!symbols) {
  return NextResponse.json(
    { error: 'Missing symbols parameter' },
    { status: 400 }
  );
}
```

**Empty Symbol List:**
```typescript
// route.ts:22-27
if (symbolArray.length === 0) {
  return NextResponse.json(
    { error: 'No symbols provided' },
    { status: 400 }
  );
}
```

**Error Response Format:**
```typescript
// route.ts:49-57
Object.entries(result.errors).forEach(([symbol, error]) => {
  quotes[symbol] = {
    symbol,
    error: error,
    price: null,
    change: null,
    changePercent: null
  };
});
```

**Global Error Handler:**
```typescript
// route.ts:62-69
catch (error: any) {
  console.error('[/api/quote] Error:', error);

  return NextResponse.json(
    { error: error.message || 'Failed to fetch quotes' },
    { status: 500 }
  );
}
```

#### Client Layer (priceUpdater.ts)

**HTTP Error:**
```typescript
// priceUpdater.ts:22-30
if (!response.ok) {
  const error = await response.json();
  console.warn(`Failed to fetch price for ${symbol}:`, error);
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: error.error || 'Failed to fetch price',
  };
}
```

**API Error Response:**
```typescript
// priceUpdater.ts:36-44
if (!quoteData || quoteData.error) {
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: quoteData?.error || 'Invalid price data',
  };
}
```

**Invalid Price Validation:**
```typescript
// priceUpdater.ts:49-56
if (!price || typeof price !== 'number' || price <= 0) {
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: 'Invalid price value',
  };
}
```

**Network Exception:**
```typescript
// priceUpdater.ts:65-73
catch (error) {
  console.error(`Error fetching price for ${symbol}:`, error);
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}
```

---

## When Price is Treated as N/A

### Conditions for N/A Price

A stock price is treated as **N/A (unavailable)** when the client receives `price: null`. This occurs under the following conditions:

#### 1. All Providers Failed + No Cache

**Scenario:** First-ever request for a symbol, or cache was cleared, and both Alpha Vantage and FMP failed.

**Service Layer Returns:**
```typescript
{
  symbol: 'XYZ',
  price: null,
  change: null,
  changePercent: 'N/A',
  source: 'cache',
  timestamp: 1700000000000
}
```

**Client Validation:** `priceUpdater.ts:49`
```typescript
if (!price || typeof price !== 'number' || price <= 0) {
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: 'Invalid price value',
  };
}
```

**Root Causes:**
- Symbol doesn't exist (typo, delisted stock)
- Both APIs down simultaneously
- Network connectivity issues
- Invalid API keys for both providers

#### 2. API Returns Error Response

**Scenario:** API endpoint returns error field instead of price data.

**API Response Format:**
```json
{
  "XYZ": {
    "symbol": "XYZ",
    "error": "No quote data for XYZ",
    "price": null,
    "change": null,
    "changePercent": null
  }
}
```

**Client Validation:** `priceUpdater.ts:36-37`
```typescript
if (!quoteData || quoteData.error) {
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: quoteData?.error || 'Invalid price data',
  };
}
```

**Root Causes:**
- Symbol not found in provider databases
- API provider error (internal server error)
- Invalid symbol format

#### 3. Price Value is Invalid

**Scenario:** API returns a response but price is not a valid positive number.

**Client Validation:** `priceUpdater.ts:49`
```typescript
if (!price || typeof price !== 'number' || price <= 0) {
  return { currentPrice: null, actualValue: null, success: false, error: 'Invalid price value' };
}
```

**Invalid Price Examples:**
- `price: undefined`
- `price: null`
- `price: 0`
- `price: -5.2`
- `price: "123.45"` (string instead of number)
- `price: NaN`

**Root Causes:**
- API response parsing error
- API provider data quality issue
- Stock halted/suspended (some APIs return 0)

#### 4. HTTP Request Failed

**Scenario:** HTTP request to `/api/quote` fails entirely.

**Client Error Handling:** `priceUpdater.ts:22-24`
```typescript
if (!response.ok) {
  const error = await response.json();
  console.warn(`Failed to fetch price for ${symbol}:`, error);
  return { currentPrice: null, actualValue: null, success: false, error: error.error || 'Failed to fetch price' };
}
```

**Root Causes:**
- Server down (500 error)
- Network timeout
- CORS error
- Client-side network disconnection

#### 5. Network Exception

**Scenario:** Fetch throws an exception (network error, DNS failure, etc.)

**Client Exception Handling:** `priceUpdater.ts:65-72`
```typescript
catch (error) {
  console.error(`Error fetching price for ${symbol}:`, error);
  return {
    currentPrice: null,
    actualValue: null,
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}
```

**Root Causes:**
- DNS resolution failure
- Connection refused
- Certificate error
- Browser extension blocking request

### N/A Detection Flow

```
Client calls fetchStockPrice('XYZ', 100)
    ↓
HTTP GET /api/quote?symbols=XYZ
    ↓
    ├─ Request fails (network error) ────────────→ catch block → return { price: null, error: '...' }
    │
    ├─ HTTP error (4xx, 5xx) ────────────────────→ return { price: null, error: '...' }
    │
    └─ HTTP 200 OK
       ↓
   Receive JSON response
       ↓
       ├─ quoteData is undefined/null ───────────→ return { price: null, error: 'Invalid price data' }
       │
       ├─ quoteData.error exists ────────────────→ return { price: null, error: quoteData.error }
       │
       └─ quoteData.price exists
          ↓
      Validate price
          ↓
          ├─ price is null ──────────────────────→ return { price: null, error: 'Invalid price value' }
          ├─ price is not a number ──────────────→ return { price: null, error: 'Invalid price value' }
          ├─ price <= 0 ─────────────────────────→ return { price: null, error: 'Invalid price value' }
          │
          └─ price is valid number > 0
             ↓
         Calculate actualValue = price * shares
             ↓
         Return { currentPrice: price, actualValue, success: true }
```

### How UI Should Handle N/A

**Recommended UI Behavior:**

```typescript
const result = await fetchStockPrice(symbol, shares);

if (!result.success || result.currentPrice === null) {
  // Display "N/A" or "Unavailable"
  // Show error message: result.error
  // Optionally show retry button
  // Do NOT display $0.00 (misleading)
} else {
  // Display price: result.currentPrice
  // Display value: result.actualValue
}
```

**UI Display Examples:**

| Condition | Display Price | Display Value | User Message |
|-----------|---------------|---------------|--------------|
| Success | $189.25 | $18,925.00 | - |
| N/A (error) | N/A | N/A | "Unable to fetch current price. {error}" |
| N/A (network) | N/A | N/A | "Network error. Please try again." |
| N/A (invalid symbol) | N/A | N/A | "Symbol not found: XYZ" |
| Stale cache | $189.25 ⚠️ | $18,925.00 ⚠️ | "Price may be out of date (cached)" |

---

## Component-Level Specifications

### priceUpdater.ts

**Purpose:** Client-side utility for fetching and updating stock prices.

**Key Functions:**

#### fetchStockPrice(symbol, shares)

**Input:**
- `symbol`: string (e.g., "AAPL", "MSFT.TO")
- `shares`: number (quantity owned)

**Output:**
```typescript
{
  currentPrice: number | null,
  actualValue: number | null,
  success: boolean,
  error?: string
}
```

**Logic:**
1. Strip `.TO` suffix (Canadian stocks)
2. HTTP GET to `/api/quote?symbols={symbol}`
3. Validate HTTP response
4. Validate quote data structure
5. Validate price value (number, > 0)
6. Calculate actualValue = price × shares
7. Return result object

**Error Handling:**
- HTTP errors → return error
- API errors → return error
- Invalid price → return error
- Network exceptions → catch and return error

#### updateStockPrice(stockId, currentPrice, actualValue, previousPrice?)

**Purpose:** Update stock price in database via PUT to `/api/stocks`

**Input:**
- `stockId`: string (database ID)
- `currentPrice`: number | null
- `actualValue`: number | null
- `previousPrice?`: number | null (optional)

**Output:** boolean (success/failure)

**Logic:**
1. Build request body
2. HTTP PUT to `/api/stocks`
3. Return response.ok

**Error Handling:**
- Catch exceptions, log, return false

#### fetchAndUpdateStockPrice(stockId, symbol, shares, setPreviousPrice?)

**Purpose:** Fetch price and update database in one operation

**Logic:**
1. Call fetchStockPrice()
2. If success, call updateStockPrice()
3. Return price result

---

### app/api/quote/route.ts

**Purpose:** API endpoint for stock quote requests

**Endpoint:** `GET /api/quote?symbols=AAPL,MSFT,GOOGL`

**Input:**
- Query parameter `symbols`: comma-separated list

**Output:**
```json
{
  "AAPL": {
    "symbol": "AAPL",
    "price": 189.25,
    "change": 2.15,
    "changePercent": "1.15%",
    "source": "alphavantage",
    "timestamp": 1700000000000
  },
  "MSFT": {
    "symbol": "MSFT",
    "error": "No quote data for MSFT",
    "price": null,
    "change": null,
    "changePercent": null
  }
}
```

**Logic:**
1. Parse `symbols` query parameter
2. Validate symbols list
3. Call `stockDataService.getBatchQuotes(symbolArray)`
4. Convert service response to API format
5. Include both quotes and errors in response
6. Return JSON

**Error Handling:**
- Missing symbols → HTTP 400
- Empty symbols → HTTP 400
- Service exception → HTTP 500

---

### stock-data.service.ts

**Purpose:** Business logic for stock quotes with caching and fallback

**Key Methods:**

#### getQuote(symbol): StockQuote

**4-Level Fallback:**
1. Cache (5min TTL)
2. Alpha Vantage
3. FMP
4. Stale cache or null

**Returns:**
```typescript
{
  symbol: string,
  price: number | null,
  change: number | null,
  changePercent: string,
  source: 'alphavantage' | 'fmp' | 'cache',
  timestamp: number
}
```

#### getBatchQuotes(symbols[]): BatchQuoteResult

**Logic:**
- Fetch all symbols in parallel (Promise.all)
- Individual error handling per symbol
- Separate successful quotes from errors

**Returns:**
```typescript
{
  quotes: Record<string, StockQuote>,
  errors: Record<string, string>,
  cached: number,
  fresh: number
}
```

---

### alpha-vantage.dao.ts

**Purpose:** HTTP client for Alpha Vantage API

**Key Method:** `getQuote(symbol)`

**API:**
- Endpoint: `https://www.alphavantage.co/query`
- Function: `GLOBAL_QUOTE`
- Timeout: 5 seconds

**Response Parsing:**
```typescript
{
  symbol: quote['01. symbol'],
  price: parseFloat(quote['05. price']),
  change: parseFloat(quote['09. change']),
  changePercent: quote['10. change percent']
}
```

**Error Detection:**
- Rate limit: check for "rate limit" in Note/Information
- API error: check for Error Message field
- No data: check if Global Quote is empty

---

### fmp.dao.ts

**Purpose:** HTTP client for FMP API (fallback provider)

**Key Method:** `getQuote(symbol)`

**API:**
- Endpoint: `https://financialmodelingprep.com/stable/quote`
- Timeout: 5 seconds

**Response Parsing:**
```typescript
{
  symbol: quote.symbol,
  price: quote.price,
  change: quote.change,
  changePercent: quote.changesPercentage?.toFixed(2) + '%' || '0.00%'
}
```

**Note:** FMP returns array, so extract first element.

---

### base.dao.ts

**Purpose:** Base HTTP client with timeout and error handling

**Key Methods:**

#### fetchWithTimeout(url, timeoutMs)

**Features:**
- AbortController for timeout enforcement
- HTTP error detection (response.ok)
- Timeout error formatting
- Automatic JSON parsing

#### Error Detection Helpers

- `isRateLimitError(data)`: Check for "rate limit" in response
- `hasApiError(data)`: Check for Error Message/Note/Information
- `getApiErrorMessage(data)`: Extract error message

---

## Performance Characteristics

### Latency Analysis

| Scenario | Latency | Notes |
|----------|---------|-------|
| **Cache hit (fresh)** | 1-5ms | In-memory lookup |
| **Cache hit (stale on rate limit)** | 1-5ms + API timeout | Wait for Alpha Vantage timeout, then return cache |
| **Alpha Vantage success** | 200-2000ms | Network + API processing |
| **Alpha Vantage fail → FMP success** | 5000ms + 200-2000ms | Timeout + FMP call |
| **Both fail → stale cache** | 10000ms + 1-5ms | Both timeouts + cache lookup |
| **Both fail → no cache** | 10000ms + 1ms | Both timeouts + null return |

**Worst Case Latency:** ~10 seconds (two 5-second timeouts)

### Rate Limit Considerations

**Alpha Vantage Free Tier:**
- 25 requests per day
- 5 requests per minute

**Implications for 1000 users:**
- Daily quota exhausted after 25 requests
- Minute quota exhausted after 5 requests
- **Critical:** Free tier not viable for production

**FMP Free Tier:**
- 250 requests per day
- No per-minute limit

**Combined Strategy:**
- Cache reduces API calls by ~80-90%
- Stale cache fallback reduces impact of rate limits
- Still need paid tier for production (1000 users)

### Batch Request Performance

**getBatchQuotes(['AAPL', 'MSFT', 'GOOGL'])**

**Parallel Execution:**
- All symbols fetched simultaneously (Promise.all)
- Total latency = slowest individual request

**Example Timeline:**
```
T+0ms:    Start all 3 requests in parallel
T+1ms:    AAPL cache hit → return immediately
T+800ms:  MSFT Alpha Vantage success → return
T+1200ms: GOOGL FMP success (Alpha Vantage failed) → return
T+1200ms: All promises settled, return batch result
```

**Total Latency:** 1200ms (not 3 × 1200ms = 3600ms)

---

## Production Readiness Assessment

### Critical Issues

#### 1. In-Memory Cache Not Production-Ready

**Current Implementation:** `lib/serverCache.ts`
- Simple in-memory object
- No TTL expiration (items never deleted)
- Lost on process restart
- Not shared across instances

**Impact:**
- Multi-instance deployment = each instance has separate cache
- Poor cache hit rate in load-balanced environment
- Memory leak potential (cache grows indefinitely)

**Recommendation:**
- **Use Redis** with automatic TTL expiration
- Implement cache key namespacing
- Add cache eviction policy (LRU)
- Monitor cache size and hit rate

#### 2. Rate Limits Insufficient for 1000 Users

**Alpha Vantage Free Tier:**
- 25 requests/day = 0.025 requests per user per day
- Completely insufficient

**FMP Free Tier:**
- 250 requests/day = 0.25 requests per user per day
- Still insufficient

**Recommendation:**
- **Upgrade to paid tier** (Alpha Vantage Premium or FMP paid plan)
- Implement user-level rate limiting
- Consider dedicated market data provider (Polygon.io, IEX Cloud)

#### 3. Error Responses Lack Detail

**Current null price response:**
```typescript
{
  symbol: 'XYZ',
  price: null,
  change: null,
  changePercent: 'N/A',
  source: 'cache',  // Misleading!
  timestamp: Date.now()
}
```

**Issues:**
- `source: 'cache'` is misleading (no cache was used)
- No indication of error type
- UI can't differentiate between rate limit vs invalid symbol

**Recommendation:**
```typescript
{
  symbol: 'XYZ',
  price: null,
  change: null,
  changePercent: 'N/A',
  source: 'unavailable',
  timestamp: Date.now(),
  error: {
    type: 'NO_DATA',
    message: 'All providers failed',
    retry: true
  }
}
```

#### 4. No Monitoring or Alerting

**Missing Metrics:**
- Cache hit rate
- API provider success rate
- Latency percentiles (P50, P95, P99)
- Rate limit errors per hour
- Stale cache usage rate

**Recommendation:**
- Implement structured logging (Winston, Pino)
- Add metrics collection (Prometheus)
- Set up alerting (Grafana, Datadog)
- Track SLO: 99% of requests < 2s

#### 5. No Circuit Breaker

**Current Behavior:**
- Always try Alpha Vantage, even if it's failing 100%
- Wastes 5 seconds on timeout every time

**Recommendation:**
- Implement circuit breaker pattern
- If Alpha Vantage fails N times in M minutes, skip it temporarily
- Automatically recover after cooldown period

---

## Recommendations for Improvement

### Short-Term (Quick Wins)

1. **Add source: 'unavailable' for null prices**
   - File: `lib/services/stock-data.service.ts:117-126`
   - Change `source: 'cache'` to `source: 'unavailable'`

2. **Add error details to null price response**
   - Include error type, message, retry flag

3. **Implement request logging**
   - Log all API calls with timing
   - Log cache hit/miss statistics

4. **Add health check endpoint**
   - `GET /api/health/providers`
   - Returns status of Alpha Vantage, FMP, cache

### Medium-Term (Infrastructure)

1. **Migrate to Redis cache**
   - Replace in-memory cache with Redis
   - Implement automatic TTL expiration
   - Enable distributed caching

2. **Upgrade to paid API tiers**
   - Alpha Vantage Premium or FMP paid plan
   - At least 10,000 requests/day for 1000 users

3. **Add metrics and monitoring**
   - Prometheus + Grafana dashboard
   - Alert on high error rate, high latency

4. **Implement circuit breaker**
   - Use library like `opossum`
   - Skip failing provider temporarily

### Long-Term (Scalability)

1. **Consider dedicated market data aggregator**
   - Polygon.io, IEX Cloud, or similar
   - Better reliability, higher rate limits

2. **Implement WebSocket real-time updates**
   - For active trading users
   - Reduce polling, improve freshness

3. **Add database-backed cache**
   - Store historical prices in PostgreSQL
   - Use for long-term caching (> 1 hour)

4. **Implement smart cache prefetching**
   - Prefetch prices for user's portfolio on login
   - Reduce initial page load latency

---

## Conclusion

The stock price retrieval system implements a robust 4-level fallback strategy with caching to maximize availability. However, several production-readiness issues must be addressed:

**Strengths:**
✅ Multi-provider fallback (Alpha Vantage → FMP)
✅ Stale cache as emergency fallback
✅ Parallel batch requests
✅ Comprehensive error handling
✅ Timeout enforcement (5s)

**Critical Improvements Needed:**
❌ Replace in-memory cache with Redis
❌ Upgrade to paid API tiers
❌ Add monitoring and alerting
❌ Implement circuit breaker
❌ Fix misleading `source: 'cache'` for null prices

**Readiness Score:** 6/10 (OK for development, needs work for production)

---

*End of Document*
