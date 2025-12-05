# Phase 3: Data Source Orchestrator & Provider Cleanup - Implementation Prompt

## Context
- **Phase 2 COMPLETE:** Orchestrator core (`src/lib/data-sources/orchestrator.ts`) already implemented with circuit breaker, deduplication, telemetry
- **Current state:** Services use old providers (Alpha Vantage, FMP, Finnhub, NewsAPI)
- **Goal:** Create provider adapters, migrate services, delete old provider code

## Task Overview
1. Create Tiingo provider adapter (batch-capable)
2. Wrap existing DAOs as providers
3. Migrate StockDataService to use orchestrator
4. **Delete FMP, Finnhub, NewsAPI files**
5. Verify cleanup complete

---

## Task 1: Tiingo Provider Adapter (4 hours)

**Create:** `src/backend/modules/stocks/dao/tiingo.dao.ts`

```typescript
import { BaseDAO } from '@backend/common/dao/base.dao';

export class TiingoDAO extends BaseDAO {
  private apiKey = process.env.TIINGO_API_KEY!;
  private baseUrl = 'https://api.tiingo.com/tiingo';

  // Batch fetch (up to 500 symbols)
  async batchGetQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const tickers = symbols.join(',');
    const url = `${this.baseUrl}/daily/${tickers}/prices?token=${this.apiKey}`;
    const response = await this.fetchWithTimeout(url);

    const quotes = new Map<string, StockQuote>();
    for (const item of response) {
      quotes.set(item.ticker, {
        symbol: item.ticker,
        price: item.close,
        change: item.close - item.prevClose,
        changePercent: ((item.close - item.prevClose) / item.prevClose * 100).toFixed(2),
        timestamp: new Date(item.date).getTime(),
        source: 'tiingo'
    }
    return quotes;
  }
      ---

      ## Success Criteria

      - [x] Tiingo DAO created and tested
      - [x] Provider adapters created
      - [x] StockDataService migrated (58 lines → 15 lines)
      - [x] FMP, Finnhub, NewsAPI files deleted
      - [x] All imports removed
      - [x] Environment variables cleaned up
      - [x] TypeScript compiles without errors
      - [x] All tests pass (81+ tests)
      - [x] Build succeeds

```typescript
import { DataProvider, BatchDataProvider } from './types';
import { tiingoDAO } from '@backend/modules/stocks/dao/tiingo.dao';
import { yahooFinanceDAO } from '@backend/modules/stocks/dao/yahoo-finance.dao';

// Batch-capable Tiingo provider
export class TiingoQuoteProvider implements BatchDataProvider<StockQuote> {
  readonly name = 'tiingo';
  readonly maxBatchSize = 500;

  async fetch(symbol: string): Promise<StockQuote> {
    return tiingoDAO.getQuote(symbol);
  }

  async batchFetch(symbols: string[]): Promise<Record<string, StockQuote>> {
    const quotes = await tiingoDAO.batchGetQuotes(symbols);
    return Object.fromEntries(quotes);
  }
}

// Yahoo Finance fallback (single-fetch only)
export class YahooFinanceQuoteProvider implements DataProvider<StockQuote> {
  readonly name = 'yahooFinance';

  async fetch(symbol: string): Promise<StockQuote> {
    return yahooFinanceDAO.getQuote(symbol);
  }
}

export const tiingoQuoteProvider = new TiingoQuoteProvider();
export const yahooFinanceQuoteProvider = new YahooFinanceQuoteProvider();
```

**Add to config:** `src/lib/config/providers.config.ts`

```typescript
export const PROVIDER_CONFIG = {
  tiingo: {
    name: 'tiingo',
    enabled: process.env.TIINGO_API_KEY ? true : false,
    priority: 1,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeout: 60000,
      halfOpenMaxRequests: 3,
    },
    rateLimit: { requestsPerMinute: 100, requestsPerDay: 10000 },
  },
  yahooFinance: {
    name: 'yahooFinance',
    enabled: true,
    priority: 2,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeout: 120000,
      halfOpenMaxRequests: 1,
    },
    rateLimit: { requestsPerMinute: 10, requestsPerDay: 500 },
  },
};
```

---

## Task 2: Migrate StockDataService (6 hours)

**Update:** `src/backend/modules/stocks/service/stock-data.service.ts`

**Before (58 lines of fallback logic):**
```typescript
// Manual cache check, Alpha Vantage → FMP → Stale cache
```

**After (15 lines with orchestrator):**
```typescript
import { DataSourceOrchestrator } from '@lib/data-sources';
import { tiingoQuoteProvider, yahooFinanceQuoteProvider } from '@lib/data-sources/provider-adapters';

export class StockDataService {
  private orchestrator = DataSourceOrchestrator.getInstance();

  async getQuote(symbol: string, tier: TierName): Promise<StockQuote | null> {
    const result = await this.orchestrator.fetchWithFallback<StockQuote>({
      key: symbol,
      providers: [tiingoQuoteProvider, yahooFinanceQuoteProvider],
      cacheKeyPrefix: 'quotes',
      tier,
      allowStale: true,
    });

    if (result.data === null) {
      console.error(`Quote fetch failed for ${symbol}:`, result.errors);
    }

    return result.data;
  }

