/**
 * AI Cache System Tests
 * 
 * Tests for all caching scenarios:
 * 1. First visit / page refresh → batch fetch
 * 2. Navigation away and back → no call unless expired
 * 3. User asks while fresh → instant memory hit
 * 4. Batch expires during chat → individual fetch
 * 5. User keeps asking same stock after expiry → deduped
 * 6. Browser crash / storage cleared → fresh batch
 * 7. Portfolio change (add/delete) → fresh batch
 */

// Mock localStorage before importing aiCache
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    },
    _getStore: () => store,
    _reset: () => { store = {}; },
  };
})();

// Define window and localStorage before importing modules
(global as any).window = {
  localStorage: localStorageMock,
};
(global as any).localStorage = localStorageMock;

import {
  saveAICache,
  loadAICache,
  clearAICache,
  getCacheTTL,
  getBatchCacheTTL,
  isBatchCacheValid,
  saveBatchMetadata,
  loadCachedStocks,
  parseBatchAndCacheIndividual,
  loadIndividualCache,
  detectPortfolioChange,
  savePortfolioTickers,
  invalidateAllBatchCaches,
  clearRemovedTickerCaches,
  isStorageAvailable,
  getStorageUsage,
  validateCacheIntegrity,
  recoverCache,
  isCacheHealthy,
  getTimeUntilExpiry,
  willExpireSoon,
  AICacheError,
} from '@lib/utils/aiCache';

