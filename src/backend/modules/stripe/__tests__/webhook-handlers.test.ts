/**
 * Webhook Handlers Unit Tests
 * 
 * Tests for Stripe webhook event handlers
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type Stripe from 'stripe';

// Mock dependencies
const mockSupabaseUpdate = jest.fn<any>();
const mockSupabaseSelect = jest.fn<any>();
const mockSupabaseSingle = jest.fn<any>();
const mockSupabaseFrom = jest.fn<any>(() => ({
  update: mockSupabaseUpdate,
  select: mockSupabaseSelect,
  eq: jest.fn<any>().mockReturnThis(),
  single: mockSupabaseSingle,
}));

const mockCreateAdminClient = jest.fn<any>(() => ({
  from: mockSupabaseFrom,
}));

const mockGetStripe = jest.fn<any>();
const mockStripeSubscriptionsRetrieve = jest.fn<any>();
const mockGetTierFromPriceId = jest.fn<any>();

const mockUpsertTransaction = jest.fn<any>();

jest.mock('@lib/supabase/admin', () => ({
  createAdminClient: () => mockCreateAdminClient(),
}));

jest.mock('@lib/stripe/client', () => ({
  getStripe: () => mockGetStripe(),
}));

jest.mock('@backend/modules/subscriptions/config/plans.config', () => ({
  getTierFromPriceId: (priceId: string) => mockGetTierFromPriceId(priceId),
}));

jest.mock('@backend/modules/stripe/dao/stripe.dao', () => ({
  upsertTransaction: (params: any) => mockUpsertTransaction(params),
}));

describe('Webhook Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetStripe.mockReturnValue({
      subscriptions: {
        retrieve: mockStripeSubscriptionsRetrieve,
      },
    });
    
    // Default: map test price IDs to tiers
    mockGetTierFromPriceId.mockImplementation((priceId: string) => {
      if (priceId === 'price_basic') return 'basic';
      if (priceId === 'price_premium') return 'premium';
      return null;
    });
    
    mockSupabaseUpdate.mockReturnValue({
      eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
    });
    
    mockSupabaseSelect.mockReturnValue({
      eq: jest.fn().mockReturnThis(),
      single: mockSupabaseSingle,
    });
  });

  describe('handleCheckoutCompleted', () => {
    it('should update user profile on successful checkout', async () => {
      const { handleCheckoutCompleted } = await import('../webhook-handlers');
      
      const mockSession: Partial<Stripe.Checkout.Session> = {
        customer: 'cus_123',
        subscription: 'sub_123',
        metadata: { userId: 'user_123' },
      };

      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_basic' },
          }],
        } as any,
        trial_end: null,
      };

      // Mock subscription with period dates
      const subscriptionWithPeriods = {
        ...mockSubscription,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
      };

      mockStripeSubscriptionsRetrieve.mockResolvedValue(subscriptionWithPeriods);
      mockGetTierFromPriceId.mockReturnValue('basic');
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'checkout.session.completed' } as Stripe.Event,
      };

      await handleCheckoutCompleted(mockSession as Stripe.Checkout.Session, context);

      expect(mockStripeSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123');
      expect(mockGetTierFromPriceId).toHaveBeenCalledWith('price_basic');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
      expect(mockUpsertTransaction).toHaveBeenCalled();
    });

    it('should throw error if userId is missing in metadata', async () => {
      const { handleCheckoutCompleted } = await import('../webhook-handlers');
      
      const mockSession: Partial<Stripe.Checkout.Session> = {
        customer: 'cus_123',
        subscription: 'sub_123',
        metadata: {}, // No userId
      };

      const context = {
        event: { id: 'evt_123', type: 'checkout.session.completed' } as Stripe.Event,
      };

      await expect(
        handleCheckoutCompleted(mockSession as Stripe.Checkout.Session, context)
      ).rejects.toThrow('No userId in checkout session metadata');
    });

    it('should handle trial period correctly', async () => {
      const { handleCheckoutCompleted } = await import('../webhook-handlers');
      
      const mockSession: Partial<Stripe.Checkout.Session> = {
        customer: 'cus_123',
        subscription: 'sub_123',
        metadata: { userId: 'user_123' },
      };

      const trialEnd = Math.floor(Date.now() / 1000) + 1209600; // 14 days
      const subscriptionWithPeriods = {
        id: 'sub_123',
        status: 'trialing',
        items: {
          data: [{
            price: { id: 'price_basic' },
          }],
        } as any,
        trial_end: trialEnd,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockStripeSubscriptionsRetrieve.mockResolvedValue(subscriptionWithPeriods);
      mockGetTierFromPriceId.mockReturnValue('basic');
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'checkout.session.completed' } as Stripe.Event,
      };

      await handleCheckoutCompleted(mockSession as Stripe.Checkout.Session, context);

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const updateCall = mockSupabaseUpdate.mock.calls[0][0] as any;
      expect(updateCall.trial_ends_at).toBe(new Date(trialEnd * 1000).toISOString());
    });

    it('should throw error if database update fails', async () => {
      const { handleCheckoutCompleted } = await import('../webhook-handlers');
      
      const mockSession: Partial<Stripe.Checkout.Session> = {
        customer: 'cus_123',
        subscription: 'sub_123',
        metadata: { userId: 'user_123' },
      };

      const subscriptionWithPeriods = {
        id: 'sub_123',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_basic' },
          }],
        } as any,
        trial_end: null,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockStripeSubscriptionsRetrieve.mockResolvedValue(subscriptionWithPeriods);
      mockGetTierFromPriceId.mockReturnValue('basic');
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ 
          error: { message: 'Database error' } 
        }),
      });

      const context = {
        event: { id: 'evt_123', type: 'checkout.session.completed' } as Stripe.Event,
      };

      await expect(
        handleCheckoutCompleted(mockSession as Stripe.Checkout.Session, context)
      ).rejects.toThrow('Failed to update user profile: Database error');
    });
  });

  describe('handleSubscriptionUpdated', () => {
    it('should update user subscription when tier changes', async () => {
      const { handleSubscriptionUpdated } = await import('../webhook-handlers');
      
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_premium' },
          }],
        } as any,
        cancel_at_period_end: false,
      };

      const subscriptionWithPeriods = {
        ...mockSubscription,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'user_123', subscription_tier: 'basic' },
        error: null,
      });
      // Ensure getTierFromPriceId returns 'premium' for this test
      mockGetTierFromPriceId.mockReturnValue('premium');
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'customer.subscription.updated' } as Stripe.Event,
      };

      await handleSubscriptionUpdated(
        subscriptionWithPeriods as any,
        context
      );

      // Note: getTierFromPriceId is imported from plans.config, not stripe/client
      // The mock is set up at the module level via jest.mock
      expect(mockSupabaseUpdate).toHaveBeenCalled();
      expect(mockUpsertTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          tier_before: 'basic',
          tier_after: 'premium',
        })
      );
    });

    it('should handle cancel_at_period_end flag', async () => {
      const { handleSubscriptionUpdated } = await import('../webhook-handlers');
      
      const subscriptionWithPeriods = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_basic' },
          }],
        } as any,
        cancel_at_period_end: true,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'user_123', subscription_tier: 'basic' },
        error: null,
      });
      // Ensure getTierFromPriceId returns 'basic' for this test
      mockGetTierFromPriceId.mockReturnValue('basic');
      
      // Capture the update call
      const mockEq = jest.fn<any>().mockResolvedValue({ data: null, error: null });
      mockSupabaseUpdate.mockReturnValue({ eq: mockEq });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'customer.subscription.updated' } as Stripe.Event,
      };

      await handleSubscriptionUpdated(
        subscriptionWithPeriods as any,
        context
      );

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const updateCall = mockSupabaseUpdate.mock.calls[0][0] as any;
      expect(updateCall.cancel_at_period_end).toBe(true);
    });

    it('should return early if user not found', async () => {
      const { handleSubscriptionUpdated } = await import('../webhook-handlers');
      
      const subscriptionWithPeriods = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        items: {
          data: [{
            price: { id: 'price_basic' },
          }],
        } as any,
        cancel_at_period_end: false,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const context = {
        event: { id: 'evt_123', type: 'customer.subscription.updated' } as Stripe.Event,
      };

      await handleSubscriptionUpdated(
        subscriptionWithPeriods as unknown as Stripe.Subscription,
        context
      );

      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });
  });

  describe('handleInvoicePaymentSucceeded', () => {
    it('should update payment status on successful payment', async () => {
      const { handleInvoicePaymentSucceeded } = await import('../webhook-handlers');
      
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_123',
        customer: 'cus_123',
        amount_paid: 600, // $6.00
        currency: 'usd',
      };

      const invoiceWithExtras = {
        ...mockInvoice,
        subscription: 'sub_123',
        payment_intent: 'pi_123',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'user_123' },
        error: null,
      });
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'invoice.payment_succeeded' } as Stripe.Event,
      };

      await handleInvoicePaymentSucceeded(
        invoiceWithExtras as unknown as Stripe.Invoice,
        context
      );

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const updateCall = mockSupabaseUpdate.mock.calls[0][0] as any;
      expect(updateCall.last_payment_status).toBe('succeeded');
      expect(updateCall.subscription_status).toBe('active');
      expect(mockUpsertTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          stripe_payment_intent_id: 'pi_123',
          amount_cents: 600,
        })
      );
    });

    it('should skip one-time payments (no subscription)', async () => {
      const { handleInvoicePaymentSucceeded } = await import('../webhook-handlers');
      
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_123',
        customer: 'cus_123',
        amount_paid: 1000,
        currency: 'usd',
      };

      const invoiceWithExtras = {
        ...mockInvoice,
        subscription: null, // One-time payment
        payment_intent: 'pi_123',
      };

      const context = {
        event: { id: 'evt_123', type: 'invoice.payment_succeeded' } as Stripe.Event,
      };

      await handleInvoicePaymentSucceeded(
        invoiceWithExtras as unknown as Stripe.Invoice,
        context
      );

      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });

    it('should return early if user not found', async () => {
      const { handleInvoicePaymentSucceeded } = await import('../webhook-handlers');
      
      const invoiceWithExtras = {
        id: 'in_123',
        customer: 'cus_123',
        subscription: 'sub_123',
        amount_paid: 600,
        currency: 'usd',
        payment_intent: 'pi_123',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const context = {
        event: { id: 'evt_123', type: 'invoice.payment_succeeded' } as Stripe.Event,
      };

      await handleInvoicePaymentSucceeded(
        invoiceWithExtras as unknown as Stripe.Invoice,
        context
      );

      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });
  });

  describe('handleInvoicePaymentFailed', () => {
    it('should update payment status and error on failed payment', async () => {
      const { handleInvoicePaymentFailed } = await import('../webhook-handlers');
      
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_123',
        customer: 'cus_123',
        amount_due: 600,
        currency: 'usd',
        last_finalization_error: {
          message: 'Your card was declined.',
        } as any,
      };

      const invoiceWithExtras = {
        ...mockInvoice,
        subscription: 'sub_123',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'user_123', email: 'user@example.com' },
        error: null,
      });
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'invoice.payment_failed' } as Stripe.Event,
      };

      await handleInvoicePaymentFailed(
        invoiceWithExtras as unknown as Stripe.Invoice,
        context
      );

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const updateCall = mockSupabaseUpdate.mock.calls[0][0] as any;
      expect(updateCall.last_payment_status).toBe('failed');
      expect(updateCall.last_payment_error).toBe('Your card was declined.');
      expect(updateCall.subscription_status).toBe('past_due');
      expect(mockUpsertTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error_message: 'Your card was declined.',
        })
      );
    });

    it('should use default error message if no error provided', async () => {
      const { handleInvoicePaymentFailed } = await import('../webhook-handlers');
      
      const invoiceWithExtras = {
        id: 'in_123',
        customer: 'cus_123',
        subscription: 'sub_123',
        amount_due: 600,
        currency: 'usd',
        last_finalization_error: null,
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'user_123', email: 'user@example.com' },
        error: null,
      });
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'invoice.payment_failed' } as Stripe.Event,
      };

      await handleInvoicePaymentFailed(
        invoiceWithExtras as unknown as Stripe.Invoice,
        context
      );

      const updateCall = mockSupabaseUpdate.mock.calls[0][0] as any;
      expect(updateCall.last_payment_error).toBe('Payment failed');
    });

    it('should skip if no subscription (one-time payment)', async () => {
      const { handleInvoicePaymentFailed } = await import('../webhook-handlers');
      
      const invoiceWithExtras = {
        id: 'in_123',
        customer: 'cus_123',
        subscription: null,
        amount_due: 600,
        currency: 'usd',
      };

      const context = {
        event: { id: 'evt_123', type: 'invoice.payment_failed' } as Stripe.Event,
      };

      await handleInvoicePaymentFailed(
        invoiceWithExtras as unknown as Stripe.Invoice,
        context
      );

      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });
  });

  describe('handleSubscriptionDeleted', () => {
    it('should downgrade user to free tier on cancellation', async () => {
      const { handleSubscriptionDeleted } = await import('../webhook-handlers');
      
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        customer: 'cus_123',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: { id: 'user_123', subscription_tier: 'premium' },
        error: null,
      });
      mockSupabaseUpdate.mockReturnValue({
        eq: jest.fn<any>().mockResolvedValue({ data: null, error: null } as any),
      });
      mockUpsertTransaction.mockResolvedValue(undefined);

      const context = {
        event: { id: 'evt_123', type: 'customer.subscription.deleted' } as Stripe.Event,
      };

      await handleSubscriptionDeleted(
        mockSubscription as Stripe.Subscription,
        context
      );

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const updateCall = mockSupabaseUpdate.mock.calls[0][0] as any;
      expect(updateCall.subscription_status).toBe('canceled');
      expect(updateCall.subscription_tier).toBe('free');
      expect(updateCall.tier).toBe('free');
      expect(updateCall.stripe_subscription_id).toBeNull();
      expect(updateCall.cancel_at_period_end).toBe(false);
      expect(mockUpsertTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          tier_before: 'premium',
          tier_after: 'free',
        })
      );
    });

    it('should return early if user not found', async () => {
      const { handleSubscriptionDeleted } = await import('../webhook-handlers');
      
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        customer: 'cus_123',
      };

      mockSupabaseSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const context = {
        event: { id: 'evt_123', type: 'customer.subscription.deleted' } as Stripe.Event,
      };

      await handleSubscriptionDeleted(
        mockSubscription as Stripe.Subscription,
        context
      );

      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });
  });
});


