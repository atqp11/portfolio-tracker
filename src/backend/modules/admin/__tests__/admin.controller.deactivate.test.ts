/**
 * Admin Controller Deactivation Tests
 *
 * Tests for admin controller deactivation endpoint error handling
 */

import { AdminController } from '@backend/modules/admin/admin.controller';
import * as adminService from '@backend/modules/admin/service/admin.service';
import { NextRequest } from 'next/server';
import type { UserProfile } from '@lib/auth/session';

jest.mock('@backend/modules/admin/service/admin.service');

const mockAdminService = adminService as jest.Mocked<typeof adminService>;

describe('Admin Controller - Deactivate User', () => {
  let controller: AdminController;
  let mockRequest: NextRequest;
  let mockAdmin: UserProfile;

  beforeEach(() => {
    controller = new AdminController();
    mockRequest = new NextRequest('http://localhost:3000/api/admin/users/user-1/deactivate', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'Test deactivation',
        notes: 'Test notes',
      }),
    });
    mockAdmin = {
      id: 'admin-1',
      email: 'admin@example.com',
      name: 'Admin User',
      tier: 'premium',
      is_admin: true,
    } as UserProfile;

    jest.clearAllMocks();
  });

  describe('Error handling', () => {
    it('should return 400 for self-deactivation attempts', async () => {
      mockAdminService.deactivateUser.mockRejectedValue(
        new Error('You cannot deactivate your own account')
      );

      const response = await controller.deactivateUser(mockRequest, {
        params: { userId: 'admin-1' },
        body: { reason: 'Test', cancelSubscription: false },
        admin: mockAdmin,
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message || data.error).toContain('cannot deactivate your own account');
    });

    it('should return 409 for last admin deactivation attempts', async () => {
      mockAdminService.deactivateUser.mockRejectedValue(
        new Error('Cannot deactivate the last active admin. At least one admin must remain active.')
      );

      const response = await controller.deactivateUser(mockRequest, {
        params: { userId: 'admin-2' },
        body: { reason: 'Test', cancelSubscription: false },
        admin: mockAdmin,
      });

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message || data.error).toContain('last active admin');
    });

    it('should return 500 for unexpected errors', async () => {
      mockAdminService.deactivateUser.mockRejectedValue(new Error('Database error'));

      const response = await controller.deactivateUser(mockRequest, {
        params: { userId: 'user-1' },
        body: { reason: 'Test', cancelSubscription: false },
        admin: mockAdmin,
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.message || data.error).toBe('Database error');
    });

    it('should return 200 for successful deactivation', async () => {
      const deactivatedUser = {
        id: 'user-1',
        email: 'user@example.com',
        is_active: false,
      };

      mockAdminService.deactivateUser.mockResolvedValue(deactivatedUser as any);

      const response = await controller.deactivateUser(mockRequest, {
        params: { userId: 'user-1' },
        body: { reason: 'Test deactivation', cancelSubscription: false },
        admin: mockAdmin,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.user).toEqual(deactivatedUser);
    });
  });
});

