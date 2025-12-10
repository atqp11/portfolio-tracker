/**
 * Admin Zod Schemas Tests
 *
 * Tests for Zod validation schemas used in admin controller
 */

import {
  getUsersInputSchema,
  getUserByIdInputSchema,
  getWebhookLogsInputSchema,
  billingOverviewSchema,
  userDetailsSchema,
  getUsersResultSchema,
} from '@backend/modules/admin/zod/admin.schemas';
import { ZodError } from 'zod';

describe('Admin Zod Schemas', () => {
  describe('getUsersInputSchema', () => {
    it('should accept valid input with all fields', () => {
      const input = {
        email: 'user@example.com',
        tier: 'basic',
        status: 'active',
        isActive: true,
      };

      const result = getUsersInputSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept partial input', () => {
      const input = { tier: 'premium' };
      const result = getUsersInputSchema.parse(input);
      expect(result).toEqual(input);
    });

    it('should accept undefined', () => {
      const result = getUsersInputSchema.parse(undefined);
      expect(result).toBeUndefined();
    });

    it('should reject invalid tier', () => {
      const input = { tier: 'invalid-tier' };
      expect(() => getUsersInputSchema.parse(input)).toThrow(ZodError);
    });

    it('should accept valid tiers', () => {
      expect(() =>
        getUsersInputSchema.parse({ tier: 'free' })
      ).not.toThrow();
      expect(() =>
        getUsersInputSchema.parse({ tier: 'basic' })
      ).not.toThrow();
      expect(() =>
        getUsersInputSchema.parse({ tier: 'premium' })
      ).not.toThrow();
    });

    it('should reject non-boolean isActive', () => {
      const input = { isActive: 'true' as any };
      expect(() => getUsersInputSchema.parse(input)).toThrow(ZodError);
    });
  });

  describe('getUserByIdInputSchema', () => {
    it('should accept valid UUID', () => {
      const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const result = getUserByIdInputSchema.parse({ userId: validUUID });
      expect(result.userId).toBe(validUUID);
    });

    it('should reject invalid UUID format', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345',
        'a0eebc99-9c0b-4ef8-bb6d', // Too short
        'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', // Invalid character
        '',
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(() =>
          getUserByIdInputSchema.parse({ userId: uuid })
        ).toThrow(ZodError);
      });
    });

    it('should require userId field', () => {
      expect(() => getUserByIdInputSchema.parse({})).toThrow(ZodError);
    });
  });

  describe('getWebhookLogsInputSchema', () => {
    it('should accept valid limit', () => {
      const result = getWebhookLogsInputSchema.parse({ limit: 50 });
      expect(result.limit).toBe(50);
    });

    it('should use default limit of 100', () => {
      const result = getWebhookLogsInputSchema.parse({});
      expect(result.limit).toBe(100);
    });

    it('should reject negative limit', () => {
      expect(() =>
        getWebhookLogsInputSchema.parse({ limit: -10 })
      ).toThrow(ZodError);
    });

    it('should reject zero limit', () => {
      expect(() =>
        getWebhookLogsInputSchema.parse({ limit: 0 })
      ).toThrow(ZodError);
    });

    it('should reject limit exceeding 1000', () => {
      expect(() =>
        getWebhookLogsInputSchema.parse({ limit: 1001 })
      ).toThrow(ZodError);
    });

    it('should accept max limit of 1000', () => {
      const result = getWebhookLogsInputSchema.parse({ limit: 1000 });
      expect(result.limit).toBe(1000);
    });

    it('should reject non-integer limit', () => {
      expect(() =>
        getWebhookLogsInputSchema.parse({ limit: 10.5 })
      ).toThrow(ZodError);
    });

    it('should reject string limit', () => {
      expect(() =>
        getWebhookLogsInputSchema.parse({ limit: '50' as any })
      ).toThrow(ZodError);
    });
  });

  describe('billingOverviewSchema', () => {
    it('should accept valid billing overview', () => {
      const validOverview = {
        userStats: {
          totalUsers: 100,
          newUsers: 10,
          inactiveUsers: 5,
        },
        subscriptionStats: {
          activeSubscriptions: 50,
          tierBreakdown: {
            free: 30,
            basic: 40,
            premium: 30,
          },
        },
        mrr: 50000,
        churn: {
          last30Days: 5,
          last90Days: 15,
        },
        upcomingInvoices: {
          count: 10,
          totalAmount: 10000,
        },
        stripeConfigured: true,
      };

      const result = billingOverviewSchema.parse(validOverview);
      expect(result).toEqual(validOverview);
    });

    it('should reject missing required fields', () => {
      const incomplete = {
        userStats: {
          totalUsers: 100,
        },
      };

      expect(() => billingOverviewSchema.parse(incomplete)).toThrow(ZodError);
    });

    it('should reject non-numeric values in numeric fields', () => {
      const invalidOverview = {
        userStats: {
          totalUsers: '100', // Should be number
          newUsers: 10,
          inactiveUsers: 5,
        },
        subscriptionStats: {
          activeSubscriptions: 50,
          tierBreakdown: { free: 0, basic: 0, premium: 0 },
        },
        mrr: 0,
        churn: { last30Days: 0, last90Days: 0 },
        upcomingInvoices: { count: 0, totalAmount: 0 },
        stripeConfigured: true,
      };

      expect(() => billingOverviewSchema.parse(invalidOverview)).toThrow(
        ZodError
      );
    });

    it('should reject non-boolean stripeConfigured', () => {
      const invalidOverview = {
        userStats: { totalUsers: 0, newUsers: 0, inactiveUsers: 0 },
        subscriptionStats: {
          activeSubscriptions: 0,
          tierBreakdown: { free: 0, basic: 0, premium: 0 },
        },
        mrr: 0,
        churn: { last30Days: 0, last90Days: 0 },
        upcomingInvoices: { count: 0, totalAmount: 0 },
        stripeConfigured: 'yes', // Should be boolean
      };

      expect(() => billingOverviewSchema.parse(invalidOverview)).toThrow(
        ZodError
      );
    });
  });

  describe('userDetailsSchema', () => {
    it('should accept valid user details', () => {
      const validUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
        tier: 'premium',
        is_admin: true,
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        trial_end: '2024-02-01T00:00:00Z',
        updated_at: '2024-01-15T00:00:00Z',
      };

      const result = userDetailsSchema.parse(validUser);
      expect(result).toEqual(validUser);
    });

    it('should accept null values for nullable fields', () => {
      const userWithNulls = {
        id: 'user-123',
        email: 'user@example.com',
        name: null,
        tier: null,
        is_admin: null,
        is_active: null,
        created_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: null,
        trial_end: null,
        updated_at: null,
      };

      const result = userDetailsSchema.parse(userWithNulls);
      expect(result).toEqual(userWithNulls);
    });

    it('should reject invalid email format', () => {
      const invalidUser = {
        id: 'user-123',
        email: 'not-an-email',
        name: 'John',
        tier: null,
        is_admin: null,
        is_active: null,
        created_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: null,
        trial_end: null,
        updated_at: null,
      };

      expect(() => userDetailsSchema.parse(invalidUser)).toThrow(ZodError);
    });

    it('should require id and email fields', () => {
      const incomplete = {
        name: 'John',
      };

      expect(() => userDetailsSchema.parse(incomplete)).toThrow(ZodError);
    });
  });

  describe('getUsersResultSchema', () => {
    it('should accept valid result with users array', () => {
      const validResult = {
        users: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'User One',
            tier: 'free',
            is_admin: false,
            is_active: true,
            created_at: '2024-01-01',
            stripe_customer_id: null,
            stripe_subscription_id: null,
            subscription_status: null,
            trial_end: null,
            updated_at: null,
          },
        ],
        total: 1,
      };

      const result = getUsersResultSchema.parse(validResult);
      expect(result).toEqual(validResult);
    });

    it('should accept empty users array', () => {
      const emptyResult = {
        users: [],
        total: 0,
      };

      const result = getUsersResultSchema.parse(emptyResult);
      expect(result).toEqual(emptyResult);
    });

    it('should reject missing total field', () => {
      const incomplete = {
        users: [],
      };

      expect(() => getUsersResultSchema.parse(incomplete)).toThrow(ZodError);
    });

    it('should reject non-array users field', () => {
      const invalid = {
        users: 'not-an-array',
        total: 0,
      };

      expect(() => getUsersResultSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should validate each user in array', () => {
      const invalidResult = {
        users: [
          {
            id: 'user-1',
            email: 'invalid-email-format', // Invalid email
            name: 'User',
            tier: null,
            is_admin: null,
            is_active: null,
            created_at: null,
            stripe_customer_id: null,
            stripe_subscription_id: null,
            subscription_status: null,
            trial_end: null,
            updated_at: null,
          },
        ],
        total: 1,
      };

      expect(() => getUsersResultSchema.parse(invalidResult)).toThrow(ZodError);
    });
  });

  describe('refundStatusSchema', () => {
    it('should accept valid refund status with all fields', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const validStatus = {
        hasPendingRefunds: true,
        totalPendingAmount: 1500,
        currency: 'usd',
        refunds: [
          {
            id: 'ref_123',
            amount: 1000,
            status: 'pending',
            reason: 'requested_by_customer',
            created: 1234567890,
            chargeId: 'ch_123',
            failureReason: null,
          },
          {
            id: 'ref_456',
            amount: 500,
            status: 'succeeded',
            reason: null,
            created: 1234567800,
            chargeId: 'ch_456',
            failureReason: null,
          },
        ],
        lastPayment: {
          amount: 2999,
          currency: 'usd',
          date: 1234567890,
          chargeId: 'ch_789',
        },
      };

      const result = refundStatusSchema.parse(validStatus);
      expect(result).toEqual(validStatus);
    });

    it('should accept null lastPayment', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const validStatus = {
        hasPendingRefunds: false,
        totalPendingAmount: 0,
        currency: 'usd',
        refunds: [],
        lastPayment: null,
      };

      const result = refundStatusSchema.parse(validStatus);
      expect(result).toEqual(validStatus);
      expect(result.lastPayment).toBeNull();
    });

    it('should accept empty refunds array', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const validStatus = {
        hasPendingRefunds: false,
        totalPendingAmount: 0,
        currency: 'eur',
        refunds: [],
        lastPayment: {
          amount: 1999,
          currency: 'eur',
          date: 1234567890,
          chargeId: 'ch_test',
        },
      };

      const result = refundStatusSchema.parse(validStatus);
      expect(result.refunds).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const incomplete = {
        hasPendingRefunds: true,
        // Missing totalPendingAmount
        currency: 'usd',
        refunds: [],
      };

      expect(() => refundStatusSchema.parse(incomplete)).toThrow(ZodError);
    });

    it('should reject invalid refund structure', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const invalid = {
        hasPendingRefunds: true,
        totalPendingAmount: 1000,
        currency: 'usd',
        refunds: [
          {
            id: 'ref_123',
            amount: 1000,
            // Missing status
            reason: null,
            created: 1234567890,
          },
        ],
        lastPayment: null,
      };

      expect(() => refundStatusSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject non-numeric amounts', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const invalid = {
        hasPendingRefunds: true,
        totalPendingAmount: '1000' as any, // String instead of number
        currency: 'usd',
        refunds: [],
        lastPayment: null,
      };

      expect(() => refundStatusSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should reject invalid lastPayment structure', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const invalid = {
        hasPendingRefunds: true,
        totalPendingAmount: 1000,
        currency: 'usd',
        refunds: [],
        lastPayment: {
          amount: 2999,
          // Missing currency
          date: 1234567890,
        },
      };

      expect(() => refundStatusSchema.parse(invalid)).toThrow(ZodError);
    });

    it('should accept various currency codes', () => {
      const { refundStatusSchema } = require('@backend/modules/admin/dto/admin.dto');
      
      const currencies = ['usd', 'eur', 'gbp', 'jpy', 'cad'];
      
      currencies.forEach(currency => {
        const validStatus = {
          hasPendingRefunds: false,
          totalPendingAmount: 0,
          currency,
          refunds: [],
          lastPayment: null,
        };

        expect(() => refundStatusSchema.parse(validStatus)).not.toThrow();
      });
    });
  });
});
