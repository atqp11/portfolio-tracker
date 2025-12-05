/**
 * Tiingo Data Access Object
 *
 * Provides access to Tiingo's stock quote and company data APIs.
 * Supports batch fetching of up to 500 symbols per request.
 *
 * API Documentation: https://api.tiingo.com/documentation/general/overview
 * Pricing: $10/month for unlimited requests (Power tier)
 */

import { BaseDAO } from '@backend/common/dao/base.dao';
import { PROVIDER_CONFIG } from '@lib/config/providers.config';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Raw Tiingo IEX quote response (EOD + delayed intraday)
 */
export interface TiingoQuoteResponse {
  ticker: string;
  timestamp: string; // ISO 8601 format
  last: number; // Last price
  prevClose: number;
  open: number;
  high: number;
  low: number;
  mid: number | null;
  volume: number;
  bidSize: number | null;
  bidPrice: number | null;
  askSize: number | null;
  askPrice: number | null;
  tngoLast: number;
}

/**
 * Standard stock quote format
 */
export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  timestamp: number;
  source: string;
}

// ============================================================================
// DAO
// ============================================================================

export class TiingoDAO extends BaseDAO {
  private apiKey: string | null = null;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor() {
    super();
    const config = PROVIDER_CONFIG.tiingo;

    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl!;
    this.timeout = config.timeout;
  }

  /**
   * Ensure API key is available before making requests
   */
  private ensureApiKey(): string {
    if (!this.apiKey) {
      throw new Error('TIINGO_API_KEY environment variable is not configured. Please set it in your .env.local file.');
    }
    return this.apiKey;
  }

  /**
   * Get quote for a single symbol
   *
   * @param symbol - Stock ticker symbol (e.g., 'AAPL')
   * @returns Stock quote data
   * @throws Error on API failure or invalid symbol
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    const quotes = await this.batchGetQuotes([symbol]);
    const quote = quotes.get(symbol);

    if (!quote) {
      throw new Error(`No quote data returned for symbol: ${symbol}`);
    }

    return quote;
  }

  /**
   * Batch fetch quotes for multiple symbols (up to 500)
   *
   * Tiingo supports batch requests for efficient multi-symbol fetching.
   * API returns array of quote objects.
   *
   * @param symbols - Array of stock ticker symbols
   * @returns Map of symbol to quote data
   * @throws Error on API failure
   *
   * @example
   * ```ts
   * const quotes = await tiingoDAO.batchGetQuotes(['AAPL', 'MSFT', 'GOOGL']);
   * console.log(quotes.get('AAPL')?.price); // 150.25
   * ```
   */
  async batchGetQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    if (symbols.length === 0) {
      return new Map();
    }

    if (symbols.length > 500) {
      throw new Error(`Tiingo batch limit is 500 symbols. Received: ${symbols.length}`);
    }

    // Ensure API key is available
    const apiKey = this.ensureApiKey();

    // Build URL with tickers as comma-separated list
    const tickers = symbols.join(',');
    const url = `${this.baseUrl}/iex/?tickers=${tickers}&token=${apiKey}`;

    try {
      const response = await this.fetchWithTimeout<TiingoQuoteResponse[]>(url, this.timeout);

      // Transform responses to standard format
      const quotes = new Map<string, StockQuote>();

      for (const item of response) {
        const symbol = item.ticker;
        // Use tngoLast (Tiingo's computed last price) when 'last' is null (outside market hours)
        const price = item.last ?? item.tngoLast;
        const change = price - item.prevClose;
        const changePercent = ((change / item.prevClose) * 100).toFixed(2);

        quotes.set(symbol, {
          symbol,
          price,
          change,
          changePercent,
          volume: item.volume,
          high: item.high,
          low: item.low,
          open: item.open,
          previousClose: item.prevClose,
          timestamp: new Date(item.timestamp).getTime(),
          source: 'tiingo',
        });
      }

      return quotes;
    } catch (error) {
      // Enhance error message for debugging
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Tiingo API error: ${message}`);
    }
  }

  /**
   * Health check - verify API connectivity
   *
   * @returns True if API is reachable
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getQuote('AAPL'); // Test with a known symbol
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of Tiingo DAO
 * Reuse across the application to avoid creating multiple instances
 */
export const tiingoDAO = new TiingoDAO();
