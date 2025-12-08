/**
 * Billing Controller Tests
 * 
 * Tests for billing controller HTTP handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { billingController } from '@backend/modules/billing/billing.controller';
import { billingService } from '@backend/modules/billing/service/billing.service';
import type { SubscriptionData } from '@lib/types/billing';
import type Stripe from 'stripe';
import type { TierName } from '@lib/tiers/config';

interface BillingAuthContext {
  auth: {
    userId: string;
    userTier: TierName;
    profile: any;
  };
}

jest.mock('@backend/modules/billing/service/billing.service');

const mockBillingService = billingService as jest.Mocked<typeof billingService>;

describe('BillingController', () => {
  const mockUserId = 'user-123';
  const mockAuthContext: BillingAuthContext = {
    auth: {
      userId: mockUserId,
      userTier: 'free' as TierName,
      profile: {
        id: mockUserId,
        email: 'user@example.com',
        tier: 'free',
      },
    },
  };

  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/billing/subscription');
  });

  describe('getSubscription', () => {
    it('should return subscription data with 200 status', async () => {
      const mockSubscriptionData: SubscriptionData = {
        hasSubscription: true,
        tier: 'premium',
        subscriptionStatus: 'active',
        currentPeriodStart: '2025-01-01T00:00:00Z',
        currentPeriodEnd: '2025-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        subscription: {
          id: 'sub_123',
          status: 'active',
          current_period_start: 1704067200,
          current_period_end: 1706745600,
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
        },
      };

      mockBillingService.getSubscriptionInfo.mockResolvedValue(mockSubscriptionData);

      const response = await billingController.getSubscription(mockRequest, mockAuthContext);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockSubscriptionData);
      expect(responseData.meta).toBeDefined();
      expect(responseData.meta.timestamp).toBeDefined();

      expect(mockBillingService.getSubscriptionInfo).toHaveBeenCalledWith(mockUserId);
    });

    it('should return data for user without subscription', async () => {
      const mockSubscriptionData: SubscriptionData = {
        hasSubscription: false,
        tier: 'free',
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        subscription: null,
      };

      mockBillingService.getSubscriptionInfo.mockResolvedValue(mockSubscriptionData);

      const response = await billingController.getSubscription(mockRequest, mockAuthContext);

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.data.hasSubscription).toBe(false);
      expect(responseData.data.tier).toBe('free');
      expect(responseData.data.subscription).toBeNull();
    });

    it('should propagate service errors', async () => {
      mockBillingService.getSubscriptionInfo.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(billingController.getSubscription(mockRequest, mockAuthContext))
        .rejects
        .toThrow('Database connection failed');
    });
  });

  describe('getHistory', () => {
    it('should return billing history with 200 status', async () => {
      const mockInvoices = [
        {
          id: 'in_123',
          amount_due: 2999,
          amount_paid: 2999,
          currency: 'usd',
          status: 'paid',
          created: 1672531200,
          hosted_invoice_url: 'https://invoice.stripe.com/i/123',
        },
        {
          id: 'in_456',
          amount_due: 2999,
          amount_paid: 2999,
          currency: 'usd',
          status: 'paid',
          created: 1675209600,
          hosted_invoice_url: 'https://invoice.stripe.com/i/456',
        },
      ] as Stripe.Invoice[];

      mockBillingService.getBillingHistory.mockResolvedValue(mockInvoices);

      const response = await billingController.getHistory(mockRequest, mockAuthContext);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data).toEqual(mockInvoices);
      expect(responseData.meta).toBeDefined();
      expect(responseData.meta.timestamp).toBeDefined();

      expect(mockBillingService.getBillingHistory).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array for user without invoices', async () => {
      mockBillingService.getBillingHistory.mockResolvedValue([]);

      const response = await billingController.getHistory(mockRequest, mockAuthContext);

      expect(response.status).toBe(200);

      const responseData = await response.json();
      expect(responseData.data).toEqual([]);
    });

    it('should propagate service errors', async () => {
      mockBillingService.getBillingHistory.mockRejectedValue(
        new Error('Stripe API error')
      );

      await expect(billingController.getHistory(mockRequest, mockAuthContext))
        .rejects
        .toThrow('Stripe API error');
    });
  });

  describe('Response format validation', () => {
    it('should return responses in SuccessResponse format', async () => {
      const mockSubscriptionData: SubscriptionData = {
        hasSubscription: false,
        tier: 'free',
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        subscription: null,
      };

      mockBillingService.getSubscriptionInfo.mockResolvedValue(mockSubscriptionData);

      const response = await billingController.getSubscription(mockRequest, mockAuthContext);
      const responseData = await response.json();

      // Verify SuccessResponse format
      expect(responseData).toHaveProperty('success');
      expect(responseData).toHaveProperty('data');
      expect(responseData.success).toBe(true);
      expect(responseData.data).toBeDefined();
    });

    it('should set correct content-type header', async () => {
      const mockSubscriptionData: SubscriptionData = {
        hasSubscription: false,
        tier: 'free',
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        subscription: null,
      };

      mockBillingService.getSubscriptionInfo.mockResolvedValue(mockSubscriptionData);

      const response = await billingController.getSubscription(mockRequest, mockAuthContext);

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
