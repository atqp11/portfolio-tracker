/**
 * Server Actions Tests for Usage Operations
 *
 * Tests for user usage and quota Server Actions:
 * - fetchUsageStats()
 * - fetchQuotaInfo()
 * - fetchTierConfigurations()
 */

import { fetchUsageStats, fetchQuotaInfo, fetchTierConfigurations } from '../actions';
import { requireUser } from '@lib/auth/session';
import { usageService } from '@backend/modules/user/service/usage.service';
import { getCurrentUserUsage } from '@lib/supabase/db';

// Mock dependencies
jest.mock('@lib/auth/session');
jest.mock('@backend/modules/user/service/usage.service');
jest.mock('@lib/supabase/db');

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;
const mockGetCurrentUserUsage = getCurrentUserUsage as jest.MockedFunction<
  typeof getCurrentUserUsage
>;

describe('Usage Server Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUsageStats', () => {
    it('should fetch usage stats for authenticated user', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          tier: 'premium',
        },
      };

      const mockStats = {
        tier: 'premium',
        usage: {
          daily: {
            chatQueries: { used: 5, limit: Infinity, remaining: Infinity },
            portfolioAnalysis: { used: 2, limit: Infinity, remaining: Infinity },
            portfolioChanges: { used: 1, limit: Infinity, remaining: Infinity },
          },
          monthly: {
            secFilings: { used: 10, limit: Infinity, remaining: Infinity },
          },
          periodStart: {
            daily: new Date('2025-01-01'),
            monthly: new Date('2025-01-01'),
          },
          periodEnd: {
            daily: new Date('2025-01-01T23:59:59'),
            monthly: new Date('2025-01-31T23:59:59'),
          },
        },
        percentages: {
          chatQueries: 0,
          portfolioAnalysis: 0,
          portfolioChanges: 0,
          secFilings: 0,
        },
        warnings: {
          chatQueries: false,
          portfolioAnalysis: false,
          portfolioChanges: false,
          secFilings: false,
        },
      };

      mockRequireUser.mockResolvedValue(mockUser as any);
      jest
        .spyOn(usageService, 'getUserUsageStats')
        .mockResolvedValue(mockStats as any);

      // Act
      const result = await fetchUsageStats();

      // Assert
      expect(mockRequireUser).toHaveBeenCalled();
      expect(usageService.getUserUsageStats).toHaveBeenCalledWith(
        'user-123',
        'premium'
      );
      expect(result).toEqual(mockStats);
    });

    it('should default to free tier if tier not in user metadata', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {},
      };

      const mockStats = {
        tier: 'free',
        usage: expect.any(Object),
        percentages: expect.any(Object),
        warnings: expect.any(Object),
      };

      mockRequireUser.mockResolvedValue(mockUser as any);
      jest
        .spyOn(usageService, 'getUserUsageStats')
        .mockResolvedValue(mockStats as any);

      // Act
      await fetchUsageStats();

      // Assert
      expect(usageService.getUserUsageStats).toHaveBeenCalledWith('user-123', 'free');
    });

    it('should throw error if user not authenticated', async () => {
      // Arrange
      mockRequireUser.mockRejectedValue(new Error('Authentication required'));

      // Act & Assert
      await expect(fetchUsageStats()).rejects.toThrow('Authentication required');
    });
  });

  describe('fetchQuotaInfo', () => {
    it('should fetch quota info for authenticated user', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          tier: 'basic',
        },
      };

      const mockUsage = {
        daily: {
          id: 'daily-123',
          user_id: 'user-123',
          tier: 'basic',
          chat_queries: 5,
          portfolio_analysis: 2,
          portfolio_changes: 1,
          sec_filings: 0,
          period_start: '2024-01-01T00:00:00Z',
          period_end: '2024-01-02T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        monthly: {
          id: 'monthly-123',
          user_id: 'user-123',
          tier: 'basic',
          chat_queries: 0,
          portfolio_analysis: 0,
          portfolio_changes: 0,
          sec_filings: 10,
          period_start: '2024-01-01T00:00:00Z',
          period_end: '2024-02-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
      };

      mockRequireUser.mockResolvedValue(mockUser as any);
      mockGetCurrentUserUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await fetchQuotaInfo();

      // Assert
      expect(mockRequireUser).toHaveBeenCalled();
      expect(mockGetCurrentUserUsage).toHaveBeenCalledWith('user-123');
      expect(result).toMatchObject({
        userId: 'user-123',
        tier: 'basic',
        limits: expect.any(Object),
        quotas: {
          chatQueries: {
            used: 5,
            limit: expect.any(Number),
            remaining: expect.any(Number),
          },
          portfolioAnalysis: {
            used: 2,
            limit: expect.any(Number),
            remaining: expect.any(Number),
          },
          portfolioChanges: {
            used: 1,
            limit: expect.any(Number),
            remaining: expect.any(Number),
          },
          secFilings: {
            used: 10,
            limit: expect.any(Number),
            remaining: expect.any(Number),
          },
        },
        resetAt: {
          daily: expect.any(Date),
          monthly: expect.any(Date),
        },
      });
    });

    it('should handle missing usage data gracefully', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          tier: 'free',
        },
      };

      const mockUsage = {
        daily: null,
        monthly: null,
      };

      mockRequireUser.mockResolvedValue(mockUser as any);
      mockGetCurrentUserUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await fetchQuotaInfo();

      // Assert
      expect(result.quotas.chatQueries.used).toBe(0);
      expect(result.quotas.portfolioAnalysis.used).toBe(0);
      expect(result.quotas.portfolioChanges.used).toBe(0);
      expect(result.quotas.secFilings.used).toBe(0);
    });

    it('should calculate remaining quota correctly for finite limits', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {
          tier: 'free', // Free tier has finite limits
        },
      };

      const mockUsage = {
        daily: {
          id: 'daily-123',
          user_id: 'user-123',
          tier: 'free',
          chat_queries: 15, // Free tier limit is 20
          portfolio_analysis: 0,
          portfolio_changes: 0,
          sec_filings: 0,
          period_start: '2024-01-01T00:00:00Z',
          period_end: '2024-01-02T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        monthly: null,
      };

      mockRequireUser.mockResolvedValue(mockUser as any);
      mockGetCurrentUserUsage.mockResolvedValue(mockUsage);

      // Act
      const result = await fetchQuotaInfo();

      // Assert
      expect(result.quotas.chatQueries.used).toBe(15);
      expect(result.quotas.chatQueries.limit).toBe(20);
      expect(result.quotas.chatQueries.remaining).toBe(5);
    });
  });

  describe('fetchTierConfigurations', () => {
    it('should return tier configurations without requiring auth', async () => {
      // Act
      const result = await fetchTierConfigurations();

      // Assert
      expect(result).toHaveProperty('tiers');
      expect(result).toHaveProperty('breakEvenAnalysis');
      expect(mockRequireUser).not.toHaveBeenCalled();
    });

    it('should include all tier levels', async () => {
      // Act
      const result = await fetchTierConfigurations();

      // Assert
      expect(result.tiers).toHaveProperty('free');
      expect(result.tiers).toHaveProperty('basic');
      expect(result.tiers).toHaveProperty('premium');
    });
  });
});
