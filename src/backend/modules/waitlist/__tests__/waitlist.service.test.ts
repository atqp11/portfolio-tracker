/**
 * Waitlist Service Tests
 *
 * Tests business logic layer for waitlist operations
 */

import * as waitlistService from '../service/waitlist.service';
import * as waitlistDao from '../dao/waitlist.dao';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// Mock the DAO layer
jest.mock('../dao/waitlist.dao');

const mockFindAllWaitlistEntries = waitlistDao.findAllWaitlistEntries as jest.MockedFunction<
  typeof waitlistDao.findAllWaitlistEntries
>;
const mockCountWaitlistEntries = waitlistDao.countWaitlistEntries as jest.MockedFunction<
  typeof waitlistDao.countWaitlistEntries
>;
const mockFindWaitlistEntryById = waitlistDao.findWaitlistEntryById as jest.MockedFunction<
  typeof waitlistDao.findWaitlistEntryById
>;
const mockDeleteWaitlistEntry = waitlistDao.deleteWaitlistEntry as jest.MockedFunction<
  typeof waitlistDao.deleteWaitlistEntry
>;
const mockUpdateWaitlistNotificationStatus = waitlistDao.updateWaitlistNotificationStatus as jest.MockedFunction<
  typeof waitlistDao.updateWaitlistNotificationStatus
>;

const mockEntries = [
  {
    id: '1',
    email: 'user1@example.com',
    name: 'User One',
    notified: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'user2@example.com',
    name: 'User Two',
    notified: true,
    createdAt: '2024-01-02T00:00:00Z',
  },
];

