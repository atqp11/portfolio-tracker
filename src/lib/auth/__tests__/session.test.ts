/**
 * Session Auth Helpers Tests
 *
 * Tests for authentication helpers including requireAdmin()
 */

import {
  getUser,
  requireUser,
  getUserProfile,
  requireUserProfile,
  requireAdmin,
  userHasTier,
} from '../session';
import { createClient } from '@lib/supabase/server';
import { redirect } from 'next/navigation';

// Mock dependencies
jest.mock('@lib/supabase/server');
jest.mock('next/navigation', () => ({
  redirect: jest.fn((url: string) => {
    // Next.js redirect throws to stop execution
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('Session Auth Helpers', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      auth: {
        getUser: jest.fn(),
        getSession: jest.fn(),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
    };

    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  describe('getUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getUser();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error'),
      });

      const result = await getUser();

      expect(result).toBeNull();
    });
  });

  describe('requireUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await requireUser();

      expect(result).toEqual(mockUser);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect to signin when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT: /auth/signin');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });
  });

  describe('getUserProfile', () => {
    it('should return profile for authenticated user', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = {
        id: 'user-1',
        email: 'user@example.com',
        tier: 'basic',
        is_admin: false,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const result = await getUserProfile();

      expect(result).toEqual(mockProfile);
    });

    it('should throw error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(getUserProfile()).rejects.toThrow('User not authenticated');
    });

    it('should throw error when profile fetch fails', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Profile not found'),
        }),
      });

      await expect(getUserProfile()).rejects.toThrow('Failed to fetch user profile');
    });
  });

  describe('requireAdmin', () => {
    it('should return profile for admin user', async () => {
      const mockUser = { id: 'admin-1', email: 'admin@example.com' };
      const mockProfile = {
        id: 'admin-1',
        email: 'admin@example.com',
        tier: 'premium',
        is_admin: true,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const result = await requireAdmin();

      expect(result).toEqual(mockProfile);
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect non-admin user to dashboard', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = {
        id: 'user-1',
        email: 'user@example.com',
        tier: 'basic',
        is_admin: false,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT: /dashboard');
      expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect to signin when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // requireAdmin calls requireUserProfile which calls requireUser
      // requireUser will redirect (throw) before reaching profile fetch
      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT: /auth/signin');
      expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
    });

    it('should redirect when is_admin is null', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = {
        id: 'user-1',
        email: 'user@example.com',
        tier: 'basic',
        is_admin: null,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT: /dashboard');
      expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect when is_admin is false', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = {
        id: 'user-1',
        email: 'user@example.com',
        tier: 'basic',
        is_admin: false,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT: /dashboard');
      expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('userHasTier', () => {
    it('should return true for exact tier match', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = { id: 'user-1', tier: 'basic' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const result = await userHasTier('basic');

      expect(result).toBe(true);
    });

    it('should return true for higher tier', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = { id: 'user-1', tier: 'premium' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const result = await userHasTier('basic');

      expect(result).toBe(true);
    });

    it('should return false for lower tier', async () => {
      const mockUser = { id: 'user-1', email: 'user@example.com' };
      const mockProfile = { id: 'user-1', tier: 'free' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProfile,
          error: null,
        }),
      });

      const result = await userHasTier('premium');

      expect(result).toBe(false);
    });

    it('should throw when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // userHasTier calls getUserProfile which throws when not authenticated
      await expect(userHasTier('basic')).rejects.toThrow('User not authenticated');
    });
  });
});
