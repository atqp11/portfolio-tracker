/**
 * Tiingo DAO Unit Tests
 *
 * Tests for the Tiingo data access object.
 * Uses mocked API responses to avoid hitting actual API during tests.
 */

import { tiingoDAO, TiingoDAO } from '../tiingo.dao';
import type { StockQuote } from '../tiingo.dao';

// Mock the PROVIDER_CONFIG
jest.mock('@lib/config/providers.config', () => ({
  PROVIDER_CONFIG: {
    tiingo: {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.tiingo.com/tiingo',
      timeout: 5000,
    },
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('TiingoDAO', () => {
  let dao: TiingoDAO;

  beforeEach(() => {
    dao = new TiingoDAO();
    jest.clearAllMocks();
  });

  describe('getQuote', () => {
    test('should fetch quote for a single symbol', async () => {
      const mockResponse = [
        {
          ticker: 'AAPL',
          timestamp: '2024-01-15T16:00:00Z',
          last: 150.25,
          prevClose: 148.50,
          open: 149.00,
          high: 151.00,
          low: 148.75,
          mid: null,
          volume: 1000000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 150.25,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quote = await dao.getQuote('AAPL');

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe('AAPL');
      expect(quote.price).toBe(150.25);
      expect(quote.change).toBe(1.75); // 150.25 - 148.50
      expect(quote.changePercent).toBe('1.18'); // ((150.25 - 148.50) / 148.50 * 100).toFixed(2)
      expect(quote.source).toBe('tiingo');
      expect(quote.volume).toBe(1000000);
      expect(quote.high).toBe(151.00);
      expect(quote.low).toBe(148.75);
      expect(quote.open).toBe(149.00);
      expect(quote.previousClose).toBe(148.50);
    });

    test('should throw error if no quote data returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await expect(dao.getQuote('INVALID')).rejects.toThrow(
        'No quote data returned for symbol: INVALID'
      );
    });

    test('should throw error if API key is not configured', async () => {
      // Create a new DAO instance with no API key
      jest.resetModules();
      jest.doMock('@lib/config/providers.config', () => ({
        PROVIDER_CONFIG: {
          tiingo: {
            apiKey: null,
            baseUrl: 'https://api.tiingo.com/tiingo',
            timeout: 5000,
          },
        },
      }));

      const { TiingoDAO: TiingoDAONoKey } = require('../tiingo.dao');
      const daoNoKey = new TiingoDAONoKey();

      await expect(daoNoKey.getQuote('AAPL')).rejects.toThrow(
        'TIINGO_API_KEY environment variable is not configured'
      );
    });
  });

  describe('batchGetQuotes', () => {
    test('should fetch quotes for multiple symbols', async () => {
      const mockResponse = [
        {
          ticker: 'AAPL',
          timestamp: '2024-01-15T16:00:00Z',
          last: 150.25,
          prevClose: 148.50,
          open: 149.00,
          high: 151.00,
          low: 148.75,
          mid: null,
          volume: 1000000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 150.25,
        },
        {
          ticker: 'MSFT',
          timestamp: '2024-01-15T16:00:00Z',
          last: 380.50,
          prevClose: 378.00,
          open: 379.00,
          high: 382.00,
          low: 377.50,
          mid: null,
          volume: 800000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 380.50,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quotes = await dao.batchGetQuotes(['AAPL', 'MSFT']);

      expect(quotes.size).toBe(2);
      expect(quotes.has('AAPL')).toBe(true);
      expect(quotes.has('MSFT')).toBe(true);

      const appleQuote = quotes.get('AAPL')!;
      expect(appleQuote.price).toBe(150.25);
      expect(appleQuote.source).toBe('tiingo');

      const msftQuote = quotes.get('MSFT')!;
      expect(msftQuote.price).toBe(380.50);
      expect(msftQuote.source).toBe('tiingo');
    });

    test('should return empty map for empty symbols array', async () => {
      const quotes = await dao.batchGetQuotes([]);

      expect(quotes.size).toBe(0);
    });

    test('should throw error if batch size exceeds 500', async () => {
      const symbols = Array.from({ length: 501 }, (_, i) => `SYM${i}`);

      await expect(dao.batchGetQuotes(symbols)).rejects.toThrow(
        'Tiingo batch limit is 500 symbols. Received: 501'
      );
    });

    test('should handle batch at max size (500 symbols)', async () => {
      const symbols = Array.from({ length: 500 }, (_, i) => `SYM${i}`);
      const mockResponse = symbols.map((symbol) => ({
        ticker: symbol,
        timestamp: '2024-01-15T16:00:00Z',
        last: 100.0,
        prevClose: 99.0,
        open: 99.5,
        high: 100.5,
        low: 99.0,
        mid: null,
        volume: 10000,
        bidSize: null,
        bidPrice: null,
        askSize: null,
        askPrice: null,
        tngoLast: 100.0,
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quotes = await dao.batchGetQuotes(symbols);

      expect(quotes.size).toBe(500);
      expect(quotes.has('SYM0')).toBe(true);
      expect(quotes.has('SYM499')).toBe(true);
    });

    test('should throw error on API failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(dao.batchGetQuotes(['AAPL'])).rejects.toThrow(
        'Tiingo API error: Network error'
      );
    });

    test('should calculate change and changePercent correctly', async () => {
      const mockResponse = [
        {
          ticker: 'TEST',
          timestamp: '2024-01-15T16:00:00Z',
          last: 110.0,
          prevClose: 100.0,
          open: 100.0,
          high: 110.0,
          low: 100.0,
          mid: null,
          volume: 10000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 110.0,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quotes = await dao.batchGetQuotes(['TEST']);
      const quote = quotes.get('TEST')!;

      expect(quote.change).toBe(10.0); // 110 - 100
      expect(quote.changePercent).toBe('10.00'); // ((110 - 100) / 100 * 100).toFixed(2)
    });

    test('should handle negative price changes', async () => {
      const mockResponse = [
        {
          ticker: 'DOWN',
          timestamp: '2024-01-15T16:00:00Z',
          last: 90.0,
          prevClose: 100.0,
          open: 100.0,
          high: 100.0,
          low: 90.0,
          mid: null,
          volume: 10000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 90.0,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quotes = await dao.batchGetQuotes(['DOWN']);
      const quote = quotes.get('DOWN')!;

      expect(quote.change).toBe(-10.0); // 90 - 100
      expect(quote.changePercent).toBe('-10.00'); // ((90 - 100) / 100 * 100).toFixed(2)
    });
  });

  describe('healthCheck', () => {
    test('should return true if API is reachable', async () => {
      const mockResponse = [
        {
          ticker: 'AAPL',
          timestamp: '2024-01-15T16:00:00Z',
          last: 150.25,
          prevClose: 148.50,
          open: 149.00,
          high: 151.00,
          low: 148.75,
          mid: null,
          volume: 1000000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 150.25,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const isHealthy = await dao.healthCheck();

      expect(isHealthy).toBe(true);
    });

    test('should return false if API is unreachable', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const isHealthy = await dao.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle timestamp parsing correctly', async () => {
      const mockResponse = [
        {
          ticker: 'AAPL',
          timestamp: '2024-01-15T16:00:00.000Z',
          last: 150.25,
          prevClose: 148.50,
          open: 149.00,
          high: 151.00,
          low: 148.75,
          mid: null,
          volume: 1000000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 150.25,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quote = await dao.getQuote('AAPL');

      expect(typeof quote.timestamp).toBe('number');
      expect(quote.timestamp).toBeGreaterThan(0);
      expect(new Date(quote.timestamp).toISOString()).toBe('2024-01-15T16:00:00.000Z');
    });

    test('should handle symbols with different cases', async () => {
      const mockResponse = [
        {
          ticker: 'aapl',
          timestamp: '2024-01-15T16:00:00Z',
          last: 150.25,
          prevClose: 148.50,
          open: 149.00,
          high: 151.00,
          low: 148.75,
          mid: null,
          volume: 1000000,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 150.25,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quote = await dao.getQuote('aapl');

      expect(quote.symbol).toBe('aapl');
    });

    test('should handle zero volume', async () => {
      const mockResponse = [
        {
          ticker: 'ILLIQ',
          timestamp: '2024-01-15T16:00:00Z',
          last: 150.25,
          prevClose: 148.50,
          open: 149.00,
          high: 151.00,
          low: 148.75,
          mid: null,
          volume: 0,
          bidSize: null,
          bidPrice: null,
          askSize: null,
          askPrice: null,
          tngoLast: 150.25,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const quote = await dao.getQuote('ILLIQ');

      expect(quote.volume).toBe(0);
    });
  });
});
