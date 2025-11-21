/**
 * News Service
 *
 * Business logic layer for company and market news.
 * Aggregates news from multiple sources (Finnhub, Brave Search).
 */
import { finnhubDAO } from '@/lib/dao/finnhub.dao';
import { FinnhubNews } from '@/types/finnhub-news.dto';
import { braveSearchDAO, BraveSearchResult } from '@/lib/dao/brave-search.dao';
import { loadFromCache, saveToCache, getCacheAge } from '@/lib/cache';

// ============================================================================
// INTERFACES
// ============================================================================

export interface NewsArticle {
  headline: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: number; // Unix timestamp
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface NewsResponse {
  articles: NewsArticle[];
  sources: string[];
  cached: boolean;
  timestamp: number;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class NewsService {
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutes (news is time-sensitive)

  /**
   * Get company news from multiple sources
   *
   * Strategy:
   * 1. Check cache (15min TTL)
   * 2. Fetch from Finnhub (primary for company-specific news)
   * 3. Augment with Brave Search if needed
   * 4. Merge, deduplicate, and sort by recency
   *
   * @param symbol - Stock ticker symbol
   * @param limit - Maximum number of articles to return
   * @returns Aggregated news articles
   */
  async getCompanyNews(symbol: string, limit: number = 20): Promise<NewsResponse> {
    const cacheKey = `company-news-${symbol}`;

    // 1. Check cache
    const cached = loadFromCache<NewsResponse>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[NewsService] Cache hit for ${symbol} news (age: ${getCacheAge(cacheKey)}ms)`);
      return {
        ...cached,
        cached: true
      };
    }

    console.log(`[NewsService] Fetching company news for ${symbol}`);

    const articles: NewsArticle[] = [];
    const sources: string[] = [];

    // 2. Try Finnhub (primary source)
    try {
      console.log(`[NewsService] Fetching Finnhub news for ${symbol}`);
      const finnhubNews = await finnhubDAO.getCompanyNews(symbol);

      const mapped = finnhubNews.map((article) => ({
        headline: article.headline,
        summary: article.summary || '',
        url: article.link,
        source: article.source,
        publishedAt: article.datetime * 1000 // Convert to milliseconds
      }));

      articles.push(...mapped);
      sources.push('finnhub');

      console.log(`[NewsService] Finnhub returned ${mapped.length} articles for ${symbol}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[NewsService] Finnhub failed for ${symbol}: ${errorMsg}`);
    }

    // 3. Augment with Brave Search if we have few results
    if (articles.length < 5) {
      try {
        console.log(`[NewsService] Augmenting with Brave Search for ${symbol}`);
        const query = `${symbol} stock news`;
        const braveResults = await braveSearchDAO.search(query, 10);

        const mapped = braveResults.map((result) => ({
          headline: result.title,
          summary: result.description || '',
          url: result.url,
          source: new URL(result.url).hostname,
          publishedAt: Date.now() // Brave doesn't always provide exact timestamps
        }));

        articles.push(...mapped);
        sources.push('brave');

        console.log(`[NewsService] Brave Search returned ${mapped.length} articles for ${symbol}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`[NewsService] Brave Search failed for ${symbol}: ${errorMsg}`);
      }
    }

    // 4. Deduplicate by URL and sort by recency
    const uniqueArticles = this.deduplicateByUrl(articles);
    const sorted = uniqueArticles.sort((a, b) => b.publishedAt - a.publishedAt);
    const limited = sorted.slice(0, limit);

    const response: NewsResponse = {
      articles: limited,
      sources: [...new Set(sources)],
      cached: false,
      timestamp: Date.now()
    };

    // Save to cache
    saveToCache(cacheKey, response);

    console.log(`[NewsService] Returning ${limited.length} articles for ${symbol} from sources: ${response.sources.join(', ')}`);
    return response;
  }

  /**
   * Search general market news
   *
   * Uses Brave Search for broad market topics.
   *
   * @param query - Search query (e.g., "stock market crash", "Fed interest rates")
   * @param limit - Maximum number of articles
   * @returns News articles matching query
   */
  async searchMarketNews(query: string, limit: number = 20): Promise<NewsResponse> {
    const cacheKey = `market-news-${query}`;

    // Check cache
    const cached = loadFromCache<NewsResponse>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[NewsService] Cache hit for market news query: ${query}`);
      return {
        ...cached,
        cached: true
      };
    }

    console.log(`[NewsService] Searching market news: ${query}`);

    try {
      const braveResults = await braveSearchDAO.search(query, limit);

      const articles = braveResults.map((result) => ({
        headline: result.title,
        summary: result.description || '',
        url: result.url,
        source: new URL(result.url).hostname,
        publishedAt: Date.now() // Brave doesn't always provide exact timestamps
      }));

      const response: NewsResponse = {
        articles,
        sources: ['brave'],
        cached: false,
        timestamp: Date.now()
      };

      saveToCache(cacheKey, response);

      console.log(`[NewsService] Found ${articles.length} market news articles for query: ${query}`);
      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NewsService] Market news search failed for "${query}": ${errorMsg}`);

      // Return cached data if available
      if (cached) {
        console.log(`[NewsService] Returning stale cache for query: ${query}`);
        return {
          ...cached,
          cached: true
        };
      }

      throw new Error(`Failed to fetch market news for query: ${query}`);
    }
  }

  /**
   * Get trending news from multiple sectors
   *
   * Fetches news for popular sectors and returns aggregated results.
   *
   * @param sectors - Array of sectors to fetch (e.g., ['tech', 'finance'])
   * @returns Aggregated trending news
   */
  async getTrendingNews(sectors: string[] = ['technology', 'finance', 'energy']): Promise<NewsResponse> {
    const cacheKey = `trending-news-${sectors.join('-')}`;

    // Check cache
    const cached = loadFromCache<NewsResponse>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.CACHE_TTL) {
      console.log(`[NewsService] Cache hit for trending news`);
      return {
        ...cached,
        cached: true
      };
    }

    console.log(`[NewsService] Fetching trending news for sectors: ${sectors.join(', ')}`);

    const allArticles: NewsArticle[] = [];

    // Fetch news for each sector in parallel
    const promises = sectors.map(async (sector) => {
      try {
        const query = `${sector} stocks news`;
        const results = await braveSearchDAO.search(query, 5);

        return results.map((result) => ({
          headline: result.title,
          summary: result.description || '',
          url: result.url,
          source: new URL(result.url).hostname,
          publishedAt: Date.now()
        }));
      } catch (error) {
        console.warn(`[NewsService] Failed to fetch trending news for sector: ${sector}`);
        return [];
      }
    });

    const results = await Promise.all(promises);
    results.forEach((articles) => allArticles.push(...articles));

    // Deduplicate and sort
    const uniqueArticles = this.deduplicateByUrl(allArticles);
    const sorted = uniqueArticles.sort((a, b) => b.publishedAt - a.publishedAt);
    const limited = sorted.slice(0, 20);

    const response: NewsResponse = {
      articles: limited,
      sources: ['brave'],
      cached: false,
      timestamp: Date.now()
    };

    saveToCache(cacheKey, response);

    console.log(`[NewsService] Returning ${limited.length} trending articles across ${sectors.length} sectors`);
    return response;
  }

  /**
   * Deduplicate articles by URL
   */
  private deduplicateByUrl(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
      const normalizedUrl = article.url.toLowerCase().trim();

      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        unique.push(article);
      }
    }

    console.log(`[NewsService] Deduplicated ${articles.length} articles to ${unique.length} unique`);
    return unique;
  }
}

// Export singleton instance
export const newsService = new NewsService();
