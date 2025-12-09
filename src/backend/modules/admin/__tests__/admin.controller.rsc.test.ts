/**
 * Admin Controller RSC Methods Tests
 *
 * Tests for RSC page methods that return DTOs directly (no NextResponse)
 * These methods validate inputs/outputs with Zod schemas
 */

import { AdminController } from '@backend/modules/admin/admin.controller';
import { usersService } from '@backend/modules/admin/service/users.service';
import * as adminService from '@backend/modules/admin/service/admin.service';
import type { AdminUserDto } from '@backend/modules/admin/dto/admin.dto';
import { ZodError } from 'zod';

jest.mock('@backend/modules/admin/service/users.service');
jest.mock('@backend/modules/admin/service/admin.service');
jest.mock('@backend/modules/admin/dao/admin.dao');
jest.mock('@backend/modules/admin/service/retry.service');

const mockUsersService = usersService as jest.Mocked<typeof usersService>;
const mockAdminService = adminService as jest.Mocked<typeof adminService>;

// Import mocked modules for dynamic imports
import * as adminDao from '@backend/modules/admin/dao/admin.dao';
import * as retryService from '@backend/modules/admin/service/retry.service';

const mockAdminDao = adminDao as jest.Mocked<typeof adminDao>;
const mockRetryService = retryService as jest.Mocked<typeof retryService>;

