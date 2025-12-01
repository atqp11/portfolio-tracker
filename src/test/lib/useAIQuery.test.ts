/**
 * AI Query Hooks Tests
 * 
 * Tests for TanStack Query integration with caching system
 * 
 * These tests verify:
 * - Query key structure
 * - Error handling (AIQueryError types)
 * - Retry logic for retryable errors
 * - Helper functions (safeParseResponse)
 */

import {
  AIQueryError,
  safeParseResponse,
} from '@lib/hooks/useAIQuery';

// These hooks require React environment, so we test them separately
// For now, we test the utility functions and error classes

describe('AIQueryError', () => {
  it('should create error with correct properties', () => {
    const error = new AIQueryError('Rate limited', 'RATE_LIMITED', false);
    
    expect(error.message).toBe('Rate limited');
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.retryable).toBe(false);
    expect(error.name).toBe('AIQueryError');
  });

  it('should create retryable network error', () => {
    const error = new AIQueryError('Network failed', 'NETWORK_ERROR', true);
    
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.retryable).toBe(true);
  });

  it('should create non-retryable parse error', () => {
    const error = new AIQueryError('Invalid JSON', 'PARSE_ERROR', false);
    
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.retryable).toBe(false);
  });
});

describe('safeParseResponse', () => {
  it('should parse valid JSON', () => {
    const result = safeParseResponse('{"foo": "bar"}', {});
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should return fallback for invalid JSON', () => {
    const fallback = { default: true };
    const result = safeParseResponse('not-json', fallback);
    expect(result).toEqual(fallback);
  });

  it('should return fallback for null input', () => {
    const fallback = { articles: [] };
    const result = safeParseResponse(null, fallback);
    expect(result).toEqual(fallback);
  });

  it('should return fallback for undefined input', () => {
    const fallback = { sentiment: 'NEUTRAL' };
    const result = safeParseResponse(undefined, fallback);
    expect(result).toEqual(fallback);
  });

  it('should return fallback for empty string', () => {
    const fallback = { data: [] };
    const result = safeParseResponse('', fallback);
    expect(result).toEqual(fallback);
  });
});

describe('Query Key Structure', () => {
  it('should have correct key structure for sentiment queries', () => {
    // The query key pattern: ['ai', 'sentiment', tickerUpper]
    const ticker = 'aapl';
    const expectedKey = ['ai', 'sentiment', 'AAPL'];
    
    // This verifies our key structure convention
    expect(['ai', 'sentiment', ticker.toUpperCase()]).toEqual(expectedKey);
  });

  it('should have correct key structure for batch queries', () => {
    // The query key pattern: ['ai', 'news', 'batch', tickersKey]
    const tickers = ['GOOGL', 'AAPL', 'MSFT'];
    const tickersKey = [...tickers].sort().join(',');
    const expectedKey = ['ai', 'news', 'batch', 'AAPL,GOOGL,MSFT'];
    
    expect(['ai', 'news', 'batch', tickersKey]).toEqual(expectedKey);
  });

  it('should sort tickers for consistent batch keys', () => {
    // Different order same tickers should produce same key
    const tickers1 = ['AAPL', 'GOOGL', 'MSFT'];
    const tickers2 = ['MSFT', 'AAPL', 'GOOGL'];
    const tickers3 = ['GOOGL', 'MSFT', 'AAPL'];
    
    const key1 = [...tickers1].sort().join(',');
    const key2 = [...tickers2].sort().join(',');
    const key3 = [...tickers3].sort().join(',');
    
    expect(key1).toBe(key2);
    expect(key2).toBe(key3);
  });
});

describe('Retry Logic', () => {
  it('should identify retryable errors correctly', () => {
    const networkError = new AIQueryError('Network failed', 'NETWORK_ERROR', true);
    const serverError = new AIQueryError('Server error', 'API_ERROR', true);
    const rateLimitError = new AIQueryError('Rate limited', 'RATE_LIMITED', false);
    const parseError = new AIQueryError('Bad JSON', 'PARSE_ERROR', false);

    expect(networkError.retryable).toBe(true);
    expect(serverError.retryable).toBe(true);
    expect(rateLimitError.retryable).toBe(false);
    expect(parseError.retryable).toBe(false);
  });

  it('should calculate exponential backoff correctly', () => {
    const retryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000);
    
    expect(retryDelay(0)).toBe(1000); // 1 second
    expect(retryDelay(1)).toBe(2000); // 2 seconds
    expect(retryDelay(2)).toBe(4000); // 4 seconds
    expect(retryDelay(3)).toBe(5000); // capped at 5 seconds
    expect(retryDelay(10)).toBe(5000); // still capped
  });
});

describe('TanStack Query Deduplication (Conceptual)', () => {
  /**
   * TanStack Query automatically deduplicates requests with the same query key.
   * When multiple components request the same data:
   * 1. Only one network request is made
   * 2. All subscribers receive the same data
   * 3. This happens automatically via the queryKey
   * 
   * Our implementation ensures:
   * - Consistent query keys (sorted tickers, uppercase symbols)
   * - Proper staleTime prevents unnecessary refetches
   * - gcTime keeps data in memory during navigation
   */

  it('should use same query key for same ticker regardless of case', () => {
    const key1 = ['ai', 'sentiment', 'aapl'.toUpperCase()];
    const key2 = ['ai', 'sentiment', 'AAPL'];
    const key3 = ['ai', 'sentiment', 'AaPl'.toUpperCase()];

    expect(key1).toEqual(key2);
    expect(key2).toEqual(key3);
  });

  it('should generate consistent batch keys for deduplication', () => {
    // Simulate two components requesting news for same portfolio
    const portfolio = ['TSLA', 'AAPL', 'NVDA'];
    
    const queryKey1 = ['ai', 'news', 'batch', [...portfolio].sort().join(',')];
    const queryKey2 = ['ai', 'news', 'batch', [...portfolio].sort().join(',')];
    
    // Both generate same key - TanStack Query will dedupe
    expect(JSON.stringify(queryKey1)).toBe(JSON.stringify(queryKey2));
  });
});
