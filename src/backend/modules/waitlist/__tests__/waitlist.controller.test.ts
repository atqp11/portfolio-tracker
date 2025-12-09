/**
 * Waitlist Controller Tests
 *
 * Tests HTTP layer for waitlist operations
 */

import { NextRequest, NextResponse } from 'next/server';
import * as waitlistController from '../waitlist.controller';
import * as waitlistService from '../service/waitlist.service';

// Mock the service layer
jest.mock('../service/waitlist.service');

const mockListWaitlistEntries = waitlistService.listWaitlistEntries as jest.MockedFunction<
  typeof waitlistService.listWaitlistEntries
>;
const mockDeleteWaitlistEntry = waitlistService.deleteWaitlistEntry as jest.MockedFunction<
  typeof waitlistService.deleteWaitlistEntry
>;
const mockUpdateWaitlistNotificationStatus = waitlistService.updateWaitlistNotificationStatus as jest.MockedFunction<
  typeof waitlistService.updateWaitlistNotificationStatus
>;

describe('Waitlist Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('listWaitlistEntries', () => {
    it('should return success response with entries and pagination', async () => {
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

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist?page=1&limit=10'
      );
      const context = {
        query: { page: 1, limit: 10, notified: 'all' as const },
      };

      const response = await waitlistController.listWaitlistEntries(
        request,
        context
      );
      const data = await response.json();

      expect(mockListWaitlistEntries).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        notified: 'all',
      });
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockData);
    });

    it('should pass search filter to service', async () => {
      const mockData = {
        entries: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      };

      mockListWaitlistEntries.mockResolvedValue(mockData);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist?search=john'
      );
      const context = {
        query: { page: 1, limit: 10, notified: 'all' as const, search: 'john' },
      };

      await waitlistController.listWaitlistEntries(request, context);

      expect(mockListWaitlistEntries).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        notified: 'all',
        search: 'john',
      });
    });

    it('should handle service errors', async () => {
      mockListWaitlistEntries.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist'
      );
      const context = {
        query: { page: 1, limit: 10, notified: 'all' as const },
      };

      await expect(
        waitlistController.listWaitlistEntries(request, context)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('deleteWaitlistEntry', () => {
    it('should delete entry and return confirmation', async () => {
      const mockResult = {
        message: 'Waitlist entry deleted successfully',
        deletedEmail: 'user@example.com',
      };

      mockDeleteWaitlistEntry.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'DELETE',
          body: JSON.stringify({ id: '123' }),
        }
      );
      const context = {
        body: { id: '123' },
      };

      const response = await waitlistController.deleteWaitlistEntry(
        request,
        context
      );
      const data = await response.json();

      expect(mockDeleteWaitlistEntry).toHaveBeenCalledWith('123');
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });

    it('should handle NotFoundError from service', async () => {
      const notFoundError = new Error('Waitlist entry');
      notFoundError.name = 'NotFoundError';
      mockDeleteWaitlistEntry.mockRejectedValue(notFoundError);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'DELETE',
          body: JSON.stringify({ id: 'nonexistent' }),
        }
      );
      const context = {
        body: { id: 'nonexistent' },
      };

      await expect(
        waitlistController.deleteWaitlistEntry(request, context)
      ).rejects.toThrow('Waitlist entry');
    });

    it('should handle service errors', async () => {
      mockDeleteWaitlistEntry.mockRejectedValue(
        new Error('Delete operation failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'DELETE',
          body: JSON.stringify({ id: '123' }),
        }
      );
      const context = {
        body: { id: '123' },
      };

      await expect(
        waitlistController.deleteWaitlistEntry(request, context)
      ).rejects.toThrow('Delete operation failed');
    });
  });

  describe('updateWaitlistNotificationStatus', () => {
    it('should update notification status and return confirmation', async () => {
      const mockResult = {
        message: 'Updated 3 waitlist entries',
        updatedCount: 3,
      };

      mockUpdateWaitlistNotificationStatus.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'PATCH',
          body: JSON.stringify({ ids: ['1', '2', '3'], notified: true }),
        }
      );
      const context = {
        body: { ids: ['1', '2', '3'], notified: true },
      };

      const response = await waitlistController.updateWaitlistNotificationStatus(
        request,
        context
      );
      const data = await response.json();

      expect(mockUpdateWaitlistNotificationStatus).toHaveBeenCalledWith(
        ['1', '2', '3'],
        true
      );
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
    });

    it('should handle updating to notified=false', async () => {
      const mockResult = {
        message: 'Updated 2 waitlist entries',
        updatedCount: 2,
      };

      mockUpdateWaitlistNotificationStatus.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'PATCH',
          body: JSON.stringify({ ids: ['1', '2'], notified: false }),
        }
      );
      const context = {
        body: { ids: ['1', '2'], notified: false },
      };

      await waitlistController.updateWaitlistNotificationStatus(
        request,
        context
      );

      expect(mockUpdateWaitlistNotificationStatus).toHaveBeenCalledWith(
        ['1', '2'],
        false
      );
    });

    it('should handle single entry update', async () => {
      const mockResult = {
        message: 'Updated 1 waitlist entry',
        updatedCount: 1,
      };

      mockUpdateWaitlistNotificationStatus.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'PATCH',
          body: JSON.stringify({ ids: ['1'], notified: true }),
        }
      );
      const context = {
        body: { ids: ['1'], notified: true },
      };

      const response = await waitlistController.updateWaitlistNotificationStatus(
        request,
        context
      );
      const data = await response.json();

      expect(data.data.message).toBe('Updated 1 waitlist entry');
    });

    it('should handle service errors', async () => {
      mockUpdateWaitlistNotificationStatus.mockRejectedValue(
        new Error('Update failed')
      );

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'PATCH',
          body: JSON.stringify({ ids: ['1'], notified: true }),
        }
      );
      const context = {
        body: { ids: ['1'], notified: true },
      };

      await expect(
        waitlistController.updateWaitlistNotificationStatus(request, context)
      ).rejects.toThrow('Update failed');
    });

    it('should handle zero updates gracefully', async () => {
      const mockResult = {
        message: 'Updated 0 waitlist entries',
        updatedCount: 0,
      };

      mockUpdateWaitlistNotificationStatus.mockResolvedValue(mockResult);

      const request = new NextRequest(
        'http://localhost:3000/api/admin/waitlist',
        {
          method: 'PATCH',
          body: JSON.stringify({ ids: ['nonexistent'], notified: true }),
        }
      );
      const context = {
        body: { ids: ['nonexistent'], notified: true },
      };

      const response = await waitlistController.updateWaitlistNotificationStatus(
        request,
        context
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.updatedCount).toBe(0);
    });
  });
});
