/**
 * Data Source Orchestrator Integration Tests
 *
 * Tests end-to-end orchestrator functionality with all components:
 * - Cache adapter
 * - Circuit breaker
 * - Request deduplication
 * - Telemetry
 */

import { DataSourceOrchestrator } from '../orchestrator';
import { CircuitBreakerManager } from '../circuit-breaker';
import { RequestDeduplicationManager } from '../deduplication';
import { TelemetryLogger } from '../telemetry';
import { getCacheAdapter } from '@lib/cache/adapter';
import type { DataProvider, BatchDataProvider, MergeStrategy } from '../types';

// Mock console methods to reduce test noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ============================================================================
// MOCK PROVIDERS
// ============================================================================

interface MockQuote {
  symbol: string;
  price: number;
  source: string;
}

class MockProvider1 implements DataProvider<MockQuote> {
  readonly name = 'tiingo'; // Use real provider name from PROVIDER_CONFIG
  private shouldFail = false;

  setFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async fetch(symbol: string): Promise<MockQuote> {
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay

    if (this.shouldFail) {
      throw new Error('MockProvider1 failed');
    }

    return {
      symbol,
      price: 100,
      source: 'tiingo',
    };
  }
}

class MockProvider2 implements DataProvider<MockQuote> {
  readonly name = 'alphaVantage'; // Use real provider name from PROVIDER_CONFIG
  private shouldFail = false;

  setFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async fetch(symbol: string): Promise<MockQuote> {
    await new Promise(resolve => setTimeout(resolve, 10));

    if (this.shouldFail) {
      throw new Error('MockProvider2 failed');
    }

    return {
      symbol,
      price: 200,
      source: 'alphaVantage',
    };
  }
}

class MockBatchProvider implements BatchDataProvider<MockQuote> {
  readonly name = 'yahooFinance'; // Use real provider name from PROVIDER_CONFIG
  readonly maxBatchSize = 10;
  private shouldFail = false;

  setFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async fetch(symbol: string): Promise<MockQuote> {
    const batch = await this.batchFetch([symbol]);
    return batch[symbol];
  }

