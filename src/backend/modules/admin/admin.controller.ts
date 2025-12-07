/**
 * Admin Controller Layer - HTTP Logic
 *
 * Handles HTTP request/response for admin operations
 * Thin wrapper that delegates to service layer
 * 
 * Uses context-based API compatible with middleware pattern:
 * - context.params: URL path parameters
 * - context.body: Validated request body
 * - context.query: Validated query parameters
 * - context.admin: Admin user profile (injected by withAdminContext)
 */

import { NextRequest, NextResponse } from 'next/server';
import { usersService } from '@backend/modules/admin/service/users.service';
import * as adminService from '@backend/modules/admin/service/admin.service';
import type { UserProfile } from '@lib/auth/session';
import type {
  GetUsersQuery,
  DeactivateUserInput,
  ReactivateUserInput,
  ChangeTierInput,
  RefundUserInput,
  ExtendTrialInput,
  CancelSubscriptionInput,
  UpdateUserInput,
} from '@lib/validators/admin-schemas';
import { adminUsersResponseSchema } from '@backend/modules/admin/dto/admin.dto';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Union type for all possible admin request body types
 */
type AdminRequestBody =
  | DeactivateUserInput
  | ReactivateUserInput
  | ChangeTierInput
  | RefundUserInput
  | ExtendTrialInput
  | CancelSubscriptionInput
  | UpdateUserInput
  | undefined;

/**
 * Union type for all possible admin request query types
 */
type AdminRequestQuery = GetUsersQuery | Record<string, never> | undefined;

/**
 * Base admin request context interface
 * Note: Individual methods use more specific context types, but this serves as a base
 */
interface AdminRequestContext {
  params?: { userId?: string; id?: string };
  body?: AdminRequestBody;
  query?: AdminRequestQuery;
  admin: UserProfile;
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function errorResponse(message: string, status = 500, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: { message, details },
    },
    { status }
  );
}

// ============================================================================
// ADMIN CONTROLLER CLASS
// ============================================================================

export class AdminController {
  // ============================================================================
  // USER MANAGEMENT
  // ============================================================================

