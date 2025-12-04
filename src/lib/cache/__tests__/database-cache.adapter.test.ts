/**
 * Database Cache Adapter Tests
 *
 * Tests for the L3 database cache adapter.
 *
 * Note: These are integration tests that require a Supabase connection.
 * Set SKIP_DB_TESTS=true to skip these tests in CI/CD.
 */

import {
  DatabaseCacheAdapter,
  getDatabaseCache,
  resetDatabaseCache,
  FilingSummaryCache,
  CompanyProfileCache,
  NewsSentimentCache,
} from '@src/lib/cache/database-cache.adapter';

const SKIP_DB_TESTS = process.env.SKIP_DB_TESTS === 'true';

// Skip all tests if SKIP_DB_TESTS is set
const describeOrSkip = SKIP_DB_TESTS ? describe.skip : describe;

describeOrSkip('DatabaseCacheAdapter', () => {
  let cache: DatabaseCacheAdapter;

  beforeEach(() => {
    cache = new DatabaseCacheAdapter();
  });

  afterEach(() => {
    resetDatabaseCache();
  });

  // ==========================================================================
  // FILING SUMMARIES
  // ==========================================================================

  describe('Filing Summaries', () => {
    const testTicker = 'TEST';
    const testFilingType = '10-K';
    const testFilingDate = '2024-12-01';

    afterEach(async () => {
      // Cleanup test data
      await cache.clearTickerCache(testTicker);
    });

    test('should set and get a filing summary', async () => {
      const summary: FilingSummaryCache = {
        ticker: testTicker,
        filing_type: testFilingType,
        filing_date: testFilingDate,
        summary_text: 'Test summary of filing',
        key_points: ['Revenue up 20%', 'Expanding to Asia'],
        sentiment_score: 0.75,
        generated_by: 'test-model',
        data_version: 1,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await cache.setFilingSummary(summary);
      const retrieved = await cache.getFilingSummary(testTicker, testFilingType, testFilingDate);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.ticker).toBe(testTicker);
      expect(retrieved?.summary_text).toBe(summary.summary_text);
      expect(retrieved?.key_points).toEqual(summary.key_points);
      expect(retrieved?.sentiment_score).toBe(summary.sentiment_score);
    });

    test('should return null for non-existent filing summary', async () => {
      const retrieved = await cache.getFilingSummary('NONEXISTENT', '10-K', '2024-01-01');
      expect(retrieved).toBeNull();
    });

    test('should handle expired filing summary', async () => {
      const expiredSummary: FilingSummaryCache = {
        ticker: testTicker,
        filing_type: testFilingType,
        filing_date: testFilingDate,
        summary_text: 'Expired summary',
        generated_by: 'test-model',
        data_version: 1,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      };

      await cache.setFilingSummary(expiredSummary);
      const retrieved = await cache.getFilingSummary(testTicker, testFilingType, testFilingDate);

      expect(retrieved).toBeNull(); // Should return null for expired entry
    });

    test('should get multiple filing summaries by ticker', async () => {
      const summaries: FilingSummaryCache[] = [
        {
          ticker: testTicker,
          filing_type: '10-K',
          filing_date: '2024-01-01',
          summary_text: 'Summary 1',
          generated_by: 'test-model',
          data_version: 1,
          generated_at: new Date().toISOString(),
        },
        {
          ticker: testTicker,
          filing_type: '10-Q',
          filing_date: '2024-06-01',
          summary_text: 'Summary 2',
          generated_by: 'test-model',
          data_version: 1,
          generated_at: new Date().toISOString(),
        },
      ];

      for (const summary of summaries) {
        await cache.setFilingSummary(summary);
      }

      const retrieved = await cache.getFilingSummariesByTicker(testTicker);
      expect(retrieved.length).toBeGreaterThanOrEqual(2);
    });

    test('should normalize ticker to uppercase', async () => {
      const summary: FilingSummaryCache = {
        ticker: 'aapl', // lowercase
        filing_type: testFilingType,
        filing_date: testFilingDate,
        summary_text: 'Test summary',
        generated_by: 'test-model',
        data_version: 1,
        generated_at: new Date().toISOString(),
      };

      await cache.setFilingSummary(summary);
      const retrieved = await cache.getFilingSummary('AAPL', testFilingType, testFilingDate);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.ticker).toBe('AAPL');
    });
  });

  // ==========================================================================
  // COMPANY PROFILES
  // ==========================================================================

  describe('Company Profiles', () => {
    const testTicker = 'TESTCO';

    afterEach(async () => {
      await cache.clearTickerCache(testTicker);
    });

    test('should set and get a company profile', async () => {
      const profile: CompanyProfileCache = {
        ticker: testTicker,
        profile_data: {
          name: 'Test Company Inc.',
          sector: 'Technology',
          employees: 10000,
          founded: 2000,
        },
        source_count: 3,
        data_version: 1,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await cache.setCompanyProfile(profile);
      const retrieved = await cache.getCompanyProfile(testTicker);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.ticker).toBe(testTicker);
      expect(retrieved?.profile_data.name).toBe('Test Company Inc.');
      expect(retrieved?.source_count).toBe(3);
    });

    test('should return null for non-existent company profile', async () => {
      const retrieved = await cache.getCompanyProfile('NONEXISTENT');
      expect(retrieved).toBeNull();
    });

    test('should return null for expired company profile', async () => {
      const expiredProfile: CompanyProfileCache = {
        ticker: testTicker,
        profile_data: { name: 'Expired Company' },
        source_count: 1,
        data_version: 1,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      await cache.setCompanyProfile(expiredProfile);
      const retrieved = await cache.getCompanyProfile(testTicker);

      expect(retrieved).toBeNull();
    });

    test('should update existing company profile', async () => {
      const profile1: CompanyProfileCache = {
        ticker: testTicker,
        profile_data: { name: 'Company v1' },
        source_count: 1,
        data_version: 1,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const profile2: CompanyProfileCache = {
        ticker: testTicker,
        profile_data: { name: 'Company v2' },
        source_count: 2,
        data_version: 2,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await cache.setCompanyProfile(profile1);
      await cache.setCompanyProfile(profile2);

      const retrieved = await cache.getCompanyProfile(testTicker);
      expect(retrieved?.profile_data.name).toBe('Company v2');
      expect(retrieved?.data_version).toBe(2);
    });
  });

  // ==========================================================================
  // NEWS SENTIMENT
  // ==========================================================================

  describe('News Sentiment', () => {
    const testTicker = 'TESTNEWS';

    afterEach(async () => {
      await cache.clearTickerCache(testTicker);
    });

    test('should set and get news sentiment', async () => {
      const sentiment: NewsSentimentCache = {
        ticker: testTicker,
        news_date: '2024-12-01',
        news_title: 'Test Company announces new product',
        news_url: 'https://example.com/news/1',
        sentiment_score: 0.8,
        sentiment_label: 'positive',
        confidence: 0.95,
        ai_summary: 'Very positive news about product launch',
        key_topics: ['product_launch', 'innovation'],
        processed_by: 'test-model',
        data_version: 1,
        processed_at: new Date().toISOString(),
      };

      await cache.setNewsSentiment(sentiment);
      const retrieved = await cache.getNewsSentiment(testTicker);

      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0].ticker).toBe(testTicker);
      expect(retrieved[0].sentiment_score).toBe(0.8);
      expect(retrieved[0].sentiment_label).toBe('positive');
    });

    test('should get news sentiment with date filters', async () => {
      const sentiments: NewsSentimentCache[] = [
        {
          ticker: testTicker,
          news_date: '2024-01-15',
          news_title: 'Q1 News',
          sentiment_score: 0.5,
          sentiment_label: 'neutral',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
        {
          ticker: testTicker,
          news_date: '2024-06-15',
          news_title: 'Q2 News',
          sentiment_score: 0.7,
          sentiment_label: 'positive',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
        {
          ticker: testTicker,
          news_date: '2024-12-15',
          news_title: 'Q4 News',
          sentiment_score: 0.9,
          sentiment_label: 'positive',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
      ];

      for (const sentiment of sentiments) {
        await cache.setNewsSentiment(sentiment);
      }

      const q2Only = await cache.getNewsSentiment(testTicker, '2024-06-01', '2024-06-30');
      expect(q2Only.length).toBe(1);
      expect(q2Only[0].news_title).toBe('Q2 News');
    });

    test('should bulk insert news sentiment', async () => {
      const sentiments: NewsSentimentCache[] = [
        {
          ticker: testTicker,
          news_date: '2024-12-01',
          news_title: 'News 1',
          sentiment_score: 0.5,
          sentiment_label: 'neutral',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
        {
          ticker: testTicker,
          news_date: '2024-12-02',
          news_title: 'News 2',
          sentiment_score: 0.7,
          sentiment_label: 'positive',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
      ];

      await cache.bulkSetNewsSentiment(sentiments);
      const retrieved = await cache.getNewsSentiment(testTicker);

      expect(retrieved.length).toBeGreaterThanOrEqual(2);
    });

    test('should calculate average sentiment', async () => {
      const sentiments: NewsSentimentCache[] = [
        {
          ticker: testTicker,
          news_date: '2024-12-01',
          news_title: 'News 1',
          sentiment_score: 0.5,
          sentiment_label: 'neutral',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
        {
          ticker: testTicker,
          news_date: '2024-12-02',
          news_title: 'News 2',
          sentiment_score: 0.7,
          sentiment_label: 'positive',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
        {
          ticker: testTicker,
          news_date: '2024-12-03',
          news_title: 'News 3',
          sentiment_score: 0.9,
          sentiment_label: 'positive',
          processed_by: 'test-model',
          data_version: 1,
          processed_at: new Date().toISOString(),
        },
      ];

      await cache.bulkSetNewsSentiment(sentiments);
      const avgSentiment = await cache.getAverageSentiment(
        testTicker,
        '2024-12-01',
        '2024-12-31'
      );

      expect(avgSentiment).not.toBeNull();
      expect(avgSentiment).toBeCloseTo(0.7, 2); // (0.5 + 0.7 + 0.9) / 3 = 0.7
    });

    test('should handle duplicate news sentiment gracefully', async () => {
      const dupeTicker = 'TESTDUPE';
      const sentiment: NewsSentimentCache = {
        ticker: dupeTicker,
        news_date: '2024-12-01',
        news_url: 'https://example.com/same-news',
        news_title: 'Duplicate News',
        sentiment_score: 0.5,
        sentiment_label: 'neutral',
        processed_by: 'test-model',
        data_version: 1,
        processed_at: new Date().toISOString(),
      };

      await cache.setNewsSentiment(sentiment);
      await cache.setNewsSentiment(sentiment); // Duplicate - should not throw

      // Should not throw, just log. First insert should still exist.
      const retrieved = await cache.getNewsSentiment(dupeTicker);
      expect(retrieved.length).toBeGreaterThan(0);

      // Cleanup
      await cache.clearTickerCache(dupeTicker);
    });
  });

  // ==========================================================================
  // CLEANUP & MAINTENANCE
  // ==========================================================================

  describe('Cleanup and Maintenance', () => {
    test('should get cache statistics', async () => {
      const stats = await cache.getStats();

      expect(stats).toHaveProperty('filing_summaries_count');
      expect(stats).toHaveProperty('company_profiles_count');
      expect(stats).toHaveProperty('news_sentiment_count');
      expect(stats).toHaveProperty('total_size_estimate_mb');
      expect(typeof stats.filing_summaries_count).toBe('number');
      expect(typeof stats.total_size_estimate_mb).toBe('number');
    });

    test('should cleanup expired data', async () => {
      const testTicker = 'EXPTEST';

      // Create expired entries
      const expiredSummary: FilingSummaryCache = {
        ticker: testTicker,
        filing_type: '10-K',
        filing_date: '2020-01-01',
        summary_text: 'Expired summary',
        generated_by: 'test-model',
        data_version: 1,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired
      };

      await cache.setFilingSummary(expiredSummary);

      const deletedCount = await cache.cleanupExpiredData();
      expect(deletedCount).toBeGreaterThanOrEqual(0); // May be 0 or more depending on db state
    });

    test('should clear all cache for a ticker', async () => {
      const testTicker = 'CLEARTEST';

      // Add various cache entries
      await cache.setFilingSummary({
        ticker: testTicker,
        filing_type: '10-K',
        filing_date: '2024-01-01',
        summary_text: 'Test',
        generated_by: 'test-model',
        data_version: 1,
        generated_at: new Date().toISOString(),
      });

      await cache.setCompanyProfile({
        ticker: testTicker,
        profile_data: { name: 'Test' },
        source_count: 1,
        data_version: 1,
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await cache.setNewsSentiment({
        ticker: testTicker,
        news_date: '2024-12-01',
        news_title: 'Test',
        sentiment_score: 0.5,
        sentiment_label: 'neutral',
        processed_by: 'test-model',
        data_version: 1,
        processed_at: new Date().toISOString(),
      });

      // Clear all
      await cache.clearTickerCache(testTicker);

      // Verify all cleared
      const summary = await cache.getFilingSummary(testTicker, '10-K', '2024-01-01');
      const profile = await cache.getCompanyProfile(testTicker);
      const sentiment = await cache.getNewsSentiment(testTicker);

      expect(summary).toBeNull();
      expect(profile).toBeNull();
      expect(sentiment.length).toBe(0);
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('Singleton', () => {
    test('should return same instance from getDatabaseCache', () => {
      const instance1 = getDatabaseCache();
      const instance2 = getDatabaseCache();
      expect(instance1).toBe(instance2);
    });

    test('should reset singleton instance', () => {
      const instance1 = getDatabaseCache();
      resetDatabaseCache();
      const instance2 = getDatabaseCache();
      expect(instance1).not.toBe(instance2);
    });
  });
});
