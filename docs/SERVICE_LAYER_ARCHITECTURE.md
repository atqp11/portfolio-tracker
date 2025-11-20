# Service Layer Architecture

**Created:** November 19, 2025
**Status:** In Progress

---

## 📋 Overview

Refactor codebase to follow Spring-style layered architecture with clear separation of concerns:

1. **DAO Layer** (Data Access Objects) - REST clients for downstream APIs
2. **Service Layer** - Business logic and data orchestration
3. **Controller Layer** - API routes (already exists in `app/api/`)
4. **Client Layer** - React hooks and components (already exists)

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────┐
│          Client Layer (React)               │
│   - Components                              │
│   - Hooks (usePortfolio, useStocks, etc.)   │
└───────────────┬─────────────────────────────┘
                │ HTTP requests
                ↓
┌─────────────────────────────────────────────┐
│     Controller Layer (API Routes)           │
│   - app/api/quote/route.ts                  │
│   - app/api/fundamentals/route.ts           │
│   - app/api/news/*/route.ts                 │
└───────────────┬─────────────────────────────┘
                │ Service calls
                ↓
┌─────────────────────────────────────────────┐
│          Service Layer (NEW)                │
│   - StockDataService                        │
│   - FinancialDataService                    │
│   - NewsService                             │
│   - MarketDataService                       │
└───────────────┬─────────────────────────────┘
                │ DAO calls
                ↓
┌─────────────────────────────────────────────┐
│            DAO Layer (NEW)                  │
│   - AlphaVantageDAO                         │
│   - FinancialModelingPrepDAO                │
│   - YahooFinanceDAO                         │
│   - FinnhubDAO                              │
│   - BraveSearchDAO                          │
│   - SecEdgarDAO                             │
└───────────────┬─────────────────────────────┘
                │ HTTP requests
                ↓
┌─────────────────────────────────────────────┐
│         External APIs                       │
│   - Alpha Vantage                           │
│   - Financial Modeling Prep                 │
│   - Yahoo Finance                           │
│   - Finnhub, Brave Search, SEC EDGAR        │
└─────────────────────────────────────────────┘
```

---

## 📁 New Folder Structure

```
lib/
├── dao/                                # Data Access Objects
│   ├── base.dao.ts                     # Base class with common HTTP logic
│   ├── alpha-vantage.dao.ts            # Alpha Vantage client
│   ├── fmp.dao.ts                      # Financial Modeling Prep client
│   ├── yahoo-finance.dao.ts            # Yahoo Finance client
│   ├── finnhub.dao.ts                  # Finnhub client
│   ├── brave-search.dao.ts             # Brave Search client
│   └── sec-edgar.dao.ts                # SEC EDGAR client
│
├── services/                           # Service Layer
│   ├── stock-data.service.ts           # Stock quotes, prices
│   ├── financial-data.service.ts       # Fundamentals, statements
│   ├── news.service.ts                 # News aggregation
│   └── market-data.service.ts          # Commodities, market data
│
├── api/                                # DEPRECATED - Keep temporarily
│   └── (existing files for backward compatibility)
│
└── ...
```

---

## 🔧 DAO Layer (Data Access Objects)

### Responsibilities:
- Make HTTP requests to external APIs
- Handle timeouts, retries, errors
- Parse raw API responses
- Return typed data models
- **NO business logic** - pure data access

### Example: AlphaVantageDAO

```typescript
// lib/dao/alpha-vantage.dao.ts
import { BaseDAO } from './base.dao';

export interface AlphaVantageQuoteResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

export class AlphaVantageDAO extends BaseDAO {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';

  constructor() {
    super();
    this.apiKey = process.env.ALPHAVANTAGE_API_KEY || '';
  }

  /**
   * Fetch real-time quote for a single symbol
   */
  async getQuote(symbol: string): Promise<AlphaVantageQuoteResponse> {
    const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;

    const data = await this.fetchWithTimeout(url, 5000);

    // Parse API response
    const quote = data['Global Quote'];
    if (!quote) throw new Error('No quote data');

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: quote['10. change percent']
    };
  }

  /**
   * Fetch company overview (fundamentals)
   */
  async getCompanyOverview(symbol: string): Promise<any> {
    const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
    return this.fetchWithTimeout(url, 10000);
  }

  /**
   * Fetch income statement
   */
  async getIncomeStatement(symbol: string): Promise<any> {
    const url = `${this.baseUrl}?function=INCOME_STATEMENT&symbol=${symbol}&apikey=${this.apiKey}`;
    return this.fetchWithTimeout(url, 10000);
  }

  // ... more DAO methods
}
```

### Example: BaseDAO (shared logic)

```typescript
// lib/dao/base.dao.ts
export abstract class BaseDAO {
  /**
   * Fetch with timeout and error handling
   */
  protected async fetchWithTimeout(
    url: string,
    timeoutMs: number = 5000
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check for rate limit errors
   */
  protected isRateLimitError(data: any): boolean {
    const msg = data?.['Note'] || data?.['Information'] || data?.['Error Message'] || '';
    return msg.toLowerCase().includes('rate limit');
  }
}
```

---

## 🎯 Service Layer (Business Logic)

### Responsibilities:
- Coordinate between multiple DAOs
- Implement business logic (fallbacks, retries, aggregation)
- Cache management
- Data transformation for business needs
- Error handling and logging

### Example: StockDataService

```typescript
// lib/services/stock-data.service.ts
import { AlphaVantageDAO } from '@/lib/dao/alpha-vantage.dao';
import { FinancialModelingPrepDAO } from '@/lib/dao/fmp.dao';
import { loadFromCache, saveToCache, getCacheAge } from '@/lib/cache';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  source: 'alphavantage' | 'fmp' | 'cache';
}