  /**
   * GET /api/admin/users
   * List all users with optional filters
   */
  async getUsers(
    req: NextRequest,
    context: { query?: GetUsersQuery; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const users = await usersService.fetchAllUsersWithUsage();

      // Validate API contract (server -> client) — ensure camelCase shape per zod schema
      const validated = adminUsersResponseSchema.parse({ users, total: users.length });

      return successResponse(validated);
    } catch (error) {
      console.error('Error fetching users:', error);
      return errorResponse(
        'Failed to fetch users',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * GET /api/admin/users/[userId]
   * Get single user details
   */
  async getUserById(
    req: NextRequest,
    context: { params: { userId: string }; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const user = await adminService.getUserDetails(userId);

      if (!user) {
        return errorResponse('User not found', 404);
      }

      return successResponse({ user });
    } catch (error) {
      console.error('Error fetching user:', error);
      return errorResponse(
        'Failed to fetch user',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * GET /api/admin/users/[userId]/billing-history
   * Get user's billing history
   */
  async getBillingHistory(
    req: NextRequest,
    context: { params: { userId: string }; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const history = await adminService.getUserBillingHistory(userId);
      return successResponse({ history });
    } catch (error) {
      console.error('Error fetching billing history:', error);
      return errorResponse(
        'Failed to fetch billing history',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * GET /api/admin/users/[userId]/transactions
   * Get user's transaction log
   */
  async getTransactions(
    req: NextRequest,
    context: { params: { userId: string }; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const transactions = await adminService.getUserTransactions(userId);
      return successResponse({ transactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return errorResponse(
        'Failed to fetch transactions',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // ============================================================================
  // USER ACTIONS
  // ============================================================================

  /**
   * POST /api/admin/users/[userId]/deactivate
   * Deactivate user account
   */
  async deactivateUser(
    req: NextRequest,
    context: { params: { userId: string }; body: DeactivateUserInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const { reason, notes, cancelSubscription } = context.body;
      const adminId = context.admin.id;

      const user = await adminService.deactivateUser({
        userId,
        adminId,
        reason,
        notes,
        cancelSubscription,
      });

      return successResponse({ user });
    } catch (error) {
      console.error('Error deactivating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Return appropriate status codes for different error types
      let statusCode = 500;
      if (errorMessage.includes('cannot deactivate your own account')) {
        statusCode = 400; // Bad Request
      } else if (errorMessage.includes('last active admin')) {
        statusCode = 409; // Conflict
      }
      
      return errorResponse(
        errorMessage,
        statusCode,
        errorMessage
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/reactivate
   * Reactivate user account
   */
  async reactivateUser(
    req: NextRequest,
    context: { params: { userId: string }; body?: ReactivateUserInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const adminId = context.admin.id;

      const user = await adminService.reactivateUser({
        userId,
        adminId,
      });

      return successResponse({ user });
    } catch (error) {
      console.error('Error reactivating user:', error);
      return errorResponse(
        'Failed to reactivate user',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/change-tier
   * Change user's tier
   */
  async changeTier(
    req: NextRequest,
    context: { params: { userId: string }; body: ChangeTierInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const { tier } = context.body;
      const adminId = context.admin.id;

      const user = await adminService.changeUserTier({
        userId,
        adminId,
        newTier: tier,
      });

      return successResponse({ user });
    } catch (error) {
      console.error('Error changing tier:', error);
      return errorResponse(
        'Failed to change tier',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/cancel-subscription
   * Cancel user's subscription
   */
  async cancelSubscription(
    req: NextRequest,
    context: { params: { userId: string }; body?: CancelSubscriptionInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const immediately = context.body?.immediately || false;
      const adminId = context.admin.id;

      await adminService.cancelUserSubscription(
        userId,
        adminId,
        immediately
      );

      return successResponse({ message: 'Subscription canceled successfully' });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return errorResponse(
        'Failed to cancel subscription',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/refund
   * Process refund for user
   */
  async refundUser(
    req: NextRequest,
    context: { params: { userId: string }; body?: RefundUserInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const { amountCents, reason } = context.body || {};
      const adminId = context.admin.id;

      await adminService.refundUser({
        userId,
        adminId,
        amount: amountCents,
        reason,
      });

      return successResponse({ message: 'Refund processed successfully' });
    } catch (error) {
      console.error('Error processing refund:', error);
      return errorResponse(
        'Failed to process refund',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/extend-trial
   * Extend user's trial period
   */
  async extendTrial(
    req: NextRequest,
    context: { params: { userId: string }; body: ExtendTrialInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const { days } = context.body;
      const adminId = context.admin.id;

      const user = await adminService.extendTrial(userId, adminId, days);

      return successResponse({ user });
    } catch (error) {
      console.error('Error extending trial:', error);
      return errorResponse(
        'Failed to extend trial',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/sync-subscription
   * Sync user's subscription from Stripe
   */
  async syncSubscription(
    req: NextRequest,
    context: { params: { userId: string }; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const adminId = context.admin.id;

      const user = await adminService.syncUserSubscription(userId, adminId);

      return successResponse({ user });
    } catch (error) {
      console.error('Error syncing subscription:', error);
      return errorResponse(
        'Failed to sync subscription',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // ============================================================================
  // LEGACY ROUTES (from [id] folder)
  // ============================================================================

  /**
   * PUT /api/admin/users/[id]
   * Update user tier or admin status (legacy route)
   */
  async updateUser(
    req: NextRequest,
    context: { params: { userId: string }; body?: UpdateUserInput; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;
      const { tier, isAdmin } = context.body || {};

      const user = await adminService.getUserDetails(userId);
      if (!user) {
        return errorResponse('User not found', 404);
      }

      let updatedUser = user;

      // Update tier if provided
      if (tier !== undefined) {
        updatedUser = await adminService.changeUserTier({
          userId,
          adminId: context.admin.id,
          newTier: tier,
        });
      }

      // Update admin status if provided (transform camelCase to snake_case for database)
      if (isAdmin !== undefined) {
        const { updateUserAdminStatus } = await import('@lib/supabase/db');
        const result = await updateUserAdminStatus(userId, isAdmin);
        if (result) {
          updatedUser = { ...updatedUser, is_admin: result.is_admin };
        }
      }

      return successResponse({
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          tier: updatedUser.tier,
          isAdmin: updatedUser.is_admin, // Transform to camelCase for API response
        },
      });
    } catch (error) {
      console.error('Error updating user:', error);
      return errorResponse(
        'Failed to update user',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * DELETE /api/admin/users/[userId]/quota
   * Reset user's quota (delete usage tracking records)
   */
  async resetUserQuota(
    req: NextRequest,
    context: { params: { userId: string }; admin: UserProfile }
  ): Promise<NextResponse> {
    try {
      const { userId } = context.params;

      const user = await adminService.getUserDetails(userId);
      if (!user) {
        return errorResponse('User not found', 404);
      }

      // Delete all usage tracking records for this user
      const { createAdminClient } = await import('@lib/supabase/admin');
      const supabase = createAdminClient();
      const { error } = await supabase
        .from('usage_tracking')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting quota:', error);
        return errorResponse('Failed to reset quota', 500, error.message);
      }

      return successResponse({
        message: 'User quota reset successfully',
        userId,
      });
    } catch (error) {
      console.error('Error resetting quota:', error);
      return errorResponse(
        'Failed to reset quota',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

export const adminController = new AdminController();