  async getQuotes(symbols: string[], tier: TierName): Promise<Record<string, StockQuote>> {
    const result = await this.orchestrator.batchFetch<StockQuote>({
      keys: symbols,
      provider: tiingoQuoteProvider,
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

---

## Task 3: Delete Old Provider Code (3 hours)

**Files to DELETE:**
```bash
rm src/backend/modules/stocks/dao/fmp.dao.ts
rm src/backend/modules/stocks/service/fmp.service.ts
rm src/backend/modules/stocks/dao/finnhub.dao.ts
rm src/backend/modules/stocks/service/finnhub.service.ts
rm src/backend/modules/news/dao/news.dao.ts  # if NewsAPI-specific
rm src/test/fmp.spec.ts
rm src/test/finnhub.spec.ts
```

**Remove from `.env.local.example`:**
```bash
# Remove these lines:
FMP_API_KEY=
FINNHUB_API_KEY=
NEWS_API_KEY=
```

**Search and remove imports:**
```bash
# Find remaining references
grep -r "fmpDAO\|fmpService" src/
grep -r "finnhubDAO\|finnhubService" src/
grep -r "newsapi" src/ --ignore-case

# Remove import statements and references
```

---

## Task 4: Environment Setup (1 hour)

**Add to `.env.local`:**
```bash
TIINGO_API_KEY=your_key_here  # Get from tiingo.com ($10/month plan)
```

**Verify Vercel Secrets:**
```bash
vercel env add TIINGO_API_KEY
```

---

## Task 5: Testing (12 hours)

**Create:** `src/backend/modules/stocks/dao/__tests__/tiingo.dao.test.ts`

```typescript
describe('TiingoDAO', () => {
  it('should batch fetch 500 symbols', async () => {
    const symbols = Array.from({ length: 500 }, (_, i) => `SYM${i}`);
    const quotes = await tiingoDAO.batchGetQuotes(symbols);
    expect(quotes.size).toBe(500);
  });

  it('should handle provider failure gracefully', async () => {
    await expect(tiingoDAO.getQuote('INVALID')).rejects.toThrow();
  });
});
```

**Integration test:** `src/test/integration/orchestrator-tiingo.test.ts`

```typescript
describe('Orchestrator with Tiingo', () => {
  it('should fallback from Tiingo to Yahoo Finance', async () => {
    // Mock Tiingo failure
    // Verify Yahoo is called
    // Verify result has source='yahooFinance'
  });

  it('should use stale cache when all providers fail', async () => {
    // Mock both provider failures
    // Verify stale cache returned
  });
});
```

**Run tests:**
```bash
npm test -- src/lib/data-sources/__tests__/
npm test -- src/backend/modules/stocks/
npm run build  # Must succeed
```

---

## Task 6: Final Verification (1 hour)

**Checklist:**
```bash
# Should return NO results
grep -r "fmpDAO" src/
grep -r "finnhubDAO" src/
grep -r "FMP_API_KEY" .
grep -r "FINNHUB_API_KEY" .
grep -r "NEWS_API_KEY" .

# Should succeed
npm run build
npm test
```

**Verify orchestrator stats:**
```typescript
const orchestrator = DataSourceOrchestrator.getInstance();
const stats = orchestrator.getStats();
console.log('Circuit breakers:', stats.circuitBreakers);
console.log('Telemetry:', stats.telemetry);
```

---

## Success Criteria

- [x] Tiingo DAO created and tested
- [x] Provider adapters created
- [x] StockDataService migrated (58 lines → 15 lines)
- [x] FMP, Finnhub, NewsAPI files deleted
- [x] All imports removed
- [x] Environment variables cleaned up
- [x] TypeScript compiles without errors
- [x] All tests pass (81+ tests)
- [x] Build succeeds

---

## Key Files Reference

**Already Implemented (Phase 2):**
- `src/lib/data-sources/orchestrator.ts` (690 LOC) ✅
- `src/lib/data-sources/circuit-breaker.ts` (300 LOC) ✅
- `src/lib/data-sources/deduplication.ts` (150 LOC) ✅
- `src/lib/data-sources/telemetry.ts` (250 LOC) ✅
- `src/lib/data-sources/types.ts` (200 LOC) ✅

**To Create (Phase 3):**
- `src/backend/modules/stocks/dao/tiingo.dao.ts`
- `src/lib/data-sources/provider-adapters.ts`
- Tests for new providers

**Documentation:**
- Full details: `product/Planning/refactoring/production-readiness-2024/PRODUCTION_READINESS_PLAN.md`
- Architecture: `docs/5_Guides/DATA_SOURCE_ORCHESTRATOR.md`
- API Reference: `src/lib/data-sources/README.md`

---

## Effort Estimate
- **Total:** 27 hours
- **Task 1:** 4 hours (Tiingo DAO + adapters)
- **Task 2:** 6 hours (Service migration)
- **Task 3:** 3 hours (Code deletion)
- **Task 4:** 1 hour (Environment)
- **Task 5:** 12 hours (Testing)
- **Task 6:** 1 hour (Verification)

---

## Notes for Coding Agent

1. **Read first:** `src/lib/data-sources/README.md` for orchestrator API
2. **Don't modify:** Phase 2 orchestrator code (already tested and working)
3. **Focus on:** Provider adapters + service migration + cleanup
4. **Test thoroughly:** 81 existing tests must still pass
5. **Verify cleanup:** Use grep commands to ensure no references remain

**Start with Task 1, then proceed sequentially. Run tests after each task.**
