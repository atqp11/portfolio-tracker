/**
 * Quote API Tests
 *
 * Tests for stock quote API route.
 */

import { GET } from '@/app/api/quote/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import { stockDataService } from '@/lib/services/stock-data.service';

// Mock dependencies
jest.mock('@/lib/services/stock-data.service');

describe('Quote API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/quote', () => {
    it('should return 400 if symbols parameter is missing', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if symbols parameter is empty', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: '' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if symbols parameter has only whitespace', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: '  ,  ,  ' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 if more than 50 symbols provided', async () => {
      const symbols = Array.from({ length: 51 }, (_, i) => `SYM${i}`).join(',');

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return quotes successfully for single symbol', async () => {
      const mockResult = {
        quotes: {
          AAPL: {
            symbol: 'AAPL',
            price: 150.5,
            change: 2.5,
            changePercent: 1.69,
            source: 'alpha_vantage',
            timestamp: '2024-01-01T12:00:00Z',
          },
        },
        errors: {},
        cached: 0,
        fresh: 1,
      };

      (stockDataService.getBatchQuotes as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: 'AAPL' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quotes.AAPL.symbol).toBe('AAPL');
      expect(data.data.quotes.AAPL.price).toBe(150.5);
      expect(data.data.stats.fresh).toBe(1);
      expect(data.data.stats.cached).toBe(0);
      expect(stockDataService.getBatchQuotes).toHaveBeenCalledWith(['AAPL']);
    });

    it('should return quotes successfully for multiple symbols', async () => {
      const mockResult = {
        quotes: {
          AAPL: {
            symbol: 'AAPL',
            price: 150.5,
            change: 2.5,
            changePercent: 1.69,
            source: 'alpha_vantage',
            timestamp: '2024-01-01T12:00:00Z',
          },
          GOOGL: {
            symbol: 'GOOGL',
            price: 2800.0,
            change: -10.5,
            changePercent: -0.37,
            source: 'yfinance',
            timestamp: '2024-01-01T12:00:00Z',
          },
        },
        errors: {},
        cached: 1,
        fresh: 1,
      };

      (stockDataService.getBatchQuotes as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: 'AAPL, GOOGL' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Object.keys(data.data.quotes)).toHaveLength(2);
      expect(data.data.quotes.AAPL.price).toBe(150.5);
      expect(data.data.quotes.GOOGL.price).toBe(2800.0);
      expect(data.data.stats.cached).toBe(1);
      expect(data.data.stats.fresh).toBe(1);
      expect(stockDataService.getBatchQuotes).toHaveBeenCalledWith(['AAPL', 'GOOGL']);
    });

    it('should handle symbols with errors', async () => {
      const mockResult = {
        quotes: {
          AAPL: {
            symbol: 'AAPL',
            price: 150.5,
            change: 2.5,
            changePercent: 1.69,
            source: 'alpha_vantage',
            timestamp: '2024-01-01T12:00:00Z',
          },
        },
        errors: {
          INVALID: 'Symbol not found',
        },
        cached: 0,
        fresh: 1,
      };

      (stockDataService.getBatchQuotes as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: 'AAPL,INVALID' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.quotes.AAPL.price).toBe(150.5);
      expect(data.data.quotes.INVALID.error).toBe('Symbol not found');
      expect(data.data.quotes.INVALID.price).toBeNull();
      expect(data.data.stats.errors).toBe(1);
    });

    it('should handle service errors', async () => {
      (stockDataService.getBatchQuotes as jest.Mock).mockRejectedValue(
        new Error('Service unavailable')
      );

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: 'AAPL' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Service unavailable');
    });

    it('should trim whitespace from symbols', async () => {
      const mockResult = {
        quotes: {
          AAPL: {
            symbol: 'AAPL',
            price: 150.5,
            change: 2.5,
            changePercent: 1.69,
            source: 'alpha_vantage',
            timestamp: '2024-01-01T12:00:00Z',
          },
          GOOGL: {
            symbol: 'GOOGL',
            price: 2800.0,
            change: -10.5,
            changePercent: -0.37,
            source: 'yfinance',
            timestamp: '2024-01-01T12:00:00Z',
          },
        },
        errors: {},
        cached: 0,
        fresh: 2,
      };

      (stockDataService.getBatchQuotes as jest.Mock).mockResolvedValue(mockResult);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/quote',
        searchParams: { symbols: '  AAPL  ,  GOOGL  ' },
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(stockDataService.getBatchQuotes).toHaveBeenCalledWith(['AAPL', 'GOOGL']);
    });
  });
});
