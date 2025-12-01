import { RiskService } from '../service/risk.service';
import * as calc from '@lib/calculator';
import { RISK_METRICS_CACHE_TTL_MS } from '@backend/common/constants';

jest.mock('@lib/calculator');

const mockCalc = calc as jest.Mocked<typeof calc>;

describe('RiskService', () => {
  let service: RiskService;

  beforeEach(() => {
    service = new RiskService();
    jest.resetAllMocks();
  });

  describe('calculateRiskMetrics', () => {
    it('calculates metrics by delegating to calculator functions', async () => {
      mockCalc.calculateSharpeRatio.mockReturnValue(1.2 as any);
      mockCalc.calculateSortinoRatio.mockReturnValue(0.8 as any);
      mockCalc.calculateStdDev.mockReturnValue(0.15 as any);
      mockCalc.calculateMaxDrawdown.mockReturnValue(0.2 as any);
      mockCalc.calculateCurrentDrawdown.mockReturnValue(0.1 as any);
      mockCalc.calculateBeta.mockReturnValue(1.1 as any);
      mockCalc.calculateAlpha.mockReturnValue(0.05 as any);
      mockCalc.calculateRSquared.mockReturnValue(0.9 as any);

      const req = {
        portfolioReturns: [0.01, 0.02, -0.01],
        marketReturns: [0.005, 0.015, -0.005],
        riskFreeRate: 0.01,
      } as any;

      const metrics = await service.calculateRiskMetrics(req);

      expect(metrics.sharpe).toBe(1.2);
      expect(metrics.sortino).toBe(0.8);
      expect(metrics.stdDev).toBe(0.15);
      expect(metrics.maxDrawdown).toBe(0.2);
      expect(metrics.currentDrawdown).toBe(0.1);
      expect(metrics.beta).toBe(1.1);
      expect(metrics.alpha).toBe(0.05);
      expect(metrics.rSquared).toBe(0.9);
    });

    it('uses default risk-free rate when not provided', async () => {
      mockCalc.calculateSharpeRatio.mockReturnValue(1.0 as any);
      mockCalc.calculateSortinoRatio.mockReturnValue(0.5 as any);
      mockCalc.calculateStdDev.mockReturnValue(0.1 as any);
      mockCalc.calculateMaxDrawdown.mockReturnValue(0.15 as any);
      mockCalc.calculateCurrentDrawdown.mockReturnValue(0.05 as any);
      mockCalc.calculateBeta.mockReturnValue(1.0 as any);
      mockCalc.calculateAlpha.mockReturnValue(0.02 as any);
      mockCalc.calculateRSquared.mockReturnValue(0.85 as any);

      const req = {
        portfolioReturns: [0.01, 0.02],
        marketReturns: [0.01, 0.015],
        // No riskFreeRate provided - should default to 0.045
      } as any;

      await service.calculateRiskMetrics(req);

      // Verify sharpe was called with default rate
      expect(mockCalc.calculateSharpeRatio).toHaveBeenCalledWith([0.01, 0.02], 0.045);
    });

    it('handles null/undefined values from calculator gracefully', async () => {
      mockCalc.calculateSharpeRatio.mockReturnValue(null as any);
      mockCalc.calculateSortinoRatio.mockReturnValue(null as any);
      mockCalc.calculateStdDev.mockReturnValue(null as any);
      mockCalc.calculateMaxDrawdown.mockReturnValue(null as any);
      mockCalc.calculateCurrentDrawdown.mockReturnValue(null as any);
      mockCalc.calculateBeta.mockReturnValue(null as any);
      mockCalc.calculateAlpha.mockReturnValue(null as any);
      mockCalc.calculateRSquared.mockReturnValue(null as any);

      const req = {
        portfolioReturns: [0.01],
        marketReturns: [0.01],
      } as any;

      const metrics = await service.calculateRiskMetrics(req);

      expect(metrics.sharpe).toBeNull();
      expect(metrics.sortino).toBeNull();
      expect(metrics.beta).toBeNull();
      expect(metrics.alpha).toBeNull();
    });

    it('calculates calmar ratio when portfolioReturn and maxDrawdown are valid', async () => {
      mockCalc.calculateSharpeRatio.mockReturnValue(1.0 as any);
      mockCalc.calculateSortinoRatio.mockReturnValue(0.5 as any);
      mockCalc.calculateStdDev.mockReturnValue(0.1 as any);
      mockCalc.calculateMaxDrawdown.mockReturnValue(0.20 as any);
      mockCalc.calculateCurrentDrawdown.mockReturnValue(0.05 as any);
      mockCalc.calculateBeta.mockReturnValue(1.0 as any);
      mockCalc.calculateAlpha.mockReturnValue(0.02 as any);
      mockCalc.calculateRSquared.mockReturnValue(0.85 as any);

      const req = {
        portfolioReturns: [0.01, 0.02],
        marketReturns: [0.01, 0.015],
        portfolioReturn: 0.10, // 10% return
      } as any;

      const metrics = await service.calculateRiskMetrics(req);

      // calmar = portfolioReturn / maxDrawdown = 0.10 / 0.20 = 0.5
      expect(metrics.calmar).toBe(0.5);
    });

    it('returns null calmar when maxDrawdown is zero or missing', async () => {
      mockCalc.calculateSharpeRatio.mockReturnValue(1.0 as any);
      mockCalc.calculateSortinoRatio.mockReturnValue(0.5 as any);
      mockCalc.calculateStdDev.mockReturnValue(0.1 as any);
      mockCalc.calculateMaxDrawdown.mockReturnValue(0 as any);
      mockCalc.calculateCurrentDrawdown.mockReturnValue(0 as any);
      mockCalc.calculateBeta.mockReturnValue(1.0 as any);
      mockCalc.calculateAlpha.mockReturnValue(0.02 as any);
      mockCalc.calculateRSquared.mockReturnValue(0.85 as any);

      const req = {
        portfolioReturns: [0.01, 0.02],
        marketReturns: [0.01, 0.015],
        portfolioReturn: 0.10,
      } as any;

      const metrics = await service.calculateRiskMetrics(req);

      expect(metrics.calmar).toBeNull();
    });
  });

  describe('cache operations', () => {
    it('generates consistent cache keys for same inputs', () => {
      const returns1 = [0.01, 0.02, -0.01];
      const market1 = [0.005, 0.015, -0.005];

      const key1 = service.generateCacheKey(returns1, market1);
      const key2 = service.generateCacheKey(returns1, market1);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64); // SHA-256 hex length
    });

    it('generates different cache keys for different inputs', () => {
      const key1 = service.generateCacheKey([0.01, 0.02], [0.01, 0.015]);
      const key2 = service.generateCacheKey([0.01, 0.03], [0.01, 0.015]);

      expect(key1).not.toBe(key2);
    });

    it('stores and retrieves from cache', () => {
      const metrics = {
        sharpe: 1.2,
        sortino: 0.8,
        alpha: 0.05,
        beta: 1.1,
        calmar: 0.5,
        stdDev: 0.15,
        maxDrawdown: 0.2,
        currentDrawdown: 0.1,
        rSquared: 0.9,
      };

      const key = service.generateCacheKey([0.01], [0.01]);
      service.setCache(key, metrics);

      const cached = service.getFromCache(key);

      expect(cached).not.toBeNull();
      expect(cached?.entry.metrics).toEqual(metrics);
      expect(cached?.age).toBeLessThan(1000); // Should be very recent
    });

    it('returns null for cache miss', () => {
      const cached = service.getFromCache('nonexistent-key');
      expect(cached).toBeNull();
    });

    it('expires cache entries after TTL', () => {
      const metrics = {
        sharpe: 1.0,
        sortino: 0.5,
        alpha: 0.02,
        beta: 1.0,
        calmar: null,
        stdDev: 0.1,
        maxDrawdown: 0.15,
        currentDrawdown: 0.05,
        rSquared: 0.85,
      };

      const key = service.generateCacheKey([0.01], [0.01]);

      // Manually set cache with old timestamp
      (service as any).cache.set(key, {
        metrics,
        timestamp: Date.now() - RISK_METRICS_CACHE_TTL_MS - 1000, // Expired
      });

      const cached = service.getFromCache(key);

      expect(cached).toBeNull();
    });

    it('truncates large arrays for cache key generation', () => {
      // Create arrays with more than 100 elements
      const largePortfolio = Array(150).fill(0.01);
      const largeMarket = Array(150).fill(0.005);

      // Should not throw
      const key = service.generateCacheKey(largePortfolio, largeMarket);
      expect(key).toHaveLength(64);
    });
  });
});
