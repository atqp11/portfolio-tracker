/**
 * User Usage Integration Tests
 * 
 * Tests the full HTTP flow through route → controller → service → repository
 * for the user usage endpoint.
 */

import { NextRequest } from 'next/server';
import { GET } from '@app/api/user/usage/route';
import { getUserProfile } from '@lib/auth/session';
import { getCurrentUserUsage } from '@lib/supabase/db';
import { getTierConfig } from '@lib/tiers';

// Mock dependencies
jest.mock('@lib/auth/session');
jest.mock('@lib/supabase/db');
jest.mock('@lib/tiers');

const mockGetUserProfile = getUserProfile as jest.MockedFunction<typeof getUserProfile>;
const mockGetCurrentUserUsage = getCurrentUserUsage as jest.MockedFunction<typeof getCurrentUserUsage>;
const mockGetTierConfig = getTierConfig as jest.MockedFunction<typeof getTierConfig>;

describe('User Usage Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/user/usage', () => {
    it('should return usage stats for authenticated user', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        created_at: new Date().toISOString(),
      });

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

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.stats.tier).toBe('free');
      expect(data.stats.usage.daily.chatQueries).toEqual({
        used: 5,
        limit: 10,
        remaining: 5,
      });
      expect(data.stats.usage.daily.portfolioAnalysis).toEqual({
        used: 2,
        limit: 3,
        remaining: 1,
      });
      expect(data.stats.usage.monthly.secFilings).toEqual({
        used: 3,
        limit: 5,
        remaining: 2,
      });
      expect(data.stats.percentages.chatQueries).toBe(50);
      expect(data.stats.warnings.chatQueries).toBe(false);
    });

    it('should return 401 if user is not authenticated', async () => {
      mockGetUserProfile.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toContain('Authentication required');
    });

    it('should return warnings when usage >= 80%', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        created_at: new Date().toISOString(),
      });

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {
          chat_queries: 9,  // 90%
          portfolio_analysis: 3,  // 100%
        },
        monthly: {
          sec_filings: 4,  // 80%
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

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.warnings.chatQueries).toBe(true);
      expect(data.stats.warnings.portfolioAnalysis).toBe(true);
      expect(data.stats.warnings.secFilings).toBe(true);
    });

    it('should handle premium tier with infinite limits', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-premium',
        email: 'premium@example.com',
        tier: 'premium',
        created_at: new Date().toISOString(),
      });

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

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.usage.daily.chatQueries.limit).toBe(null); // JSON serializes Infinity as null
      expect(data.stats.usage.daily.chatQueries.remaining).toBe(null);
      expect(data.stats.percentages.chatQueries).toBe(0);
      expect(data.stats.warnings.chatQueries).toBe(false);
    });

    it('should handle zero usage correctly', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-new',
        email: 'new@example.com',
        tier: 'free',
        created_at: new Date().toISOString(),
      });

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

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.usage.daily.chatQueries.used).toBe(0);
      expect(data.stats.usage.daily.chatQueries.remaining).toBe(10);
      expect(data.stats.percentages.chatQueries).toBe(0);
      expect(data.stats.warnings.chatQueries).toBe(false);
    });

    it('should include valid period boundaries', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        created_at: new Date().toISOString(),
      });

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

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.usage.periodStart.daily).toBeDefined();
      expect(data.stats.usage.periodStart.monthly).toBeDefined();
      expect(data.stats.usage.periodEnd.daily).toBeDefined();
      expect(data.stats.usage.periodEnd.monthly).toBeDefined();
    });

    it('should return 500 on service error', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        created_at: new Date().toISOString(),
      });

      mockGetCurrentUserUsage.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toContain('Database connection failed');
    });

    it('should handle quota exceeded scenario', async () => {
      mockGetUserProfile.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        tier: 'free',
        created_at: new Date().toISOString(),
      });

      mockGetCurrentUserUsage.mockResolvedValue({
        daily: {
          chat_queries: 15,  // Over limit
          portfolio_analysis: 5,  // Over limit
        },
        monthly: {
          sec_filings: 10,  // Over limit
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

      const request = new NextRequest('http://localhost:3000/api/user/usage', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.stats.usage.daily.chatQueries.remaining).toBe(0);
      expect(data.stats.usage.daily.portfolioAnalysis.remaining).toBe(0);
      expect(data.stats.usage.monthly.secFilings.remaining).toBe(0);
      expect(data.stats.percentages.chatQueries).toBe(100); // Capped
      expect(data.stats.percentages.portfolioAnalysis).toBe(100);
      expect(data.stats.percentages.secFilings).toBe(100);
    });
  });
});
