/**
 * Usage Service Unit Tests
 * 
 * Tests business logic for usage calculations, tier limits,
 * percentages, and warning thresholds.
 */

import { UsageService } from '@backend/modules/user/service/usage.service';
import { getCurrentUserUsage } from '@lib/supabase/db';
import { getTierConfig } from '@lib/tiers';

// Mock dependencies
jest.mock('@lib/supabase/db');
jest.mock('@lib/tiers');

const mockGetCurrentUserUsage = getCurrentUserUsage as jest.MockedFunction<typeof getCurrentUserUsage>;
const mockGetTierConfig = getTierConfig as jest.MockedFunction<typeof getTierConfig>;

describe('UsageService', () => {
  let service: UsageService;

  beforeEach(() => {
    service = new UsageService();
    jest.clearAllMocks();
  });

  describe('getUserUsageStats', () => {
    it('should calculate stats for user with no usage', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {},
        monthly: {},
      });

      mockGetTierConfig.mockReturnValue({
        name: 'free',
        chatQueriesPerDay: 10,
        portfolioAnalysisPerDay: 3,
        secFilingsPerMonth: 5,
        price: 0,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'free');

      expect(stats.tier).toBe('free');
      expect(stats.usage.daily.chatQueries).toEqual({
        used: 0,
        limit: 10,
        remaining: 10,
      });
      expect(stats.usage.daily.portfolioAnalysis).toEqual({
        used: 0,
        limit: 3,
        remaining: 3,
      });
      expect(stats.usage.monthly.secFilings).toEqual({
        used: 0,
        limit: 5,
        remaining: 5,
      });
      expect(stats.percentages.chatQueries).toBe(0);
      expect(stats.percentages.portfolioAnalysis).toBe(0);
      expect(stats.percentages.secFilings).toBe(0);
      expect(stats.warnings.chatQueries).toBe(false);
      expect(stats.warnings.portfolioAnalysis).toBe(false);
      expect(stats.warnings.secFilings).toBe(false);
    });

    it('should calculate stats for user with partial usage', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {
          chat_queries: 5,
          portfolio_analysis: 2,
        },
        monthly: {
          sec_filings: 3,
        },
      });

      mockGetTierConfig.mockReturnValue({
        name: 'free',
        chatQueriesPerDay: 10,
        portfolioAnalysisPerDay: 3,
        secFilingsPerMonth: 5,
        price: 0,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'free');

      expect(stats.usage.daily.chatQueries).toEqual({
        used: 5,
        limit: 10,
        remaining: 5,
      });
      expect(stats.usage.daily.portfolioAnalysis).toEqual({
        used: 2,
        limit: 3,
        remaining: 1,
      });
      expect(stats.usage.monthly.secFilings).toEqual({
        used: 3,
        limit: 5,
        remaining: 2,
      });
      expect(stats.percentages.chatQueries).toBe(50);
      expect(stats.percentages.portfolioAnalysis).toBeCloseTo(66.67, 1);
      expect(stats.percentages.secFilings).toBe(60);
    });

    it('should handle quota exceeded (100%+ usage)', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {
          chat_queries: 12,
          portfolio_analysis: 5,
        },
        monthly: {
          sec_filings: 8,
        },
      });

      mockGetTierConfig.mockReturnValue({
        name: 'free',
        chatQueriesPerDay: 10,
        portfolioAnalysisPerDay: 3,
        secFilingsPerMonth: 5,
        price: 0,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'free');

      expect(stats.usage.daily.chatQueries.remaining).toBe(0);
      expect(stats.usage.daily.portfolioAnalysis.remaining).toBe(0);
      expect(stats.usage.monthly.secFilings.remaining).toBe(0);
      expect(stats.percentages.chatQueries).toBe(100); // Capped at 100
      expect(stats.percentages.portfolioAnalysis).toBe(100);
      expect(stats.percentages.secFilings).toBe(100);
    });

    it('should set warnings when usage >= 80%', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {
          chat_queries: 8,  // 80%
          portfolio_analysis: 2,  // 66%
        },
        monthly: {
          sec_filings: 5,  // 100%
        },
      });

      mockGetTierConfig.mockReturnValue({
        name: 'free',
        chatQueriesPerDay: 10,
        portfolioAnalysisPerDay: 3,
        secFilingsPerMonth: 5,
        price: 0,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'free');

      expect(stats.warnings.chatQueries).toBe(true);       // 80%
      expect(stats.warnings.portfolioAnalysis).toBe(false); // 66%
      expect(stats.warnings.secFilings).toBe(true);        // 100%
    });

    it('should handle infinite limits (premium tier)', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {
          chat_queries: 100,
          portfolio_analysis: 50,
        },
        monthly: {
          sec_filings: 200,
        },
      });

      mockGetTierConfig.mockReturnValue({
        name: 'premium',
        chatQueriesPerDay: Infinity,
        portfolioAnalysisPerDay: Infinity,
        secFilingsPerMonth: Infinity,
        price: 99,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'premium');

      expect(stats.usage.daily.chatQueries).toEqual({
        used: 100,
        limit: Infinity,
        remaining: Infinity,
      });
      expect(stats.usage.daily.portfolioAnalysis).toEqual({
        used: 50,
        limit: Infinity,
        remaining: Infinity,
      });
      expect(stats.usage.monthly.secFilings).toEqual({
        used: 200,
        limit: Infinity,
        remaining: Infinity,
      });
      expect(stats.percentages.chatQueries).toBe(0);
      expect(stats.percentages.portfolioAnalysis).toBe(0);
      expect(stats.percentages.secFilings).toBe(0);
      expect(stats.warnings.chatQueries).toBe(false);
      expect(stats.warnings.portfolioAnalysis).toBe(false);
      expect(stats.warnings.secFilings).toBe(false);
    });

    it('should include valid period boundaries', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {},
        monthly: {},
      });

      mockGetTierConfig.mockReturnValue({
        name: 'free',
        chatQueriesPerDay: 10,
        portfolioAnalysisPerDay: 3,
        secFilingsPerMonth: 5,
        price: 0,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'free');

      // Verify period structure
      expect(stats.usage.periodStart.daily).toBeInstanceOf(Date);
      expect(stats.usage.periodStart.monthly).toBeInstanceOf(Date);
      expect(stats.usage.periodEnd.daily).toBeInstanceOf(Date);
      expect(stats.usage.periodEnd.monthly).toBeInstanceOf(Date);

      // Daily period should be today
      const today = new Date();
      const dailyStart = stats.usage.periodStart.daily;
      expect(dailyStart.getUTCHours()).toBe(0);
      expect(dailyStart.getUTCMinutes()).toBe(0);
      expect(dailyStart.getUTCSeconds()).toBe(0);
      expect(dailyStart.getUTCDate()).toBe(today.getUTCDate());

      const dailyEnd = stats.usage.periodEnd.daily;
      expect(dailyEnd.getUTCHours()).toBe(23);
      expect(dailyEnd.getUTCMinutes()).toBe(59);
      expect(dailyEnd.getUTCSeconds()).toBe(59);

      // Monthly period should be first to last day of month
      const monthlyStart = stats.usage.periodStart.monthly;
      expect(monthlyStart.getUTCDate()).toBe(1);
      expect(monthlyStart.getUTCHours()).toBe(0);

      const monthlyEnd = stats.usage.periodEnd.monthly;
      expect(monthlyEnd.getUTCHours()).toBe(23);
      expect(monthlyEnd.getUTCMinutes()).toBe(59);
    });

    it('should handle missing usage data gracefully', async () => {
      mockGetCurrentUserUsage.mockResolvedValue({
        daily: undefined,
        monthly: undefined,
      });

      mockGetTierConfig.mockReturnValue({
        name: 'free',
        chatQueriesPerDay: 10,
        portfolioAnalysisPerDay: 3,
        secFilingsPerMonth: 5,
        price: 0,
        features: [],
      });

      const stats = await service.getUserUsageStats('user-123', 'free');

      // Should default to 0 usage
      expect(stats.usage.daily.chatQueries.used).toBe(0);
      expect(stats.usage.daily.portfolioAnalysis.used).toBe(0);
      expect(stats.usage.monthly.secFilings.used).toBe(0);
    });

    it('should calculate percentages correctly at various thresholds', async () => {
      const testCases = [
        { used: 0, limit: 10, expected: 0 },
        { used: 1, limit: 10, expected: 10 },
        { used: 5, limit: 10, expected: 50 },
        { used: 7, limit: 10, expected: 70 },
        { used: 8, limit: 10, expected: 80 },
        { used: 9, limit: 10, expected: 90 },
        { used: 10, limit: 10, expected: 100 },
        { used: 15, limit: 10, expected: 100 }, // Capped at 100
      ];

      for (const testCase of testCases) {
        mockGetCurrentUserUsage.mockResolvedValue({
          daily: { chat_queries: testCase.used },
          monthly: {},
        });

        mockGetTierConfig.mockReturnValue({
          name: 'free',
          chatQueriesPerDay: testCase.limit,
          portfolioAnalysisPerDay: 3,
          secFilingsPerMonth: 5,
          price: 0,
          features: [],
        });

        const stats = await service.getUserUsageStats('user-123', 'free');
        expect(stats.percentages.chatQueries).toBe(testCase.expected);
      }
    });
  });
});
