/**
 * Market Data Service Tests
 *
 * Tests for orchestrator-based commodity data fetching with demo fallback.
 */
import { MarketDataService } from '../market-data.service';
import { ProviderError, ProviderErrorCode } from '@lib/data-sources';
import { DataSourceOrchestrator } from '@lib/data-sources';

// Mock dependencies
jest.mock('@lib/data-sources');

describe('MarketDataService', () => {
  let service: MarketDataService;
  let mockOrchestrator: jest.Mocked<DataSourceOrchestrator>;

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

    // Create service instance
    service = new MarketDataService();
  });

  describe('getOilPrice', () => {
    it('should fetch oil price using orchestrator', async () => {
      const mockResult = {
        data: {
          name: 'WTI Crude Oil',
          price: 75.25,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'alphaVantage',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [
          new ProviderError('alphaVantage', ProviderErrorCode.NETWORK_ERROR, 'Network error', new Error('Network error')),
        ],
        metadata: {
          providersAttempted: ['alphaVantage'],
          totalDuration: 300,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getOilPrice('free');

      expect(result).toEqual(mockResult.data);
      expect(mockOrchestrator.fetchWithFallback).toHaveBeenCalledWith({
        key: 'oil',
        providers: expect.arrayContaining([
          expect.objectContaining({ name: 'alphaVantage' }),
        ]),
        cacheKeyPrefix: 'commodities',
        tier: 'free',
        allowStale: true,
      });
    });

    it('should return demo fallback when all providers fail', async () => {
      const mockResult = {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [
          new ProviderError('alphaVantage', ProviderErrorCode.RATE_LIMIT, 'Rate limit exceeded', new Error('Rate limit')),
        ],
        metadata: {
          providersAttempted: ['alphaVantage'],
          totalDuration: 1000,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getOilPrice('free');

      expect(result.source).toBe('fallback');
      expect(result.name).toBe('WTI Crude Oil');
      expect(result.price).toBeGreaterThan(69); // Base 72.50 - 5 variation
      expect(result.price).toBeLessThan(78); // Base 72.50 + 5 variation
      expect(result.timestamp).toContain('Demo Data - API Error');
    });

    it('should log cache hit information when data is cached', async () => {
      const mockResult = {
        data: {
          name: 'WTI Crude Oil',
          price: 75.25,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'cache',
        cached: true,
        timestamp: Date.now() - 180000, // 3 minutes ago
        age: 180000,
        errors: [],
        metadata: {
          providersAttempted: [],
          totalDuration: 5,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.getOilPrice('premium');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for oil (age: 3m)')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('getGasPrice', () => {
    it('should fetch gas price using orchestrator', async () => {
      const mockResult = {
        data: {
          name: 'Natural Gas',
          price: 2.95,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'alphaVantage',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {
          providersAttempted: ['alphaVantage'],
          totalDuration: 450,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getGasPrice('free');

      expect(result).toEqual(mockResult.data);
      expect(mockOrchestrator.fetchWithFallback).toHaveBeenCalledWith({
        key: 'gas',
        providers: expect.arrayContaining([
          expect.objectContaining({ name: 'alphaVantage' }),
        ]),
        cacheKeyPrefix: 'commodities',
        tier: 'free',
        allowStale: true,
      });
    });

    it('should return demo fallback when providers fail', async () => {
      const mockResult = {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {
          providersAttempted: ['alphaVantage'],
          totalDuration: 1000,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getGasPrice();

      expect(result.source).toBe('fallback');
      expect(result.name).toBe('Natural Gas');
      expect(result.price).toBeGreaterThan(2.5); // Base 2.85 - 0.5 variation
      expect(result.price).toBeLessThan(3.5); // Base 2.85 + 0.5 variation
    });
  });

  describe('getCopperPrice', () => {
    it('should fetch copper price using orchestrator', async () => {
      const mockResult = {
        data: {
          name: 'Copper',
          price: 4.35,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'alphaVantage',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {
          providersAttempted: ['alphaVantage'],
          totalDuration: 480,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithFallback.mockResolvedValue(mockResult);

      const result = await service.getCopperPrice('free');

      expect(result).toEqual(mockResult.data);
      expect(mockOrchestrator.fetchWithFallback).toHaveBeenCalledWith({
        key: 'copper',
        providers: expect.arrayContaining([
          expect.objectContaining({ name: 'alphaVantage' }),
        ]),
        cacheKeyPrefix: 'commodities',
        tier: 'free',
        allowStale: true,
      });
    });
  });

  describe('getEnergyCommodities', () => {
    it('should fetch oil and gas prices in parallel', async () => {
      const mockOilResult = {
        data: {
          name: 'WTI Crude Oil',
          price: 75.25,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'alphaVantage',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      const mockGasResult = {
        data: {
          name: 'Natural Gas',
          price: 2.95,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'alphaVantage',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      mockOrchestrator.fetchWithFallback
        .mockResolvedValueOnce(mockOilResult)
        .mockResolvedValueOnce(mockGasResult);

      const result = await service.getEnergyCommodities('premium');

      expect(result.oil).toEqual(mockOilResult.data);
      expect(result.gas).toEqual(mockGasResult.data);
      expect(mockOrchestrator.fetchWithFallback).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and fallback scenarios', async () => {
      const mockOilResult = {
        data: {
          name: 'WTI Crude Oil',
          price: 75.25,
          timestamp: '2025-12-05 (Alpha Vantage)',
          source: 'alphaVantage',
        },
        source: 'alphaVantage',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      const mockGasResult = {
        data: null, // Gas provider failed
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {} as any,
      };

      mockOrchestrator.fetchWithFallback
        .mockResolvedValueOnce(mockOilResult)
        .mockResolvedValueOnce(mockGasResult);

      const result = await service.getEnergyCommodities();

      expect(result.oil.source).toBe('alphaVantage');
      expect(result.gas.source).toBe('fallback'); // Fallback data used
    });
  });
});
