/**
 * Stripe Integration Tests
 * 
 * Unit tests for Stripe client functions
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type Stripe from 'stripe';

// Mock Stripe constructor with explicit parameter types

const mockCustomersList = jest.fn() as jest.MockedFunction<
  (params?: Stripe.CustomerListParams) => Promise<{ data: Array<{ id: string; email?: string }> }>
>;

const mockCustomersCreate = jest.fn() as jest.MockedFunction<
  (params: Stripe.CustomerCreateParams) => Promise<{ id: string }>
>;

const mockCheckoutSessionsCreate = jest.fn() as jest.MockedFunction<
  (params: Stripe.Checkout.SessionCreateParams) => Promise<{ id: string; url: string }>
>;

const mockPricesRetrieve = jest.fn() as jest.MockedFunction<
  (id: string) => Promise<Stripe.Price>
>;

const mockWebhooksConstructEvent = jest.fn() as jest.MockedFunction<
  (payload: string | Buffer, header: string | Buffer, secret: string) => Stripe.Event
>;

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      list: mockCustomersList,
      create: mockCustomersCreate,
    },
    checkout: {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    },
    prices: {
      retrieve: mockPricesRetrieve,
    },
    webhooks: {
      constructEvent: mockWebhooksConstructEvent,
    },
  }));
});

describe('Stripe Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
    // Clear module cache to ensure fresh imports
    jest.resetModules();
  });

  describe('getStripe', () => {
    it('should initialize Stripe client with API key', async () => {
      const { getStripe } = await import('@lib/stripe/client');
      const stripe = getStripe();
      expect(stripe).toBeDefined();
    });

    it('should return null if STRIPE_SECRET_KEY is not configured', async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      jest.resetModules();
      
      const { getStripe } = await import('@lib/stripe/client');
      const stripe = getStripe();
      expect(stripe).toBeNull();
      
      // Restore for other tests
      if (originalKey) {
        process.env.STRIPE_SECRET_KEY = originalKey;
      }
      jest.resetModules();
    });

    it('should reuse same instance on multiple calls', async () => {
      const { getStripe } = await import('@lib/stripe/client');
      const stripe1 = getStripe();
      const stripe2 = getStripe();
      expect(stripe1).toBe(stripe2);
    });
  });

  describe('getTierFromPriceId', () => {
    it('should return correct tier for price ID', async () => {
      process.env.STRIPE_PRICE_BASIC_MONTHLY = 'price_basic_monthly_123';
      process.env.STRIPE_PRICE_BASIC_ANNUAL = 'price_basic_annual_123';
      process.env.STRIPE_PRICE_PREMIUM_MONTHLY = 'price_premium_monthly_456';
      process.env.STRIPE_PRICE_PREMIUM_ANNUAL = 'price_premium_annual_456';
      
      jest.resetModules();
      const { getTierFromPriceId } = await import('@backend/modules/subscriptions/config/plans.config');
      
      expect(getTierFromPriceId('price_basic_monthly_123')).toBe('basic');
      expect(getTierFromPriceId('price_basic_annual_123')).toBe('basic');
      expect(getTierFromPriceId('price_premium_monthly_456')).toBe('premium');
      expect(getTierFromPriceId('price_premium_annual_456')).toBe('premium');
    });

    it('should return null for unknown price ID', async () => {
      const { getTierFromPriceId } = await import('@backend/modules/subscriptions/config/plans.config');
      expect(getTierFromPriceId('price_unknown')).toBeNull();
    });
  });

  describe('createOrRetrieveCustomer', () => {
    it('should return existing customer if found', async () => {
      const mockCustomerId = 'cus_existing';
      mockCustomersList.mockResolvedValue({
        data: [{ id: mockCustomerId, email: 'test@example.com' }],
      });

      const { createOrRetrieveCustomer } = await import('@lib/stripe/client');
      const customerId = await createOrRetrieveCustomer('test@example.com');
      
      expect(customerId).toBe(mockCustomerId);
      expect(mockCustomersList).toHaveBeenCalledWith({
        email: 'test@example.com',
        limit: 1,
      });
    });

    it('should create new customer if not found', async () => {
      const mockCustomerId = 'cus_new';
      mockCustomersList.mockResolvedValue({ data: [] });
      mockCustomersCreate.mockResolvedValue({ id: mockCustomerId });

      const { createOrRetrieveCustomer } = await import('@lib/stripe/client');
      const customerId = await createOrRetrieveCustomer('new@example.com', { userId: 'user_123' });
      
      expect(customerId).toBe(mockCustomerId);
      expect(mockCustomersCreate).toHaveBeenCalledWith({
        email: 'new@example.com',
        metadata: { userId: 'user_123' },
      });
    });
  });

  describe('validatePriceId', () => {
    it('should return valid for active recurring price', async () => {
      mockPricesRetrieve.mockResolvedValue({
        id: 'price_test',
        object: 'price',
        active: true,
        currency: 'usd',
        unit_amount: 599,
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
      } as Stripe.Price);

      const { validatePriceId } = await import('@lib/stripe/client');
      const result = await validatePriceId('price_test');
      
      expect(result).toEqual({ valid: true });
      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_test');
    });

    it('should return invalid for inactive price', async () => {
      mockPricesRetrieve.mockResolvedValue({
        id: 'price_test',
        object: 'price',
        active: false,
        currency: 'usd',
        unit_amount: 599,
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
      } as Stripe.Price);

      const { validatePriceId } = await import('@lib/stripe/client');
      const result = await validatePriceId('price_test');
      
      expect(result).toEqual({
        valid: false,
        error: 'Price ID price_test is not active',
      });
    });

    it('should return invalid for non-recurring price', async () => {
      mockPricesRetrieve.mockResolvedValue({
        id: 'price_test',
        object: 'price',
        active: true,
        currency: 'usd',
        unit_amount: 599,
        recurring: null,
      } as Stripe.Price);

      const { validatePriceId } = await import('@lib/stripe/client');
      const result = await validatePriceId('price_test');
      
      expect(result).toEqual({
        valid: false,
        error: 'Price ID price_test is not a recurring subscription price',
      });
    });

    it('should return invalid if price not found', async () => {
      mockPricesRetrieve.mockRejectedValue(new Error('No such price'));

      const { validatePriceId } = await import('@lib/stripe/client');
      const result = await validatePriceId('price_invalid');
      
      expect(result).toEqual({
        valid: false,
        error: 'Price ID price_invalid not found: No such price',
      });
    });

    it('should return invalid if Stripe is not configured', async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      jest.resetModules();

      const { validatePriceId } = await import('@lib/stripe/client');
      const result = await validatePriceId('price_test');
      
      expect(result).toEqual({
        valid: false,
        error: 'Stripe is not configured',
      });

      // Restore for other tests
      if (originalKey) {
        process.env.STRIPE_SECRET_KEY = originalKey;
      }
      jest.resetModules();
    });
  });

  describe('createCheckoutSession', () => {
    it('should create checkout session with correct parameters', async () => {
      const mockSessionId = 'cs_test_123';
      const mockUrl = 'https://checkout.stripe.com/test';
      
      // Mock price validation - price exists and is active
      mockPricesRetrieve.mockResolvedValue({
        id: 'price_basic',
        object: 'price',
        active: true,
        currency: 'usd',
        unit_amount: 599,
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
      } as Stripe.Price);
      
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: mockSessionId,
        url: mockUrl,
      });

      const { createCheckoutSession } = await import('@lib/stripe/client');
      const result = await createCheckoutSession(
        'cus_123',
        'price_basic',
        'https://example.com/success',
        'https://example.com/cancel'
      );
      
      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_basic');
      expect(result).toEqual({
        sessionId: mockSessionId,
        url: mockUrl,
      });
    });

    it('should include trial period if provided', async () => {
      // Mock price validation - price exists and is active
      mockPricesRetrieve.mockResolvedValue({
        id: 'price_basic',
        object: 'price',
        active: true,
        currency: 'usd',
        unit_amount: 599,
        recurring: {
          interval: 'month',
          interval_count: 1,
        },
      } as Stripe.Price);
      
      mockCheckoutSessionsCreate.mockResolvedValue({
        id: 'cs_test',
        url: 'https://checkout.stripe.com/test',
      });

      const { createCheckoutSession } = await import('@lib/stripe/client');
      await createCheckoutSession(
        'cus_123',
        'price_basic',
        'https://example.com/success',
        'https://example.com/cancel',
        7,
        undefined
      );
      
      expect(mockPricesRetrieve).toHaveBeenCalledWith('price_basic');
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: expect.objectContaining({
            trial_period_days: 7,
            metadata: {},
          }),
        }),
        expect.any(Object)
      );
    });
  });

  describe('constructWebhookEvent', () => {
    it('should construct webhook event with valid signature', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        object: 'event',
        api_version: '2023-10-16',
        created: Date.now(),
        data: { object: {} },
        livemode: false,
        pending_webhooks: 0,
        request: null,
      } as Stripe.Event;
      mockWebhooksConstructEvent.mockReturnValue(mockEvent);

      const { constructWebhookEvent } = await import('@lib/stripe/client');
      const event = constructWebhookEvent(
        'raw_body',
        'signature',
        'whsec_secret'
      );
      
      expect(event).toEqual(mockEvent);
    });

    it('should return null for invalid signature', async () => {
      mockWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const { constructWebhookEvent } = await import('@lib/stripe/client');
      const event = constructWebhookEvent(
        'raw_body',
        'invalid_signature',
        'whsec_secret'
      );
      
      expect(event).toBeNull();
    });
  });
});
