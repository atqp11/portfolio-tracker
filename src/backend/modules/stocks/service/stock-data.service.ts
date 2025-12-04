/**
 * Stock Data Service
 *
 * Business logic layer for stock quotes and pricing data.
 * Implements fallback logic, caching, and error handling.
 *
 * Phase 1: Migrated to distributed cache (Vercel KV / Upstash Redis)
 */
import { alphaVantageDAO, AlphaVantageQuoteResponse } from '@backend/modules/stocks/dao/alpha-vantage.dao';
import { fmpDAO, FMPQuoteResponse } from '@backend/modules/stocks/dao/fmp.dao';
import { getCacheAdapter, type CacheAdapter } from '@lib/cache/adapter';
import { getCacheTTL } from '@lib/config/cache-ttl.config';
import type { TierName } from '@lib/config/types';

// ============================================================================
// INTERFACES
// ============================================================================

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  source: 'alphavantage' | 'fmp' | 'cache';
  timestamp: number;
}

export interface BatchQuoteResult {
  quotes: Record<string, StockQuote>;
  errors: Record<string, string>;
  cached: number;
  fresh: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class StockDataService {
  private readonly cache: CacheAdapter;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes fallback

  constructor() {
    this.cache = getCacheAdapter();
  }

  /**
   * Get cache TTL based on user tier
   */
  private getCacheTTL(tier?: TierName): number {
    if (tier) {
      return getCacheTTL('quotes', tier);
    }
    return this.DEFAULT_TTL;
  }

  /**
   * Get stock quote with intelligent fallback
   *
   * Strategy:
   * 1. Check cache (TTL based on tier)
   * 2. Try Alpha Vantage (primary)
   * 3. Fallback to FMP
   * 4. Return stale cache if all fail
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Stock quote with source indicator
   */
  async getQuote(symbol: string, tier?: TierName): Promise<StockQuote> {
    const cacheKey = `quote:${symbol}:v1`;
    const ttl = this.getCacheTTL(tier);

    // 1. Check cache
    const cached = await this.cache.get<StockQuote>(cacheKey);
    if (cached) {
      const age = await this.cache.getAge(cacheKey);
      console.log(`[StockDataService] Cache hit for ${symbol} (age: ${age}ms)`);
      return {
        ...cached,
        source: 'cache'
      };
    }

    console.log(`[StockDataService] Cache miss for ${symbol}`);

    // 2. Try Alpha Vantage (primary provider)
    try {
      console.log(`[StockDataService] Fetching ${symbol} from Alpha Vantage`);
      const avQuote = await alphaVantageDAO.getQuote(symbol);

      const quote: StockQuote = {
        ...avQuote,
        source: 'alphavantage',
        timestamp: Date.now()
      };

      await this.cache.set(cacheKey, quote, ttl);
      return quote;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[StockDataService] Alpha Vantage failed for ${symbol}: ${errorMsg}`);

      // If rate limited, try to get stale cache
      if (errorMsg.includes('RATE_LIMIT')) {
        const staleCache = await this.cache.get<StockQuote>(cacheKey);
        if (staleCache) {
          console.log(`[StockDataService] Rate limited, returning stale cache for ${symbol}`);
          return {
            ...staleCache,
            source: 'cache'
          };
        }
      }
    }

    // 3. Fallback to FMP
    try {
      console.log(`[StockDataService] Fetching ${symbol} from FMP (fallback)`);
      const fmpQuote = await fmpDAO.getQuote(symbol);

      const quote: StockQuote = {
        ...fmpQuote,
        source: 'fmp',
        timestamp: Date.now()
      };

      await this.cache.set(cacheKey, quote, ttl);
      return quote;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[StockDataService] FMP also failed for ${symbol}: ${errorMsg}`);
    }

    // 4. Return stale cache if available (check again for any cached value)
    const staleCache = await this.cache.get<StockQuote>(cacheKey);
    if (staleCache) {
      console.log(`[StockDataService] All providers failed, returning stale cache for ${symbol}`);
      return {
        ...staleCache,
        source: 'cache'
      };
    }

    // Return a StockQuote with price: null and error info for UI to handle gracefully
    return {
      symbol,
      price: null as any, // UI should check for null
      change: null as any,
      changePercent: 'N/A',
      source: 'cache',
      timestamp: Date.now(),
    };
  }

  /**
   * Get multiple stock quotes in batch
   *
   * Fetches quotes in parallel with individual error handling.
   *
   * @param symbols - Array of stock ticker symbols
   * @param tier - User tier for TTL selection
   * @returns Object with quotes, errors, and statistics
   */
  async getBatchQuotes(symbols: string[], tier?: TierName): Promise<BatchQuoteResult> {
    console.log(`[StockDataService] Fetching batch quotes for: ${symbols.join(', ')}`);

    const results: Record<string, StockQuote> = {};
    const errors: Record<string, string> = {};
    let cachedCount = 0;
    let freshCount = 0;

    // Fetch all quotes in parallel
    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getQuote(symbol, tier);

        if (quote.source === 'cache') {
          cachedCount++;
        } else {
          freshCount++;
        }

        return { symbol, quote, error: null };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[StockDataService] Failed to fetch ${symbol}:`, errorMsg);
        return { symbol, quote: null, error: errorMsg };
      }
    });

    const settled = await Promise.all(promises);

    // Process results
    settled.forEach((result) => {
      if (result.quote) {
        results[result.symbol] = result.quote;
      } else if (result.error) {
        errors[result.symbol] = result.error;
      }
    });

    console.log(`[StockDataService] Batch complete: ${Object.keys(results).length} success, ${Object.keys(errors).length} errors (${cachedCount} cached, ${freshCount} fresh)`);

    return {
      quotes: results,
      errors,
      cached: cachedCount,
      fresh: freshCount
    };
  }

  /**
   * Get quotes for specific symbols, returns as price map
   *
   * @param symbols - Array of stock ticker symbols
   * @returns Map of symbol to current price
   */
  async getPriceMap(symbols: string[]): Promise<Record<string, number>> {
    const result = await this.getBatchQuotes(symbols);
    const priceMap: Record<string, number> = {};

    Object.entries(result.quotes).forEach(([symbol, quote]) => {
      priceMap[symbol] = quote.price;
    });

    return priceMap;
  }

  /**
   * Check if quotes can be fetched (provider health check)
   *
   * @returns Status of providers
   */
  async healthCheck(): Promise<{
    alphaVantage: boolean;
    fmp: boolean;
  }> {
    const testSymbol = 'AAPL'; // Use AAPL for health check

    const results = {
      alphaVantage: false,
      fmp: false
    };

    // Test Alpha Vantage
    try {
      await alphaVantageDAO.getQuote(testSymbol);
      results.alphaVantage = true;
    } catch (error) {
      console.warn('[StockDataService] Alpha Vantage health check failed');
    }

    // Test FMP
    try {
      await fmpDAO.getQuote(testSymbol);
      results.fmp = true;
    } catch (error) {
      console.warn('[StockDataService] FMP health check failed');
    }

    return results;
  }
}

// Export singleton instance
export const stockDataService = new StockDataService();
