/**
 * Brave Search Data Access Object
 *
 * Handles all HTTP requests to Brave Search API.
 * Provides web search for news and information.
 */
import { BaseDAO } from '@backend/common/dao/base.dao';

// ============================================================================
// INTERFACES
// ============================================================================

export interface BraveSearchResult {
  title: string;
  description: string;
  url: string;
  age?: string;
}

export interface BraveSearchResponse {
  web: {
    results: BraveSearchResult[];
  };
}

// ============================================================================
// DAO CLASS
// ============================================================================

export class BraveSearchDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.search.brave.com/res/v1/web/search';

  constructor() {
    super();
    this.apiKey = process.env.BRAVE_SEARCH_API_KEY || '';

    if (!this.apiKey) {
      console.warn('Brave Search API key not configured');
    }
  }

  /**
   * Search for news about a query
   */
  async search(query: string, count: number = 10): Promise<BraveSearchResult[]> {
    const url = this.buildUrl(this.baseUrl, {
      q: query,
      count: count.toString(),
      freshness: 'pw' // past week
    });

    console.log(`Brave Search query: ${query}`);

    const headers = {
      'X-Subscription-Token': this.apiKey,
      'Accept': 'application/json'
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: BraveSearchResponse = await response.json();

      console.log(`Brave Search results for "${query}": ${data.web?.results?.length || 0} results`);

      return data.web?.results || [];
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// Export singleton instance
export const braveSearchDAO = new BraveSearchDAO();
