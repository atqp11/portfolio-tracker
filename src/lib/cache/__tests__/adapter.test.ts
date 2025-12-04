/**
 * Cache Adapter Unit Tests
 *
 * Tests for the cache adapter implementations.
 * Integration tests with real Redis require actual connection.
 */

import {
  InMemoryCacheAdapter,
  CacheAdapter,
  resetCacheAdapter,
} from '../adapter';

describe('CacheAdapter', () => {
  describe('InMemoryCacheAdapter', () => {
    let cache: InMemoryCacheAdapter;

    beforeEach(() => {
      cache = new InMemoryCacheAdapter();
    });

    describe('get/set', () => {
      test('should set and get a string value', async () => {
        await cache.set('test-key', 'test-value', 1000);
        const value = await cache.get('test-key');
        expect(value).toBe('test-value');
      });

      test('should set and get an object value', async () => {
        const obj = { price: 150.25, symbol: 'AAPL' };
        await cache.set('quote:AAPL:v1', obj, 1000);
        const value = await cache.get<typeof obj>('quote:AAPL:v1');
        expect(value).toEqual(obj);
      });

      test('should set and get an array value', async () => {
        const arr = [1, 2, 3, 4, 5];
        await cache.set('array-key', arr, 1000);
        const value = await cache.get<number[]>('array-key');
        expect(value).toEqual(arr);
      });

      test('should return null for non-existent key', async () => {
        const value = await cache.get('non-existent-key');
        expect(value).toBeNull();
      });

      test('should return null for expired key', async () => {
        await cache.set('test-key', 'test-value', 50); // 50ms TTL
        await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
        const value = await cache.get('test-key');
        expect(value).toBeNull();
      });

      test('should update existing key with new value', async () => {
        await cache.set('test-key', 'value1', 1000);
        await cache.set('test-key', 'value2', 1000);
        const value = await cache.get('test-key');
        expect(value).toBe('value2');
      });

      test('should handle null value', async () => {
        await cache.set('null-key', null, 1000);
        const value = await cache.get('null-key');
        expect(value).toBeNull();
      });
    });

    describe('getAge', () => {
      test('should return age of cached entry', async () => {
        await cache.set('test-key', 'test-value', 10000);
        await new Promise((resolve) => setTimeout(resolve, 50));
        const age = await cache.getAge('test-key');
        expect(age).toBeGreaterThanOrEqual(50);
        expect(age).toBeLessThan(200);
      });

      test('should return Infinity for non-existent key', async () => {
        const age = await cache.getAge('non-existent-key');
        expect(age).toBe(Infinity);
      });
    });

    describe('delete', () => {
      test('should delete existing key', async () => {
        await cache.set('test-key', 'test-value', 1000);
        await cache.delete('test-key');
        const value = await cache.get('test-key');
        expect(value).toBeNull();
      });

      test('should not throw when deleting non-existent key', async () => {
        await expect(cache.delete('non-existent-key')).resolves.not.toThrow();
      });
    });

    describe('clear', () => {
      test('should clear all keys when no pattern provided', async () => {
        await cache.set('key1', 'value1', 1000);
        await cache.set('key2', 'value2', 1000);
        await cache.set('key3', 'value3', 1000);

        await cache.clear();

        expect(await cache.get('key1')).toBeNull();
        expect(await cache.get('key2')).toBeNull();
        expect(await cache.get('key3')).toBeNull();
      });

      test('should clear only keys matching pattern', async () => {
        await cache.set('quote:AAPL:v1', { price: 150 }, 1000);
        await cache.set('quote:TSLA:v1', { price: 200 }, 1000);
        await cache.set('news:123:v1', { title: 'News' }, 1000);

        await cache.clear('quote:*');

        expect(await cache.get('quote:AAPL:v1')).toBeNull();
        expect(await cache.get('quote:TSLA:v1')).toBeNull();
        expect(await cache.get('news:123:v1')).not.toBeNull();
      });

      test('should handle complex glob patterns', async () => {
        await cache.set('fundamentals:AAPL:v1', { pe: 25 }, 1000);
        await cache.set('fundamentals:AAPL:v2', { pe: 26 }, 1000);
        await cache.set('fundamentals:TSLA:v1', { pe: 50 }, 1000);

        await cache.clear('fundamentals:AAPL:*');

        expect(await cache.get('fundamentals:AAPL:v1')).toBeNull();
        expect(await cache.get('fundamentals:AAPL:v2')).toBeNull();
        expect(await cache.get('fundamentals:TSLA:v1')).not.toBeNull();
      });
    });

    describe('getStats', () => {
      test('should track cache hits and misses', async () => {
        await cache.set('key1', 'value1', 1000);

        await cache.get('key1'); // hit
        await cache.get('key1'); // hit
        await cache.get('key2'); // miss
        await cache.get('key3'); // miss
        await cache.get('key4'); // miss

        const stats = await cache.getStats();
        expect(stats.type).toBe('memory');
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(3);
        expect(stats.size).toBe(1);
      });
    });

    describe('cleanExpired', () => {
      test('should clean up expired entries', async () => {
        await cache.set('short-ttl-1', 'value1', 50);
        await cache.set('short-ttl-2', 'value2', 50);
        await cache.set('long-ttl', 'value3', 10000);

        await new Promise((resolve) => setTimeout(resolve, 100));

        const cleaned = cache.cleanExpired();
        expect(cleaned).toBe(2);

        const stats = await cache.getStats();
        expect(stats.size).toBe(1);
      });
    });

    describe('edge cases', () => {
      test('should handle empty string key', async () => {
        await cache.set('', 'value', 1000);
        const value = await cache.get('');
        expect(value).toBe('value');
      });

      test('should handle special characters in key', async () => {
        await cache.set('key:with:colons', 'value1', 1000);
        await cache.set('key-with-dashes', 'value2', 1000);
        await cache.set('key_with_underscores', 'value3', 1000);

        expect(await cache.get('key:with:colons')).toBe('value1');
        expect(await cache.get('key-with-dashes')).toBe('value2');
        expect(await cache.get('key_with_underscores')).toBe('value3');
      });

      test('should handle very long TTL', async () => {
        const longTTL = 365 * 24 * 60 * 60 * 1000; // 1 year
        await cache.set('long-ttl-key', 'value', longTTL);
        const value = await cache.get('long-ttl-key');
        expect(value).toBe('value');
      });

      test('should handle zero TTL (immediate expiration)', async () => {
        await cache.set('zero-ttl-key', 'value', 0);
        const value = await cache.get('zero-ttl-key');
        expect(value).toBeNull();
      });

      test('should handle complex nested objects', async () => {
        const complex = {
          symbol: 'AAPL',
          quote: {
            price: 150.25,
            change: 2.50,
            history: [148, 149, 150],
          },
          metadata: {
            source: 'cache',
            timestamp: Date.now(),
          },
        };

        await cache.set('complex-key', complex, 1000);
        const value = await cache.get<typeof complex>('complex-key');
        expect(value).toEqual(complex);
      });
    });
  });

  describe('resetCacheAdapter', () => {
    test('should reset singleton instance', () => {
      // This is mainly for testing - verify it doesn't throw
      expect(() => resetCacheAdapter()).not.toThrow();
    });
  });
});
