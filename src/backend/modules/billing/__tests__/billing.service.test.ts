/**
 * Billing Service Tests
 * 
 * Tests for billing service layer business logic
 */

import { billingService } from '@backend/modules/billing/service/billing.service';
import { billingDao } from '@backend/modules/billing/dao/billing.dao';
import { getStripe } from '@lib/stripe/client';
import type { SubscriptionInfo } from '@lib/types/billing';
import type Stripe from 'stripe';

jest.mock('@backend/modules/billing/dao/billing.dao');
jest.mock('@lib/stripe/client');

const mockBillingDao = billingDao as jest.Mocked<typeof billingDao>;
const mockGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;

describe('BillingService', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionInfo', () => {
    it('should return basic info for user without subscription', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        hasSubscription: false,
        tier: 'free',
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
      };

      mockBillingDao.getUserSubscriptionInfo.mockResolvedValue(mockSubscriptionInfo);

      const result = await billingService.getSubscriptionInfo(mockUserId);

      expect(result).toEqual({
        hasSubscription: false,
        tier: 'free',
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        subscription: null,
      });

      expect(mockBillingDao.getUserSubscriptionInfo).toHaveBeenCalledWith(mockUserId);
      expect(mockGetStripe).not.toHaveBeenCalled();
    });

    it('should return detailed info for user with active subscription', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        hasSubscription: true,
        tier: 'premium',
        subscriptionStatus: 'active',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
      };

      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        items: {
          data: [
            {
              id: 'si_123',
              price: {
                id: 'price_123',
                unit_amount: 2999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
            } as any,
          ],
        } as any,
      };

      mockBillingDao.getUserSubscriptionInfo.mockResolvedValue(mockSubscriptionInfo);
      
      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      const result = await billingService.getSubscriptionInfo(mockUserId);

      expect(result.hasSubscription).toBe(true);
      expect(result.tier).toBe('premium');
      expect(result.subscription).toEqual({
        id: 'sub_123',
        status: 'active',
        current_period_start: new Date('2025-01-01T00:00:00Z').getTime() / 1000,
        current_period_end: new Date('2025-02-01T00:00:00Z').getTime() / 1000,
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        items: [
          {
            id: 'si_123',
            price: {
              id: 'price_123',
              amount: 2999,
              currency: 'usd',
              interval: 'month',
            },
          },
        ],
      });

      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    });

    it('should handle missing Stripe subscription gracefully', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        hasSubscription: true,
        tier: 'basic',
        subscriptionStatus: 'active',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
      };

      mockBillingDao.getUserSubscriptionInfo.mockResolvedValue(mockSubscriptionInfo);
      
      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockRejectedValue(new Error('Subscription not found')),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await billingService.getSubscriptionInfo(mockUserId);

      expect(result.hasSubscription).toBe(true);
      expect(result.subscription).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Subscription not found in Stripe:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('should throw error if Stripe is not configured', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        hasSubscription: true,
        tier: 'basic',
        subscriptionStatus: 'active',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
      };

      mockBillingDao.getUserSubscriptionInfo.mockResolvedValue(mockSubscriptionInfo);
      mockGetStripe.mockReturnValue(null);

      await expect(billingService.getSubscriptionInfo(mockUserId))
        .rejects
        .toThrow('Stripe is not configured');
    });

    it('should handle subscription with trial period', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        hasSubscription: true,
        tier: 'basic',
        subscriptionStatus: 'trialing',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: '2025-01-15T00:00:00Z',
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
      };

      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        status: 'trialing',
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: Math.floor(new Date('2025-01-15T00:00:00Z').getTime() / 1000),
        items: {
          data: [
            {
              id: 'si_123',
              price: {
                id: 'price_123',
                unit_amount: 999,
                currency: 'usd',
                recurring: { interval: 'month' },
              },
            } as any,
          ],
        } as any,
      };

      mockBillingDao.getUserSubscriptionInfo.mockResolvedValue(mockSubscriptionInfo);
      
      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      const result = await billingService.getSubscriptionInfo(mockUserId);

      expect(result.subscriptionStatus).toBe('trialing');
      expect(result.trialEndsAt).toBe('2025-01-15T00:00:00Z');
      expect(result.subscription?.trial_end).toBe(Math.floor(new Date('2025-01-15T00:00:00Z').getTime() / 1000));
    });

    it('should handle price without recurring interval', async () => {
      const mockSubscriptionInfo: SubscriptionInfo = {
        hasSubscription: true,
        tier: 'premium',
        subscriptionStatus: 'active',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        stripeSubscriptionId: 'sub_123',
        stripeCustomerId: 'cus_123',
      };

      const mockStripeSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
        canceled_at: null,
        trial_end: null,
        items: {
          data: [
            {
              id: 'si_123',
              price: {
                id: 'price_123',
                unit_amount: 2999,
                currency: 'usd',
                recurring: null,
              },
            } as any,
          ],
        } as any,
      };

      mockBillingDao.getUserSubscriptionInfo.mockResolvedValue(mockSubscriptionInfo);
      
      const mockStripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue(mockStripeSubscription),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      const result = await billingService.getSubscriptionInfo(mockUserId);

      expect(result.subscription?.items[0].price.interval).toBeNull();
    });
  });

  describe('getBillingHistory', () => {
    it('should return invoices for user with customer ID', async () => {
      const mockInvoices = [
        {
          id: 'in_123',
          amount_due: 2999,
          currency: 'usd',
          status: 'paid',
          created: 1672531200,
        },
        {
          id: 'in_456',
          amount_due: 2999,
          currency: 'usd',
          status: 'paid',
          created: 1675209600,
        },
      ] as Stripe.Invoice[];

      mockBillingDao.getStripeCustomerId.mockResolvedValue('cus_123');
      
      const mockStripe = {
        invoices: {
          list: jest.fn().mockResolvedValue({ data: mockInvoices }),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      const result = await billingService.getBillingHistory(mockUserId);

      expect(result).toEqual(mockInvoices);
      expect(mockBillingDao.getStripeCustomerId).toHaveBeenCalledWith(mockUserId);
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 100,
      });
    });

    it('should return empty array for user without customer ID', async () => {
      mockBillingDao.getStripeCustomerId.mockResolvedValue(null);

      const result = await billingService.getBillingHistory(mockUserId);

      expect(result).toEqual([]);
      expect(mockGetStripe).not.toHaveBeenCalled();
    });

    it('should throw error if Stripe is not configured', async () => {
      mockBillingDao.getStripeCustomerId.mockResolvedValue('cus_123');
      mockGetStripe.mockReturnValue(null);

      await expect(billingService.getBillingHistory(mockUserId))
        .rejects
        .toThrow('Stripe is not configured');
    });

    it('should handle Stripe API errors', async () => {
      mockBillingDao.getStripeCustomerId.mockResolvedValue('cus_123');
      
      const mockStripe = {
        invoices: {
          list: jest.fn().mockRejectedValue(new Error('Stripe API error')),
        },
      };
      mockGetStripe.mockReturnValue(mockStripe as any);

      await expect(billingService.getBillingHistory(mockUserId))
        .rejects
        .toThrow('Stripe API error');
    });
  });
});
