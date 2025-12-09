/**
 * Waitlist Controller RSC Methods Tests
 *
 * Tests for RSC page methods that return DTOs directly
 */

import * as waitlistController from '../waitlist.controller';
import * as waitlistService from '../service/waitlist.service';
import { ZodError } from 'zod';

jest.mock('../service/waitlist.service');

const mockListWaitlistEntries = waitlistService.listWaitlistEntries as jest.MockedFunction<
  typeof waitlistService.listWaitlistEntries
>;

describe('Waitlist Controller - RSC Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listWaitlistEntriesData', () => {
    it('should return waitlist entries with validated query', async () => {
      const mockData = {
        entries: [
          {
            id: '1',
            email: 'user@example.com',
            name: 'User',
            notified: false,
            createdAt: '2024-01-01T00:00:00Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockListWaitlistEntries.mockResolvedValue(mockData);

      const result = await waitlistController.listWaitlistEntriesData({
        page: 1,
        limit: 10,
        notified: 'all',
      });

      expect(result).toEqual(mockData);
      expect(mockListWaitlistEntries).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        notified: 'all',
      });
    });

    it('should apply default values from Zod schema', async () => {
      const mockData = {
        entries: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockListWaitlistEntries.mockResolvedValue(mockData);

      // Pass minimal query, let Zod apply defaults
      const result = await waitlistController.listWaitlistEntriesData({} as any);

      expect(result).toEqual(mockData);
      // Zod should apply defaults: page=1, limit=50, notified='all'
      expect(mockListWaitlistEntries).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        notified: 'all',
      });
    });

    it('should validate page is positive integer', async () => {
      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 0,
          limit: 10,
          notified: 'all',
        })
      ).rejects.toThrow(ZodError);

      await expect(
        waitlistController.listWaitlistEntriesData({
          page: -1,
          limit: 10,
          notified: 'all',
        })
      ).rejects.toThrow(ZodError);
    });

    it('should validate limit is within range (1-1000)', async () => {
      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 1,
          limit: 0,
          notified: 'all',
        })
      ).rejects.toThrow(ZodError);

      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 1,
          limit: 1001,
          notified: 'all',
        })
      ).rejects.toThrow(ZodError);
    });

    it('should validate notified enum values', async () => {
      const mockData = { entries: [], pagination: {} as any };
      mockListWaitlistEntries.mockResolvedValue(mockData);

      // Valid values
      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 1,
          limit: 10,
          notified: 'true',
        })
      ).resolves.toBeDefined();

      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 1,
          limit: 10,
          notified: 'false',
        })
      ).resolves.toBeDefined();

      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 1,
          limit: 10,
          notified: 'all',
        })
      ).resolves.toBeDefined();

      // Invalid value
      await expect(
        waitlistController.listWaitlistEntriesData({
          page: 1,
          limit: 10,
          notified: 'invalid' as any,
        })
      ).rejects.toThrow(ZodError);
    });

    it('should coerce string numbers to integers for page/limit', async () => {
      const mockData = { entries: [], pagination: {} as any };
      mockListWaitlistEntries.mockResolvedValue(mockData);

      const result = await waitlistController.listWaitlistEntriesData({
        page: '2' as any,
        limit: '25' as any,
        notified: 'all',
      });

      expect(mockListWaitlistEntries).toHaveBeenCalledWith({
        page: 2,
        limit: 25,
        notified: 'all',
      });
    });

    it('should handle optional search parameter', async () => {
      const mockData = { entries: [], pagination: {} as any };
      mockListWaitlistEntries.mockResolvedValue(mockData);

      const result = await waitlistController.listWaitlistEntriesData({
        page: 1,
        limit: 10,
        notified: 'all',
        search: 'john@example.com',
      });

      expect(mockListWaitlistEntries).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        notified: 'all',
        search: 'john@example.com',
      });
    });
  });
});
