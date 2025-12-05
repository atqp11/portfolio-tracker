/**
 * News Service Tests
 *
 * Tests for orchestrator-based news fetching from RSS feeds.
 */
import { NewsService } from '../news.service';
import { DataSourceOrchestrator } from '@lib/data-sources';
import { getCacheAdapter } from '@lib/cache/adapter';

// Mock dependencies
jest.mock('@lib/data-sources');
jest.mock('@lib/cache/adapter');
jest.mock('../../dao/rss-feed.dao');
jest.mock('@lib/ai/gemini');

describe('NewsService', () => {
  let service: NewsService;
  let mockOrchestrator: jest.Mocked<DataSourceOrchestrator>;
  let mockCache: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock orchestrator instance
    mockOrchestrator = {
      fetchWithFallback: jest.fn(),
      fetchWithMerge: jest.fn(),
      batchFetch: jest.fn(),
      getStats: jest.fn(),
    } as any;

    (DataSourceOrchestrator.getInstance as jest.Mock).mockReturnValue(mockOrchestrator);

    // Mock cache adapter
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      getAge: jest.fn(),
    };

    (getCacheAdapter as jest.Mock).mockReturnValue(mockCache);

    // Create service instance
    service = new NewsService();
  });

  describe('getCompanyNews', () => {
    it('should fetch company news using orchestrator', async () => {
      const mockProviderArticles = [
        {
          headline: 'Apple Announces New Product',
          summary: 'Apple reveals new iPhone',
          link: 'https://example.com/article1',
          datetime: Date.now(),
          source: 'MarketWatch',
        },
        {
          headline: 'Apple Stock Rises',
          summary: 'AAPL stock gains 5%',
          link: 'https://example.com/article2',
          datetime: Date.now() - 1000,
          source: 'Bloomberg',
        },
      ];

      const mockResult = {
        data: mockProviderArticles,
        source: 'rssFeed',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {
          providersAttempted: ['rssFeed'],
          totalDuration: 300,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getCompanyNews('AAPL', 20, 'free');

      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].headline).toBe('Apple Announces New Product');
      expect(result.articles[0].url).toBe('https://example.com/article1');
      expect(result.sources).toEqual(['rss']);
      expect(result.cached).toBe(false);
      expect(mockOrchestrator.fetchWithFallback).toHaveBeenCalledWith({
        key: 'AAPL',
        providers: expect.arrayContaining([
          expect.objectContaining({ name: 'rssFeed' }),
        ]),
        cacheKeyPrefix: 'news',
        tier: 'free',
        allowStale: true,
        context: { limit: 20 },
      });
    });

    it('should deduplicate articles by URL', async () => {
      const mockProviderArticles = [
        {
          headline: 'Article 1',
          summary: 'Summary 1',
          link: 'https://example.com/article1',
          datetime: Date.now(),
          source: 'Source1',
        },
        {
          headline: 'Article 1 Duplicate',
          summary: 'Summary duplicate',
          link: 'HTTPS://EXAMPLE.COM/ARTICLE1', // Same URL, different case
          datetime: Date.now() - 1000,
          source: 'Source2',
        },
        {
          headline: 'Article 2',
          summary: 'Summary 2',
          link: 'https://example.com/article2',
          datetime: Date.now() - 2000,
          source: 'Source3',
        },
      ];

      const mockResult = {
        data: mockProviderArticles,
        source: 'rssFeed',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getCompanyNews('AAPL');

      // Should have 2 unique articles (duplicates removed)
      expect(result.articles).toHaveLength(2);
      expect(result.articles[0].headline).toBe('Article 1');
      expect(result.articles[1].headline).toBe('Article 2');
    });

    it('should return empty articles array when orchestrator returns null', async () => {
      const mockResult = {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [
          {
            provider: 'rssFeed',
            code: 'NETWORK_ERROR',
            message: 'Network error',
            originalError: new Error('Network error'),
          },
        ],
        metadata: {} as any,
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.getCompanyNews('AAPL');

      expect(result.articles).toHaveLength(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch news for AAPL'),
        mockResult.errors
      );

      consoleErrorSpy.mockRestore();
    });

    it('should limit articles to specified limit', async () => {
      const mockArticles = Array.from({ length: 50 }, (_, i) => ({
        headline: `Article ${i}`,
        summary: `Summary ${i}`,
        link: `https://example.com/article${i}`,
        datetime: Date.now() - i * 1000,
        source: 'Source',
      }));

      const mockResult = {
        data: mockArticles,
        source: 'rssFeed',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getCompanyNews('AAPL', 10);

      expect(result.articles).toHaveLength(10);
    });

    it('should sort articles by publishedAt in descending order', async () => {
      const now = Date.now();
      const mockArticles = [
        {
          headline: 'Oldest',
          summary: '',
          link: 'https://example.com/1',
          datetime: now - 10000,
          source: 'Source',
        },
        {
          headline: 'Newest',
          summary: '',
          link: 'https://example.com/2',
          datetime: now,
          source: 'Source',
        },
        {
          headline: 'Middle',
          summary: '',
          link: 'https://example.com/3',
          datetime: now - 5000,
          source: 'Source',
        },
      ];

      const mockResult = {
        data: mockArticles,
        source: 'rssFeed',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getCompanyNews('AAPL');

      expect(result.articles[0].headline).toBe('Newest');
      expect(result.articles[1].headline).toBe('Middle');
      expect(result.articles[2].headline).toBe('Oldest');
    });
  });

  describe('searchMarketNews', () => {
    it('should fetch market news from cache when available', async () => {
      const mockCachedResponse = {
        articles: [
          {
            headline: 'Market News',
            summary: 'Summary',
            url: 'https://example.com/1',
            source: 'MarketWatch',
            publishedAt: Date.now(),
          },
        ],
        sources: ['rss'],
        cached: false,
        timestamp: Date.now(),
      };

      mockCache.get.mockResolvedValue(mockCachedResponse);
      mockCache.getAge.mockResolvedValue(60000);

      const result = await service.searchMarketNews('stock market', 20, 'free');

      expect(result.articles).toHaveLength(1);
      expect(result.cached).toBe(true);
      expect(mockCache.get).toHaveBeenCalledWith('market-news:stock market:v2');
    });

    it('should return stale cache when fetch fails', async () => {
      mockCache.get
        .mockResolvedValueOnce(null) // First call: no fresh cache
        .mockResolvedValueOnce({     // Second call: stale cache exists
          articles: [
            {
              headline: 'Stale Market News',
              summary: 'Stale summary',
              url: 'https://example.com/stale',
              source: 'MarketWatch',
              publishedAt: Date.now() - 86400000,
            },
          ],
          sources: ['rss'],
          cached: false,
          timestamp: Date.now() - 86400000,
        });

      const result = await service.searchMarketNews('tech stocks');

      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].headline).toBe('Stale Market News');
      expect(result.cached).toBe(true);
    });
  });

  describe('getTrendingNews', () => {
    it('should fetch trending news from cache when available', async () => {
      const mockCachedResponse = {
        articles: [
          {
            headline: 'Trending News',
            summary: 'Summary',
            url: 'https://example.com/1',
            source: 'MarketWatch',
            publishedAt: Date.now(),
          },
        ],
        sources: ['rss'],
        cached: false,
        timestamp: Date.now(),
      };

      mockCache.get.mockResolvedValue(mockCachedResponse);
      mockCache.getAge.mockResolvedValue(120000);

      const result = await service.getTrendingNews(['technology', 'finance']);

      expect(result.articles).toHaveLength(1);
      expect(result.cached).toBe(true);
    });
  });

  describe('generateNewsQueryForPortfolio', () => {
    it('should return cached AI query when available', async () => {
      const mockCachedQuery = 'energy OR oil OR natural gas OR petroleum';
      const mockPortfolio = {
        id: 'portfolio-1',
        type: 'energy',
        holdings: [
          { symbol: 'COP', shares: 100, name: 'ConocoPhillips' },
          { symbol: 'SU', shares: 50, name: 'Suncor' },
        ],
      };

      mockCache.get.mockResolvedValue(mockCachedQuery);

      const result = await service.generateNewsQueryForPortfolio(mockPortfolio);

      expect(result).toBe(mockCachedQuery);
      expect(mockCache.get).toHaveBeenCalledWith(
        expect.stringContaining('ai-news-query:portfolio-1')
      );
    });

    it('should return fallback query when AI fails', async () => {
      mockCache.get.mockResolvedValue(null);

      const { generateText } = require('@lib/ai/gemini');
      (generateText as jest.Mock).mockRejectedValue(new Error('AI error'));

      const mockPortfolio = {
        id: 'portfolio-1',
        type: 'energy',
        holdings: [],
      };

      const result = await service.generateNewsQueryForPortfolio(mockPortfolio);

      expect(result).toBe('energy OR oil OR natural gas OR petroleum OR crude');
    });
  });
});
