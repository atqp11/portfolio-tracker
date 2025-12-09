/**
 * Stripe Service Tests
 *
 * Tests for Stripe service layer functions
 */

import * as stripeService from '@backend/modules/stripe/stripe.service';
import * as stripeClient from '@lib/stripe/client';
import * as stripeDao from '@backend/modules/stripe/dao/stripe.dao';
import * as webhookHandlers from '@backend/modules/stripe/webhook-handlers';
import type { Profile } from '@lib/supabase/db';

jest.mock('@lib/stripe/client');
jest.mock('@backend/modules/stripe/dao/stripe.dao');

const mockStripeClient = stripeClient as jest.Mocked<typeof stripeClient>;
const mockStripeDao = stripeDao as jest.Mocked<typeof stripeDao>;

describe('Stripe Service', () => {
  const mockProfile: Profile = {
    id: 'user-1',
    email: 'user@example.com',
    tier: 'basic',
    stripe_customer_id: 'cus_123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Profile;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Date.now() to return incrementing timestamps for idempotency key uniqueness
    let timestamp = 1000000000000;
    jest.spyOn(Date, 'now').mockImplementation(() => timestamp++);
    
    // Mock getStripe to return a mock stripe instance
    mockStripeClient.getStripe.mockReturnValue({
      subscriptions: {
        retrieve: jest.fn(),
      },
    } as any);
  });

  describe('createStripeCheckoutSession', () => {
    it('should create checkout session with idempotency key', async () => {
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');
      mockStripeClient.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/session',
      });

      const result = await stripeService.createStripeCheckoutSession({
        profile: mockProfile,
        tier: 'basic',
        priceId: 'price_basic_monthly', // Server-resolved price ID
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
        trialDays: 14,
      });

      expect(result.sessionId).toBe('cs_123');
      expect(result.url).toBe('https://checkout.stripe.com/session');
      expect(result.tier).toBe('basic');
      expect(mockStripeClient.createOrRetrieveCustomer).toHaveBeenCalledWith(
        'user@example.com',
        { userId: 'user-1' }
      );
      expect(mockStripeClient.createCheckoutSession).toHaveBeenCalledWith(
        'cus_123',
        'price_basic_monthly',
        'https://example.com/success',
        'https://example.com/cancel',
        14,
        expect.stringMatching(/^checkout_user-1_\d+$/),
        { userId: 'user-1' }
      );
    });

    it('should generate unique idempotency keys', async () => {
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');
      mockStripeClient.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_123',
        url: 'https://checkout.stripe.com/session',
      });

      const idempotencyKeys: string[] = [];

      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        await stripeService.createStripeCheckoutSession({
          profile: mockProfile,
          tier: 'basic',
          priceId: 'price_basic_monthly', // Server-resolved price ID
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });

        const lastCall = mockStripeClient.createCheckoutSession.mock.calls[i];
        idempotencyKeys.push(lastCall[5] as string);
      }

      // All keys should be unique
      const uniqueKeys = new Set(idempotencyKeys);
      expect(uniqueKeys.size).toBe(3);
    });

    it('should throw error for free tier', async () => {
      await expect(
        stripeService.createStripeCheckoutSession({
          profile: mockProfile,
          tier: 'free',
          priceId: 'price_free',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Free tier does not require checkout');
    });

    it('should throw error when price ID not provided', async () => {
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');

      await expect(
        stripeService.createStripeCheckoutSession({
          profile: mockProfile,
          tier: 'premium',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Price ID is required for premium tier');
    });

    it('should handle Stripe API errors', async () => {
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');
      mockStripeClient.createCheckoutSession.mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(
        stripeService.createStripeCheckoutSession({
          profile: mockProfile,
          tier: 'basic',
          priceId: 'price_basic_monthly', // Provide priceId so validation passes
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        })
      ).rejects.toThrow('Stripe API error');
    });
  });

  describe('getCheckoutInfo', () => {
    it('should return checkout information', async () => {
      const result = await stripeService.getCheckoutInfo(mockProfile);

      expect(result.currentTier).toBe('basic');
      expect(result.stripeCustomerId).toBe('cus_123');
      expect(result.available).toBe(true);
    });
  });

  describe('createStripePortalSession', () => {
    it('should create portal session', async () => {
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_123');
      mockStripeClient.createCustomerPortalSession.mockResolvedValue(
        'https://billing.stripe.com/session'
      );

      const result = await stripeService.createStripePortalSession({
        profile: mockProfile,
        returnUrl: 'https://example.com/return',
      });

      expect(result.url).toBe('https://billing.stripe.com/session');
      expect(mockStripeClient.createOrRetrieveCustomer).toHaveBeenCalledWith(
        'user@example.com',
        { userId: 'user-1' }
      );
      expect(mockStripeClient.createCustomerPortalSession).toHaveBeenCalledWith(
        'cus_123',
        'https://example.com/return'
      );
    });

    it('should create customer if not exists', async () => {
      const profileWithoutCustomer = { ...mockProfile, stripe_customer_id: null };
      mockStripeClient.createOrRetrieveCustomer.mockResolvedValue('cus_new');
      mockStripeClient.createCustomerPortalSession.mockResolvedValue(
        'https://billing.stripe.com/session'
      );

      await stripeService.createStripePortalSession({
        profile: profileWithoutCustomer,
        returnUrl: 'https://example.com/return',
      });

      expect(mockStripeClient.createOrRetrieveCustomer).toHaveBeenCalled();
    });
  });

  describe('getPortalInfo', () => {
    it('should return portal information', async () => {
      const result = await stripeService.getPortalInfo(mockProfile);

      expect(result.hasPortalAccess).toBe(true);
      expect(result.tier).toBe('basic');
    });

    it('should return false for portal access when no customer', async () => {
      const profileWithoutCustomer = { ...mockProfile, stripe_customer_id: null };
      const result = await stripeService.getPortalInfo(profileWithoutCustomer);

      expect(result.hasPortalAccess).toBe(false);
    });
  });

  describe('processStripeWebhook', () => {
    const mockEvent = {
      id: 'evt_123',
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

    beforeEach(() => {
      mockStripeClient.constructWebhookEvent.mockReturnValue(mockEvent);
      mockStripeDao.findTransactionByEventId.mockResolvedValue(null);
      mockStripeDao.createTransaction.mockResolvedValue({
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
        status: 'pending',
      } as any);
      mockStripeDao.updateTransactionByEventId.mockResolvedValue(undefined);
      // Patch Stripe subscription mock for webhook handler
      (webhookHandlers as any).handleCheckoutCompleted = jest.fn().mockImplementation(async () => {
        return {
          items: {
            data: [
              { price: { id: 'price_basic' } }
            ]
          },
          current_period_start: 1700000000,
          current_period_end: 1702592000,
        };
      });
    });

    it('should process webhook event successfully', async () => {
      // Stub webhook handler so we don't call real handlers that hit DB/Stripe in unit tests
      (webhookHandlers as any).handleCheckoutCompleted = jest.fn().mockResolvedValue(undefined);

      const result = await stripeService.processStripeWebhook({
        body: '{}',
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(result.received).toBe(true);
      expect(mockStripeClient.constructWebhookEvent).toHaveBeenCalledWith(
        '{}',
        'sig_123',
        'whsec_test'
      );
      expect(mockStripeDao.findTransactionByEventId).toHaveBeenCalledWith('evt_123');
      expect(mockStripeDao.createTransaction).toHaveBeenCalled();
      expect(mockStripeDao.updateTransactionByEventId).toHaveBeenCalledWith(
        'evt_123',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should detect and skip duplicate events', async () => {
      const existingTransaction = {
        stripe_event_id: 'evt_123',
        event_type: 'checkout.session.completed',
        status: 'completed',
      };

      mockStripeDao.findTransactionByEventId.mockResolvedValue(
        existingTransaction as any
      );

      const result = await stripeService.processStripeWebhook({
        body: '{}',
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(result.received).toBe(true);
      expect(result.duplicate).toBe(true);
      expect(mockStripeDao.createTransaction).not.toHaveBeenCalled();
    });

    it('should throw error for invalid signature', async () => {
      mockStripeClient.constructWebhookEvent.mockReturnValue(null);

      await expect(
        stripeService.processStripeWebhook({
          body: '{}',
          signature: 'invalid',
          webhookSecret: 'whsec_test',
        })
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should mark transaction as failed on error', async () => {
      // Mock webhook handler to throw error
      (webhookHandlers as any).handleCheckoutCompleted = jest.fn().mockRejectedValue(new Error('Handler error'));

      mockStripeClient.constructWebhookEvent.mockReturnValue(mockEvent);

      await expect(
        stripeService.processStripeWebhook({
          body: '{}',
          signature: 'sig_123',
          webhookSecret: 'whsec_test',
        })
      ).rejects.toThrow();

      expect(mockStripeDao.updateTransactionByEventId).toHaveBeenCalledWith(
        'evt_123',
        expect.objectContaining({
          status: 'failed',
          error_message: expect.any(String),
        })
      );
    });

    it('should handle unhandled event types gracefully', async () => {
      const unhandledEvent = {
        ...mockEvent,
        type: 'customer.created',
      };

      mockStripeClient.constructWebhookEvent.mockReturnValue(unhandledEvent);

      const result = await stripeService.processStripeWebhook({
        body: '{}',
        signature: 'sig_123',
        webhookSecret: 'whsec_test',
      });

      expect(result.received).toBe(true);
      expect(mockStripeDao.updateTransactionByEventId).toHaveBeenCalledWith(
        'evt_123',
        expect.objectContaining({
          status: 'completed',
        })
      );
    });

    it('should continue processing even if logging fails', async () => {
      mockStripeDao.createTransaction.mockRejectedValue(new Error('Logging failed'));

      // Should not throw, just log error
      await expect(
        stripeService.processStripeWebhook({
          body: '{}',
          signature: 'sig_123',
          webhookSecret: 'whsec_test',
        })
      ).resolves.toBeDefined();
    });
  });
});
