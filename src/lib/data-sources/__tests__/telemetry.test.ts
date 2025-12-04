/**
 * Telemetry Logger Tests
 *
 * Tests event logging, statistics tracking, and metrics calculations.
 */

import { TelemetryLogger } from '../telemetry';
import { ProviderErrorCode } from '../types';

// Mock console methods to reduce test noise
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('TelemetryLogger', () => {
  let logger: TelemetryLogger;

  beforeEach(() => {
    logger = TelemetryLogger.getInstance();
    logger.reset();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = TelemetryLogger.getInstance();
      const instance2 = TelemetryLogger.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Cache Events', () => {
    it('should log cache hit', () => {
      logger.logCacheHit('quote', 'AAPL', 1000);

      const stats = logger.getStats();
      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(0);
      expect(stats.totalEvents).toBe(1);

      const events = logger.getEventsByType('cache_hit');
      expect(events).toHaveLength(1);
      expect(events[0].key).toBe('quote:AAPL');
      expect(events[0].metadata?.age).toBe(1000);
    });

    it('should log cache miss', () => {
      logger.logCacheMiss('quote', 'AAPL');

      const stats = logger.getStats();
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(1);

      const events = logger.getEventsByType('cache_miss');
      expect(events).toHaveLength(1);
      expect(events[0].key).toBe('quote:AAPL');
    });

    it('should calculate cache hit rate', () => {
      logger.logCacheHit('quote', 'AAPL', 100);
      logger.logCacheHit('quote', 'MSFT', 200);
      logger.logCacheMiss('quote', 'GOOGL');
      logger.logCacheMiss('quote', 'TSLA');

      const stats = logger.getStats();
      expect(stats.cacheHits).toBe(2);
      expect(stats.cacheMisses).toBe(2);
      expect(stats.cacheHitRate).toBe(50); // 50%
    });

    it('should log stale cache usage', () => {
      logger.logStaleCacheUsed('quote', 'AAPL', 60000);

      const stats = logger.getStats();
      expect(stats.staleCacheUsed).toBe(1);

      const events = logger.getEventsByType('stale_cache_used');
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.age).toBe(60000);
    });
  });

  describe('Provider Events', () => {
    it('should log provider attempt', () => {
      logger.logProviderAttempt('alphaVantage', 'AAPL');
      logger.logProviderAttempt('alphaVantage', 'MSFT');

      const stats = logger.getStats();
      expect(stats.providerAttempts.alphaVantage).toBe(2);
    });

    it('should log provider success', () => {
      logger.logProviderSuccess('alphaVantage', 'AAPL', 250);

      const stats = logger.getStats();
      expect(stats.providerSuccesses.alphaVantage).toBe(1);

      const events = logger.getEventsByType('provider_success');
      expect(events).toHaveLength(1);
      expect(events[0].provider).toBe('alphaVantage');
      expect(events[0].duration).toBe(250);
    });

    it('should log provider failure', () => {
      logger.logProviderFailure('alphaVantage', 'AAPL', ProviderErrorCode.TIMEOUT);
      logger.logProviderFailure('alphaVantage', 'MSFT', ProviderErrorCode.TIMEOUT);
      logger.logProviderFailure('alphaVantage', 'GOOGL', ProviderErrorCode.RATE_LIMIT);

      const stats = logger.getStats();
      expect(stats.providerFailures.alphaVantage).toBeDefined();
      expect(stats.providerFailures.alphaVantage[ProviderErrorCode.TIMEOUT]).toBe(2);
      expect(stats.providerFailures.alphaVantage[ProviderErrorCode.RATE_LIMIT]).toBe(1);
    });

    it('should track multiple providers', () => {
      logger.logProviderAttempt('alphaVantage', 'AAPL');
      logger.logProviderAttempt('fmp', 'AAPL');
      logger.logProviderSuccess('alphaVantage', 'AAPL', 100);
      logger.logProviderFailure('fmp', 'AAPL', ProviderErrorCode.NOT_FOUND);

      const stats = logger.getStats();
      expect(stats.providerAttempts.alphaVantage).toBe(1);
      expect(stats.providerAttempts.fmp).toBe(1);
      expect(stats.providerSuccesses.alphaVantage).toBe(1);
      expect(stats.providerFailures.fmp[ProviderErrorCode.NOT_FOUND]).toBe(1);
    });
  });

  describe('Circuit Breaker Events', () => {
    it('should log circuit open events', () => {
      logger.logCircuitOpen('alphaVantage', 'AAPL');
      logger.logCircuitOpen('alphaVantage', 'MSFT');

      const stats = logger.getStats();
      expect(stats.circuitOpenEvents).toBe(2);

      const events = logger.getEventsByType('circuit_open');
      expect(events).toHaveLength(2);
    });
  });

  describe('Merge Events', () => {
    it('should log merge success', () => {
      logger.logMergeSuccess('AAPL', 2);

      const stats = logger.getStats();
      expect(stats.mergeOperations).toBe(1);

      const events = logger.getEventsByType('merge_success');
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.providerCount).toBe(2);
    });

    it('should log merge failed', () => {
      logger.logMergeFailed('AAPL');

      const events = logger.getEventsByType('merge_failed');
      expect(events).toHaveLength(1);
    });

    it('should log insufficient providers', () => {
      logger.logMergeInsufficientProviders('AAPL', 1, 2);

      const events = logger.getEventsByType('merge_insufficient_providers');
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.actual).toBe(1);
      expect(events[0].metadata?.required).toBe(2);
    });
  });

  describe('Batch Events', () => {
    it('should log batch fetch', () => {
      logger.logBatchFetch('tiingo', 100, 2);

      const stats = logger.getStats();
      expect(stats.batchOperations).toBe(1);

      const events = logger.getEventsByType('batch_fetch');
      expect(events).toHaveLength(1);
      expect(events[0].provider).toBe('tiingo');
      expect(events[0].metadata?.keyCount).toBe(100);
      expect(events[0].metadata?.batchCount).toBe(2);
    });
  });

  describe('Error Events', () => {
    it('should log all providers failed', () => {
      logger.logAllProvidersFailed('AAPL', [
        { provider: 'alphaVantage', code: 'TIMEOUT' },
        { provider: 'fmp', code: 'RATE_LIMIT' },
      ]);

      const events = logger.getEventsByType('all_providers_failed');
      expect(events).toHaveLength(1);
      expect(events[0].metadata?.errorCount).toBe(2);
    });
  });

  describe('Event Management', () => {
    it('should get recent events', () => {
      logger.logCacheHit('quote', 'AAPL', 100);
      logger.logCacheMiss('quote', 'MSFT');
      logger.logProviderAttempt('alphaVantage', 'AAPL');

      const recent = logger.getRecentEvents(2);
      expect(recent).toHaveLength(2);
      // Should be last 2 events
      expect(recent[0].type).toBe('cache_miss');
      expect(recent[1].type).toBe('provider_attempt');
    });

    it('should get events by type', () => {
      logger.logCacheHit('quote', 'AAPL', 100);
      logger.logCacheHit('quote', 'MSFT', 200);
      logger.logCacheMiss('quote', 'GOOGL');

      const hits = logger.getEventsByType('cache_hit');
      const misses = logger.getEventsByType('cache_miss');

      expect(hits).toHaveLength(2);
      expect(misses).toHaveLength(1);
    });

    it('should limit events to MAX_EVENTS', () => {
      // Log more than MAX_EVENTS (1000)
      for (let i = 0; i < 1100; i++) {
        logger.logCacheHit('quote', `SYMBOL${i}`, 100);
      }

      const allEvents = logger.getRecentEvents(2000);
      expect(allEvents.length).toBeLessThanOrEqual(1000);

      const stats = logger.getStats();
      expect(stats.totalEvents).toBe(1100); // Stats still track total
    });
  });

  describe('Reset', () => {
    it('should reset all events and stats', () => {
      logger.logCacheHit('quote', 'AAPL', 100);
      logger.logProviderSuccess('alphaVantage', 'AAPL', 200);
      logger.logCircuitOpen('alphaVantage', 'AAPL');

      let stats = logger.getStats();
      expect(stats.totalEvents).toBe(3);

      logger.reset();

      stats = logger.getStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.providerSuccesses.alphaVantage).toBeUndefined();
      expect(stats.circuitOpenEvents).toBe(0);

      const events = logger.getRecentEvents(100);
      expect(events).toHaveLength(0);
    });
  });

  describe('Statistics Calculations', () => {
    it('should calculate correct cache hit rate with multiple hits/misses', () => {
      // 7 hits, 3 misses = 70% hit rate
      for (let i = 0; i < 7; i++) {
        logger.logCacheHit('quote', `HIT${i}`, 100);
      }
      for (let i = 0; i < 3; i++) {
        logger.logCacheMiss('quote', `MISS${i}`);
      }

      const stats = logger.getStats();
      expect(stats.cacheHitRate).toBe(70);
    });

    it('should handle zero cache operations', () => {
      const stats = logger.getStats();
      expect(stats.cacheHitRate).toBe(0);
    });

    it('should track comprehensive statistics', () => {
      // Simulate real usage
      logger.logCacheHit('quote', 'AAPL', 100);
      logger.logCacheMiss('quote', 'MSFT');
      logger.logProviderAttempt('alphaVantage', 'MSFT');
      logger.logProviderSuccess('alphaVantage', 'MSFT', 250);
      logger.logBatchFetch('tiingo', 50, 1);

      const stats = logger.getStats();

      expect(stats.cacheHits).toBe(1);
      expect(stats.cacheMisses).toBe(1);
      expect(stats.cacheHitRate).toBe(50);
      expect(stats.providerAttempts.alphaVantage).toBe(1);
      expect(stats.providerSuccesses.alphaVantage).toBe(1);
      expect(stats.batchOperations).toBe(1);
      expect(stats.totalEvents).toBe(5);
    });
  });

  describe('Event Timestamps', () => {
    it('should include timestamp in events', () => {
      const beforeTime = Date.now();
      logger.logCacheHit('quote', 'AAPL', 100);
      const afterTime = Date.now();

      const events = logger.getRecentEvents(1);
      expect(events[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(events[0].timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
