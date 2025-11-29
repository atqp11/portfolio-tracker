/**
 * Admin Users API Tests
 *
 * Tests for admin user management endpoint.
 */

import { GET } from '@app/api/admin/users/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import * as adminAuth from '@lib/auth/admin';
import * as supabaseDb from '@lib/supabase/db';
import { NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@lib/auth/admin');
jest.mock('@lib/supabase/db');

describe('Admin Users API', () => {
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      tier: 'free' as const,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
    },
    {
      id: 'user-2',
      email: 'admin@example.com',
      name: 'Admin User',
      tier: 'premium' as const,
      is_admin: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      stripe_customer_id: 'cus_123',
      stripe_subscription_id: 'sub_123',
      subscription_status: 'active',
    },
  ];

  const mockUsage = {
    daily: {
      chat_queries: 5,
      portfolio_analysis: 2,
      sec_filings: 1,
    },
    monthly: {
      chat_queries: 50,
      portfolio_analysis: 20,
      sec_filings: 10,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return unauthorized if user is not admin', async () => {
      const unauthorizedResponse = NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
      (adminAuth.requireAdmin as jest.Mock).mockResolvedValue(unauthorizedResponse);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/admin/users',
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(401);
      expect(data.error).toBeTruthy();
    });

    it('should return all users with usage data for admin', async () => {
      (adminAuth.requireAdmin as jest.Mock).mockResolvedValue(null);
      (supabaseDb.getAllUsers as jest.Mock).mockResolvedValue(mockUsers);
      (supabaseDb.getCurrentUserUsage as jest.Mock).mockResolvedValue(mockUsage);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/admin/users',
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.users).toHaveLength(2);
      expect(data.data.total).toBe(2);
      expect(data.data.users[0].id).toBe('user-1');
      expect(data.data.users[0].usage.daily.chatQueries).toBe(5);
      expect(supabaseDb.getAllUsers).toHaveBeenCalled();
      expect(supabaseDb.getCurrentUserUsage).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully', async () => {
      (adminAuth.requireAdmin as jest.Mock).mockResolvedValue(null);
      (supabaseDb.getAllUsers as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createMockRequest({
        url: 'http://localhost:3000/api/admin/users',
      });

      const response = await GET(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Failed to fetch users');
    });
  });
});
