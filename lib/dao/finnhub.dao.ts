/**
 * Finnhub Data Access Object
 *
 * Handles all HTTP requests to Finnhub API.
 * Provides company news and market data.
 */
import { BaseDAO } from './base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface FinnhubNews {
  headline: string;
  link: string;
  datetime: number;
  source: string;
  summary: string;
}

// ============================================================================
// DAO CLASS
// ============================================================================

export class FinnhubDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://finnhub.io/api/v1';

  constructor() {
    super();
    this.apiKey = process.env.FINNHUB_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Finnhub API key not configured');
    }
  }

  /**
   * Get company news for a symbol
   */
  async getCompanyNews(symbol: string, from?: string, to?: string): Promise<FinnhubNews[]> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const fromDate = from || thirtyDaysAgo.toISOString().split('T')[0];
    const toDate = to || now.toISOString().split('T')[0];

    const url = this.buildUrl(`${this.baseUrl}/company-news`, {
      symbol: symbol,
      from: fromDate,
      to: toDate,
      token: this.apiKey
    });

    console.log(`Fetching Finnhub news for: ${symbol}`);

    const data = await this.fetchWithTimeout<FinnhubNews[]>(url, 10000);

    if (!Array.isArray(data)) {
      throw new Error(`Invalid Finnhub response for ${symbol}`);
    }

    console.log(`Finnhub news count for ${symbol}: ${data.length}`);

    return data.map((article) => ({
      headline: article.headline,
      link: article.link,
      datetime: article.datetime,
      source: article.source,
      summary: article.summary
    }));
  }
}

// Export singleton instance
export const finnhubDAO = new FinnhubDAO();
