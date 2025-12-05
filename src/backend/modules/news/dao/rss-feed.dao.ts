/**
 * RSS Feed DAO
 *
 * Fetches news from free RSS feeds (Yahoo Finance, Google News, Investing.com, etc.)
 * No API key required - completely free.
 */

import { BaseDAO } from '@backend/common/dao/base.dao';

export interface RSSArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: number; // Unix timestamp
  source: string;
}

/**
 * Free RSS feed sources for financial news
 */
const RSS_FEEDS = {
  // Yahoo Finance RSS feeds
  YAHOO_TOP_STORIES: 'https://finance.yahoo.com/news/rssindex',
  YAHOO_STOCK_NEWS: (symbol: string) => `https://finance.yahoo.com/rss/headline?s=${symbol}`,

  // Google News finance section (no API key needed)
  GOOGLE_FINANCE: 'https://news.google.com/rss/search?q=finance+stock+market&hl=en-US&gl=US&ceid=US:en',
  GOOGLE_BUSINESS: 'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',

  // Seeking Alpha (free RSS)
  SEEKING_ALPHA_MARKET: 'https://seekingalpha.com/market_currents.xml',

  // MarketWatch RSS (free)
  MARKETWATCH_TOP: 'https://feeds.content.dowjones.io/public/rss/mw_topstories',
  MARKETWATCH_REALTIME: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines',

  // Investing.com RSS feeds (free, comprehensive)
  INVESTING_FUNDAMENTALS: 'https://www.investing.com/rss/market_overview_Fundamental.rss',
  INVESTING_COMMODITIES: 'https://www.investing.com/rss/121899.rss',
  INVESTING_IDEAS: 'https://www.investing.com/rss/market_overview_investing_ideas.rss',
} as const;

export class RSSFeedDAO extends BaseDAO {
  private readonly timeout = 10000; // 10s timeout

  constructor() {
    super();
  }

