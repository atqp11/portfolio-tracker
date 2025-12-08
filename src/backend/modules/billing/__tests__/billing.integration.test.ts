/**
 * Billing Integration Tests
 * 
 * End-to-end tests for billing module covering DAO → Service → Controller
 */

import { NextRequest } from 'next/server';
import { billingController } from '@backend/modules/billing/billing.controller';
import { createClient } from '@lib/supabase/server';
import { getStripe } from '@lib/stripe/client';
import type Stripe from 'stripe';
import type { TierName } from '@lib/tiers/config';

interface BillingAuthContext {
  auth: {
    userId: string;
    userTier: TierName;
    profile: any;
  };
}

jest.mock('@lib/supabase/server');
jest.mock('@lib/stripe/client');

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;

describe('Billing Integration Tests', () => {
  const mockUserId = 'user-integration-123';
  const mockAuthContext: BillingAuthContext = {
    auth: {
      userId: mockUserId,
      userTier: 'free' as TierName,
      profile: {
        id: mockUserId,
        email: 'integration@example.com',
        tier: 'free',
      },
    },
  };

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

  describe('Complete subscription flow', () => {
    it('should handle complete flow for user with active subscription', async () => {
      // Setup: Mock database profile
      const mockProfile = {
        tier: 'premium',
        subscription_status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        cancel_at_period_end: false,
        trial_ends_at: null,
        stripe_subscription_id: 'sub_integration_123',
        stripe_customer_id: 'cus_integration_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      // Setup: Mock Stripe subscription
      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_integration_123',
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        items: {
          data: [
            {
              id: 'si_integration_123',
              price: {
                id: 'price_premium_monthly',
                unit_amount: 2999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
            } as any,
          ],
        } as any,
      };

      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        },
        invoices: {
          list: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'in_123',
                amount_paid: 2999,
                currency: 'usd',
                status: 'paid',
                created: 1672531200,
              },
            ],
          }),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      // Execute: Get subscription
      const mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');
      const subscriptionResponse = await billingController.getSubscription(mockRequest, mockAuthContext);
      const subscriptionData = await subscriptionResponse.json();

      // Verify: Subscription data
      expect(subscriptionResponse.status).toBe(200);
      expect(subscriptionData.success).toBe(true);
      expect(subscriptionData.data.hasSubscription).toBe(true);
      expect(subscriptionData.data.tier).toBe('premium');
      expect(subscriptionData.data.subscription).toBeDefined();
      expect(subscriptionData.data.subscription.id).toBe('sub_integration_123');

      // Execute: Get billing history
      const historyResponse = await billingController.getHistory(mockRequest, mockAuthContext);
      const historyData = await historyResponse.json();

      // Verify: Billing history
      expect(historyResponse.status).toBe(200);
      expect(historyData.success).toBe(true);
      expect(historyData.data).toHaveLength(1);
      expect(historyData.data[0].id).toBe('in_123');

      // Verify: Proper DAO calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockUserId);

      // Verify: Proper Stripe calls
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_integration_123');
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_integration_123',
        limit: 100,
      });
    });

    it('should handle complete flow for free tier user', async () => {
      // Setup: Mock free tier profile
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

      // Execute: Get subscription
      const mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');
      const subscriptionResponse = await billingController.getSubscription(mockRequest, mockAuthContext);
      const subscriptionData = await subscriptionResponse.json();

      // Verify: Subscription data for free user
      expect(subscriptionResponse.status).toBe(200);
      expect(subscriptionData.data.hasSubscription).toBe(false);
      expect(subscriptionData.data.tier).toBe('free');
      expect(subscriptionData.data.subscription).toBeNull();

      // Execute: Get billing history
      const historyResponse = await billingController.getHistory(mockRequest, mockAuthContext);
      const historyData = await historyResponse.json();

      // Verify: Empty billing history
      expect(historyResponse.status).toBe(200);
      expect(historyData.data).toEqual([]);

      // Verify: Stripe was not called for free user
      expect(mockGetStripe).not.toHaveBeenCalled();
    });

    it('should handle trialing subscription with upcoming invoice', async () => {
      // Setup: Mock trialing profile
      const mockProfile = {
        tier: 'basic',
        subscription_status: 'trialing',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        cancel_at_period_end: false,
        trial_ends_at: '2025-01-15T00:00:00Z',
        stripe_subscription_id: 'sub_trial_123',
        stripe_customer_id: 'cus_trial_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      // Setup: Mock trialing Stripe subscription
      const trialEndTimestamp = Math.floor(new Date('2025-01-15T00:00:00Z').getTime() / 1000);
      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_trial_123',
        status: 'trialing',
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: trialEndTimestamp,
        items: {
          data: [
            {
              id: 'si_trial_123',
              price: {
                id: 'price_basic_monthly',
                unit_amount: 999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
            } as any,
          ],
        } as any,
      };

      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        },
        invoices: {
          list: jest.fn().mockResolvedValue({
            data: [], // No invoices during trial
          }),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      // Execute
      const mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');
      const response = await billingController.getSubscription(mockRequest, mockAuthContext);
      const data = await response.json();

      // Verify: Trial subscription details
      expect(data.data.subscriptionStatus).toBe('trialing');
      expect(data.data.trialEndsAt).toBe('2025-01-15T00:00:00Z');
      expect(data.data.subscription.status).toBe('trialing');
      expect(data.data.subscription.trial_end).toBe(trialEndTimestamp);
    });

    it('should handle canceled subscription (active until period end)', async () => {
      // Setup: Mock canceled profile
      const mockProfile = {
        tier: 'premium',
        subscription_status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        cancel_at_period_end: true,
        trial_ends_at: null,
        stripe_subscription_id: 'sub_canceled_123',
        stripe_customer_id: 'cus_canceled_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      // Setup: Mock canceled Stripe subscription
      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_canceled_123',
        status: 'active',
        cancel_at_period_end: true,
        canceled_at: 1704067200,
        trial_end: null,
        items: {
          data: [
            {
              id: 'si_canceled_123',
              price: {
                id: 'price_premium_monthly',
                unit_amount: 2999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
            } as any,
          ],
        } as any,
      };

      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      // Execute
      const mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');
      const response = await billingController.getSubscription(mockRequest, mockAuthContext);
      const data = await response.json();

      // Verify: Cancellation details
      expect(data.data.cancelAtPeriodEnd).toBe(true);
      expect(data.data.subscription.cancel_at_period_end).toBe(true);
      expect(data.data.subscription.canceled_at).toBe(1704067200);
      expect(data.data.currentPeriodEnd).toBe('2025-02-01T00:00:00Z');
    });
  });

  describe('Error handling across layers', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');

      await expect(billingController.getSubscription(mockRequest, mockAuthContext))
        .rejects
        .toThrow();
    });

    it('should handle Stripe API errors gracefully', async () => {
      // Setup: Valid database profile
      const mockProfile = {
        tier: 'basic',
        subscription_status: 'active',
        current_period_start: '2025-01-01T00:00:00Z',
        current_period_end: '2025-02-01T00:00:00Z',
        cancel_at_period_end: false,
        trial_ends_at: null,
        stripe_subscription_id: 'sub_error_123',
        stripe_customer_id: 'cus_error_123',
      };

      mockSupabaseClient.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      // Setup: Stripe API error
      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockRejectedValue(new Error('Stripe API unavailable')),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      // Execute
      const mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');
      const response = await billingController.getSubscription(mockRequest, mockAuthContext);
      const data = await response.json();

      // Verify: Returns data without Stripe subscription details
      expect(response.status).toBe(200);
      expect(data.data.hasSubscription).toBe(true);
      expect(data.data.subscription).toBeNull();
    });
  });
});
