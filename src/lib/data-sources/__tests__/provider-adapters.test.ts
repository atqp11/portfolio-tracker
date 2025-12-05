/**
 * Provider Adapters Unit Tests
 *
 * Tests for the Tiingo and Yahoo Finance provider adapters.
 * Focuses on error handling, transformation, and batch operations.
 */

import {
  TiingoQuoteProvider,
  YahooFinanceQuoteProvider,
  tiingoQuoteProvider,
  yahooFinanceQuoteProvider,
  type StockQuote,
} from '../provider-adapters';
import { ProviderError, ProviderErrorCode } from '../types';

// Mock the DAOs
jest.mock('@backend/modules/stocks/dao/tiingo.dao', () => ({
  tiingoDAO: {
    getQuote: jest.fn(),
    batchGetQuotes: jest.fn(),
  },
  TiingoDAO: jest.fn(),
}));

jest.mock('@backend/modules/stocks/dao/yahoo-finance.dao', () => ({
  yahooFinanceDAO: {
    getQuote: jest.fn(),
  },
  YahooFinanceDAO: jest.fn(),
}));

import { tiingoDAO } from '@backend/modules/stocks/dao/tiingo.dao';
import { yahooFinanceDAO } from '@backend/modules/stocks/dao/yahoo-finance.dao';