export class StockDataService {
  private alphaVantageDAO: AlphaVantageDAO;
  private fmpDAO: FinancialModelingPrepDAO;

  constructor() {
    this.alphaVantageDAO = new AlphaVantageDAO();
    this.fmpDAO = new FinancialModelingPrepDAO();
  }

  /**
   * Get stock quote with fallback logic
   * 1. Try cache
   * 2. Try Alpha Vantage (primary)
   * 3. Fallback to FMP
   */
  async getStockQuote(symbol: string): Promise<StockQuote> {
    const cacheKey = `quote-${symbol}`;

    // 1. Check cache (5min TTL)
    const cached = loadFromCache<StockQuote>(cacheKey);
    if (cached && getCacheAge(cacheKey) < 5 * 60 * 1000) {
      console.log(`Cache hit for ${symbol}`);
      return { ...cached, source: 'cache' };
    }

    // 2. Try Alpha Vantage (primary provider)
    try {
      const avQuote = await this.alphaVantageDAO.getQuote(symbol);
      const quote: StockQuote = {
        ...avQuote,
        source: 'alphavantage'
      };

      saveToCache(cacheKey, quote);
      return quote;
    } catch (error) {
      console.warn(`Alpha Vantage failed for ${symbol}, trying FMP`, error);
    }

    // 3. Fallback to FMP
    try {
      const fmpQuote = await this.fmpDAO.getQuote(symbol);
      const quote: StockQuote = {
        ...fmpQuote,
        source: 'fmp'
      };

      saveToCache(cacheKey, quote);
      return quote;
    } catch (error) {
      console.error(`All providers failed for ${symbol}`, error);

      // Return stale cache if available
      if (cached) {
        console.log(`Returning stale cache for ${symbol}`);
        return { ...cached, source: 'cache' };
      }

      throw new Error(`Failed to fetch quote for ${symbol}`);
    }
  }

  /**
   * Get multiple stock quotes (batch)
   */
  async getBatchQuotes(symbols: string[]): Promise<Record<string, StockQuote>> {
    const results: Record<string, StockQuote> = {};

    // Fetch in parallel
    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getStockQuote(symbol);
        return { symbol, quote };
      } catch (error) {
        console.error(`Failed to fetch ${symbol}:`, error);
        return { symbol, quote: null };
      }
    });

    const settled = await Promise.allSettled(promises);

    settled.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.quote) {
        results[result.value.symbol] = result.value.quote;
      }
    });

    return results;
  }
}
```

### Example: FinancialDataService

```typescript
// lib/services/financial-data.service.ts
import { AlphaVantageDAO } from '@/lib/dao/alpha-vantage.dao';
import { YahooFinanceDAO } from '@/lib/dao/yahoo-finance.dao';

export interface Fundamentals {
  symbol: string;
  pe: number | null;
  eps: number | null;
  marketCap: number | null;
  revenue: number | null;
  // ... more fields
}

