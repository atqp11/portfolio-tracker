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
import { z } from 'zod';
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
import { adminUsersResponseSchema, type AdminUserDto } from '@backend/modules/admin/dto/admin.dto';
import {
  getUsersInputSchema,
  getUserByIdInputSchema,
  getWebhookLogsInputSchema,
  billingOverviewSchema,
  userDetailsSchema,
  getUsersResultSchema,
  type GetUsersInput,
  type BillingOverviewDto,
  type UserDetailsDto,
  type GetUsersResultDto,
} from '@backend/modules/admin/zod/admin.schemas';

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
   * 
   * @deprecated This HTTP route has been removed. Use `getUserDetailsData()` for RSC pages instead.
   * This method is kept for reference only and is no longer accessible via HTTP.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `deactivateUser()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `reactivateUser()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `changeTier()` or `updateUserTier()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `cancelSubscription()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `refundUser()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `extendTrial()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `syncSubscription()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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
   * Update user tier or admin status
   * 
   * @deprecated This HTTP route has been removed. Use server actions instead:
   * - For tier updates: `updateUserTierData()` controller method (called by `updateUserTier()` server action)
   * - For admin status updates: `updateAdminStatusData()` controller method (called by `updateAdminStatus()` server action)
   * This method is kept for reference only and is no longer accessible via HTTP.
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
   * 
   * @deprecated This HTTP route is deprecated. Use the `resetUserQuota()` server action instead.
   * This method is kept for backward compatibility but should not be used in new code.
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

  // ============================================================================
  // RSC PAGE METHODS (Non-HTTP, return DTOs directly)
  // These methods validate inputs and outputs using Zod schemas
  // ============================================================================

  /**
   * Get all users with usage data (for RSC pages)
   * Validates output with Zod schema
   * Returns DTO directly, no NextResponse wrapping
   */
  async getAllUsersData(): Promise<AdminUserDto[]> {
    const users = await usersService.fetchAllUsersWithUsage();
    
    // Validate each user against schema
    users.forEach(user => adminUsersResponseSchema.shape.users.element.parse(user));
    
    return users;
  }

  /**
   * Get users with pagination (for RSC pages)
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   */
  async getUsersPaginated(page: number = 1, limit: number = 50) {
    const result = await usersService.fetchUsersWithPagination(page, limit);
    
    // Validate each user against schema
    result.users.forEach(user => adminUsersResponseSchema.shape.users.element.parse(user));
    
    return result;
  }

  /**
   * Get billing overview data (for RSC pages)
   * Validates output with Zod schema
   */
  async getBillingOverviewData(): Promise<BillingOverviewDto> {
    const overview = await adminService.getBillingOverview();
    
    // Validate output
    return billingOverviewSchema.parse(overview);
  }

  /**
   * Get webhook logs (for RSC pages)
   * Validates input with Zod schema
   */
  async getWebhookLogsData(limit: number = 100) {
    // Validate input
    const validated = getWebhookLogsInputSchema.parse({ limit });
    
    return await adminService.getWebhookLogs(validated.limit);
  }

  /**
   * Get webhook logs with pagination (for RSC pages)
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   */
  async getWebhookLogsPaginated(page: number = 1, limit: number = 50) {
    return await adminService.getWebhookLogsPaginated(page, limit);
  }

  /**
   * Get sync errors (for RSC pages)
   * No input validation needed
   */
  async getSyncErrorsData() {
    return await adminService.getSyncErrors();
  }

  /**
   * Get users with filters (for RSC pages)
   * Validates input and output with Zod schemas
   */
  async getUsersData(params?: GetUsersInput): Promise<GetUsersResultDto> {
    // Validate input
    const validated = getUsersInputSchema.parse(params);
    
    const result = await adminService.getUsers(validated || {});
    
    // Validate output
    return getUsersResultSchema.parse(result);
  }

  /**
   * Get user details (for RSC pages)
   * Validates input with Zod schema
   * Returns raw Profile type (service already returns correct type)
   */
  async getUserDetailsData(userId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.getUserDetails(userId);
  }

  /**
   * Get user billing history (for RSC pages)
   * Validates input with Zod schema
   */
  async getUserBillingHistoryData(userId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.getUserBillingHistory(userId);
  }

  /**
   * Get user transactions (for RSC pages)
   * Validates input with Zod schema
   */
  async getUserTransactionsData(userId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.getUserTransactions(userId);
  }

  /**
   * Get Stripe subscription status (for RSC pages)
   * Validates input with Zod schema
   */
  async getStripeSubscriptionStatusData(userId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.getStripeSubscriptionStatus(userId);
  }

  // ============================================================================
  // RSC SERVER ACTION METHODS (Non-HTTP, for server actions)
  // These methods validate inputs using Zod schemas and call services
  // ============================================================================

  /**
   * Sync user subscription from Stripe (for server actions)
   * Validates input with Zod schema
   */
  async syncSubscriptionData(userId: string, adminId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.syncUserSubscription(userId, adminId);
  }

  /**
   * Cancel user subscription (for server actions)
   * Validates input with Zod schema
   */
  async cancelSubscriptionData(userId: string, adminId: string, immediately: boolean = false) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.cancelUserSubscription(userId, adminId, immediately);
  }

  /**
   * Change user tier (for server actions)
   * Validates input with Zod schema
   */
  async changeTierData(userId: string, adminId: string, newTier: 'free' | 'basic' | 'premium') {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    z.enum(['free', 'basic', 'premium']).parse(newTier);
    
    return await adminService.changeUserTier({
      userId,
      adminId,
      newTier,
    });
  }

  /**
   * Extend user trial (for server actions)
   * Validates input with Zod schema
   */
  async extendTrialData(userId: string, adminId: string, days: number) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    z.number().int().positive().max(365, 'Cannot extend trial more than 365 days').parse(days);
    
    return await adminService.extendTrial(userId, adminId, days);
  }

  /**
   * Deactivate user account (for server actions)
   * Validates input with Zod schema
   */
  async deactivateUserData(
    userId: string,
    adminId: string,
    reason?: string,
    notes?: string,
    cancelSubscription?: boolean
  ) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.deactivateUser({
      userId,
      adminId,
      reason: reason || 'Admin deactivation',
      notes,
      cancelSubscription: cancelSubscription || false,
    });
  }

  /**
   * Reactivate user account (for server actions)
   * Validates input with Zod schema
   */
  async reactivateUserData(userId: string, adminId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    return await adminService.reactivateUser({
      userId,
      adminId,
    });
  }

  /**
   * Update user tier (for server actions)
   * Alias for changeTierData - can be used for simple tier updates without reason requirement
   * Validates input with Zod schema
   */
  async updateUserTierData(userId: string, adminId: string, newTier: 'free' | 'basic' | 'premium') {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    z.enum(['free', 'basic', 'premium']).parse(newTier);
    
    return await adminService.changeUserTier({
      userId,
      adminId,
      newTier,
    });
  }

  /**
   * Update user admin status (for server actions)
   * Validates input with Zod schema
   */
  async updateAdminStatusData(userId: string, adminId: string, isAdmin: boolean) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    z.boolean().parse(isAdmin);
    
    // Get current user to log before state
    const user = await adminService.getUserDetails(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Import the database function
    const { updateUserAdminStatus } = await import('@lib/supabase/db');
    const result = await updateUserAdminStatus(userId, isAdmin);
    
    if (!result) {
      throw new Error('Failed to update admin status');
    }
    
    // Log admin action
    const adminDao = await import('@backend/modules/admin/dao/admin.dao');
    await adminDao.logAdminAction({
      admin_id: adminId,
      target_user_id: userId,
      action: isAdmin ? 'grant_admin' : 'revoke_admin',
      entity_type: 'user',
      entity_id: userId,
      before_state: { is_admin: user.is_admin },
      after_state: { is_admin: isAdmin },
    });
    
    return result;
  }

  /**
   * Reset user quota (for server actions)
   * Validates input with Zod schema
   */
  async resetUserQuotaData(userId: string, adminId: string) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    
    // Verify user exists
    const user = await adminService.getUserDetails(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Delete all usage tracking records for this user
    const { createAdminClient } = await import('@lib/supabase/admin');
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('usage_tracking')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to reset quota: ${error.message}`);
    }

    // Log admin action
    const adminDao = await import('@backend/modules/admin/dao/admin.dao');
    await adminDao.logAdminAction({
      admin_id: adminId,
      target_user_id: userId,
      action: 'reset_user_quota',
      entity_type: 'user',
      entity_id: userId,
      after_state: { quota_reset: true },
    });

    return { success: true, userId };
  }

  /**
   * Refund user payment (for server actions)
   * Validates input with Zod schema
   */
  async refundUserData(
    userId: string,
    adminId: string,
    amountCents: number,
    reason: string,
    note?: string
  ) {
    // Validate input
    getUserByIdInputSchema.parse({ userId });
    z.number().int().positive().parse(amountCents);
    z.string().min(1, 'Reason is required').parse(reason);
    
    await adminService.refundUser({
      userId,
      adminId,
      amount: amountCents,
      reason,
    });

    return { success: true, userId };
  }

  /**
   * Clear cache (for server actions)
   * Validates input with Zod schema
   */
  async clearCacheData(adminId: string) {
    // Validate admin access (adminId is already validated by authGuard)
    const result = await adminService.clearCache();
    
    // Log admin action
    const adminDao = await import('@backend/modules/admin/dao/admin.dao');
    await adminDao.logAdminAction({
      admin_id: adminId,
      action: 'clear_cache',
      entity_type: 'system',
      entity_id: 'cache',
      after_state: { stats: result.stats },
    });

    return result;
  }

  /**
   * Retry webhook event (for server actions)
   * Validates input with Zod schema
   */
  async retryWebhookData(eventId: string, adminId: string) {
    // Validate input
    const { retryWebhookInputSchema } = await import('@backend/modules/admin/zod/admin.schemas');
    retryWebhookInputSchema.parse({ eventId });
    
    // Call retry service
    const { retryWebhookEvent } = await import('@backend/modules/admin/service/retry.service');
    const result = await retryWebhookEvent(eventId);
    
    // Log admin action
    const adminDao = await import('@backend/modules/admin/dao/admin.dao');
    await adminDao.logAdminAction({
      admin_id: adminId,
      action: 'retry_webhook',
      entity_type: 'webhook',
      entity_id: eventId,
      after_state: { retryCount: result.retryCount, success: result.success },
    });

    return result;
  }
}

export const adminController = new AdminController();
