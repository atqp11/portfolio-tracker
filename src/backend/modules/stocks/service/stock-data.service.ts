/**
 * Stock Data Service
 *
 * Business logic layer for stock quotes and pricing data.
 * Implements fallback logic, caching, and error handling via Data Source Orchestrator.
 *
 * Phase 1: Migrated to distributed cache (Vercel KV / Upstash Redis)
 * Phase 3: Migrated to Data Source Orchestrator (Tiingo → Yahoo Finance fallback)
 */
import { DataSourceOrchestrator } from '@lib/data-sources';
import { tiingoQuoteProvider, yahooFinanceQuoteProvider, type StockQuote } from '@lib/data-sources/provider-adapters';
import type { TierName } from '@lib/config/types';

// ============================================================================
// INTERFACES
// ============================================================================

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
  private readonly orchestrator: DataSourceOrchestrator;

  constructor() {
    this.orchestrator = DataSourceOrchestrator.getInstance();
  }

  /**
   * Get stock quote with intelligent fallback via orchestrator
   *
   * Strategy (managed by orchestrator):
   * 1. Check cache (TTL based on tier)
   * 2. Try Tiingo (primary - batch capable)
   * 3. Fallback to Yahoo Finance
   * 4. Return stale cache if all fail (if allowStale: true)
   *
   * @param symbol - Stock ticker symbol
   * @param tier - User tier for TTL selection
   * @returns Stock quote with source indicator
   */
  async getQuote(symbol: string, tier?: TierName): Promise<StockQuote | null> {
    const result = await this.orchestrator.fetchWithFallback<StockQuote>({
      key: symbol,
      providers: [tiingoQuoteProvider, yahooFinanceQuoteProvider],
      cacheKeyPrefix: 'quotes',
      tier: tier || 'free',
      allowStale: true, // Graceful degradation
    });

    if (result.data === null) {
      console.error(`[StockDataService] Failed to fetch quote for ${symbol}:`, result.errors);
      return null;
    }

    // Log cache/staleness info
    if (result.cached) {
      const ageMinutes = Math.round((result.age || 0) / 60000);
      console.log(`[StockDataService] Cache hit for ${symbol} (age: ${ageMinutes}m)`);
    } else {
      console.log(`[StockDataService] Fresh fetch for ${symbol} from ${result.data.source}`);
    }

    return result.data;
  }

  /**
   * Get multiple stock quotes in batch
   *
   * Uses orchestrator's batchFetch for efficient parallel fetching.
   * Tiingo supports up to 500 symbols per batch request.
   *
   * @param symbols - Array of stock ticker symbols
   * @param tier - User tier for TTL selection
   * @returns Object with quotes, errors, and statistics
   */
  async getBatchQuotes(symbols: string[], tier?: TierName): Promise<BatchQuoteResult> {
    console.log(`[StockDataService] Fetching batch quotes for ${symbols.length} symbols`);

    const result = await this.orchestrator.batchFetch<StockQuote>({
      keys: symbols,
      provider: tiingoQuoteProvider, // Use batch-capable provider
      cacheKeyPrefix: 'quotes',
      tier: tier || 'free',
    });

    const quotes: Record<string, StockQuote> = {};
    const errors: Record<string, string> = {};
    let cachedCount = 0;
    let freshCount = 0;

    // Process results
    Object.entries(result.results).forEach(([symbol, fetchResult]) => {
      if (fetchResult.data) {
        quotes[symbol] = fetchResult.data;

        if (fetchResult.cached) {
          cachedCount++;
        } else {
          freshCount++;
        }
      }
    });

    // Collect errors
    Object.entries(result.errors).forEach(([symbol, errorList]) => {
      errors[symbol] = errorList.map(e => `${e.provider}: ${e.message}`).join('; ');
    });

    console.log(
      `[StockDataService] Batch complete: ${result.summary.successful} success, ${result.summary.failed} errors ` +
      `(${result.summary.cached} cached, ${result.summary.fresh} fresh)`
    );

    return {
      quotes,
      errors,
      cached: cachedCount,
      fresh: freshCount,
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
   * @returns Status of providers and orchestrator statistics
   */
  async healthCheck(): Promise<{
    tiingo: boolean;
    yahooFinance: boolean;
    orchestratorStats: any;
  }> {
    const testSymbol = 'AAPL'; // Use AAPL for health check

    const results = {
      tiingo: false,
      yahooFinance: false,
      orchestratorStats: this.orchestrator.getStats(),
    };

    // Test Tiingo
    try {
      await tiingoQuoteProvider.fetch(testSymbol);
      results.tiingo = true;
    } catch (error) {
      console.warn('[StockDataService] Tiingo health check failed');
    }

    // Test Yahoo Finance
    try {
      await yahooFinanceQuoteProvider.fetch(testSymbol);
      results.yahooFinance = true;
    } catch (error) {
      console.warn('[StockDataService] Yahoo Finance health check failed');
    }

    return results;
  }
}

// Export singleton instance
export const stockDataService = new StockDataService();

// Re-export StockQuote type for backward compatibility
export type { StockQuote };
