/**
 * Auth Middleware
 *
 * Wraps existing authentication functions from lib/auth/session.ts
 * Provides middleware interface for authentication and authorization.
 */

import { NextRequest } from 'next/server';
import {
  getUser,
  getUserProfile,
  userHasTier,
  requireUser,
  requireUserProfile,
  requireTier,
  User,
  UserProfile,
} from '@lib/auth/session';
import { TierName } from '@lib/tiers/config';
import { UnauthorizedError, ForbiddenError } from './error-handler.middleware';

/**
 * Auth context type
 */
export interface AuthContext {
  user: User;
  profile: UserProfile;
}

/**
 * Auth Middleware
 */
export class AuthMiddleware {
  /**
   * Get current user (returns null if not authenticated)
   */
  static async getCurrentUser(): Promise<User | null> {
    return getUser();
  }

  /**
   * Get current user profile
   */
  static async getCurrentProfile(): Promise<UserProfile | null> {
    return getUserProfile();
  }

  /**
   * Require authentication (throws if not authenticated)
   */
  static async requireAuth(): Promise<User> {
    const user = await getUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    return user;
  }

  /**
   * Require user profile (throws if not found)
   */
  static async requireProfile(): Promise<UserProfile> {
    const profile = await getUserProfile();
    if (!profile) {
      throw new UnauthorizedError('User profile not found');
    }
    return profile;
  }

  /**
   * Require specific tier (throws if user doesn't have tier)
   */
  static async requireMinimumTier(tier: TierName): Promise<UserProfile> {
    const profile = await this.requireProfile();

    const hasTier = await userHasTier(tier);
    if (!hasTier) {
      throw new ForbiddenError(
        `This feature requires ${tier} tier or higher`
      );
    }

    return profile;
  }

  /**
   * Check if user has specific tier
   */
  static async hasTier(tier: TierName): Promise<boolean> {
    return userHasTier(tier);
  }

  /**
   * Get full auth context (user + profile)
   */
  static async getAuthContext(): Promise<AuthContext | null> {
    const user = await getUser();
    if (!user) return null;

    const profile = await getUserProfile();
    if (!profile) return null;

    return { user, profile };
  }

  /**
   * Require full auth context
   */
  static async requireAuthContext(): Promise<AuthContext> {
    const user = await this.requireAuth();
    const profile = await this.requireProfile();

    return { user, profile };
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(): Promise<boolean> {
    const profile = await getUserProfile();
    return profile?.is_admin === true;
  }

  /**
   * Require admin access
   */
  static async requireAdmin(): Promise<UserProfile> {
    const profile = await this.requireProfile();

    if (!profile.is_admin) {
      throw new ForbiddenError('Admin access required');
    }

    return profile;
  }

  /**
   * Check if user owns resource
   */
  static checkOwnership(userId: string, resourceUserId: string): void {
    if (userId !== resourceUserId) {
      throw new ForbiddenError('You do not have access to this resource');
    }
  }

  /**
   * Require user owns resource or is admin
   */
  static async requireOwnershipOrAdmin(
    resourceUserId: string
  ): Promise<UserProfile> {
    const profile = await this.requireProfile();

    // Admin can access any resource
    if (profile.is_admin) {
      return profile;
    }

    // Otherwise, must be owner
    this.checkOwnership(profile.id, resourceUserId);
    return profile;
  }
}

/**
 * Decorator for requiring authentication
 */
export function RequireAuth() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await AuthMiddleware.requireAuth();
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Decorator for requiring specific tier
 */
export function RequireTier(tier: TierName) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await AuthMiddleware.requireMinimumTier(tier);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Decorator for requiring admin access
 */
export function RequireAdmin() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      await AuthMiddleware.requireAdmin();
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Higher-order function to wrap route handlers with auth
 */
export function withAuth<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    await AuthMiddleware.requireAuth();
    return handler(...args);
  }) as T;
}

/**
 * Higher-order function to wrap route handlers with tier requirement
 */
export function withTier<T extends (...args: any[]) => Promise<any>>(
  tier: TierName,
  handler: T
): T {
  return (async (...args: any[]) => {
    await AuthMiddleware.requireMinimumTier(tier);
    return handler(...args);
  }) as T;
}

/**
 * Higher-order function to wrap route handlers with admin requirement
 */
export function withAdmin<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    await AuthMiddleware.requireAdmin();
    return handler(...args);
  }) as T;
}

/**
 * Admin context that includes the admin user profile
 */
export interface AdminContext {
  admin: UserProfile;
}

/**
 * Higher-order function to wrap route handlers with admin requirement
 * and inject admin context
 */
export function withAdminContext(
  handler: (
    request: NextRequest,
    context: { params?: any; body?: any; query?: any; admin: UserProfile }
  ) => Promise<any>
) {
  return async (
    request: NextRequest,
    context: { params?: any; body?: any; query?: any }
  ): Promise<any> => {
    const admin = await AuthMiddleware.requireAdmin();
    return handler(request, { ...context, admin });
  };
}