describe('Waitlist Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listWaitlistEntries', () => {
    it('should return paginated list with metadata', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue(mockEntries);
      mockCountWaitlistEntries.mockResolvedValue(42);

      const result = await waitlistService.listWaitlistEntries({
        page: 1,
        limit: 10,
        notified: 'all',
      });

      expect(mockFindAllWaitlistEntries).toHaveBeenCalledWith({}, 0, 10);
      expect(mockCountWaitlistEntries).toHaveBeenCalledWith({});
      expect(result.entries).toEqual(mockEntries);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 42,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      });
    });

    it('should filter by notified status when provided', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue([mockEntries[0]]);
      mockCountWaitlistEntries.mockResolvedValue(20);

      await waitlistService.listWaitlistEntries({
        page: 1,
        limit: 10,
        notified: 'false',
      });

      expect(mockFindAllWaitlistEntries).toHaveBeenCalledWith(
        { notified: false },
        0,
        10
      );
      expect(mockCountWaitlistEntries).toHaveBeenCalledWith({
        notified: false,
      });
    });

    it('should apply search filter when provided', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue(mockEntries);
      mockCountWaitlistEntries.mockResolvedValue(2);

      await waitlistService.listWaitlistEntries({
        page: 1,
        limit: 10,
        notified: 'all',
        search: 'john',
      });

      expect(mockFindAllWaitlistEntries).toHaveBeenCalledWith(
        { search: 'john' },
        0,
        10
      );
      expect(mockCountWaitlistEntries).toHaveBeenCalledWith({
        search: 'john',
      });
    });

    it('should calculate correct pagination for page 2', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue(mockEntries);
      mockCountWaitlistEntries.mockResolvedValue(42);

      const result = await waitlistService.listWaitlistEntries({
        page: 2,
        limit: 10,
        notified: 'all',
      });

      expect(mockFindAllWaitlistEntries).toHaveBeenCalledWith({}, 10, 10);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 42,
        totalPages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle last page correctly', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue([mockEntries[0]]);
      mockCountWaitlistEntries.mockResolvedValue(21);

      const result = await waitlistService.listWaitlistEntries({
        page: 3,
        limit: 10,
        notified: 'all',
      });

      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 21,
        totalPages: 3,
        hasNext: false,
        hasPrev: true,
      });
    });

    it('should trim search term whitespace', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue([]);
      mockCountWaitlistEntries.mockResolvedValue(0);

      await waitlistService.listWaitlistEntries({
        page: 1,
        limit: 10,
        notified: 'all',
        search: '  john  ',
      });

      expect(mockFindAllWaitlistEntries).toHaveBeenCalledWith(
        { search: 'john' },
        0,
        10
      );
    });

    it('should ignore empty search strings', async () => {
      mockFindAllWaitlistEntries.mockResolvedValue(mockEntries);
      mockCountWaitlistEntries.mockResolvedValue(2);

      await waitlistService.listWaitlistEntries({
        page: 1,
        limit: 10,
        notified: 'all',
        search: '   ',
      });

      expect(mockFindAllWaitlistEntries).toHaveBeenCalledWith({}, 0, 10);
    });
  });

  describe('deleteWaitlistEntry', () => {
    it('should delete entry and return confirmation', async () => {
      const mockEntry = mockEntries[0];
      mockFindWaitlistEntryById.mockResolvedValue(mockEntry);
      mockDeleteWaitlistEntry.mockResolvedValue(mockEntry);

      const result = await waitlistService.deleteWaitlistEntry('1');

      expect(mockFindWaitlistEntryById).toHaveBeenCalledWith('1');
      expect(mockDeleteWaitlistEntry).toHaveBeenCalledWith('1');
      expect(result).toEqual({
        message: 'Waitlist entry deleted successfully',
        deletedEmail: 'user1@example.com',
      });
    });

    it('should throw NotFoundError when entry does not exist', async () => {
      mockFindWaitlistEntryById.mockResolvedValue(null);

      await expect(
        waitlistService.deleteWaitlistEntry('nonexistent')
      ).rejects.toThrow(NotFoundError);
      await expect(
        waitlistService.deleteWaitlistEntry('nonexistent')
      ).rejects.toThrow('Waitlist entry');

      expect(mockDeleteWaitlistEntry).not.toHaveBeenCalled();
    });

    it('should propagate DAO errors', async () => {
      mockFindWaitlistEntryById.mockResolvedValue(mockEntries[0]);
      mockDeleteWaitlistEntry.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        waitlistService.deleteWaitlistEntry('1')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('updateWaitlistNotificationStatus', () => {
    it('should update multiple entries to notified=true', async () => {
      mockUpdateWaitlistNotificationStatus.mockResolvedValue(3);

      const result = await waitlistService.updateWaitlistNotificationStatus(
        ['1', '2', '3'],
        true
      );

      expect(mockUpdateWaitlistNotificationStatus).toHaveBeenCalledWith(
        ['1', '2', '3'],
        true
      );
      expect(result).toEqual({
        message: 'Updated 3 waitlist entries',
        updatedCount: 3,
      });
    });

    it('should update multiple entries to notified=false', async () => {
      mockUpdateWaitlistNotificationStatus.mockResolvedValue(2);

      const result = await waitlistService.updateWaitlistNotificationStatus(
        ['1', '2'],
        false
      );

      expect(mockUpdateWaitlistNotificationStatus).toHaveBeenCalledWith(
        ['1', '2'],
        false
      );
      expect(result).toEqual({
        message: 'Updated 2 waitlist entries',
        updatedCount: 2,
      });
    });

    it('should use singular "entry" for single update', async () => {
      mockUpdateWaitlistNotificationStatus.mockResolvedValue(1);

      const result = await waitlistService.updateWaitlistNotificationStatus(
        ['1'],
        true
      );

      expect(result.message).toBe('Updated 1 waitlist entry');
    });

    it('should handle zero updates', async () => {
      mockUpdateWaitlistNotificationStatus.mockResolvedValue(0);

      const result = await waitlistService.updateWaitlistNotificationStatus(
        ['nonexistent'],
        true
      );

      expect(result).toEqual({
        message: 'Updated 0 waitlist entries',
        updatedCount: 0,
      });
    });

    it('should propagate DAO errors', async () => {
      mockUpdateWaitlistNotificationStatus.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(
        waitlistService.updateWaitlistNotificationStatus(['1'], true)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('getWaitlistStats', () => {
    it('should return correct statistics', async () => {
      mockCountWaitlistEntries
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30); // notified

      const result = await waitlistService.getWaitlistStats();

      expect(mockCountWaitlistEntries).toHaveBeenCalledTimes(2);
      expect(mockCountWaitlistEntries).toHaveBeenNthCalledWith(1, {});
      expect(mockCountWaitlistEntries).toHaveBeenNthCalledWith(2, {
        notified: true,
      });
      expect(result).toEqual({
        total: 50,
        notified: 30,
        pending: 20,
      });
    });

    it('should handle empty waitlist', async () => {
      mockCountWaitlistEntries
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await waitlistService.getWaitlistStats();

      expect(result).toEqual({
        total: 0,
        notified: 0,
        pending: 0,
      });
    });

    it('should handle all notified', async () => {
      mockCountWaitlistEntries
        .mockResolvedValueOnce(25)
        .mockResolvedValueOnce(25);

      const result = await waitlistService.getWaitlistStats();

      expect(result).toEqual({
        total: 25,
        notified: 25,
        pending: 0,
      });
    });

    it('should propagate DAO errors', async () => {
      mockCountWaitlistEntries.mockRejectedValue(
        new Error('Database error')
      );

      await expect(waitlistService.getWaitlistStats()).rejects.toThrow(
        'Database error'
      );
    });
  });
});