  async batchFetch(symbols: string[]): Promise<Record<string, MockQuote>> {
    await new Promise(resolve => setTimeout(resolve, 20));

    if (this.shouldFail) {
      throw new Error('MockBatchProvider failed');
    }

    const results: Record<string, MockQuote> = {};
    symbols.forEach(symbol => {
      results[symbol] = {
        symbol,
        price: 300,
        source: 'yahooFinance',
      };
    });

    return results;
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('DataSourceOrchestrator Integration', () => {
  let orchestrator: DataSourceOrchestrator;
  let cache: ReturnType<typeof getCacheAdapter>;
  let telemetry: TelemetryLogger;
  let circuitBreakerManager: CircuitBreakerManager;
  let deduplicationManager: RequestDeduplicationManager;

  let provider1: MockProvider1;
  let provider2: MockProvider2;
  let batchProvider: MockBatchProvider;

  beforeEach(() => {
    // Get instances
    orchestrator = DataSourceOrchestrator.getInstance();
    cache = getCacheAdapter();
    telemetry = TelemetryLogger.getInstance();
    circuitBreakerManager = CircuitBreakerManager.getInstance();
    deduplicationManager = RequestDeduplicationManager.getInstance();

    // Reset state
    cache.clear();
    telemetry.reset();
    circuitBreakerManager.clearAll();
    deduplicationManager.clear();

    // Create fresh providers
    provider1 = new MockProvider1();
    provider2 = new MockProvider2();
    batchProvider = new MockBatchProvider();
  });

  afterEach(() => {
    // Clean up
    cache.clear();
    circuitBreakerManager.clearAll();
    deduplicationManager.clear();
  });

  describe('fetchWithFallback', () => {
    it('should fetch from primary provider on cache miss', async () => {
      const result = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
        tier: 'free',
      });

      expect(result.data).not.toBeNull();
      expect(result.data?.symbol).toBe('AAPL');
      expect(result.data?.price).toBe(100);
      expect(result.source).toBe('tiingo');
      expect(result.cached).toBe(false);
      expect(result.metadata.providersAttempted).toEqual(['tiingo']);
    });

    it('should return cached data on second request', async () => {
      // First request
      const result1 = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      expect(result1.cached).toBe(false);

      // Second request (should hit cache)
      const result2 = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      expect(result2.cached).toBe(true);
      expect(result2.source).toBe('cache');
      expect(result2.data).toEqual(result1.data);
    });

    it('should fallback to secondary provider on primary failure', async () => {
      provider1.setFail(true);

      const result = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
      });

      expect(result.data).not.toBeNull();
      expect(result.data?.price).toBe(200);
      expect(result.source).toBe('alphaVantage');
      expect(result.metadata.providersAttempted).toEqual(['tiingo', 'alphaVantage']);
      expect(result.errors).toHaveLength(1);
    });

    it('should return stale cache when all providers fail', async () => {
      // First request - populate cache with very short TTL
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
        cacheTTL: 50, // 50ms - will expire quickly
      });

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Fail all providers
      provider1.setFail(true);
      provider2.setFail(true);

      // Second request - should return stale cache
      const result = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
        allowStale: true,
      });

      expect(result.data).not.toBeNull();
      expect(result.cached).toBe(true);
      expect(result.source).toBe('cache');
      expect(result.errors).toHaveLength(2);
    });

    it('should return null when all providers fail and no cache', async () => {
      provider1.setFail(true);
      provider2.setFail(true);

      const result = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
      });

      expect(result.data).toBeNull();
      expect(result.errors).toHaveLength(2);
    });

    it('should deduplicate concurrent requests', async () => {
      const promises = [
        orchestrator.fetchWithFallback({
          key: 'AAPL',
          providers: [provider1],
          cacheKeyPrefix: 'quotes',
          deduplicate: true,
        }),
        orchestrator.fetchWithFallback({
          key: 'AAPL',
          providers: [provider1],
          cacheKeyPrefix: 'quotes',
          deduplicate: true,
        }),
        orchestrator.fetchWithFallback({
          key: 'AAPL',
          providers: [provider1],
          cacheKeyPrefix: 'quotes',
          deduplicate: true,
        }),
      ];

      const results = await Promise.all(promises);

      // First request was not deduplicated
      expect(results[0].metadata.deduplicated).toBe(false);
      // Others were deduplicated
      expect(results[1].metadata.deduplicated).toBe(true);
      expect(results[2].metadata.deduplicated).toBe(true);

      // All should have same data
      expect(results[0].data).toEqual(results[1].data);
      expect(results[1].data).toEqual(results[2].data);
    });

    it('should skip cache when skipCache is true', async () => {
      // First request - populate cache
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      // Change provider data
      provider1.setFail(false);

      // Second request with skipCache
      const result = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
        skipCache: true,
      });

      expect(result.cached).toBe(false);
      expect(result.source).toBe('tiingo');
    });
  });

  describe('fetchWithMerge', () => {
    it('should merge data from multiple providers', async () => {
      const mergeStrategy: MergeStrategy<MockQuote> = (results) => {
        // Combine prices
        const totalPrice = results.reduce((sum, r) => sum + (r.data?.price || 0), 0);
        return {
          symbol: results[0].data!.symbol,
          price: totalPrice,
          source: 'merged',
        };
      };

      const result = await orchestrator.fetchWithMerge({
        key: 'AAPL',
        providers: [provider1, provider2],
        mergeStrategy,
        cacheKeyPrefix: 'fundamentals',
      });

      expect(result.data).not.toBeNull();
      expect(result.data?.price).toBe(300); // 100 + 200
      expect(result.source).toBe('merged');
    });

    it('should fail when insufficient providers succeed', async () => {
      provider1.setFail(true);
      provider2.setFail(true);

      const mergeStrategy: MergeStrategy<MockQuote> = (results) => results[0]?.data || null;

      const result = await orchestrator.fetchWithMerge({
        key: 'AAPL',
        providers: [provider1, provider2],
        mergeStrategy,
        minProviders: 1,
        cacheKeyPrefix: 'fundamentals',
      });

      expect(result.data).toBeNull();
    });

    it('should succeed with minProviders=1 when one provider succeeds', async () => {
      provider1.setFail(true);

      const mergeStrategy: MergeStrategy<MockQuote> = (results) => results[0]?.data || null;

      const result = await orchestrator.fetchWithMerge({
        key: 'AAPL',
        providers: [provider1, provider2],
        mergeStrategy,
        minProviders: 1,
        cacheKeyPrefix: 'fundamentals',
      });

      expect(result.data).not.toBeNull();
      expect(result.data?.price).toBe(200);
    });
  });

  describe('batchFetch', () => {
    it('should fetch multiple symbols in one batch', async () => {
      const result = await orchestrator.batchFetch({
        keys: ['AAPL', 'MSFT', 'GOOGL'],
        provider: batchProvider,
        cacheKeyPrefix: 'quotes',
      });

      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(3);
      expect(result.summary.failed).toBe(0);
      expect(result.results.AAPL.data?.price).toBe(300);
      expect(result.results.MSFT.data?.price).toBe(300);
      expect(result.results.GOOGL.data?.price).toBe(300);
    });

    it('should split large requests into multiple batches', async () => {
      const symbols = Array(25).fill(0).map((_, i) => `SYMBOL${i}`);

      const result = await orchestrator.batchFetch({
        keys: symbols,
        provider: batchProvider,
        cacheKeyPrefix: 'quotes',
      });

      expect(result.summary.total).toBe(25);
      expect(result.summary.successful).toBe(25);
    });

    it('should use cached results for some keys', async () => {
      // Pre-populate cache for some symbols
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      // Batch fetch including cached symbol
      const result = await orchestrator.batchFetch({
        keys: ['AAPL', 'MSFT', 'GOOGL'],
        provider: batchProvider,
        cacheKeyPrefix: 'quotes',
      });

      expect(result.summary.cached).toBe(1); // AAPL from cache
      expect(result.summary.fresh).toBe(2); // MSFT, GOOGL from provider
      expect(result.results.AAPL.cached).toBe(true);
      expect(result.results.MSFT.cached).toBe(false);
    });

    it('should handle batch fetch errors', async () => {
      batchProvider.setFail(true);

      const result = await orchestrator.batchFetch({
        keys: ['AAPL', 'MSFT'],
        provider: batchProvider,
        cacheKeyPrefix: 'quotes',
      });

      expect(result.summary.failed).toBe(2);
      expect(result.errors.AAPL).toBeDefined();
      expect(result.errors.MSFT).toBeDefined();
    });
  });

  describe('Telemetry Integration', () => {
    it('should track cache hits and misses', async () => {
      // Cache miss
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      // Cache hit
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      const stats = telemetry.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHitRate).toBe(50);
    });

    it('should track provider successes and failures', async () => {
      // Success
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      // Failure
      provider1.setFail(true);
      await orchestrator.fetchWithFallback({
        key: 'MSFT',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
        allowStale: false,
      });

      const stats = telemetry.getStats();
      expect(stats.providerAttempts.tiingo).toBe(2);
      expect(stats.providerSuccesses.tiingo).toBe(1);
      expect(stats.providerFailures.tiingo).toBeDefined();
    });

    it('should track merge operations', async () => {
      const mergeStrategy: MergeStrategy<MockQuote> = (results) => results[0]?.data || null;

      await orchestrator.fetchWithMerge({
        key: 'AAPL',
        providers: [provider1, provider2],
        mergeStrategy,
        cacheKeyPrefix: 'fundamentals',
      });

      const stats = telemetry.getStats();
      expect(stats.mergeOperations).toBe(1);
    });

    it('should track batch operations', async () => {
      await orchestrator.batchFetch({
        keys: ['AAPL', 'MSFT'],
        provider: batchProvider,
        cacheKeyPrefix: 'quotes',
      });

      const stats = telemetry.getStats();
      expect(stats.batchOperations).toBe(1);
    });
  });

  describe('Complete Integration Flow', () => {
    it('should handle complex workflow: cache → primary fail → fallback → stale', async () => {
      // 1. First request - populate cache
      const result1 = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
      });

      expect(result1.cached).toBe(false);
      expect(result1.source).toBe('tiingo');

      // 2. Second request - hit cache
      const result2 = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
      });

      expect(result2.cached).toBe(true);

      // 3. Force fresh fetch with primary fail → use fallback
      provider1.setFail(true);

      const result3 = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
        skipCache: true,
      });

      expect(result3.source).toBe('alphaVantage');
      expect(result3.errors).toHaveLength(1);

      // 4. All providers fail → use stale cache
      provider2.setFail(true);

      const result4 = await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1, provider2],
        cacheKeyPrefix: 'quotes',
        skipCache: true,
        allowStale: true,
      });

      expect(result4.cached).toBe(true);
      expect(result4.errors).toHaveLength(2);

      // Verify telemetry tracked everything
      const stats = telemetry.getStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
      expect(stats.staleCacheUsed).toBe(1);
      expect(stats.providerAttempts.tiingo).toBeGreaterThan(0);
      expect(stats.providerFailures.tiingo).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive orchestrator stats', async () => {
      await orchestrator.fetchWithFallback({
        key: 'AAPL',
        providers: [provider1],
        cacheKeyPrefix: 'quotes',
      });

      const stats = orchestrator.getStats();

      expect(stats).toHaveProperty('circuitBreakers');
      expect(stats).toHaveProperty('deduplication');
      expect(stats).toHaveProperty('telemetry');

      expect(stats.telemetry.cacheHits + stats.telemetry.cacheMisses).toBeGreaterThan(0);
    });
  });
});
