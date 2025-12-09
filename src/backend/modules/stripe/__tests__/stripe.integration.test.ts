/**
 * Stripe Integration Tests
 *
 * End-to-end tests for Stripe checkout flow and subscription lifecycle
 */

import * as stripeService from '@backend/modules/stripe/stripe.service';
import * as stripeClient from '@lib/stripe/client';
import * as stripeDao from '@backend/modules/stripe/dao/stripe.dao';
import type { Profile } from '@lib/supabase/db';

jest.mock('@lib/stripe/client');
jest.mock('@backend/modules/stripe/dao/stripe.dao');
jest.mock('@lib/supabase/admin');

const mockStripeClient = stripeClient as jest.Mocked<typeof stripeClient>;
const mockStripeDao = stripeDao as jest.Mocked<typeof stripeDao>;

describe('Stripe Integration - Checkout Flow', () => {
  const mockProfile: Profile = {
    id: 'user-1',
    email: 'user@example.com',
    tier: 'free',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Profile;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Date.now() to return incrementing timestamps
    let timestamp = 1000000000000;
    jest.spyOn(Date, 'now').mockImplementation(() => timestamp++);

    // Mock getStripe to return a mock Stripe instance
    const mockStripe = {
      subscriptions: {
        retrieve: jest.fn().mockResolvedValue({
          id: 'sub_123',
          status: 'active',
          items: {
            data: [
              {
                price: {
                  id: 'price_basic',
                },
              },
            ],
          },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        }),
      },
    };
    mockStripeClient.getStripe.mockReturnValue(mockStripe as any);
    mockStripeClient.getTierFromPriceId.mockReturnValue('basic');

    // Mock Supabase admin client
    const { createAdminClient } = require('@lib/supabase/admin');
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'user-1', tier: 'basic' },
              error: null,
            }),
          }),
        }),
      }),
    };
    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Complete Checkout Flow', () => {
    it('should handle full checkout flow from free to paid tier', async () => {
      // Step 1: Create checkout session
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');
      // priceId is provided directly (server-resolved)
      mockStripeClient.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/session',
      });

      const checkoutResult = await stripeService.createStripeCheckoutSession({
        profile: mockProfile,
        tier: 'basic',
        priceId: 'price_basic_monthly', // Server-resolved price ID
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      expect(checkoutResult.sessionId).toBe('cs_123');
      expect(checkoutResult.tier).toBe('basic');

      // Step 2: Simulate webhook processing after checkout completion
      const mockEvent = {
        id: 'evt_checkout_completed',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { userId: 'user-1' },
          },
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(mockEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_checkout_completed',
        event_type: 'checkout.session.completed',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      const webhookResult = await stripeService.processStripeWebhook({
        body: JSON.stringify(mockEvent),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(webhookResult.received).toBe(true);
      expect(mockStripeDao.findTransactionByEventId).toHaveBeenCalledWith(
        'evt_checkout_completed'
      );
    });

    it('should handle idempotency in checkout flow', async () => {
      // First checkout attempt
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');
      // priceId is provided directly (server-resolved)
      mockStripeClient.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/session',
      });

      const firstResult = await stripeService.createStripeCheckoutSession({
        profile: mockProfile,
        tier: 'basic',
        priceId: 'price_basic_monthly', // Server-resolved price ID
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const firstIdempotencyKey = (mockStripeClient.createCheckoutSession.mock
        .calls[0][5] as string);

      // Second checkout attempt (retry)
      const secondResult = await stripeService.createStripeCheckoutSession({
        profile: mockProfile,
        tier: 'basic',
        priceId: 'price_basic_monthly', // Server-resolved price ID
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });

      const secondIdempotencyKey = (mockStripeClient.createCheckoutSession.mock
        .calls[1][5] as string);

      // Idempotency keys should be different (timestamp-based)
      expect(firstIdempotencyKey).not.toBe(secondIdempotencyKey);
      // But both should follow the pattern
      expect(firstIdempotencyKey).toMatch(/^checkout_user-1_\d+$/);
      expect(secondIdempotencyKey).toMatch(/^checkout_user-1_\d+$/);
    });
  });

  describe('Subscription Lifecycle', () => {
    it('should handle subscription creation flow', async () => {
      // 1. Checkout completed webhook
      const checkoutEvent = {
        id: 'evt_checkout',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { userId: 'user-1' },
          },
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(checkoutEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_checkout',
        event_type: 'checkout.session.completed',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      await stripeService.processStripeWebhook({
        body: JSON.stringify(checkoutEvent),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(mockStripeDao.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'checkout.session.completed',
        })
      );
    });

    it('should handle subscription update flow', async () => {
      const updateEvent = {
        id: 'evt_update',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_premium' } }],
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(updateEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_update',
        event_type: 'customer.subscription.updated',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      await stripeService.processStripeWebhook({
        body: JSON.stringify(updateEvent),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(mockStripeDao.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'customer.subscription.updated',
        })
      );
    });

    it('should handle subscription cancellation flow', async () => {
      const cancelEvent = {
        id: 'evt_cancel',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          },
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(cancelEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_cancel',
        event_type: 'customer.subscription.deleted',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      await stripeService.processStripeWebhook({
        body: JSON.stringify(cancelEvent),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(mockStripeDao.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'customer.subscription.deleted',
        })
      );
    });

    it('should handle payment success flow', async () => {
      const paymentEvent = {
        id: 'evt_payment',
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_paid: 600,
            payment_intent: 'pi_123',
          },
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(paymentEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_payment',
        event_type: 'invoice.payment_succeeded',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      await stripeService.processStripeWebhook({
        body: JSON.stringify(paymentEvent),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(mockStripeDao.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'invoice.payment_succeeded',
        })
      );
    });

    it('should handle payment failure flow', async () => {
      const failureEvent = {
        id: 'evt_failure',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            amount_due: 600,
            last_finalization_error: {
              message: 'Your card was declined.',
            },
          },
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(failureEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_failure',
        event_type: 'invoice.payment_failed',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      await stripeService.processStripeWebhook({
        body: JSON.stringify(failureEvent),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(mockStripeDao.createTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'invoice.payment_failed',
        })
      );
    });
  });

  describe('Webhook Deduplication', () => {
    it('should prevent duplicate webhook processing', async () => {
      const event = {
        id: 'evt_duplicate',
        type: 'checkout.session.completed',
        data: { object: {} },
      } as any;

      const existingTransaction = {
        stripe_event_id: 'evt_duplicate',
        event_type: 'checkout.session.completed',
        status: 'completed',
      };

      mockStripeClient.constructWebhookEvent.mockReturnValue(event);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(
        existingTransaction as any
      );

      const result = await stripeService.processStripeWebhook({
        body: JSON.stringify(event),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(result.received).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(mockStripeDao.createTransaction).not.toHaveBeenCalled();
    });

    it('should process webhook when no duplicate exists', async () => {
      const event = {
        id: 'evt_new',
        type: 'checkout.session.completed',
        data: { 
          object: {
            metadata: { userId: 'user-1' },
            customer: 'cus_123',
            subscription: 'sub_123',
          } 
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(event);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_new',
        event_type: 'checkout.session.completed',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      const result = await stripeService.processStripeWebhook({
        body: JSON.stringify(event),
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(result.received).toBe(true);
      expect(result.duplicate).toBeUndefined();
      expect(mockStripeDao.createTransaction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle webhook processing errors gracefully', async () => {
      const event = {
        id: 'evt_error',
        type: 'checkout.session.completed',
        data: { object: {} },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(event);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_error',
        event_type: 'checkout.session.completed',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      // Mock handler to throw error
      jest.doMock('@backend/modules/stripe/webhook-handlers', () => ({
        handleCheckoutCompleted: jest.fn().mockRejectedValue(new Error('Handler error')),
      }));

      await expect(
        stripeService.processStripeWebhook({
          body: JSON.stringify(event),
          signature: 'sig_123',
          webhookSecret: 'whsec_test',
        })
      ).rejects.toThrow();

      expect(mockStripeDao.updateTransactionByEventId).toHaveBeenCalledWith(
        'evt_error',
        expect.objectContaining({
          status: 'failed',
          error_message: expect.any(String),
        })
      );
    });

    it('should continue processing when transaction logging fails', async () => {
      const event = {
        id: 'evt_log_error',
        type: 'checkout.session.completed',
        data: { 
          object: {
            metadata: { userId: 'user-1' },
            customer: 'cus_123',
            subscription: 'sub_123',
          } 
        },
      } as any;

      mockStripeClient.constructWebhookEvent.mockReturnValue(event);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockRejectedValue(new Error('Logging failed'));
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);

      // Should not throw, just log error and continue
      await expect(
        stripeService.processStripeWebhook({
          body: JSON.stringify(event),
          signature: 'sig_123',
          webhookSecret: 'whsec_test',
        })
      ).resolves.toBeDefined();
    });
  });
});