export class FinancialDataService {
  private alphaVantageDAO: AlphaVantageDAO;
  private yahooFinanceDAO: YahooFinanceDAO;

  constructor() {
    this.alphaVantageDAO = new AlphaVantageDAO();
    this.yahooFinanceDAO = new YahooFinanceDAO();
  }

  /**
   * Get comprehensive fundamentals from multiple sources
   */
  async getFundamentals(symbol: string): Promise<Fundamentals> {
    // Try Yahoo Finance first (more reliable for fundamentals)
    try {
      const yahooData = await this.yahooFinanceDAO.getFundamentals(symbol);
      return this.transformYahooData(yahooData);
    } catch (error) {
      console.warn('Yahoo Finance failed, trying Alpha Vantage', error);
    }

    // Fallback to Alpha Vantage
    const avData = await this.alphaVantageDAO.getCompanyOverview(symbol);
    return this.transformAlphaVantageData(avData);
  }

  private transformYahooData(data: any): Fundamentals {
    // Transform Yahoo Finance response to our Fundamentals model
    return {
      symbol: data.symbol,
      pe: data.trailingPE,
      eps: data.trailingEps,
      marketCap: data.marketCap,
      revenue: data.totalRevenue,
      // ... more fields
    };
  }

  private transformAlphaVantageData(data: any): Fundamentals {
    // Transform Alpha Vantage response to our Fundamentals model
    return {
      symbol: data.Symbol,
      pe: parseFloat(data.PERatio) || null,
      eps: parseFloat(data.EPS) || null,
      marketCap: parseFloat(data.MarketCapitalization) || null,
      revenue: parseFloat(data.RevenueTTM) || null,
      // ... more fields
    };
  }
}
```

---

## 🔌 Controller Layer (API Routes)

### Example: Updated API Route

```typescript
// app/api/quote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { StockDataService } from '@/lib/services/stock-data.service';

export const dynamic = 'force-dynamic';

const stockDataService = new StockDataService();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols');

    if (!symbols) {
      return NextResponse.json(
        { error: 'Missing symbols parameter' },
        { status: 400 }
      );
    }

    const symbolList = symbols.split(',').map(s => s.trim());

    // Use service layer
    const quotes = await stockDataService.getBatchQuotes(symbolList);

    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
```

---

## 📝 Migration Plan

### Phase 1: Create DAO Layer
1. Create `lib/dao/base.dao.ts` with shared HTTP logic
2. Create individual DAOs:
   - `alpha-vantage.dao.ts`
   - `fmp.dao.ts`
   - `yahoo-finance.dao.ts`
   - `finnhub.dao.ts`
   - `brave-search.dao.ts`
   - `sec-edgar.dao.ts`

### Phase 2: Create Service Layer
1. Create `lib/services/stock-data.service.ts`
2. Create `lib/services/financial-data.service.ts`
3. Create `lib/services/news.service.ts`
4. Create `lib/services/market-data.service.ts`

### Phase 3: Update API Routes
1. Update `app/api/quote/route.ts` to use `StockDataService`
2. Update `app/api/fundamentals/route.ts` to use `FinancialDataService`
3. Update news routes to use `NewsService`
4. Update commodity routes to use `MarketDataService`

### Phase 4: Update React Hooks
1. Update `lib/hooks/useDatabase.ts` if needed
2. Ensure hooks still work with new API responses

### Phase 5: Testing & Cleanup
1. Run all tests
2. Fix any breaking changes
3. Remove old `lib/api/` files
4. Update documentation

---

## ✅ Benefits

1. **Separation of Concerns**
   - DAOs: Pure data access, no business logic
   - Services: Business logic, orchestration, fallbacks
   - Controllers: Request/response handling

2. **Testability**
   - Easy to mock DAOs in service tests
   - Easy to mock services in controller tests

3. **Maintainability**
   - Clear responsibility boundaries
   - Easier to add new data sources
   - Easier to change business logic

4. **Reusability**
   - Services can be used by multiple controllers
   - DAOs can be used by multiple services

5. **Consistency**
   - Standard patterns across codebase
   - Similar to Spring Boot architecture (familiar to many developers)

---

## 🔗 Related Documents

- **CLAUDE.md** - Development guidelines
- **API_PROVIDERS.md** - External API documentation
- **ACTIVE_TODOS.md** - Current sprint tasks

---

**Status:** Ready to implement
**Estimated Time:** 6-8 hours
