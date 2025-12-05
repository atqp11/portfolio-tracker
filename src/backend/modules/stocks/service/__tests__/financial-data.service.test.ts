/**
 * Financial Data Service Tests
 *
 * Tests for orchestrator-based financial data fetching with merging strategy.
 */
import { FinancialDataService } from '../financial-data.service';
import { DataSourceOrchestrator } from '@lib/data-sources';
import { getCacheAdapter } from '@lib/cache/adapter';
import { alphaVantageDAO } from '@backend/modules/stocks/dao/alpha-vantage.dao';

// Mock dependencies
jest.mock('@lib/data-sources');
jest.mock('@lib/cache/adapter');
jest.mock('@backend/modules/stocks/dao/alpha-vantage.dao');

describe('FinancialDataService', () => {
  let service: FinancialDataService;
  let mockOrchestrator: jest.Mocked<DataSourceOrchestrator>;
  let mockCache: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock orchestrator instance
    mockOrchestrator = {
      fetchWithMerge: jest.fn(),
      fetchWithFallback: jest.fn(),
      batchFetch: jest.fn(),
      getStats: jest.fn(),
    } as any;

    (DataSourceOrchestrator.getInstance as jest.Mock).mockReturnValue(mockOrchestrator);

    // Mock cache adapter
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      getAge: jest.fn(),
    };

    (getCacheAdapter as jest.Mock).mockReturnValue(mockCache);

    // Create service instance
    service = new FinancialDataService();
  });

  describe('getFundamentals', () => {
    it('should fetch fundamentals using orchestrator with merge strategy', async () => {
      const mockResult = {
        data: {
          symbol: 'AAPL',
          marketCap: 3000000000000,
          trailingPE: 30.5,
          beta: 1.2,
          source: 'merged',
        },
        source: 'merged',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [],
        metadata: {
          providersAttempted: ['yahooFinance', 'alphaVantage'],
          totalDuration: 500,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithMerge.mockResolvedValue(mockResult);

      const result = await service.getFundamentals('AAPL', 'free');

      expect(result).toEqual(mockResult.data);
      expect(mockOrchestrator.fetchWithMerge).toHaveBeenCalledWith({
        key: 'AAPL',
        providers: expect.arrayContaining([
          expect.objectContaining({ name: 'yahooFinance' }),
          expect.objectContaining({ name: 'alphaVantage' }),
        ]),
        mergeStrategy: expect.any(Function),
        minProviders: 1,
        cacheKeyPrefix: 'fundamentals',
        tier: 'free',
        allowStale: true,
      });
    });

    it('should return null and log errors when all providers fail', async () => {
      const mockResult = {
        data: null,
        source: 'cache',
        cached: false,
        timestamp: Date.now(),
        age: 0,
        errors: [
          {
            provider: 'yahooFinance',
            code: 'NETWORK_ERROR',
            message: 'Network error',
            originalError: new Error('Network error'),
          },
        ],
        metadata: {
          providersAttempted: ['yahooFinance', 'alphaVantage'],
          totalDuration: 2000,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithMerge.mockResolvedValue(mockResult);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.getFundamentals('AAPL', 'free');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch fundamentals for AAPL'),
        mockResult.errors
      );

      consoleErrorSpy.mockRestore();
    });

    it('should log cache hit information when data is cached', async () => {
      const mockResult = {
        data: {
          symbol: 'AAPL',
          marketCap: 3000000000000,
          source: 'yahooFinance',
        },
        source: 'cache',
        cached: true,
        timestamp: Date.now() - 120000, // 2 minutes ago
        age: 120000,
        errors: [],
        metadata: {
          providersAttempted: [],
          totalDuration: 5,
          circuitBreakerTriggered: false,
          deduplicated: false,
        },
      };

      mockOrchestrator.fetchWithMerge.mockResolvedValue(mockResult);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.getFundamentals('AAPL', 'premium');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit for AAPL fundamentals (age: 2m)')
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('getIncomeStatement', () => {
    it('should fetch from cache when available', async () => {
      const mockStatements = [
        { fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' },
      ];

      mockCache.get.mockResolvedValue(mockStatements);

      const result = await service.getIncomeStatement('AAPL');

      expect(result).toEqual(mockStatements);
      expect(mockCache.get).toHaveBeenCalledWith('income-statement:AAPL:v1');
    });

    it('should fetch from Alpha Vantage when cache misses', async () => {
      mockCache.get.mockResolvedValue(null);

      const mockDAOResponse = {
        annualReports: [
          { fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' },
          { fiscalDateEnding: '2022-12-31', reportedCurrency: 'USD' },
        ],
      };

      (alphaVantageDAO.getIncomeStatement as jest.Mock).mockResolvedValue(mockDAOResponse);

      const result = await service.getIncomeStatement('AAPL', 'free');

      expect(result).toEqual(mockDAOResponse.annualReports);
      expect(alphaVantageDAO.getIncomeStatement).toHaveBeenCalledWith('AAPL');
      expect(mockCache.set).toHaveBeenCalledWith(
        'income-statement:AAPL:v1',
        mockDAOResponse.annualReports,
        expect.any(Number)
      );
    });
  });

  describe('getAllFinancials', () => {
    it('should fetch all financial statements in parallel', async () => {
      mockCache.get.mockResolvedValue(null);

      const mockIncomeData = {
        annualReports: [{ fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' }],
      };
      const mockBalanceData = {
        annualReports: [{ fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' }],
      };
      const mockCashFlowData = {
        annualReports: [{ fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' }],
      };

      (alphaVantageDAO.getIncomeStatement as jest.Mock).mockResolvedValue(mockIncomeData);
      (alphaVantageDAO.getBalanceSheet as jest.Mock).mockResolvedValue(mockBalanceData);
      (alphaVantageDAO.getCashFlow as jest.Mock).mockResolvedValue(mockCashFlowData);

      const result = await service.getAllFinancials('AAPL');

      expect(result.symbol).toBe('AAPL');
      expect(result.incomeStatement).toEqual(mockIncomeData.annualReports);
      expect(result.balanceSheet).toEqual(mockBalanceData.annualReports);
      expect(result.cashFlow).toEqual(mockCashFlowData.annualReports);
      expect(result.source).toBe('alphavantage');
    });

    it('should return cached all-financials when available', async () => {
      const mockCachedData = {
        symbol: 'AAPL',
        incomeStatement: [{ fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' }],
        balanceSheet: [{ fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' }],
        cashFlow: [{ fiscalDateEnding: '2023-12-31', reportedCurrency: 'USD' }],
        source: 'alphavantage' as const,
        timestamp: Date.now(),
      };

      mockCache.get.mockResolvedValue(mockCachedData);

      const result = await service.getAllFinancials('AAPL');

      expect(result).toEqual({
        ...mockCachedData,
        source: 'cache',
      });
      expect(alphaVantageDAO.getIncomeStatement).not.toHaveBeenCalled();
    });
  });
});
