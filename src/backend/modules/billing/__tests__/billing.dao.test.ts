/**
 * Billing DAO Tests
 * 
 * Tests for billing data access layer
 */

import { billingDao } from '@backend/modules/billing/dao/billing.dao';
import { createClient } from '@lib/supabase/server';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

jest.mock('@lib/supabase/server');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('BillingDao', () => {
  const mockUserId = 'user-123';
  
  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockResolvedValue(mockSupabaseClient as any);
  });

  describe('getUserSubscriptionInfo', () => {
    it('should return subscription info for user with active subscription', async () => {
      const mockProfile = {
        tier: 'premium',
        subscription_status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        cancel_at_period_end: false,
        trial_ends_at: null,
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await billingDao.getUserSubscriptionInfo(mockUserId);

      expect(result).toEqual({
        hasSubscription: true,
        tier: 'premium',
        subscriptionStatus: 'active',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        'tier, subscription_status, current_period_start, current_period_end, cancel_at_period_end, trial_ends_at, stripe_subscription_id, stripe_customer_id'
      );
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should return subscription info for user without subscription', async () => {
      const mockProfile = {
        tier: 'free',
        subscription_status: null,
        current_period_start: null,
        current_period_end: null,
        cancel_at_period_end: null,
        trial_ends_at: null,
        stripe_subscription_id: null,
        stripe_customer_id: null,
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await billingDao.getUserSubscriptionInfo(mockUserId);

      expect(result).toEqual({
        hasSubscription: false,
        tier: 'free',
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      });
    });

    it('should handle cancel_at_period_end being null', async () => {
      const mockProfile = {
        tier: 'basic',
        subscription_status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        cancel_at_period_end: null,
        trial_ends_at: null,
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await billingDao.getUserSubscriptionInfo(mockUserId);

      expect(result.cancelAtPeriodEnd).toBe(false);
    });

    it('should throw NotFoundError if profile not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      await expect(billingDao.getUserSubscriptionInfo(mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });

    it('should throw NotFoundError if profile is null', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      });

      await expect(billingDao.getUserSubscriptionInfo(mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('getStripeCustomerId', () => {
    it('should return customer ID for user with Stripe account', async () => {
      const mockProfile = {
        stripe_customer_id: 'cus_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await billingDao.getStripeCustomerId(mockUserId);

      expect(result).toBe('cus_123');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('stripe_customer_id');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockUserId);
    });

    it('should return null for user without Stripe account', async () => {
      const mockProfile = {
        stripe_customer_id: null,
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await billingDao.getStripeCustomerId(mockUserId);

      expect(result).toBeNull();
    });

    it('should throw NotFoundError if profile not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      });

      await expect(billingDao.getStripeCustomerId(mockUserId))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
