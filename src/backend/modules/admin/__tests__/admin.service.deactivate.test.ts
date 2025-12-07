/**
 * Admin Service Deactivation Tests
 *
 * Tests for user deactivation functionality with protection rules
 */

import * as adminService from '@backend/modules/admin/service/admin.service';
import * as adminDao from '@backend/modules/admin/dao/admin.dao';
import { getStripe } from '@lib/stripe/client';

jest.mock('@backend/modules/admin/dao/admin.dao');
jest.mock('@lib/stripe/client', () => {
  const mockStripe = {
    subscriptions: {
      update: jest.fn(),
    },
  };
  return {
    getStripe: jest.fn(() => mockStripe),
  };
});

const mockAdminDao = adminDao as jest.Mocked<typeof adminDao>;
const mockGetStripe = getStripe as jest.MockedFunction<typeof getStripe>;

describe('Admin Service - Deactivate User', () => {
  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    tier: 'free',
    is_admin: false,
    is_active: true,
    stripe_subscription_id: null,
  };

  const mockAdmin = {
    id: 'admin-1',
    email: 'admin@example.com',
    name: 'Admin User',
    tier: 'premium',
    is_admin: true,
    is_active: true,
    stripe_subscription_id: 'sub_123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Self-deactivation prevention', () => {
    it('should prevent admin from deactivating themselves', async () => {
      await expect(
        adminService.deactivateUser({
          userId: 'admin-1',
          adminId: 'admin-1', // Same ID - self-deactivation attempt
          reason: 'Test deactivation',
        })
      ).rejects.toThrow('You cannot deactivate your own account');

      // Self-deactivation check happens before getUserById
      expect(mockAdminDao.getUserById).not.toHaveBeenCalled();
      expect(mockAdminDao.deactivateUser).not.toHaveBeenCalled();
    });

    it('should allow admin to deactivate different user', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(2); // Multiple admins exist
      mockAdminDao.deactivateUser.mockResolvedValue({
        ...mockUser,
        is_active: false,
      } as any);
      mockAdminDao.logDeactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.deactivateUser({
        userId: 'user-1',
        adminId: 'admin-1', // Different ID - allowed
        reason: 'Test deactivation',
      });

      expect(result.is_active).toBe(false);
      expect(mockAdminDao.deactivateUser).toHaveBeenCalledWith('user-1', 'Test deactivation');
    });
  });

  describe('Last active admin protection', () => {
    it('should prevent deactivating the last active admin', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockAdmin as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(1); // Only one admin

      await expect(
        adminService.deactivateUser({
          userId: 'admin-1',
          adminId: 'admin-2', // Different admin trying to deactivate
          reason: 'Test deactivation',
        })
      ).rejects.toThrow('Cannot deactivate the last active admin');

      expect(mockAdminDao.countActiveAdmins).toHaveBeenCalled();
      expect(mockAdminDao.deactivateUser).not.toHaveBeenCalled();
    });

    it('should allow deactivating admin when multiple admins exist', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockAdmin as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(3); // Multiple admins
      mockAdminDao.deactivateUser.mockResolvedValue({
        ...mockAdmin,
        is_active: false,
      } as any);
      mockAdminDao.logDeactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.deactivateUser({
        userId: 'admin-1',
        adminId: 'admin-2',
        reason: 'Test deactivation',
      });

      expect(result.is_active).toBe(false);
      expect(mockAdminDao.deactivateUser).toHaveBeenCalled();
    });

    it('should allow deactivating non-admin user even if only one admin exists', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(1); // Only one admin, but user is not admin
      mockAdminDao.deactivateUser.mockResolvedValue({
        ...mockUser,
        is_active: false,
      } as any);
      mockAdminDao.logDeactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.deactivateUser({
        userId: 'user-1',
        adminId: 'admin-1',
        reason: 'Test deactivation',
      });

      expect(result.is_active).toBe(false);
      // Should not check admin count for non-admin users
      expect(mockAdminDao.countActiveAdmins).not.toHaveBeenCalled();
      expect(mockAdminDao.deactivateUser).toHaveBeenCalled();
    });
  });

  describe('Stripe subscription cancellation', () => {
    it('should cancel Stripe subscription when requested', async () => {
      const userWithSubscription = {
        ...mockUser,
        stripe_subscription_id: 'sub_123',
      };

      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.update.mockResolvedValue({});
      mockAdminDao.getUserById.mockResolvedValue(userWithSubscription as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(2);
      mockAdminDao.deactivateUser.mockResolvedValue({
        ...userWithSubscription,
        is_active: false,
      } as any);
      mockAdminDao.logDeactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.deactivateUser({
        userId: 'user-1',
        adminId: 'admin-1',
        reason: 'Test deactivation',
        cancelSubscription: true,
      });

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('should continue deactivation even if Stripe cancellation fails', async () => {
      const userWithSubscription = {
        ...mockUser,
        stripe_subscription_id: 'sub_123',
      };

      const mockStripeInstance = mockGetStripe() as any;
      mockStripeInstance.subscriptions.update.mockRejectedValue(new Error('Stripe API error'));
      mockAdminDao.getUserById.mockResolvedValue(userWithSubscription as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(2);
      mockAdminDao.deactivateUser.mockResolvedValue({
        ...userWithSubscription,
        is_active: false,
      } as any);
      mockAdminDao.logDeactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      const result = await adminService.deactivateUser({
        userId: 'user-1',
        adminId: 'admin-1',
        reason: 'Test deactivation',
        cancelSubscription: true,
      });

      // Should still deactivate user even if Stripe fails
      expect(result.is_active).toBe(false);
      expect(mockAdminDao.deactivateUser).toHaveBeenCalled();
    });
  });

  describe('Audit logging', () => {
    it('should log deactivation and admin action', async () => {
      mockAdminDao.getUserById.mockResolvedValue(mockUser as any);
      mockAdminDao.countActiveAdmins.mockResolvedValue(2);
      mockAdminDao.deactivateUser.mockResolvedValue({
        ...mockUser,
        is_active: false,
      } as any);
      mockAdminDao.logDeactivation.mockResolvedValue(undefined);
      mockAdminDao.logAdminAction.mockResolvedValue(undefined);

      await adminService.deactivateUser({
        userId: 'user-1',
        adminId: 'admin-1',
        reason: 'Test deactivation',
        notes: 'Test notes',
      });

      expect(mockAdminDao.logDeactivation).toHaveBeenCalledWith({
        user_id: 'user-1',
        admin_id: 'admin-1',
        reason: 'Test deactivation',
        notes: 'Test notes',
      });

      expect(mockAdminDao.logAdminAction).toHaveBeenCalledWith({
        admin_id: 'admin-1',
        target_user_id: 'user-1',
        action: 'deactivate_user',
        entity_type: 'user',
        entity_id: 'user-1',
        before_state: { is_active: true },
        after_state: { is_active: false },
      });
    });
  });

  describe('Error handling', () => {
    it('should throw error when user not found', async () => {
      mockAdminDao.getUserById.mockResolvedValue(null);

      await expect(
        adminService.deactivateUser({
          userId: 'non-existent',
          adminId: 'admin-1',
          reason: 'Test deactivation',
        })
      ).rejects.toThrow('User not found');

      expect(mockAdminDao.deactivateUser).not.toHaveBeenCalled();
    });
  });
});