  /**
   * Fetch and parse RSS feed
   */
  private async fetchRSSFeed(url: string): Promise<RSSArticle[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PortfolioTracker/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlString = await response.text();

        // Parse RSS XML
        const articles = this.parseRSS(xmlString, this.extractSourceFromUrl(url));
        return articles;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`[RSSFeedDAO] Failed to fetch RSS from ${url}: ${message}`);
      return [];
    }
  }

  /**
   * Parse RSS XML to articles
   */
  private parseRSS(xmlString: string, source: string): RSSArticle[] {
    const articles: RSSArticle[] = [];

    try {
      // Simple regex-based XML parsing (works for RSS feeds)
      // Extract all <item> tags
      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      const items = xmlString.match(itemRegex) || [];

      for (const item of items) {
        // Extract title
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
        const title = titleMatch ? this.decodeHTML(titleMatch[1].trim()) : '';

        // Extract description (might be in <description> or <content:encoded>)
        const descMatch = item.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
        const description = descMatch ? this.decodeHTML(descMatch[1].trim()) : '';

        // Extract link/url
        const linkMatch = item.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/i);
        const url = linkMatch ? linkMatch[1].trim() : '';

        // Extract published date
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
        const publishedAt = pubDateMatch
          ? new Date(pubDateMatch[1]).getTime()
          : Date.now();

        if (title && url) {
          articles.push({
            title,
            description: this.stripHTMLTags(description),
            url,
            publishedAt,
            source,
          });
        }
      }
    } catch (error) {
      console.error('[RSSFeedDAO] Error parsing RSS XML:', error);
    }

    return articles;
  }

  /**
   * Strip HTML tags from text
   */
  private stripHTMLTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Decode HTML entities
   */
  private decodeHTML(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }

  /**
   * Extract source name from URL
   */
  private extractSourceFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;

      if (hostname.includes('yahoo')) return 'Yahoo Finance';
      if (hostname.includes('google')) return 'Google News';
      if (hostname.includes('seekingalpha')) return 'Seeking Alpha';
      if (hostname.includes('marketwatch')) return 'MarketWatch';
      if (hostname.includes('investing')) return 'Investing.com';

      return hostname;
    } catch {
      return 'RSS Feed';
    }
  }

  /**
   * Filter articles by keywords (case-insensitive)
   * Returns articles that contain ANY of the keywords in title or description
   */
  private filterByKeywords(articles: RSSArticle[], keywords: string[]): RSSArticle[] {
    if (!keywords || keywords.length === 0) {
      return articles;
    }

    const lowerKeywords = keywords.map(k => k.toLowerCase());

    return articles.filter(article => {
      const searchText = `${article.title} ${article.description}`.toLowerCase();

      // Check if any keyword appears in title or description
      return lowerKeywords.some(keyword => searchText.includes(keyword));
    });
  }

  /**
   * Get general market news from multiple RSS sources
   */
  async getMarketNews(limit: number = 20, keywords?: string[]): Promise<RSSArticle[]> {
    console.log('[RSSFeedDAO] Fetching market news from RSS feeds');

    const feeds = [
      RSS_FEEDS.YAHOO_TOP_STORIES,
      RSS_FEEDS.GOOGLE_BUSINESS,
      RSS_FEEDS.MARKETWATCH_TOP,
      RSS_FEEDS.INVESTING_FUNDAMENTALS,
    ];

    // Fetch from multiple sources in parallel
    const results = await Promise.all(
      feeds.map(feed => this.fetchRSSFeed(feed))
    );

    // Combine and deduplicate
    let allArticles = results.flat();
    const uniqueArticles = this.deduplicateByUrl(allArticles);

    // Filter by keywords if provided
    const filtered = keywords && keywords.length > 0
      ? this.filterByKeywords(uniqueArticles, keywords)
      : uniqueArticles;

    // Sort by published date (newest first)
    const sorted = filtered.sort((a, b) => b.publishedAt - a.publishedAt);

    console.log(
      `[RSSFeedDAO] Found ${sorted.length} articles from ${feeds.length} RSS feeds` +
      (keywords ? ` (filtered by: ${keywords.join(', ')})` : '')
    );

    return sorted.slice(0, limit);
  }

  /**
   * Get commodity/energy news from Investing.com and other sources
   */
  async getCommodityNews(type: 'energy' | 'copper', limit: number = 20): Promise<RSSArticle[]> {
    console.log(`[RSSFeedDAO] Fetching ${type} news from RSS feeds`);

    const feeds = [
      RSS_FEEDS.INVESTING_COMMODITIES,
      RSS_FEEDS.INVESTING_IDEAS,
      RSS_FEEDS.GOOGLE_FINANCE, // General finance news
    ];

    // Fetch from multiple sources in parallel
    const results = await Promise.all(
      feeds.map(feed => this.fetchRSSFeed(feed))
    );

    // Combine and deduplicate
    const allArticles = results.flat();
    const uniqueArticles = this.deduplicateByUrl(allArticles);

    // Filter by commodity type keywords
    const keywords = type === 'energy'
      ? ['energy', 'oil', 'gas', 'petroleum', 'crude', 'natural gas', 'lng', 'wti', 'brent']
      : ['copper', 'metal', 'mining', 'commodity'];

    const filtered = this.filterByKeywords(uniqueArticles, keywords);

    // Sort by published date (newest first)
    const sorted = filtered.sort((a, b) => b.publishedAt - a.publishedAt);

    console.log(`[RSSFeedDAO] Found ${sorted.length} ${type} articles (filtered from ${uniqueArticles.length} total)`);

    return sorted.slice(0, limit);
  }

  /**
   * Get company-specific news from Yahoo Finance RSS
   */
  async getCompanyNews(symbol: string, limit: number = 20): Promise<RSSArticle[]> {
    console.log(`[RSSFeedDAO] Fetching RSS news for ${symbol}`);

    try {
      const feedUrl = RSS_FEEDS.YAHOO_STOCK_NEWS(symbol);
      const articles = await this.fetchRSSFeed(feedUrl);

      console.log(`[RSSFeedDAO] Found ${articles.length} articles for ${symbol}`);

      return articles.slice(0, limit);
    } catch (error) {
      console.error(`[RSSFeedDAO] Failed to fetch company news for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Search news by query using Google News RSS
   */
  async searchNews(query: string, limit: number = 20): Promise<RSSArticle[]> {
    console.log(`[RSSFeedDAO] Searching RSS news for query: ${query}`);

    try {
      // Google News search RSS
      const searchUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const articles = await this.fetchRSSFeed(searchUrl);

      console.log(`[RSSFeedDAO] Found ${articles.length} articles for query: ${query}`);

      return articles.slice(0, limit);
    } catch (error) {
      console.error(`[RSSFeedDAO] Failed to search news for query "${query}":`, error);
      return [];
    }
  }

  /**
   * Deduplicate articles by URL
   */
  private deduplicateByUrl(articles: RSSArticle[]): RSSArticle[] {
    const seen = new Set<string>();
    const unique: RSSArticle[] = [];

    for (const article of articles) {
      const normalizedUrl = article.url.toLowerCase().trim();

      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        unique.push(article);
      }
    }

    return unique;
  }
}

// Export singleton instance
export const rssFeedDAO = new RSSFeedDAO();
