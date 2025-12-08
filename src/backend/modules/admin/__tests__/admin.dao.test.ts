/**
 * Admin DAO Tests
 *
 * Tests for admin data access layer functions
 */

import * as adminDao from '@backend/modules/admin/dao/admin.dao';
import { createAdminClient } from '@lib/supabase/admin';

jest.mock('@lib/supabase/admin');

describe('Admin DAO', () => {
  let mockSelect: jest.Mock;
  let mockEq: jest.Mock;
  let mockIlike: jest.Mock;
  let mockOrder: jest.Mock;
  let mockLimit: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockInsert: jest.Mock;
  let mockSingle: jest.Mock;
  let mockIs: jest.Mock;
  let mockGte: jest.Mock;
  let mockFrom: jest.Mock;
  let mockSupabase: any;
  let createQueryBuilder: (defaultPromise?: Promise<any>) => any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock chain for Supabase queries
    // limit() returns a promise, so it needs to be set up separately
    mockLimit = jest.fn();
    mockEq = jest.fn();
    mockIlike = jest.fn();
    mockOrder = jest.fn();
    mockSingle = jest.fn();
    mockIs = jest.fn();
    mockGte = jest.fn();
    
    // Create a query builder object that can be chained
    // The builder itself is thenable (can be awaited) and methods return the builder for chaining
    createQueryBuilder = (defaultPromise?: Promise<any>) => {
      let promise = defaultPromise || Promise.resolve({ data: [], error: null });
      
      const builder: any = {
        eq: jest.fn().mockImplementation((...args) => {
          mockEq(...args);
          return builder;
        }),
        ilike: jest.fn().mockImplementation((...args) => {
          mockIlike(...args);
          return builder;
        }),
        order: jest.fn().mockImplementation((...args) => {
          mockOrder(...args);
          return builder;
        }),
        limit: jest.fn().mockImplementation((...args) => {
          mockLimit(...args);
          // limit() returns the builder so it can be awaited or chained with .single()
          return builder;
        }),
        is: jest.fn().mockImplementation((...args) => {
          mockIs(...args);
          return builder;
        }),
        gte: jest.fn().mockImplementation((...args) => {
          mockGte(...args);
          return builder;
        }),
        single: mockSingle,
        // Make the builder itself thenable (can be awaited)
        then: (onFulfilled: any, onRejected?: any) => promise.then(onFulfilled, onRejected),
        catch: (onRejected: any) => promise.catch(onRejected),
      };
      
      // Allow tests to override the promise
      builder._setPromise = (p: Promise<any>) => {
        promise = p;
      };
      
      return builder;
    };
    
    mockSelect = jest.fn().mockReturnValue(createQueryBuilder());

    mockUpdate = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
    });

    mockInsert = jest.fn().mockReturnValue({
      data: null,
      error: null,
    });

    mockFrom = jest.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
    });

    mockSupabase = {
      from: mockFrom,
    };

    (createAdminClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('countActiveAdmins', () => {
    it('should return count of active admins', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: [{ id: 'admin1' }, { id: 'admin2' }], error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const count = await adminDao.countActiveAdmins();

      expect(count).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('id');
      expect(mockEq).toHaveBeenCalledWith('is_admin', true);
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });

    it('should return 0 when no active admins exist', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: [], error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const count = await adminDao.countActiveAdmins();

      expect(count).toBe(0);
    });

    it('should throw error when database query fails', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: null, error: { message: 'Database connection failed' } })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      await expect(adminDao.countActiveAdmins()).rejects.toThrow(
        'Failed to count active admins: Database connection failed'
      );
    });
  });

  describe('getAllUsers', () => {
    it('should return all users without filters', async () => {
      const mockUsers = [
        { id: 'user1', email: 'user1@example.com', tier: 'free' },
        { id: 'user2', email: 'user2@example.com', tier: 'basic' },
      ];

      // Create a new query builder with the mock data
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockUsers, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const users = await adminDao.getAllUsers();

      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
    });

    it('should filter by email', async () => {
      const mockUsers = [{ id: 'user1', email: 'test@example.com' }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockUsers, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const users = await adminDao.getAllUsers({ email: 'test' });

      expect(users).toEqual(mockUsers);
      expect(mockIlike).toHaveBeenCalledWith('email', '%test%');
    });

    it('should filter by tier', async () => {
      const mockUsers = [{ id: 'user1', tier: 'premium' }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockUsers, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const users = await adminDao.getAllUsers({ tier: 'premium' });

      expect(users).toEqual(mockUsers);
      expect(mockEq).toHaveBeenCalledWith('tier', 'premium');
    });

    it('should filter by subscription status', async () => {
      const mockUsers = [{ id: 'user1', subscription_status: 'active' }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockUsers, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const users = await adminDao.getAllUsers({ status: 'active' });

      expect(users).toEqual(mockUsers);
      expect(mockEq).toHaveBeenCalledWith('subscription_status', 'active');
    });
    
    it('should filter by isActive', async () => {
      const mockUsers = [{ id: 'user1', is_active: true }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockUsers, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const users = await adminDao.getAllUsers({ isActive: true });

      expect(users).toEqual(mockUsers);
      expect(mockEq).toHaveBeenCalledWith('is_active', true);
    });

    it('should throw error when database query fails', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: null, error: { message: 'Query failed' } })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      await expect(adminDao.getAllUsers()).rejects.toThrow(
        'Failed to fetch users: Query failed'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser = { id: 'user1', email: 'user@example.com' };

      mockSingle.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const user = await adminDao.getUserById('user1');

      expect(user).toEqual(mockUser);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', 'user1');
      expect(mockSingle).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      const user = await adminDao.getUserById('nonexistent');

      expect(user).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER' },
      });

      await expect(adminDao.getUserById('user1')).rejects.toThrow(
        'Failed to fetch user: Database error'
      );
    });
  });

  describe('getUserBillingHistory', () => {
    it('should return billing history for user', async () => {
      const mockTransactions = [
        { id: 'tx1', amount_cents: 600, status: 'completed' },
        { id: 'tx2', amount_cents: 600, status: 'completed' },
      ];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockTransactions, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const history = await adminDao.getUserBillingHistory('user1');

      expect(history).toEqual(mockTransactions);
      expect(mockFrom).toHaveBeenCalledWith('stripe_transactions');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user1');
    });

    it('should return empty array when no transactions', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: [], error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const history = await adminDao.getUserBillingHistory('user1');

      expect(history).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: null, error: { message: 'Query failed' } })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      await expect(adminDao.getUserBillingHistory('user1')).rejects.toThrow(
        'Failed to fetch billing history: Query failed'
      );
    });
  });

  describe('getUserTransactions', () => {
    it('should return transactions with limit', async () => {
      const mockTransactions = [{ id: 'tx1' }, { id: 'tx2' }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockTransactions, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const transactions = await adminDao.getUserTransactions('user1');

      expect(transactions).toEqual(mockTransactions);
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });

  describe('updateUser', () => {
    it('should update user profile', async () => {
      const updates = { tier: 'premium' as const };
      const updatedUser = { id: 'user1', tier: 'premium' as const };

      mockSingle.mockResolvedValue({
        data: updatedUser,
        error: null,
      });

      const result = await adminDao.updateUser('user1', updates);

      expect(result).toEqual(updatedUser);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Update failed' },
      });

      await expect(adminDao.updateUser('user1', { tier: 'premium' })).rejects.toThrow(
        'Failed to update user: Update failed'
      );
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user with reason', async () => {
      const deactivatedUser = { id: 'user1', is_active: false };

      mockSingle.mockResolvedValue({
        data: deactivatedUser,
        error: null,
      });

      const result = await adminDao.deactivateUser('user1', 'Test reason');

      expect(result).toEqual(deactivatedUser);
      expect(result.is_active).toBe(false);
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user', async () => {
      const reactivatedUser = { id: 'user1', is_active: true, deactivated_at: null };

      mockSingle.mockResolvedValue({
        data: reactivatedUser,
        error: null,
      });

      const result = await adminDao.reactivateUser('user1');

      expect(result).toEqual(reactivatedUser);
      expect(result.is_active).toBe(true);
    });
  });

  describe('changeUserTier', () => {
    it('should change user tier', async () => {
      const updatedUser = { id: 'user1', tier: 'premium' as const, subscription_tier: 'premium' };

      mockSingle.mockResolvedValue({
        data: updatedUser,
        error: null,
      });

      const result = await adminDao.changeUserTier('user1', 'premium');

      expect(result).toEqual(updatedUser);
      expect(result.tier).toBe('premium');
    });
  });

  describe('logDeactivation', () => {
    it('should log deactivation without throwing', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      await adminDao.logDeactivation({
        user_id: 'user1',
        admin_id: 'admin1',
        reason: 'Test reason',
      });

      expect(mockFrom).toHaveBeenCalledWith('user_deactivations');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should not throw when logging fails', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: { message: 'Logging failed' },
      });

      // Should not throw
      await expect(
        adminDao.logDeactivation({
          user_id: 'user1',
          admin_id: 'admin1',
          reason: 'Test reason',
        })
      ).resolves.not.toThrow();
    });
  });

  describe('logReactivation', () => {
    it('should log reactivation when deactivation exists', async () => {
      // Mock finding deactivation
      mockSingle.mockResolvedValueOnce({
        data: { id: 'deactivation1' },
        error: null,
      });

      // Mock update
      mockEq.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await adminDao.logReactivation('user1', 'admin1');

      expect(mockFrom).toHaveBeenCalledWith('user_deactivations');
    });

    it('should handle case when no deactivation found', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      });

      // Should not throw
      await expect(adminDao.logReactivation('user1', 'admin1')).resolves.not.toThrow();
    });
  });

  describe('logAdminAction', () => {
    it('should log admin action', async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: null,
      });

      await adminDao.logAdminAction({
        admin_id: 'admin1',
        action: 'test_action',
        entity_type: 'user',
      });

      expect(mockFrom).toHaveBeenCalledWith('admin_audit_log');
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('getAdminAuditLog', () => {
    it('should return audit log with default limit', async () => {
      const mockLogs = [
        { id: 'log1', action: 'deactivate_user' },
        { id: 'log2', action: 'change_tier' },
      ];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockLogs, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const logs = await adminDao.getAdminAuditLog();

      expect(logs).toEqual(mockLogs);
      expect(mockLimit).toHaveBeenCalledWith(100);
    });

    it('should filter by adminId', async () => {
      const mockLogs = [{ id: 'log1', admin_id: 'admin1' }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockLogs, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const logs = await adminDao.getAdminAuditLog({ adminId: 'admin1' });

      expect(logs).toEqual(mockLogs);
      expect(mockEq).toHaveBeenCalledWith('admin_id', 'admin1');
    });

    it('should filter by action', async () => {
      const mockLogs = [{ id: 'log1', action: 'deactivate_user' }];

      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: mockLogs, error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      const logs = await adminDao.getAdminAuditLog({ action: 'deactivate_user' });

      expect(logs).toEqual(mockLogs);
      expect(mockEq).toHaveBeenCalledWith('action', 'deactivate_user');
    });

    it('should use custom limit', async () => {
      const queryBuilder = createQueryBuilder(
        Promise.resolve({ data: [], error: null })
      );
      mockSelect.mockReturnValueOnce(queryBuilder);

      await adminDao.getAdminAuditLog({ limit: 50 });

      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });
});