describe('AI Cache System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    localStorageMock._reset();
  });

  // ==========================================================================
  // SCENARIO 1: First Visit / Page Refresh → Batch Fetch
  // ==========================================================================
  describe('Scenario 1: First Visit / Fresh Start', () => {
    it('should return null for uncached data', () => {
      const result = loadAICache('sentiment', 'AAPL');
      expect(result).toBeNull();
    });

    it('should report batch cache as invalid when empty', () => {
      const tickers = ['AAPL', 'GOOGL', 'MSFT'];
      const isValid = isBatchCacheValid('batch_news', tickers);
      expect(isValid).toBe(false);
    });

    it('should return empty cached and all missing for loadCachedStocks', () => {
      const tickers = ['AAPL', 'GOOGL', 'MSFT'];
      const { cached, missing } = loadCachedStocks('batch_news', tickers);
      expect(cached.size).toBe(0);
      expect(missing).toEqual(tickers);
    });
  });

  // ==========================================================================
  // SCENARIO 2: Navigation Away and Back → Cache Hit
  // ==========================================================================
  describe('Scenario 2: Remount Within TTL', () => {
    it('should return cached data when TTL not expired', () => {
      const testData = { sentiment: 'BULLISH', summary: 'Test' };
      saveAICache('sentiment', 'AAPL', testData);
      
      const result = loadAICache('sentiment', 'AAPL');
      expect(result).toEqual(testData);
    });

    it('should validate batch cache when all tickers present and fresh', () => {
      const tickers = ['AAPL', 'GOOGL'];
      
      // Save individual caches
      saveAICache('news', 'AAPL', [{ headline: 'Test' }]);
      saveAICache('news', 'GOOGL', [{ headline: 'Test 2' }]);
      
      // Save batch metadata
      saveBatchMetadata('batch_news', tickers);
      
      const isValid = isBatchCacheValid('batch_news', tickers);
      expect(isValid).toBe(true);
    });

    it('should return all cached stocks for loadCachedStocks', () => {
      const tickers = ['AAPL', 'GOOGL'];
      
      saveAICache('news', 'AAPL', [{ headline: 'Apple news' }]);
      saveAICache('news', 'GOOGL', [{ headline: 'Google news' }]);
      saveBatchMetadata('batch_news', tickers);
      
      const { cached, missing } = loadCachedStocks('batch_news', tickers);
      expect(cached.size).toBe(2);
      expect(missing.length).toBe(0);
      expect(cached.get('AAPL')).toEqual([{ headline: 'Apple news' }]);
    });

    // -------------------------------------------------------------------------
    // REMOUNT SCENARIO: ALL EXPIRED
    // Simulates: User navigates away, TTL passes, user returns → cache miss
    // -------------------------------------------------------------------------
    it('remount: all expired → isBatchCacheValid false, retrieval returns null', () => {
      const tickers = ['AAPL', 'GOOGL'];
      
      // Save fresh individual caches
      saveAICache('news', 'AAPL', [{ headline: 'AAPL news' }]);
      saveAICache('news', 'GOOGL', [{ headline: 'GOOGL news' }]);
      saveBatchMetadata('batch_news', tickers);
      
      // Advance time past TTL
      const originalNow = Date.now();
      const future = originalNow + getCacheTTL('news') * 10;
      const spy = jest.spyOn(Date, 'now').mockImplementation(() => future);
      
      try {
        // Batch metadata should be invalid (expired)
        expect(isBatchCacheValid('batch_news', tickers)).toBe(false);
        
        // Individual caches should also be expired (return null)
        expect(loadAICache('news', 'AAPL')).toBeNull();
        expect(loadAICache('news', 'GOOGL')).toBeNull();
        
        // loadCachedStocks should report all missing
        const { cached, missing } = loadCachedStocks('batch_news', tickers);
        expect(cached.size).toBe(0);
        expect(missing.sort()).toEqual(['AAPL', 'GOOGL']);
      } finally {
        spy.mockRestore();
      }
    });

    // -------------------------------------------------------------------------
    // REMOUNT SCENARIO: PARTIAL CACHE
    // Simulates: Batch metadata fresh but some individual caches missing
    // -------------------------------------------------------------------------
    it('remount: partial cache → metadata valid, some missing tickers', () => {
      const tickers = ['AAPL', 'MSFT', 'GOOGL'];
      
      // Save individual caches only for AAPL and GOOGL (MSFT missing)
      saveAICache('news', 'AAPL', [{ headline: 'AAPL news' }]);
      saveAICache('news', 'GOOGL', [{ headline: 'GOOGL news' }]);
      saveBatchMetadata('batch_news', tickers);
      
      // Batch metadata should be valid (fresh)
      expect(isBatchCacheValid('batch_news', tickers)).toBe(true);
      
      // loadCachedStocks should report MSFT as missing
      const { cached, missing } = loadCachedStocks('batch_news', tickers);
      
      // Validate hit for existing tickers
      expect(cached.has('AAPL')).toBe(true);
      expect(cached.get('AAPL')).toEqual([{ headline: 'AAPL news' }]);
      expect(cached.has('GOOGL')).toBe(true);
      expect(cached.get('GOOGL')).toEqual([{ headline: 'GOOGL news' }]);
      
      // Validate miss for missing ticker
      expect(cached.has('MSFT')).toBe(false);
      expect(missing).toContain('MSFT');
      expect(missing.length).toBe(1);
    });

    // -------------------------------------------------------------------------
    // REMOUNT SCENARIO: FULLY CACHED (NOT EXPIRED)
    // Simulates: User navigates away and back quickly → full cache hit
    // -------------------------------------------------------------------------
    it('remount: not expired → full cache hit, no fetch needed', () => {
      const tickers = ['TSLA', 'NVDA'];
      const tslaData = [{ headline: 'TSLA breaking news', sentiment: 'POSITIVE' }];
      const nvdaData = [{ headline: 'NVDA earnings report', sentiment: 'BULLISH' }];
      
      // Save individual caches for all tickers
      saveAICache('news', 'TSLA', tslaData);
      saveAICache('news', 'NVDA', nvdaData);
      saveBatchMetadata('batch_news', tickers);
      
      // Batch should be valid (not expired)
      expect(isBatchCacheValid('batch_news', tickers)).toBe(true);
      
      // loadCachedStocks should return all data with no missing
      const { cached, missing } = loadCachedStocks('batch_news', tickers);
      
      // Validate full hit
      expect(missing.length).toBe(0);
      expect(cached.size).toBe(2);
      
      // Validate retrieved data matches what was saved
      expect(cached.get('TSLA')).toEqual(tslaData);
      expect(cached.get('NVDA')).toEqual(nvdaData);
      
      // Also verify individual loadAICache returns correct data
      expect(loadAICache('news', 'TSLA')).toEqual(tslaData);
      expect(loadAICache('news', 'NVDA')).toEqual(nvdaData);
      
      // Verify loadIndividualCache also works
      expect(loadIndividualCache('batch_news', 'TSLA')).toEqual(tslaData);
      expect(loadIndividualCache('batch_news', 'NVDA')).toEqual(nvdaData);
    });
  });

  // ==========================================================================
  // SCENARIO 3: User Asks While Fresh → Instant Memory Hit
  // ==========================================================================
  describe('Scenario 3: Fresh Cache Hit', () => {
    it('should load individual cache in <10ms (simulated)', () => {
      const testData = { sentiment: 'BEARISH', key_points: ['Point 1', 'Point 2'] };
      saveAICache('sentiment', 'TSLA', testData);
      
      const start = Date.now();
      const result = loadIndividualCache('batch_sentiment', 'TSLA');
      const elapsed = Date.now() - start;
      
      // localStorage operations should be very fast
      expect(elapsed).toBeLessThan(50);
      expect(result).toEqual(testData);
    });
  });

  // ==========================================================================
  // SCENARIO 4: Batch Expires During Chat → Individual Fetch
  // ==========================================================================
  describe('Scenario 4: Cache Expiry', () => {
    it('should return null for expired cache', () => {
      // Save with expired timestamp
      const expiredData = {
        data: { sentiment: 'NEUTRAL' },
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      };
      localStorageMock.setItem('ai_cache_sentiment_AAPL', JSON.stringify(expiredData));
      
      const result = loadAICache('sentiment', 'AAPL');
      expect(result).toBeNull();
    });

    it('should report batch cache as invalid when metadata expired', () => {
      const tickers = ['AAPL', 'GOOGL'];
      
      // Save individual caches (still valid)
      saveAICache('news', 'AAPL', [{ headline: 'Test' }]);
      saveAICache('news', 'GOOGL', [{ headline: 'Test 2' }]);
      
      // Save expired batch metadata
      const expiredMeta = {
        tickers,
        timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
      };
      localStorageMock.setItem('ai_cache_batch_news_meta', JSON.stringify(expiredMeta));
      
      const isValid = isBatchCacheValid('batch_news', tickers);
      expect(isValid).toBe(false);
    });

    it('should calculate time until expiry correctly', () => {
      const testData = { sentiment: 'BULLISH' };
      saveAICache('sentiment', 'AAPL', testData);
      
      const timeRemaining = getTimeUntilExpiry('sentiment', 'AAPL');
      // With fresh save, time remaining should be close to full TTL
      expect(timeRemaining).toBeLessThanOrEqual(getCacheTTL('sentiment'));
    });

    it('should detect when cache will expire soon', () => {
      // Create fresh cache - willExpireSoon should return false for fresh cache
      saveAICache('sentiment', 'AAPL', { sentiment: 'NEUTRAL' });
      
      const willExpire = willExpireSoon('sentiment', 'AAPL', 10 * 60 * 1000); // 10 min threshold
      expect(willExpire).toBe(false); // Fresh cache should not be expiring soon
    });
  });

  // ==========================================================================
  // SCENARIO 5: Deduplication (handled by TanStack Query)
  // NOTE: This is tested at the hook level, not cache level
  // ==========================================================================
  describe('Scenario 5: Cache Deduplication Support', () => {
    it('should consistently return same data for same key', () => {
      const testData = { sentiment: 'BULLISH', summary: 'Test' };
      saveAICache('sentiment', 'AAPL', testData);
      
      // Multiple reads should return identical data
      const result1 = loadAICache('sentiment', 'AAPL');
      const result2 = loadAICache('sentiment', 'AAPL');
      const result3 = loadAICache('sentiment', 'AAPL');
      
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  // ==========================================================================
  // SCENARIO 6: Browser Crash / Storage Cleared → Fresh Batch
  // ==========================================================================
  describe('Scenario 6: Storage Recovery', () => {
    it('should detect storage availability', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should report storage usage', () => {
      saveAICache('sentiment', 'AAPL', { large: 'data'.repeat(100) });
      const usage = getStorageUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.available).toBe(true);
    });

    it('should validate cache integrity', () => {
      // Valid cache
      saveAICache('sentiment', 'AAPL', { sentiment: 'BULLISH' });
      
      const result = validateCacheIntegrity();
      expect(result.valid).toBe(true);
      expect(result.corrupted).toBe(0);
    });

    it('should detect corrupted cache entries', () => {
      // Manually set corrupted data
      localStorageMock.setItem('ai_cache_sentiment_BAD', 'not valid json{{{');
      
      const result = validateCacheIntegrity();
      // Corrupted entries are removed, so corrupted count > 0
      expect(result.corrupted).toBeGreaterThan(0);
    });

    it('should recover from corrupted cache', () => {
      // Set some valid and some corrupted data
      saveAICache('sentiment', 'AAPL', { sentiment: 'BULLISH' });
      localStorageMock.setItem('ai_cache_news_BAD', 'corrupted{{{');
      
      // Recover should not throw
      recoverCache();
      
      // Corrupted entries should be gone
      expect(localStorageMock.getItem('ai_cache_news_BAD')).toBeNull();
    });

    it('should report overall cache health', () => {
      saveAICache('sentiment', 'AAPL', { sentiment: 'BULLISH' });
      saveAICache('news', 'AAPL', [{ headline: 'Test' }]);
      
      expect(isCacheHealthy()).toBe(true);
    });
  });

  // ==========================================================================
  // SCENARIO 7: Portfolio Change (Add/Delete) → Fresh Batch
  // ==========================================================================
  describe('Scenario 7: Portfolio Change Detection', () => {
    it('should detect no change when portfolio unchanged', () => {
      const tickers = ['AAPL', 'GOOGL', 'MSFT'];
      savePortfolioTickers(tickers);
      
      const result = detectPortfolioChange(tickers);
      expect(result.changed).toBe(false);
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
    });

    it('should detect added stocks', () => {
      const oldTickers = ['AAPL', 'GOOGL'];
      const newTickers = ['AAPL', 'GOOGL', 'TSLA', 'NVDA'];
      
      savePortfolioTickers(oldTickers);
      const result = detectPortfolioChange(newTickers);
      
      expect(result.changed).toBe(true);
      expect(result.added.sort()).toEqual(['NVDA', 'TSLA'].sort());
      expect(result.removed).toEqual([]);
    });

    it('should detect removed stocks', () => {
      const oldTickers = ['AAPL', 'GOOGL', 'MSFT'];
      const newTickers = ['AAPL'];
      
      savePortfolioTickers(oldTickers);
      const result = detectPortfolioChange(newTickers);
      
      expect(result.changed).toBe(true);
      expect(result.added).toEqual([]);
      expect(result.removed.sort()).toEqual(['GOOGL', 'MSFT'].sort());
    });

    it('should detect both added and removed stocks', () => {
      const oldTickers = ['AAPL', 'GOOGL'];
      const newTickers = ['AAPL', 'TSLA'];
      
      savePortfolioTickers(oldTickers);
      const result = detectPortfolioChange(newTickers);
      
      expect(result.changed).toBe(true);
      expect(result.added).toEqual(['TSLA']);
      expect(result.removed).toEqual(['GOOGL']);
    });

    it('should handle first portfolio save (no previous)', () => {
      const result = detectPortfolioChange(['AAPL', 'GOOGL']);
      
      expect(result.changed).toBe(true); // Changed from "no previous"
      expect(result.previousTickers).toEqual([]);
    });

    it('should invalidate all batch caches on portfolio change', () => {
      // Setup batch caches using saveBatchMetadata (which creates correct keys)
      saveBatchMetadata('batch_news', ['AAPL', 'GOOGL']);
      saveBatchMetadata('batch_filings', ['AAPL', 'GOOGL']);
      saveBatchMetadata('batch_sentiment', ['AAPL', 'GOOGL']);
      
      // Verify they exist (keys will be like ai_batch_batch_news_AAPL,GOOGL)
      const batchNewsKey = 'ai_batch_batch_news_AAPL,GOOGL';
      const batchFilingsKey = 'ai_batch_batch_filings_AAPL,GOOGL';
      const batchSentimentKey = 'ai_batch_batch_sentiment_AAPL,GOOGL';
      
      expect(localStorageMock.getItem(batchNewsKey)).toBeTruthy();
      expect(localStorageMock.getItem(batchFilingsKey)).toBeTruthy();
      expect(localStorageMock.getItem(batchSentimentKey)).toBeTruthy();
      
      // Invalidate
      invalidateAllBatchCaches();
      
      // Verify they're gone
      expect(localStorageMock.getItem(batchNewsKey)).toBeNull();
      expect(localStorageMock.getItem(batchFilingsKey)).toBeNull();
      expect(localStorageMock.getItem(batchSentimentKey)).toBeNull();
    });

    it('should clear caches only for removed tickers', () => {
      // Setup caches for multiple tickers
      saveAICache('sentiment', 'AAPL', { sentiment: 'BULLISH' });
      saveAICache('sentiment', 'GOOGL', { sentiment: 'NEUTRAL' });
      saveAICache('news', 'AAPL', [{ headline: 'Apple news' }]);
      saveAICache('news', 'GOOGL', [{ headline: 'Google news' }]);
      
      // Remove GOOGL from portfolio
      clearRemovedTickerCaches(['GOOGL']);
      
      // AAPL caches should remain
      expect(loadAICache('sentiment', 'AAPL')).toBeTruthy();
      expect(loadAICache('news', 'AAPL')).toBeTruthy();
      
      // GOOGL caches should be gone
      expect(loadAICache('sentiment', 'GOOGL')).toBeNull();
      expect(loadAICache('news', 'GOOGL')).toBeNull();
    });
  });

  // ==========================================================================
  // BATCH PARSING AND CACHING
  // ==========================================================================
  describe('Batch Parsing and Individual Caching', () => {
    it('should parse batch response and cache individually', () => {
      const batchArticles = [
        { ticker: 'AAPL', headline: 'Apple news', summary: 'Good', sentiment: 'POSITIVE' },
        { ticker: 'AAPL', headline: 'Apple news 2', summary: 'More', sentiment: 'NEUTRAL' },
        { ticker: 'GOOGL', headline: 'Google news', summary: 'Neutral', sentiment: 'NEUTRAL' },
      ];
      const tickers = ['AAPL', 'GOOGL'];
      
      const result = parseBatchAndCacheIndividual('batch_news', batchArticles, tickers);
      
      expect(result.size).toBe(2);
      const appleArticles = result.get('AAPL');
      expect(Array.isArray(appleArticles) ? appleArticles.length : 0).toBe(2);
      const googleArticles = result.get('GOOGL');
      expect(Array.isArray(googleArticles) ? googleArticles.length : 0).toBe(1);
      
      // Verify individual caches were created
      expect(loadIndividualCache('batch_news', 'AAPL')).toEqual([
        { ticker: 'AAPL', headline: 'Apple news', summary: 'Good', sentiment: 'POSITIVE' },
        { ticker: 'AAPL', headline: 'Apple news 2', summary: 'More', sentiment: 'NEUTRAL' },
      ]);
    });

    it('should handle empty array for tickers not in response', () => {
      const batchArticles = [
        { ticker: 'AAPL', headline: 'Apple news' },
      ];
      const tickers = ['AAPL', 'GOOGL', 'MSFT'];
      
      const result = parseBatchAndCacheIndividual('batch_news', batchArticles, tickers);
      
      expect(result.size).toBe(3);
      const appleArticles = result.get('AAPL');
      expect(Array.isArray(appleArticles) ? appleArticles.length : 0).toBe(1);
      expect(result.get('GOOGL')).toEqual([]);
      expect(result.get('MSFT')).toEqual([]);
    });
  });

  // ==========================================================================
  // TTL CONFIGURATION
  // ==========================================================================
  describe('Cache TTL Configuration', () => {
    it('should return correct TTLs for different types', () => {
      expect(getCacheTTL('news')).toBe(60 * 60 * 1000); // 1 hour
      expect(getCacheTTL('sentiment')).toBe(60 * 60 * 1000); // 1 hour
      expect(getCacheTTL('sec_filing')).toBe(24 * 60 * 60 * 1000); // 1 day
      expect(getCacheTTL('company_profile')).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
    });

    it('should return correct batch TTLs', () => {
      expect(getBatchCacheTTL('batch_news')).toBe(60 * 60 * 1000); // 1 hour
      expect(getBatchCacheTTL('batch_filings')).toBe(24 * 60 * 60 * 1000); // 1 day
      expect(getBatchCacheTTL('batch_sentiment')).toBe(60 * 60 * 1000); // 1 hour
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  describe('Error Handling', () => {
    it('should create AICacheError with correct properties', () => {
      const error = new AICacheError('Storage full', 'STORAGE_FULL');
      
      expect(error.message).toBe('Storage full');
      expect(error.code).toBe('STORAGE_FULL');
      expect(error.name).toBe('AICacheError');
    });

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.setItem('ai_cache_sentiment_BAD', 'not-json');
      
      // Should return null instead of throwing
      const result = loadAICache('sentiment', 'BAD');
      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // CLEAR CACHE
  // ==========================================================================
  describe('Cache Clearing', () => {
    it('should clear specific cache entry', () => {
      saveAICache('sentiment', 'AAPL', { sentiment: 'BULLISH' });
      saveAICache('sentiment', 'GOOGL', { sentiment: 'NEUTRAL' });
      
      clearAICache('sentiment', 'AAPL');
      
      expect(loadAICache('sentiment', 'AAPL')).toBeNull();
      expect(loadAICache('sentiment', 'GOOGL')).toBeTruthy();
    });

    it('should clear all caches of a type when no ticker specified', () => {
      saveAICache('sentiment', 'AAPL', { sentiment: 'BULLISH' });
      saveAICache('sentiment', 'GOOGL', { sentiment: 'NEUTRAL' });
      saveAICache('news', 'AAPL', [{ headline: 'Test' }]);
      
      clearAICache('sentiment');
      
      expect(loadAICache('sentiment', 'AAPL')).toBeNull();
      expect(loadAICache('sentiment', 'GOOGL')).toBeNull();
      // Other types should remain
      expect(loadAICache('news', 'AAPL')).toBeTruthy();
    });
  });
});
