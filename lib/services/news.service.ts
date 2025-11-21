/**
 * News Service
 *
 * Business logic layer for company and market news.
 * Aggregates news from multiple sources (Finnhub, Brave Search).
 */
import { finnhubDAO } from '@/lib/dao/finnhub.dao';
import { FinnhubNews } from '@/types/finnhub-news.dto';
import { braveSearchDAO, BraveSearchResult } from '@/lib/dao/brave-search.dao';
import { loadFromCache, saveToCache, getCacheAge } from '@/lib/serverCache';
import { NewsDAO } from '@/lib/dao/news.dao';
import { NewsArticle as NewsAPIArticle } from '@/types/news.dto';
import { generateText } from '@/lib/ai/gemini';

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
  private readonly MARKET_NEWS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for market news
  private newsDAO: NewsDAO | null = null;

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

  /**
   * Generate NewsAPI query using AI based on portfolio holdings
   * Caches successful AI responses until portfolio changes
   *
   * @param portfolio - Portfolio with holdings to analyze
   * @returns Optimized NewsAPI query string
   */
  static async generateNewsQueryForPortfolio(portfolio: any): Promise<string> {
    const holdings = portfolio.holdings || [];
    const portfolioType = portfolio.type || 'general';
    const portfolioId = portfolio.id;

    try {

      // Create a cache key that includes portfolio ID and holdings hash
      const holdingsHash = holdings
        .map((h: any) => `${h.symbol}:${h.shares}`)
        .sort()
        .join('|');
      const cacheKey = `ai-news-query-${portfolioId}-${holdingsHash}`;

      // Check cache for existing AI-generated query
      const cached = loadFromCache<string>(cacheKey);
      if (cached && getCacheAge(cacheKey) < 7 * 24 * 60 * 60 * 1000) { // 7 days TTL
        console.log(`[NewsService] Cache hit for AI query: ${cached}`);
        return cached;
      }

      // Extract stock symbols and names
      const stockInfo = holdings.map((holding: any) =>
        `${holding.symbol}: ${holding.name}`
      ).join(', ');

      // Create AI prompt
      const prompt = `You are a financial analyst. Based on this ${portfolioType} portfolio with holdings: ${stockInfo}

Please generate an optimized NewsAPI search query that will find relevant market news for this portfolio. The query should:

1. Include the main sectors/industries represented by these holdings
2. Include key companies and their ticker symbols
3. Include relevant market terms, commodities, or economic indicators
4. Use OR operators to broaden the search
5. Be optimized for NewsAPI's search syntax
6. Focus on current market news, not historical
7. IMPORTANT: Keep the query under 500 characters (current limit: ~${500 - stockInfo.length} remaining chars)

Return ONLY the search query string, no explanation or quotes.

Example format: "energy OR oil OR natural gas OR petroleum OR crude OR COP OR SU OR CNQ OR TRP"

Generate a similar query for this portfolio:`;

      // Use Gemini for news query generation
      console.log(`[NewsService] Generating news query using Gemini for ${portfolioType} portfolio`);

      // Call Gemini
      const query = await generateText(prompt, {
        temperature: 0.3,
        maxTokens: 200
      });

      if (!query) {
        console.warn('[NewsService] AI returned empty query, using fallback');
        // Fallback to basic query based on portfolio type - DO NOT CACHE
        return portfolioType === 'energy'
          ? 'energy OR oil OR natural gas OR petroleum OR crude'
          : portfolioType === 'copper'
          ? 'copper OR mining OR metals'
          : 'stocks OR markets OR finance';
      }

      // Validate query length (should be under 500 chars due to prompt instructions)
      const validatedQuery = query.trim();
      if (validatedQuery.length > 500) {
        console.warn(`[NewsService] AI query still too long (${validatedQuery.length} chars), using fallback`);
        return portfolioType === 'energy'
          ? 'energy OR oil OR natural gas OR petroleum OR crude'
          : portfolioType === 'copper'
          ? 'copper OR mining OR metals'
          : 'stocks OR markets OR finance';
      }

      // Cache successful AI response
      saveToCache(cacheKey, validatedQuery);
      console.log(`[NewsService] AI generated and cached query (${validatedQuery.length} chars): ${validatedQuery}`);
      return validatedQuery;

    } catch (error) {
      console.error('Error generating AI news query:', error);

      // Fallback to basic query using stock symbols and portfolio type - DO NOT CACHE when AI fails
      const stockSymbols = holdings.map((h: any) => h.symbol).join(' OR ');
      const portfolioTypeTerm = portfolioType.toLowerCase();

      let fallbackQuery: string;
      if (stockSymbols) {
        fallbackQuery = `${stockSymbols} OR ${portfolioTypeTerm}`;
      } else {
        fallbackQuery = portfolioType === 'energy'
          ? 'energy OR oil OR natural gas OR petroleum OR crude'
          : portfolioType === 'copper'
          ? 'copper OR mining OR metals'
          : 'stocks OR markets OR finance';
      }

      // Ensure fallback query also respects 500 char limit
      if (fallbackQuery.length > 500) {
        console.warn(`[NewsService] Fallback query too long (${fallbackQuery.length} chars), using basic portfolio type query`);
        fallbackQuery = portfolioType === 'energy'
          ? 'energy OR oil OR natural gas OR petroleum OR crude'
          : portfolioType === 'copper'
          ? 'copper OR mining OR metals'
          : 'stocks OR markets OR finance';
      }

      console.log(`[NewsService] Using fallback query (not cached): ${fallbackQuery}`);
      return fallbackQuery;
    }
  }

  /**
   * Get news from NewsAPI with caching
   *
   * @param query - NewsAPI search query
   * @param cacheKey - Cache key for this query
   * @param pageSize - Number of articles to fetch
   * @returns NewsAPI articles
   */
  async getNewsAPI(query: string, cacheKey: string, pageSize: number = 10): Promise<NewsAPIArticle[]> {
    // Check cache
    const cached = loadFromCache<NewsAPIArticle[]>(cacheKey);
    if (cached && getCacheAge(cacheKey) < this.MARKET_NEWS_CACHE_TTL) {
      console.log(`[NewsService] Cache hit for ${cacheKey}`);
      return cached;
    }

    console.log(`[NewsService] Fetching fresh news from NewsAPI for query: ${query}`);

    if (!this.newsDAO) {
      this.newsDAO = new NewsDAO();
    }

    try {
      const articles = await this.newsDAO.fetchNews(query, pageSize);

      // Save to cache
      saveToCache(cacheKey, articles);

      return articles;
    } catch (error) {
      console.error(`Error fetching news for query "${query}":`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const newsService = new NewsService();