describe('Admin Controller - RSC Methods', () => {
  let controller: AdminController;

  beforeEach(() => {
    controller = new AdminController();
    jest.clearAllMocks();
  });

  describe('getAllUsersData', () => {
    it('should return all users with usage data', async () => {
      const mockUsers: AdminUserDto[] = [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          tier: 'free',
          isAdmin: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          stripeCustomerId: null,
          subscriptionStatus: null,
          usage: {
            daily: { chatQueries: 5, portfolioAnalysis: 2, secFilings: 1 },
            monthly: { chatQueries: 50, portfolioAnalysis: 20, secFilings: 10 },
          },
        },
      ];

      mockUsersService.fetchAllUsersWithUsage.mockResolvedValue(mockUsers);

      const result = await controller.getAllUsersData();

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.fetchAllUsersWithUsage).toHaveBeenCalledTimes(1);
    });

    it('should validate output against Zod schema', async () => {
      const invalidUser = {
        id: 'user-1',
        email: 'invalid-email', // Invalid email
        name: 'User',
        tier: 'free',
      };

      mockUsersService.fetchAllUsersWithUsage.mockResolvedValue([invalidUser] as any);

      await expect(controller.getAllUsersData()).rejects.toThrow(ZodError);
    });

    it('should return empty array when no users exist', async () => {
      mockUsersService.fetchAllUsersWithUsage.mockResolvedValue([]);

      const result = await controller.getAllUsersData();

      expect(result).toEqual([]);
    });
  });

  describe('getBillingOverviewData', () => {
    it('should return billing overview and validate output', async () => {
      const mockOverview = {
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

      mockAdminService.getBillingOverview.mockResolvedValue(mockOverview);

      const result = await controller.getBillingOverviewData();

      expect(result).toEqual(mockOverview);
      expect(mockAdminService.getBillingOverview).toHaveBeenCalledTimes(1);
    });

    it('should throw ZodError for invalid output structure', async () => {
      const invalidOverview = {
        userStats: {
          totalUsers: 'invalid', // Should be number
        },
      };

      mockAdminService.getBillingOverview.mockResolvedValue(invalidOverview as any);

      await expect(controller.getBillingOverviewData()).rejects.toThrow(ZodError);
    });
  });

  describe('getWebhookLogsData', () => {
    it('should return webhook logs with default limit', async () => {
      const mockLogs = [
        { id: 'log-1', eventType: 'customer.created', status: 'completed' },
      ];

      mockAdminService.getWebhookLogs.mockResolvedValue(mockLogs as any);

      const result = await controller.getWebhookLogsData();

      expect(result).toEqual(mockLogs);
      expect(mockAdminService.getWebhookLogs).toHaveBeenCalledWith(100);
    });

    it('should validate input limit parameter', async () => {
      const mockLogs = [{ id: 'log-1' }];
      mockAdminService.getWebhookLogs.mockResolvedValue(mockLogs as any);

      const result = await controller.getWebhookLogsData(50);

      expect(result).toEqual(mockLogs);
      expect(mockAdminService.getWebhookLogs).toHaveBeenCalledWith(50);
    });

    it('should throw ZodError for invalid limit (negative)', async () => {
      await expect(controller.getWebhookLogsData(-10)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for limit exceeding max (1000)', async () => {
      await expect(controller.getWebhookLogsData(2000)).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for non-integer limit', async () => {
      await expect(controller.getWebhookLogsData(10.5)).rejects.toThrow(ZodError);
    });
  });

  describe('getSyncErrorsData', () => {
    it('should return sync errors', async () => {
      const mockErrors = [
        { userId: 'user-1', error: 'Subscription mismatch' },
      ];

      mockAdminService.getSyncErrors.mockResolvedValue(mockErrors as any);

      const result = await controller.getSyncErrorsData();

      expect(result).toEqual(mockErrors);
      expect(mockAdminService.getSyncErrors).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUsersData', () => {
    it('should return users with filters and validate output', async () => {
      const mockResult = {
        users: [
          {
            id: 'user-1',
            email: 'user@example.com',
            name: 'User One',
            tier: 'basic',
            is_admin: false,
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            stripe_customer_id: 'cus_123',
            stripe_subscription_id: 'sub_123',
            subscription_status: 'active',
            trial_end: null,
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
        total: 1,
      };

      mockAdminService.getUsers.mockResolvedValue(mockResult as any);

      const result = await controller.getUsersData({ tier: 'basic' });

      expect(result).toEqual(mockResult);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith({ tier: 'basic' });
    });

    it('should validate input filters', async () => {
      const mockResult = { users: [], total: 0 };
      mockAdminService.getUsers.mockResolvedValue(mockResult as any);

      // Valid tier
      await expect(
        controller.getUsersData({ tier: 'premium' })
      ).resolves.toBeDefined();

      // Invalid tier should throw
      await expect(
        controller.getUsersData({ tier: 'invalid' } as any)
      ).rejects.toThrow(ZodError);
    });

    it('should handle undefined params', async () => {
      const mockResult = { users: [], total: 0 };
      mockAdminService.getUsers.mockResolvedValue(mockResult as any);

      const result = await controller.getUsersData();

      expect(result).toEqual(mockResult);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith({});
    });

    it('should throw ZodError for invalid output', async () => {
      const invalidResult = {
        users: [{ id: 123 }], // id should be string
        total: 'one', // should be number
      };

      mockAdminService.getUsers.mockResolvedValue(invalidResult as any);

      await expect(controller.getUsersData()).rejects.toThrow(ZodError);
    });
  });

  describe('getUserDetailsData', () => {
    it('should return user details for valid UUID', async () => {
      const mockUser = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'user@example.com',
        name: 'User',
        tier: 'basic',
        is_admin: false,
        is_active: true,
        created_at: '2024-01-01',
        stripe_customer_id: 'cus_123',
        stripe_subscription_id: 'sub_123',
        subscription_status: 'active',
        trial_end: null,
        updated_at: '2024-01-01',
      };

      mockAdminService.getUserDetails.mockResolvedValue(mockUser as any);

      const result = await controller.getUserDetailsData(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toEqual(mockUser);
      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
    });

    it('should throw ZodError for invalid UUID format', async () => {
      await expect(
        controller.getUserDetailsData('invalid-uuid')
      ).rejects.toThrow(ZodError);

      expect(mockAdminService.getUserDetails).not.toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      mockAdminService.getUserDetails.mockResolvedValue(null);

      const result = await controller.getUserDetailsData(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toBeNull();
    });

    it('should throw ZodError for empty string', async () => {
      await expect(controller.getUserDetailsData('')).rejects.toThrow(ZodError);
    });
  });

  describe('getUserBillingHistoryData', () => {
    it('should return billing history for valid UUID', async () => {
      const mockHistory = [
        { id: 'inv_1', amount: 1000, status: 'paid' },
      ];

      mockAdminService.getUserBillingHistory.mockResolvedValue(mockHistory as any);

      const result = await controller.getUserBillingHistoryData(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toEqual(mockHistory);
      expect(mockAdminService.getUserBillingHistory).toHaveBeenCalledWith(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
    });

    it('should throw ZodError for invalid UUID', async () => {
      await expect(
        controller.getUserBillingHistoryData('not-a-uuid')
      ).rejects.toThrow(ZodError);

      expect(mockAdminService.getUserBillingHistory).not.toHaveBeenCalled();
    });
  });

  describe('getUserTransactionsData', () => {
    it('should return transactions for valid UUID', async () => {
      const mockTransactions = [
        { id: 'txn_1', type: 'payment', amount: 500 },
      ];

      mockAdminService.getUserTransactions.mockResolvedValue(mockTransactions as any);

      const result = await controller.getUserTransactionsData(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toEqual(mockTransactions);
      expect(mockAdminService.getUserTransactions).toHaveBeenCalledWith(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
    });

    it('should throw ZodError for invalid UUID', async () => {
      await expect(
        controller.getUserTransactionsData('invalid')
      ).rejects.toThrow(ZodError);

      expect(mockAdminService.getUserTransactions).not.toHaveBeenCalled();
    });
  });

  describe('getStripeSubscriptionStatusData', () => {
    it('should return subscription status for valid UUID', async () => {
      const mockStatus = {
        status: 'active',
        lastSync: '2024-01-01T00:00:00Z',
      };

      mockAdminService.getStripeSubscriptionStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStripeSubscriptionStatusData(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toEqual(mockStatus);
      expect(mockAdminService.getStripeSubscriptionStatus).toHaveBeenCalledWith(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );
    });

    it('should throw ZodError for invalid UUID', async () => {
      await expect(
        controller.getStripeSubscriptionStatusData('not-valid')
      ).rejects.toThrow(ZodError);

      expect(mockAdminService.getStripeSubscriptionStatus).not.toHaveBeenCalled();
    });

    it('should handle null status', async () => {
      mockAdminService.getStripeSubscriptionStatus.mockResolvedValue({
        status: null,
        lastSync: null,
      });

      const result = await controller.getStripeSubscriptionStatusData(
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      );

      expect(result).toEqual({ status: null, lastSync: null });
    });
  });

  describe('getUsersPaginated', () => {
    it('should return paginated users with correct metadata', async () => {
      const mockResult = {
        users: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            name: 'User One',
            tier: 'free',
            isAdmin: false,
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            stripeCustomerId: null,
            subscriptionStatus: null,
            usage: {
              daily: { chatQueries: 5, portfolioAnalysis: 2, secFilings: 1 },
              monthly: { chatQueries: 50, portfolioAnalysis: 20, secFilings: 10 },
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 100,
          totalPages: 2,
          hasNext: true,
          hasPrev: false,
        },
      };

      mockUsersService.fetchUsersWithPagination.mockResolvedValue(mockResult as any);

      const result = await controller.getUsersPaginated(1, 50);

      expect(result).toEqual(mockResult);
      expect(mockUsersService.fetchUsersWithPagination).toHaveBeenCalledWith(1, 50);
    });

    it('should use default pagination values', async () => {
      const mockResult = {
        users: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUsersService.fetchUsersWithPagination.mockResolvedValue(mockResult as any);

      const result = await controller.getUsersPaginated();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(mockUsersService.fetchUsersWithPagination).toHaveBeenCalledWith(1, 50);
    });

    it('should validate each user against schema', async () => {
      const mockResult = {
        users: [
          {
            id: 'invalid',
            email: 'not-an-email', // Invalid
            name: 'User',
            tier: 'free',
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockUsersService.fetchUsersWithPagination.mockResolvedValue(mockResult as any);

      await expect(controller.getUsersPaginated(1, 50)).rejects.toThrow(ZodError);
    });
  });

  describe('getWebhookLogsPaginated', () => {
    it('should return paginated webhook logs', async () => {
      const mockResult = {
        logs: [
          {
            id: 'log-1',
            eventId: 'evt_123',
            eventType: 'customer.subscription.created',
            status: 'completed',
            latency: 150,
            retryCount: 0,
            recoveryStatus: 'manual',
            createdAt: '2024-01-01T00:00:00Z',
            processedAt: '2024-01-01T00:00:01Z',
            errorMessage: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          total: 25,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockAdminService.getWebhookLogsPaginated.mockResolvedValue(mockResult as any);

      const result = await controller.getWebhookLogsPaginated(1, 50);

      expect(result).toEqual(mockResult);
      expect(mockAdminService.getWebhookLogsPaginated).toHaveBeenCalledWith(1, 50);
    });

    it('should use default pagination values for webhook logs', async () => {
      const mockResult = {
        logs: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockAdminService.getWebhookLogsPaginated.mockResolvedValue(mockResult as any);

      const result = await controller.getWebhookLogsPaginated();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(50);
      expect(mockAdminService.getWebhookLogsPaginated).toHaveBeenCalledWith(1, 50);
    });
  });

  // ============================================================================
  // RSC SERVER ACTION METHODS TESTS
  // ============================================================================

  describe('syncSubscriptionData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should sync subscription for valid user ID', async () => {
      const mockUser = {
        id: validUserId,
        email: 'user@example.com',
        tier: 'premium',
        is_active: true,
      };

      mockAdminService.syncUserSubscription.mockResolvedValue(mockUser as any);

      const result = await controller.syncSubscriptionData(validUserId, validAdminId);

      expect(result).toEqual(mockUser);
      expect(mockAdminService.syncUserSubscription).toHaveBeenCalledWith(validUserId, validAdminId);
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.syncSubscriptionData('invalid-uuid', validAdminId)
      ).rejects.toThrow(ZodError);

      expect(mockAdminService.syncUserSubscription).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscriptionData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should cancel subscription with default immediately=false', async () => {
      await controller.cancelSubscriptionData(validUserId, validAdminId);

      expect(mockAdminService.cancelUserSubscription).toHaveBeenCalledWith(
        validUserId,
        validAdminId,
        false
      );
    });

    it('should cancel subscription immediately when specified', async () => {
      await controller.cancelSubscriptionData(validUserId, validAdminId, true);

      expect(mockAdminService.cancelUserSubscription).toHaveBeenCalledWith(
        validUserId,
        validAdminId,
        true
      );
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.cancelSubscriptionData('invalid-uuid', validAdminId)
      ).rejects.toThrow(ZodError);
    });
  });

  describe('changeTierData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should change tier for valid inputs', async () => {
      const mockUser = {
        id: validUserId,
        tier: 'premium',
      };

      mockAdminService.changeUserTier.mockResolvedValue(mockUser as any);

      const result = await controller.changeTierData(validUserId, validAdminId, 'premium');

      expect(result).toEqual(mockUser);
      expect(mockAdminService.changeUserTier).toHaveBeenCalledWith({
        userId: validUserId,
        adminId: validAdminId,
        newTier: 'premium',
      });
    });

    it('should throw ZodError for invalid tier', async () => {
      await expect(
        controller.changeTierData(validUserId, validAdminId, 'invalid' as any)
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.changeTierData('invalid-uuid', validAdminId, 'premium')
      ).rejects.toThrow(ZodError);
    });
  });

  describe('extendTrialData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should extend trial for valid inputs', async () => {
      const mockUser = {
        id: validUserId,
        trial_ends_at: '2024-12-31T00:00:00Z',
      };

      mockAdminService.extendTrial.mockResolvedValue(mockUser as any);

      const result = await controller.extendTrialData(validUserId, validAdminId, 30);

      expect(result).toEqual(mockUser);
      expect(mockAdminService.extendTrial).toHaveBeenCalledWith(validUserId, validAdminId, 30);
    });

    it('should throw ZodError for invalid days (too large)', async () => {
      await expect(
        controller.extendTrialData(validUserId, validAdminId, 400)
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for invalid days (negative)', async () => {
      await expect(
        controller.extendTrialData(validUserId, validAdminId, -1)
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.extendTrialData('invalid-uuid', validAdminId, 30)
      ).rejects.toThrow(ZodError);
    });
  });

  describe('deactivateUserData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should deactivate user with default reason', async () => {
      const mockUser = {
        id: validUserId,
        is_active: false,
      };

      mockAdminService.deactivateUser.mockResolvedValue(mockUser as any);

      const result = await controller.deactivateUserData(validUserId, validAdminId);

      expect(result).toEqual(mockUser);
      expect(mockAdminService.deactivateUser).toHaveBeenCalledWith({
        userId: validUserId,
        adminId: validAdminId,
        reason: 'Admin deactivation',
        notes: undefined,
        cancelSubscription: false,
      });
    });

    it('should deactivate user with custom reason and options', async () => {
      const mockUser = {
        id: validUserId,
        is_active: false,
      };

      mockAdminService.deactivateUser.mockResolvedValue(mockUser as any);

      const result = await controller.deactivateUserData(
        validUserId,
        validAdminId,
        'Violation of terms',
        'User violated terms of service',
        true
      );

      expect(result).toEqual(mockUser);
      expect(mockAdminService.deactivateUser).toHaveBeenCalledWith({
        userId: validUserId,
        adminId: validAdminId,
        reason: 'Violation of terms',
        notes: 'User violated terms of service',
        cancelSubscription: true,
      });
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.deactivateUserData('invalid-uuid', validAdminId)
      ).rejects.toThrow(ZodError);
    });
  });

  describe('reactivateUserData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should reactivate user', async () => {
      const mockUser = {
        id: validUserId,
        is_active: true,
      };

      mockAdminService.reactivateUser.mockResolvedValue(mockUser as any);

      const result = await controller.reactivateUserData(validUserId, validAdminId);

      expect(result).toEqual(mockUser);
      expect(mockAdminService.reactivateUser).toHaveBeenCalledWith({
        userId: validUserId,
        adminId: validAdminId,
      });
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.reactivateUserData('invalid-uuid', validAdminId)
      ).rejects.toThrow(ZodError);
    });
  });

  describe('updateUserTierData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should update user tier', async () => {
      const mockUser = {
        id: validUserId,
        tier: 'basic',
      };

      mockAdminService.changeUserTier.mockResolvedValue(mockUser as any);

      const result = await controller.updateUserTierData(validUserId, validAdminId, 'basic');

      expect(result).toEqual(mockUser);
      expect(mockAdminService.changeUserTier).toHaveBeenCalledWith({
        userId: validUserId,
        adminId: validAdminId,
        newTier: 'basic',
      });
    });

    it('should throw ZodError for invalid tier', async () => {
      await expect(
        controller.updateUserTierData(validUserId, validAdminId, 'invalid' as any)
      ).rejects.toThrow(ZodError);
    });
  });

  describe('resetUserQuotaData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    beforeEach(() => {
      // Mock dynamic imports
      jest.mock('@lib/supabase/admin', () => ({
        createAdminClient: jest.fn(() => ({
          from: jest.fn(() => ({
            delete: jest.fn(() => ({
              eq: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      }));

      jest.mock('@backend/modules/admin/dao/admin.dao', () => ({
        logAdminAction: jest.fn().mockResolvedValue(undefined),
      }));
    });

    it('should validate user ID before processing', async () => {
      await expect(
        controller.resetUserQuotaData('invalid-uuid', validAdminId)
      ).rejects.toThrow(ZodError);

      expect(mockAdminService.getUserDetails).not.toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      mockAdminService.getUserDetails.mockResolvedValue(null);

      await expect(
        controller.resetUserQuotaData(validUserId, validAdminId)
      ).rejects.toThrow('User not found');

      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith(validUserId);
    });

    // Note: Full integration test for resetUserQuotaData would require
    // mocking Supabase client and adminDao, which is better suited for
    // integration tests. This test focuses on validation and error handling.
  });

  describe('refundUserData', () => {
    const validUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const validAdminId = 'b1ffcd00-ad1c-5fg9-cc7e-7cc0ce491b22';

    it('should process refund successfully', async () => {
      mockAdminService.refundUser.mockResolvedValue(undefined);

      const result = await controller.refundUserData(
        validUserId,
        validAdminId,
        1000,
        'Customer requested refund',
        'Refund note'
      );

      expect(result.success).toBe(true);
      expect(result.userId).toBe(validUserId);
      expect(mockAdminService.refundUser).toHaveBeenCalledWith({
        userId: validUserId,
        adminId: validAdminId,
        amount: 1000,
        reason: 'Customer requested refund',
      });
    });

    it('should throw ZodError for invalid amount (negative)', async () => {
      await expect(
        controller.refundUserData(validUserId, validAdminId, -100, 'reason')
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for empty reason', async () => {
      await expect(
        controller.refundUserData(validUserId, validAdminId, 1000, '')
      ).rejects.toThrow(ZodError);
    });

    it('should throw ZodError for invalid user ID', async () => {
      await expect(
        controller.refundUserData('invalid-uuid', validAdminId, 1000, 'reason')
      ).rejects.toThrow(ZodError);
    });
  });

  describe('clearCacheData', () => {
    const validAdminId = '123e4567-e89b-12d3-a456-426614174000';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should clear cache and log admin action', async () => {
      const mockCacheResult = {
        success: true,
        timestamp: '2024-01-01T00:00:00Z',
        message: 'Redis cache cleared successfully',
        stats: {
          before: { type: 'memory', size: 100, hits: 50, misses: 10 },
          after: { type: 'memory', size: 0, hits: 50, misses: 10 },
        },
      };

      mockAdminService.clearCache.mockResolvedValue(mockCacheResult);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await controller.clearCacheData(validAdminId);

      expect(result).toEqual(mockCacheResult);
      expect(mockAdminService.clearCache).toHaveBeenCalledTimes(1);
      expect(mockAdminDao.logAdminAction).toHaveBeenCalledWith({
        admin_id: validAdminId,
        action: 'clear_cache',
        entity_type: 'system',
        entity_id: 'cache',
        after_state: { stats: mockCacheResult.stats },
      });
    });

    it('should handle cache service errors', async () => {
      mockAdminService.clearCache.mockRejectedValue(new Error('Cache error'));

      await expect(controller.clearCacheData(validAdminId)).rejects.toThrow('Cache error');
    });
  });

  describe('retryWebhookData', () => {
    const validAdminId = '123e4567-e89b-12d3-a456-426614174000';
    const validEventId = 'evt_1234567890';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should retry webhook and log admin action', async () => {
      const mockRetryResult = {
        success: true,
        retryCount: 1,
      };

      mockRetryService.retryWebhookEvent.mockResolvedValue(mockRetryResult);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await controller.retryWebhookData(validEventId, validAdminId);

      expect(result).toEqual(mockRetryResult);
      expect(mockRetryService.retryWebhookEvent).toHaveBeenCalledWith(validEventId);
      expect(mockAdminDao.logAdminAction).toHaveBeenCalledWith({
        admin_id: validAdminId,
        action: 'retry_webhook',
        entity_type: 'webhook',
        entity_id: validEventId,
        after_state: { retryCount: 1, success: true },
      });
    });

    it('should throw ZodError for empty event ID', async () => {
      await expect(
        controller.retryWebhookData('', validAdminId)
      ).rejects.toThrow(ZodError);
    });

    it('should handle retry service errors', async () => {
      mockRetryService.retryWebhookEvent.mockRejectedValue(new Error('Retry failed'));

      await expect(
        controller.retryWebhookData(validEventId, validAdminId)
      ).rejects.toThrow('Retry failed');
    });
  });
});