describe('TiingoQuoteProvider', () => {
  let provider: TiingoQuoteProvider;

  beforeEach(() => {
    provider = new TiingoQuoteProvider();
    jest.clearAllMocks();
  });

  describe('fetch', () => {
    test('should fetch quote successfully', async () => {
      const mockQuote: StockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 1.75,
        changePercent: '1.18',
        timestamp: Date.now(),
        source: 'tiingo',
      };

      (tiingoDAO.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await provider.fetch('AAPL');

      expect(result).toEqual(mockQuote);
      expect(tiingoDAO.getQuote).toHaveBeenCalledWith('AAPL');
    });

    test('should throw ProviderError on timeout', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      await expect(provider.fetch('AAPL')).rejects.toThrow(ProviderError);

      try {
        await provider.fetch('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(ProviderErrorCode.TIMEOUT);
        expect((error as ProviderError).provider).toBe('tiingo');
      }
    });

    test('should throw ProviderError on authentication error', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('401 Unauthorized: Invalid API key')
      );

      try {
        await provider.fetch('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(ProviderErrorCode.AUTHENTICATION);
        expect((error as ProviderError).provider).toBe('tiingo');
      }
    });

    test('should throw ProviderError on not found error', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('No quote data found for symbol')
      );

      try {
        await provider.fetch('INVALID');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(ProviderErrorCode.NOT_FOUND);
      }
    });

    test('should throw ProviderError on rate limit error', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('429 Too Many Requests')
      );

      try {
        await provider.fetch('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(ProviderErrorCode.RATE_LIMIT);
      }
    });

    test('should throw ProviderError on network error', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Network error: fetch failed')
      );

      try {
        await provider.fetch('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(ProviderErrorCode.NETWORK_ERROR);
      }
    });

    test('should throw ProviderError with UNKNOWN code for unknown errors', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Some unexpected error')
      );

      try {
        await provider.fetch('AAPL');
      } catch (error) {
        expect(error).toBeInstanceOf(ProviderError);
        expect((error as ProviderError).code).toBe(ProviderErrorCode.UNKNOWN);
      }
    });
  });

  describe('batchFetch', () => {
    test('should batch fetch quotes successfully', async () => {
      const mockQuotes = new Map([
        [
          'AAPL',
          {
            symbol: 'AAPL',
            price: 150.25,
            change: 1.75,
            changePercent: '1.18',
            timestamp: Date.now(),
            source: 'tiingo',
          },
        ],
        [
          'MSFT',
          {
            symbol: 'MSFT',
            price: 380.50,
            change: 2.50,
            changePercent: '0.66',
            timestamp: Date.now(),
            source: 'tiingo',
          },
        ],
      ]);

      (tiingoDAO.batchGetQuotes as jest.Mock).mockResolvedValueOnce(mockQuotes);

      const result = await provider.batchFetch(['AAPL', 'MSFT']);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['AAPL'].price).toBe(150.25);
      expect(result['MSFT'].price).toBe(380.50);
      expect(tiingoDAO.batchGetQuotes).toHaveBeenCalledWith(['AAPL', 'MSFT']);
    });

    test('should convert Map to Record correctly', async () => {
      const mockQuotes = new Map([
        [
          'TEST',
          {
            symbol: 'TEST',
            price: 100.0,
            change: 0,
            changePercent: '0.00',
            timestamp: Date.now(),
            source: 'tiingo',
          },
        ],
      ]);

      (tiingoDAO.batchGetQuotes as jest.Mock).mockResolvedValueOnce(mockQuotes);

      const result = await provider.batchFetch(['TEST']);

      expect(result).toHaveProperty('TEST');
      expect(result['TEST'].symbol).toBe('TEST');
    });

    test('should handle batch fetch errors', async () => {
      (tiingoDAO.batchGetQuotes as jest.Mock).mockRejectedValueOnce(
        new Error('Batch request failed')
      );

      await expect(provider.batchFetch(['AAPL', 'MSFT'])).rejects.toThrow(ProviderError);
    });
  });

  describe('healthCheck', () => {
    test('should return true when provider is healthy', async () => {
      const mockQuote: StockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 1.75,
        changePercent: '1.18',
        timestamp: Date.now(),
        source: 'tiingo',
      };

      (tiingoDAO.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false when provider is unhealthy', async () => {
      (tiingoDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Provider properties', () => {
    test('should have correct name', () => {
      expect(provider.name).toBe('tiingo');
    });

    test('should have correct maxBatchSize', () => {
      expect(provider.maxBatchSize).toBe(500);
    });
  });

  describe('Singleton instance', () => {
    test('should export singleton instance', () => {
      expect(tiingoQuoteProvider).toBeInstanceOf(TiingoQuoteProvider);
      expect(tiingoQuoteProvider.name).toBe('tiingo');
    });
  });
});

describe('YahooFinanceQuoteProvider', () => {
  let provider: YahooFinanceQuoteProvider;

  beforeEach(() => {
    provider = new YahooFinanceQuoteProvider();
    jest.clearAllMocks();
  });

  describe('fetch', () => {
    test('should fetch quote successfully', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 1.75,
        changePercent: '1.18',
      };

      (yahooFinanceDAO.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await provider.fetch('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.25);
      expect(result.change).toBe(1.75);
      expect(result.changePercent).toBe('1.18');
      expect(result.source).toBe('yahooFinance');
      expect(typeof result.timestamp).toBe('number');
      expect(yahooFinanceDAO.getQuote).toHaveBeenCalledWith('AAPL');
    });

    test('should handle errors with proper ProviderError', async () => {
      (yahooFinanceDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Yahoo API error')
      );

      await expect(provider.fetch('AAPL')).rejects.toThrow(ProviderError);
    });

    test('should use symbol parameter if rawQuote.symbol is missing', async () => {
      const mockQuote = {
        symbol: null, // Missing symbol in response
        price: 150.25,
        change: 1.75,
        changePercent: '1.18',
      };

      (yahooFinanceDAO.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await provider.fetch('AAPL');

      expect(result.symbol).toBe('AAPL'); // Should use parameter symbol
    });
  });

  describe('healthCheck', () => {
    test('should return true when provider is healthy', async () => {
      const mockQuote = {
        symbol: 'AAPL',
        price: 150.25,
        change: 1.75,
        changePercent: '1.18',
      };

      (yahooFinanceDAO.getQuote as jest.Mock).mockResolvedValueOnce(mockQuote);

      const result = await provider.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false when provider is unhealthy', async () => {
      (yahooFinanceDAO.getQuote as jest.Mock).mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const result = await provider.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('Provider properties', () => {
    test('should have correct name', () => {
      expect(provider.name).toBe('yahooFinance');
    });

    test('should not have batch support', () => {
      expect((provider as any).batchFetch).toBeUndefined();
      expect((provider as any).maxBatchSize).toBeUndefined();
    });
  });

  describe('Singleton instance', () => {
    test('should export singleton instance', () => {
      expect(yahooFinanceQuoteProvider).toBeInstanceOf(YahooFinanceQuoteProvider);
      expect(yahooFinanceQuoteProvider.name).toBe('yahooFinance');
    });
  });
});
