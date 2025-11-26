/**
 * Admin Authorization Helpers
 *
 * Utilities for checking admin status and protecting admin routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUser } from './session';
import { isUserAdmin } from '@/lib/supabase/db';

/**
 * Check if the current user is an admin
 * Returns the user profile if admin, null otherwise
 */
export async function checkAdminAuth(request: NextRequest): Promise<{
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}> {
  try {
    // Get session user
    const user = await getUser();

    if (!user) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Not authenticated',
      };
    }

    // Check if user is admin
    const adminStatus = await isUserAdmin(user.id);

    if (!adminStatus) {
      return {
        isAdmin: false,
        userId: user.id,
        error: 'Unauthorized - admin access required',
      };
    }

    return {
      isAdmin: true,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return {
      isAdmin: false,
      userId: null,
      error: 'Authentication error',
    };
  }
}

/**
 * Middleware wrapper for admin-only routes
 * Returns an error response if user is not an admin
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const authCheck = await checkAdminAuth(request);

  if (!authCheck.isAdmin) {
    return NextResponse.json(
      {
        error: authCheck.error || 'Unauthorized',
        code: 'ADMIN_REQUIRED',
      },
      { status: authCheck.userId ? 403 : 401 }
    );
  }

  // Return null to indicate auth passed
  return null;
}
