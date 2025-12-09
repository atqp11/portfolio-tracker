/**
 * Waitlist DAO Tests
 *
 * Tests database access layer for waitlist operations
 */

import * as waitlistDao from '../dao/waitlist.dao';
import { createAdminClient } from '@lib/supabase/admin';

// Mock Supabase admin client
jest.mock('@lib/supabase/admin');

const mockSupabaseClient = {
  from: jest.fn(),
};

const mockCreateAdminClient = createAdminClient as jest.MockedFunction<
  typeof createAdminClient
>;

describe('Waitlist DAO', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateAdminClient.mockReturnValue(mockSupabaseClient as any);
  });

  describe('findAllWaitlistEntries', () => {
    it('should fetch all waitlist entries with pagination', async () => {
      const mockData = [
        {
          id: '1',
          email: 'user1@example.com',
          name: 'User One',
          notified: false,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          email: 'user2@example.com',
          name: 'User Two',
          notified: true,
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.findAllWaitlistEntries({}, 0, 10);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('waitlist');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', {
        ascending: false,
      });
      expect(mockQuery.range).toHaveBeenCalledWith(0, 9);
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user1@example.com');
      expect(result[0].createdAt).toBe('2024-01-01T00:00:00Z');
    });

    it('should apply notified filter when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await waitlistDao.findAllWaitlistEntries({ notified: true }, 0, 10);

      expect(mockQuery.eq).toHaveBeenCalledWith('notified', true);
    });

    it('should apply search filter when provided', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await waitlistDao.findAllWaitlistEntries({ search: 'john' }, 0, 10);

      expect(mockQuery.or).toHaveBeenCalledWith(
        'email.ilike.%john%,name.ilike.%john%'
      );
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(
        waitlistDao.findAllWaitlistEntries({}, 0, 10)
      ).rejects.toThrow('Failed to fetch waitlist entries: Database error');
    });
  });

  describe('countWaitlistEntries', () => {
    it('should count all entries without filters', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue({ count: 42, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.countWaitlistEntries({});

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('waitlist');
      expect(mockQuery.select).toHaveBeenCalledWith('*', {
        count: 'exact',
        head: true,
      });
      expect(result).toBe(42);
    });

    it('should count with filters applied', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ count: 15, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.countWaitlistEntries({
        notified: false,
      });

      expect(mockQuery.eq).toHaveBeenCalledWith('notified', false);
      expect(result).toBe(15);
    });

    it('should return 0 if count is null', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue({ count: null, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.countWaitlistEntries({});

      expect(result).toBe(0);
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Count failed' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(waitlistDao.countWaitlistEntries({})).rejects.toThrow(
        'Failed to count waitlist entries: Count failed'
      );
    });
  });

  describe('findWaitlistEntryById', () => {
    it('should find entry by ID', async () => {
      const mockData = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        notified: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.findWaitlistEntryById('1');

      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(result).not.toBeNull();
      expect(result?.email).toBe('user@example.com');
    });

    it('should return null when entry not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.findWaitlistEntryById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'OTHER_ERROR', message: 'DB error' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(
        waitlistDao.findWaitlistEntryById('1')
      ).rejects.toThrow('Failed to fetch waitlist entry: DB error');
    });
  });

  describe('deleteWaitlistEntry', () => {
    it('should delete entry and return it', async () => {
      const mockData = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        notified: false,
        created_at: '2024-01-01T00:00:00Z',
      };

      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.deleteWaitlistEntry('1');

      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
      expect(result.email).toBe('user@example.com');
    });

    it('should throw error when entry not found', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(waitlistDao.deleteWaitlistEntry('1')).rejects.toThrow(
        'Waitlist entry not found'
      );
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: 'OTHER', message: 'Delete failed' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(waitlistDao.deleteWaitlistEntry('1')).rejects.toThrow(
        'Failed to delete waitlist entry: Delete failed'
      );
    });
  });

  describe('updateWaitlistNotificationStatus', () => {
    it('should update notification status for multiple entries', async () => {
      const mockData = [
        { id: '1', notified: true },
        { id: '2', notified: true },
        { id: '3', notified: true },
      ];
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.updateWaitlistNotificationStatus(
        ['1', '2', '3'],
        true
      );

      expect(mockQuery.update).toHaveBeenCalledWith({ notified: true });
      expect(mockQuery.in).toHaveBeenCalledWith('id', ['1', '2', '3']);
      expect(result).toBe(3);
    });

    it('should return 0 when no entries matched', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      const result = await waitlistDao.updateWaitlistNotificationStatus(
        ['nonexistent'],
        true
      );

      expect(result).toBe(0);
    });

    it('should throw error on database failure', async () => {
      const mockQuery = {
        update: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      };

      mockSupabaseClient.from.mockReturnValue(mockQuery);

      await expect(
        waitlistDao.updateWaitlistNotificationStatus(['1'], true)
      ).rejects.toThrow('Failed to update waitlist entries: Update failed');
    });
  });
});
