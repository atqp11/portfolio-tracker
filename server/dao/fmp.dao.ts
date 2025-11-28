/**
 * Financial Modeling Prep Data Access Object
 *
 * Handles all HTTP requests to Financial Modeling Prep API.
 * Provides stock quotes as an alternative to Alpha Vantage.
 */
import { BaseDAO } from './base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FMPQuoteResponse {
  symbol: string;
  price: number;
  change: number;
  changePercent: string;
}

// ============================================================================
// DAO CLASS
// ============================================================================

export class FinancialModelingPrepDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://financialmodelingprep.com/stable';

  constructor() {
    super();
    this.apiKey = process.env.FMP_API_KEY || '';

    if (!this.apiKey) {
      console.warn('FMP API key not configured');
    }
  }

  /**
   * Get real-time quote for a single symbol
   */
  async getQuote(symbol: string): Promise<FMPQuoteResponse> {
    const url = this.buildUrl(`${this.baseUrl}/quote`, {
      symbol: encodeURIComponent(symbol),
      apikey: this.apiKey
    });

    console.log(`Fetching FMP quote for symbol: ${symbol}`);
    console.log(`FMP request URL: ${url}`);

    const data = await this.fetchWithTimeout(url, 5000);

    console.log(`FMP data for ${symbol}:`, data);

    // FMP returns array of quotes
    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`No FMP quote data for ${symbol}`);
      throw new Error(`No quote data for ${symbol}`);
    }

    const quote = data[0];

    const parsed = {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage?.toFixed(2) + '%' || '0.00%'
    };

    console.log(`Parsed FMP quote for ${symbol}:`, parsed);

    return parsed;
  }

  /**
   * Get quotes for multiple symbols (per-symbol requests)
   * Note: FMP free tier doesn't support batch endpoint, so we fetch individually
   */
  async getQuotes(symbols: string[]): Promise<Record<string, FMPQuoteResponse>> {
    const results: Record<string, FMPQuoteResponse> = {};

    console.log(`Fetching FMP quotes (per-symbol) for: ${symbols.join(', ')}`);

    const settled = await Promise.allSettled(
      symbols.map((symbol) => this.getQuote(symbol))
    );

    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[symbols[index]] = result.value;
      }
    });

    console.log(`Fetched ${Object.keys(results).length} quotes via per-symbol requests`);

    return results;
  }
}

// Export singleton instance
export const fmpDAO = new FinancialModelingPrepDAO();
