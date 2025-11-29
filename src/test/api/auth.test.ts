/**
 * Auth API Tests
 *
 * Tests for authentication-related API routes.
 */

import { POST as SignOut } from '@app/api/auth/signout/route';
import { GET as GetUser } from '@app/api/auth/user/route';
import { POST as CreateUser } from '@app/api/auth/create-user/route';
import { createMockRequest, extractJSON } from '../helpers/test-utils';
import * as supabaseDb from '@lib/supabase/db';

// Mock dependencies
jest.mock('@lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signOut: jest.fn(),
    },
  })),
}));

jest.mock('@lib/supabase/db');

// Mock service role Supabase client for create-user
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
  })),
}));

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/signout', () => {
    it('should sign out successfully', async () => {
      const { createClient } = require('@lib/supabase/server');
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: null }),
        },
      };
      createClient.mockResolvedValue(mockSupabase);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signout',
      });

      const response = await SignOut(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.signedOut).toBe(true);
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle signout errors', async () => {
      const { createClient } = require('@lib/supabase/server');
      const mockSupabase = {
        auth: {
          signOut: jest.fn().mockResolvedValue({ error: { message: 'Signout failed' } }),
        },
      };
      createClient.mockResolvedValue(mockSupabase);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/signout',
      });

      const response = await SignOut(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Signout failed');
    });
  });

  describe('GET /api/auth/user', () => {
    const mockProfile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      tier: 'free' as const,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
    };

    it('should return 400 if user ID is missing', async () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/auth/user',
      });

      const response = await GetUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    it('should return user profile successfully', async () => {
      (supabaseDb.getProfile as jest.Mock).mockResolvedValue(mockProfile);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/auth/user',
        searchParams: { id: 'user-123' },
      });

      const response = await GetUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockProfile.id);
      expect(data.data.email).toBe(mockProfile.email);
      expect(data.data.name).toBe(mockProfile.name);
      expect(supabaseDb.getProfile).toHaveBeenCalledWith('user-123');
    });

    it('should return 404 if profile not found', async () => {
      (supabaseDb.getProfile as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest({
        url: 'http://localhost:3000/api/auth/user',
        searchParams: { id: 'non-existent' },
      });

      const response = await GetUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('POST /api/auth/create-user', () => {
    const validUserData = {
      id: 'user-123',
      email: 'newuser@example.com',
      name: 'New User',
      tier: 'free',
    };

    const mockProfile = {
      ...validUserData,
      is_admin: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      stripe_customer_id: null,
      stripe_subscription_id: null,
      subscription_status: null,
    };

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        id: '',
        email: 'invalid-email',
      };

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/create-user',
        body: invalidData,
      });

      const response = await CreateUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return existing profile if already exists', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
            })),
          })),
          insert: jest.fn(),
        })),
      };
      createClient.mockReturnValue(mockSupabase);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/create-user',
        body: validUserData,
      });

      const response = await CreateUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockProfile.id);
    });

    it('should create new profile successfully', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
            })),
          })),
        })),
      };
      createClient.mockReturnValue(mockSupabase);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/create-user',
        body: validUserData,
      });

      const response = await CreateUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe(mockProfile.id);
      expect(data.data.email).toBe(mockProfile.email);
    });

    it('should handle database errors', async () => {
      const { createClient } = require('@supabase/supabase-js');
      const mockSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          insert: jest.fn(() => ({
            select: jest.fn(() => ({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
              }),
            })),
          })),
        })),
      };
      createClient.mockReturnValue(mockSupabase);

      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/create-user',
        body: validUserData,
      });

      const response = await CreateUser(request);
      const data = await extractJSON(response);

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });
});
