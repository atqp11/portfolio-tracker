import { BaseDAO } from './base.dao';
import { NewsArticle, NewsAPIResponse, NewsAPIError } from '@/lib/types/news.dto';

export class NewsDAO extends BaseDAO {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://newsapi.org/v2/everything';

  constructor() {
    super();
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error('NEWS_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async fetchNews(query: string, pageSize: number = 10): Promise<NewsArticle[]> {
    const url = `${this.baseUrl}?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${pageSize}&apiKey=${this.apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PortfolioTracker/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');

        // Check for specific NewsAPI error codes
        if (response.status === 429) {
          throw new NewsAPIError(429, 'rateLimited', 'Rate limited by NewsAPI');
        } else if (response.status === 401) {
          throw new NewsAPIError(401, 'apiKeyInvalid', 'Invalid NewsAPI key');
        } else if (response.status === 403) {
          throw new NewsAPIError(403, 'apiKeyDisabled', 'NewsAPI key disabled or forbidden');
        }

        throw new Error(`NewsAPI request failed: ${response.status} - ${errorText}`);
      }

      const data: NewsAPIResponse = await response.json();

      if (data.status === 'error') {
        throw new NewsAPIError(500, data.code || 'unknown', data.message || 'NewsAPI error');
      }

      return data.articles || [];
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after 10000ms`);
        }
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}