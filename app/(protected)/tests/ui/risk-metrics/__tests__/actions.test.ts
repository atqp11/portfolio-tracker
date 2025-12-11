/**
 * Server Actions Tests for Risk Metrics
 *
 * Tests the server-side business logic for risk metrics calculation.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { calculateRiskMetrics } from '../actions';

// Mock dependencies
jest.mock('@lib/auth/session');
jest.mock('@backend/modules/risk/service/risk.service');

import { requireUser } from '@lib/auth/session';
import { riskService } from '@backend/modules/risk/service/risk.service';

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockRiskService = riskService as jest.Mocked<typeof riskService>;

describe('Risk Metrics Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
    } as any);
  });

  describe('calculateRiskMetrics', () => {
    it('should calculate risk metrics successfully', async () => {
      const requestData = {
        portfolioReturns: [0.05, 0.03, -0.02, 0.04],
        marketReturns: [0.04, 0.02, -0.01, 0.03],
        riskFreeRate: 0.045,
      };

      const mockMetrics = {
        sharpe: 1.5,
        sortino: 1.8,
        alpha: 0.02,
        beta: 1.1,
        calmar: 2.0,
        stdDev: 0.03,
        maxDrawdown: 0.15,
        currentDrawdown: 0.05,
        rSquared: 0.85,
      };

      mockRiskService.checkCache.mockReturnValue(null);
      mockRiskService.calculateRiskMetrics.mockResolvedValue(mockMetrics as any);
      mockRiskService.generateCacheKey.mockReturnValue('cache-key-123');
      mockRiskService.setCache.mockReturnValue(undefined);

      const result = await calculateRiskMetrics(requestData);

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockRiskService.checkCache).toHaveBeenCalledWith(
        expect.objectContaining(requestData)
      );
      expect(mockRiskService.calculateRiskMetrics).toHaveBeenCalledWith(
        expect.objectContaining(requestData)
      );
      expect(mockRiskService.setCache).toHaveBeenCalled();
      expect(result).toEqual({ ...mockMetrics, cached: false });
    });

    it('should return cached metrics when available', async () => {
      const requestData = {
        portfolioReturns: [0.05, 0.03],
        marketReturns: [0.04, 0.02],
      };

      const cachedMetrics = {
        sharpe: 1.5,
        sortino: 1.8,
        cached: true,
        cacheAge: 5000,
      };

      mockRiskService.checkCache.mockReturnValue(cachedMetrics as any);

      const result = await calculateRiskMetrics(requestData);

      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockRiskService.checkCache).toHaveBeenCalled();
      expect(mockRiskService.calculateRiskMetrics).not.toHaveBeenCalled();
      expect(result).toEqual(cachedMetrics);
    });

    it('should validate input schema', async () => {
      const invalidData = {
        portfolioReturns: [], // Empty array - should fail
        marketReturns: [0.01],
      };

      await expect(calculateRiskMetrics(invalidData)).rejects.toThrow();
    });

    it('should handle missing required fields', async () => {
      const incompleteData = {
        portfolioReturns: [0.05],
        // Missing marketReturns
      };

      await expect(calculateRiskMetrics(incompleteData)).rejects.toThrow();
    });

    it('should use default riskFreeRate when not provided', async () => {
      const requestData = {
        portfolioReturns: [0.05],
        marketReturns: [0.04],
      };

      const mockMetrics = {
        sharpe: 1.5,
        sortino: 1.8,
      };

      mockRiskService.checkCache.mockReturnValue(null);
      mockRiskService.calculateRiskMetrics.mockResolvedValue(mockMetrics as any);
      mockRiskService.generateCacheKey.mockReturnValue('cache-key');
      mockRiskService.setCache.mockReturnValue(undefined);

      await calculateRiskMetrics(requestData);

      expect(mockRiskService.calculateRiskMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          riskFreeRate: 0.045, // Default value
        })
      );
    });

    it('should bypass cache when requested', async () => {
      const requestData = {
        portfolioReturns: [0.05],
        marketReturns: [0.04],
        bypassCache: true,
      };

      const mockMetrics = { sharpe: 1.5 };

      mockRiskService.checkCache.mockReturnValue(null);
      mockRiskService.calculateRiskMetrics.mockResolvedValue(mockMetrics as any);
      mockRiskService.generateCacheKey.mockReturnValue('cache-key');
      mockRiskService.setCache.mockReturnValue(undefined);

      const result = await calculateRiskMetrics(requestData);

      expect(mockRiskService.checkCache).toHaveBeenCalledWith(
        expect.objectContaining({ bypassCache: true })
      );
      expect(result).toEqual({ ...mockMetrics, cached: false });
    });

    it('should require authentication', async () => {
      mockRequireUser.mockRejectedValue(new Error('Not authenticated'));

      await expect(
        calculateRiskMetrics({
          portfolioReturns: [0.05],
          marketReturns: [0.04],
        })
      ).rejects.toThrow('Not authenticated');
    });

    it('should handle calculation errors', async () => {
      const requestData = {
        portfolioReturns: [0.05],
        marketReturns: [0.04],
      };

      mockRiskService.checkCache.mockReturnValue(null);
      mockRiskService.calculateRiskMetrics.mockRejectedValue(
        new Error('Calculation failed')
      );

      await expect(calculateRiskMetrics(requestData)).rejects.toThrow('Calculation failed');
    });
  });
});
