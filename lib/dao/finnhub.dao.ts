/**
 * Finnhub Data Access Object
 *
 * Handles all HTTP requests to Finnhub API.
 * Provides company news and market data.
 */
import { BaseDAO } from './base.dao';
import { FinnhubNews } from '@/types/finnhub-news.dto';

// ============================================================================
// INTERFACES
// ============================================================================



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

    const data = await this._fetchNews(url, symbol);

    console.log(`Finnhub news count for ${symbol}: ${data.length}`);

    return data;
  }


   /**
   * Get general news for a category
   */
  async getGeneralNews(category: string = 'general'): Promise<FinnhubNews[]> {
        console.log(`Fetching Finnhub general news for category: ${category}`);

    const url = this.buildUrl(`${this.baseUrl}/news`, {
      category,
      token: this.apiKey
    });
    return await this._fetchNews(url, 'general');
  }

  /**
   * Shared news fetch logic for company and general news
   */
  private async _fetchNews(url: string, context: string): Promise<FinnhubNews[]> {
    let rawData: any[];
    try {
      rawData = await this.fetchWithTimeout<any[]>(url, 10000);
    } catch (err: any) {
      if (typeof err?.message === 'string') {
        if (err.message.includes('HTTP 401')) {
          throw new Error('Finnhub API unauthorized (401): Check API key');
        }
        if (err.message.includes('HTTP 429')) {
          throw new Error('Finnhub API rate limit exceeded (429)');
        }
      }
      throw err;
    }
    if (!Array.isArray(rawData)) {
      throw new Error(`Invalid Finnhub response for ${context}`);
    }
    // Map raw API response to FinnhubNews DTO
    return rawData.map((article) => ({
      headline: article.headline,
      link: article.url ?? article.link,
      datetime: article.datetime,
      source: article.source,
      summary: article.summary
    }));
  }
}

// Export singleton instance
export const finnhubDAO = new FinnhubDAO();
