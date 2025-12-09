/**
 * Admin Service Comprehensive Tests
 *
 * Tests for all admin service functions beyond deactivation
 */

import * as adminService from '@backend/modules/admin/service/admin.service';
import * as adminDao from '@backend/modules/admin/dao/admin.dao';
import { getStripe } from '@lib/stripe/client';
import { getCacheAdapter } from '@lib/cache/adapter';

jest.mock('@backend/modules/admin/dao/admin.dao');
jest.mock('@lib/cache/adapter', () => ({
  getCacheAdapter: jest.fn(),
}));
jest.mock('@lib/stripe/client', () => {
  const mockStripe = {
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    invoices: {
      list: jest.fn(),
    },
    paymentIntents: {
      list: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
  };
  return {
    getStripe: jest.fn(() => mockStripe),
  };
});

const mockAdminDao = adminDao as jest.Mocked<typeof adminDao>;
const mockGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;
const mockGetCacheAdapter = getCacheAdapter as jest.MockedFunction<typeof getCacheAdapter>;

describe('Admin Service - Comprehensive', () => {
  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    tier: 'basic',
    subscription_tier: 'basic',
    is_admin: false,
    is_active: true,
    stripe_customer_id: 'cus_123',
    stripe_subscription_id: 'sub_123',
    subscription_status: 'active',
    // Default created_at set to ~40 days ago so tests that measure "new users (<30 days)"
    // can set explicit recently created users and avoid accidental false positives
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    // Reset mocks and implementations between each test to avoid leakage
    jest.resetAllMocks();

    // Restore a fresh mock Stripe instance for each test so tests don't leak mockReturnValue
    const freshMockStripe = {
      subscriptions: {
        retrieve: jest.fn(),
        update: jest.fn(),
        cancel: jest.fn(),
      },
      invoices: {
        list: jest.fn(),
      },
      paymentIntents: {
        list: jest.fn(),
      },
      refunds: {
        create: jest.fn(),
      },
    } as any;

    mockGetStripe.mockReturnValue(freshMockStripe);
  });

  describe('getUsers', () => {
    it('should return users with filters', async () => {
      const mockUsers = [mockUser];
      mockAdminDao.getAllUsers.mockResolvedValue(mockUsers as any);

      const result = await adminService.getUsers({ tier: 'basic' });

      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(1);
      expect(mockAdminDao.getAllUsers).toHaveBeenCalledWith({ tier: 'basic' });
    });
  });

  describe('getUserDetails', () => {
    it('should return user details', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);

      const result = await adminService.getUserDetails('user-1');

      expect(result).toEqual(mockUser);
      expect(mockAdminDao.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return null when user not found', async () => {
      mockAdminDao.getUserById.mockResolvedValue(null);

      const result = await adminService.getUserDetails('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserBillingHistory', () => {
    it('should return invoices from Stripe', async () => {
      const mockInvoices = [
        { id: 'in_1', amount_paid: 600, status: 'paid' },
        { id: 'in_2', amount_paid: 600, status: 'paid' },
      ];

      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.invoices.list.mockResolvedValue({ data: mockInvoices });

      const result = await adminService.getUserBillingHistory('user-1');

      expect(result).toEqual(mockInvoices);
      expect(mockStripeInstance.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 100,
      });
    });

    it('should return empty array when no customer ID', async () => {
      const userWithoutCustomer = { ...mockUser, stripe_customer_id: null };
      mockAdminDao.getUserById.mockResolvedValue(userWithoutCustomer as any);

      const result = await adminService.getUserBillingHistory('user-1');

      expect(result).toEqual([]);
    });

    it('should return empty array when Stripe not configured', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      mockGetStripe.mockReturnValue(null);

      const result = await adminService.getUserBillingHistory('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getUserTransactions', () => {
    it('should return user transactions', async () => {
      const mockTransactions = [
        { id: 'tx1', event_type: 'checkout.session.completed' },
        { id: 'tx2', event_type: 'invoice.payment_succeeded' },
      ];

      mockAdminDao.getUserTransactions.mockResolvedValue(mockTransactions as any);

      const result = await adminService.getUserTransactions('user-1');

      expect(result).toEqual(mockTransactions);
      expect(mockAdminDao.getUserTransactions).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getStripeSubscriptionStatus', () => {
    it('should return subscription status from Stripe', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
      };

      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);

      const result = await adminService.getStripeSubscriptionStatus('user-1');

      expect(result.status).toBe('active');
      expect(result.lastSync).toBe(mockUser.updated_at);
    });

    it('should return null when no subscription', async () => {
      const userWithoutSubscription = { ...mockUser, stripe_subscription_id: null };
      mockAdminDao.getUserById.mockResolvedValue(userWithoutSubscription as any);

      const result = await adminService.getStripeSubscriptionStatus('user-1');

      expect(result.status).toBeNull();
      expect(result.lastSync).toBeNull();
    });

    it('should handle Stripe errors gracefully', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.retrieve.mockRejectedValue(new Error('Stripe error'));

      const result = await adminService.getStripeSubscriptionStatus('user-1');

      expect(result.status).toBeNull();
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user and log actions', async () => {
      const deactivatedUser = { ...mockUser, is_active: false };
      const reactivatedUser = { ...mockUser, is_active: true };

      mockAdminDao.getUserById.mockResolvedValue(deactivatedUser as any);
      mockAdminDao.reactivateUser.mockResolvedValue(reactivatedUser as any);
      mockAdminDao.logReactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.reactivateUser({
        userId: 'user-1',
        adminId: 'admin-1',
      });

      expect(result.is_active).toBe(true);
      expect(mockAdminDao.reactivateUser).toHaveBeenCalledWith('user-1');
      expect(mockAdminDao.logReactivation).toHaveBeenCalledWith('user-1', 'admin-1');
      expect(mockAdminDao.logAdminAction).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      mockAdminDao.getUserById.mockResolvedValue(null);

      await expect(
        adminService.reactivateUser({
          userId: 'nonexistent',
          adminId: 'admin-1',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('changeUserTier', () => {
    it('should change user tier and log action', async () => {
      const updatedUser = { ...mockUser, tier: 'premium', subscription_tier: 'premium' };

      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      mockAdminDao.changeUserTier.mockResolvedValue(updatedUser as any);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.changeUserTier({
        userId: 'user-1',
        adminId: 'admin-1',
        newTier: 'premium',
      });

      expect(result.tier).toBe('premium');
      expect(mockAdminDao.changeUserTier).toHaveBeenCalledWith('user-1', 'premium');
      expect(mockAdminDao.logAdminAction).toHaveBeenCalled();
    });

    it('should throw error for invalid tier', async () => {
      await expect(
        adminService.changeUserTier({
          userId: 'user-1',
          adminId: 'admin-1',
          newTier: 'invalid',
        })
      ).rejects.toThrow('Invalid tier: invalid');
    });

    it('should throw error when user not found', async () => {
      mockAdminDao.getUserById.mockResolvedValue(null);

      await expect(
        adminService.changeUserTier({
          userId: 'nonexistent',
          adminId: 'admin-1',
          newTier: 'premium',
        })
      ).rejects.toThrow('User not found');
    });
  });

  describe('cancelUserSubscription', () => {
    it('should cancel subscription at period end', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.update.mockResolvedValue({});
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.cancelUserSubscription('user-1', 'admin-1', false);

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
      expect(mockAdminDao.logAdminAction).toHaveBeenCalled();
    });

    it('should cancel subscription immediately', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.cancel.mockResolvedValue({});
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.cancelUserSubscription('user-1', 'admin-1', true);

      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should throw error when user has no subscription', async () => {
      const userWithoutSubscription = { ...mockUser, stripe_subscription_id: null };
      mockAdminDao.getUserById.mockResolvedValue(userWithoutSubscription as any);

      await expect(
        adminService.cancelUserSubscription('user-1', 'admin-1')
      ).rejects.toThrow('User has no active subscription');
    });

    it('should throw error when Stripe not configured', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      mockGetStripe.mockReturnValue(null);

      await expect(
        adminService.cancelUserSubscription('user-1', 'admin-1')
      ).rejects.toThrow('Stripe is not configured');
    });
  });

  describe('refundUser', () => {
    it('should refund last payment', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 600,
      };

      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.paymentIntents.list.mockResolvedValue({
        data: [mockPaymentIntent],
      });
      mockStripeInstance.refunds.create.mockResolvedValue({
        id: 're_123',
        amount: 600,
      });
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.refundUser({
        userId: 'user-1',
        adminId: 'admin-1',
      });

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 600,
        reason: 'requested_by_customer',
        metadata: expect.objectContaining({
          admin_id: 'admin-1',
        }),
      });
    });

    it('should refund specific amount', async () => {
      const mockPaymentIntent = {
        id: 'pi_123',
        amount: 600,
      };

      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.paymentIntents.list.mockResolvedValue({
        data: [mockPaymentIntent],
      });
      mockStripeInstance.refunds.create.mockResolvedValue({
        id: 're_123',
        amount: 300,
      });
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.refundUser({
        userId: 'user-1',
        adminId: 'admin-1',
        amount: 300,
        reason: 'Partial refund',
      });

      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 300,
        })
      );
    });

    it('should throw error when no payment found', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.paymentIntents.list.mockResolvedValue({ data: [] });

      await expect(
        adminService.refundUser({
          userId: 'user-1',
          adminId: 'admin-1',
        })
      ).rejects.toThrow('No payment found to refund');
    });

    it('should throw error when user has no customer', async () => {
      const userWithoutCustomer = { ...mockUser, stripe_customer_id: null };
      mockAdminDao.getUserById.mockResolvedValue(userWithoutCustomer as any);

      await expect(
        adminService.refundUser({
          userId: 'user-1',
          adminId: 'admin-1',
        })
      ).rejects.toThrow('User has no Stripe customer');
    });
  });

  describe('extendTrial', () => {
    it('should extend trial period', async () => {
      const userWithTrial = {
        ...mockUser,
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const newTrialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const updatedUser = { ...userWithTrial, trial_ends_at: newTrialEnd };

      mockAdminDao.getUserById.mockResolvedValue(userWithTrial as any);
      mockAdminDao.updateUser.mockResolvedValue(updatedUser as any);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.extendTrial('user-1', 'admin-1', 7);

      expect(result.trial_ends_at).toBe(newTrialEnd);
      expect(mockAdminDao.updateUser).toHaveBeenCalled();
      expect(mockAdminDao.logAdminAction).toHaveBeenCalled();
    });

    it('should handle user without trial', async () => {
      const userWithoutTrial = { ...mockUser, trial_ends_at: null };
      const newTrialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const updatedUser = { ...userWithoutTrial, trial_ends_at: newTrialEnd };

      mockAdminDao.getUserById.mockResolvedValue(userWithoutTrial as any);
      mockAdminDao.updateUser.mockResolvedValue(updatedUser as any);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.extendTrial('user-1', 'admin-1', 7);

      expect(mockAdminDao.updateUser).toHaveBeenCalled();
    });
  });

  describe('syncUserSubscription', () => {
    it('should sync subscription from Stripe', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
        cancel_at_period_end: false,
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      };

      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockAdminDao.updateUser.mockResolvedValue({
        ...mockUser,
        subscription_status: 'active',
      } as any);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.syncUserSubscription('user-1', 'admin-1');

      expect(result.subscription_status).toBe('active');
      expect(mockStripeInstance.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
      expect(mockAdminDao.updateUser).toHaveBeenCalled();
    });

    it('should throw error when user has no subscription', async () => {
      const userWithoutSubscription = { ...mockUser, stripe_subscription_id: null };
      mockAdminDao.getUserById.mockResolvedValue(userWithoutSubscription as any);

      await expect(
        adminService.syncUserSubscription('user-1', 'admin-1')
      ).rejects.toThrow('User has no subscription to sync');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const now = new Date();
      const oldUser = {
        ...mockUser,
        id: 'user-old',
        created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const newUser = {
        ...mockUser,
        id: 'user-new',
        created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      };
      const inactiveUser = {
        ...mockUser,
        id: 'user-inactive',
        is_active: false,
      };

      mockAdminDao.getAllUsers.mockResolvedValue([
        oldUser,
        newUser,
        inactiveUser,
        mockUser,
      ] as any);

      const stats = await adminService.getUserStats();

      expect(stats.totalUsers).toBe(4);
      expect(stats.newUsers).toBe(1); // Only newUser is within 30 days
      expect(stats.inactiveUsers).toBe(1);
    });
  });

  describe('getBillingOverview', () => {
    it('should return billing overview with Stripe data', async () => {
      const allUsers = [
        { ...mockUser, tier: 'free' },
        { ...mockUser, id: 'user2', tier: 'basic', subscription_status: 'active' },
        { ...mockUser, id: 'user3', tier: 'premium', subscription_status: 'active' },
      ];

      mockAdminDao.getAllUsers.mockResolvedValue(allUsers as any);
      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.invoices.list.mockResolvedValue({
        data: [{ amount_due: 600 }],
      });

      // Mock calculateMRR and getChurnEvents
      const calculateMRRSpy = jest.spyOn(adminService, 'calculateMRR').mockResolvedValue(2199);
      const getChurnEventsSpy = jest.spyOn(adminService, 'getChurnEvents').mockResolvedValue(2);

      const overview = await adminService.getBillingOverview();

      expect(overview.userStats.totalUsers).toBe(3);
      expect(overview.subscriptionStats.tierBreakdown.free).toBe(1);
      expect(overview.subscriptionStats.tierBreakdown.basic).toBe(1);
      expect(overview.subscriptionStats.tierBreakdown.premium).toBe(1);
      expect(overview.mrr).toBe(2199);
      expect(overview.stripeConfigured).toBe(true);

      // Restore spies so they don't interfere with other tests
      calculateMRRSpy.mockRestore();
      getChurnEventsSpy.mockRestore();
    });

    it('should return billing overview without Stripe when not configured', async () => {
      const allUsers = [mockUser];
      mockAdminDao.getAllUsers.mockResolvedValue(allUsers as any);
      mockGetStripe.mockReturnValue(null);

      const overview = await adminService.getBillingOverview();

      expect(overview.mrr).toBe(0);
      expect(overview.stripeConfigured).toBe(false);
    });
  });

  describe('calculateMRR', () => {
    it('should calculate MRR from active subscriptions', async () => {
      const activeUsers = [
        { ...mockUser, id: 'user1', tier: 'basic', subscription_status: 'active', stripe_subscription_id: 'sub_1' },
        { ...mockUser, id: 'user2', tier: 'premium', subscription_status: 'active', stripe_subscription_id: 'sub_2' },
      ];

      mockAdminDao.getAllUsers.mockResolvedValue(activeUsers as any);
      const mockStripeInstance = mockGetStripe() as any;

      // Mock subscription and price retrieval
      mockStripeInstance.subscriptions.retrieve
        .mockResolvedValueOnce({
          items: { data: [{ price: { id: 'price_basic' } }] },
        })
        .mockResolvedValueOnce({
          items: { data: [{ price: { id: 'price_premium' } }] },
        });

      mockStripeInstance.prices = {
        retrieve: jest.fn()
          .mockResolvedValueOnce({ unit_amount: 600, recurring: { interval: 'month' } })
          .mockResolvedValueOnce({ unit_amount: 1599, recurring: { interval: 'month' } }),
      };

      // Debugging: inspect mocks state
      console.log('DEBUG - mockGetStripe():', mockGetStripe());
      console.log('DEBUG - mockAdminDao.getAllUsers implementation present?:', typeof mockAdminDao.getAllUsers);
      console.log('DEBUG - adminService.calculateMRR typeof:', typeof adminService.calculateMRR);
      console.log('DEBUG - adminService.calculateMRR mock prop:', (adminService.calculateMRR as any).mock);
      const mrr = await adminService.calculateMRR();

      expect(mrr).toBe(2199); // 600 + 1599
    });

    it('should return 0 when Stripe not configured', async () => {
      mockAdminDao.getAllUsers.mockResolvedValue([mockUser] as any);
      mockGetStripe.mockReturnValue(null);

      const mrr = await adminService.calculateMRR();

      expect(mrr).toBe(0);
    });
  });

  describe('getChurnEvents', () => {
    it('should return churn count for period', async () => {
      // This function uses createAdminClient directly, so we need to mock it
      const { createAdminClient } = require('@lib/supabase/admin');
      const mockSupabase = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [{ id: 'tx1' }, { id: 'tx2' }],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      jest.spyOn(require('@lib/supabase/admin'), 'createAdminClient').mockReturnValue(mockSupabase);

      const churn = await adminService.getChurnEvents(30);

      expect(churn).toBe(2);
    });
  });

  describe('clearCache', () => {
    it('should clear cache and return stats', async () => {
      // Mock the cache adapter
      const mockCacheAdapter = {
        getStats: jest.fn()
          .mockResolvedValueOnce({
            type: 'memory' as const,
            size: 100,
            hits: 50,
            misses: 10,
          })
          .mockResolvedValueOnce({
            type: 'memory' as const,
            size: 0,
            hits: 50,
            misses: 10,
          }),
        clear: jest.fn().mockResolvedValue(undefined),
      };

      mockGetCacheAdapter.mockReturnValue(mockCacheAdapter as any);

      const result = await adminService.clearCache();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Redis cache cleared successfully');
      expect(result.stats).toBeDefined();
      expect(result.stats?.before).toEqual({
        type: 'memory',
        size: 100,
        hits: 50,
        misses: 10,
      });
      expect(result.stats?.after).toEqual({
        type: 'memory',
        size: 0,
        hits: 50,
        misses: 10,
      });
      expect(mockCacheAdapter.getStats).toHaveBeenCalledTimes(2);
      expect(mockCacheAdapter.clear).toHaveBeenCalledTimes(1);
      expect(result.timestamp).toBeDefined();
    });

    it('should handle cache errors gracefully', async () => {
      const mockCacheAdapter = {
        getStats: jest.fn().mockRejectedValue(new Error('Cache error')),
        clear: jest.fn(),
      };

      mockGetCacheAdapter.mockReturnValue(mockCacheAdapter as any);

      await expect(adminService.clearCache()).rejects.toThrow('Cache error');
    });
  });
});
