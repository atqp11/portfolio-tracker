/**
 * Admin Controller Layer - HTTP Logic
 *
 * Handles HTTP request/response for admin operations
 * Thin wrapper that delegates to service layer
 */

import { NextRequest, NextResponse } from 'next/server';
import { usersService } from './service/users.service';
import * as adminService from './service/admin.service';

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
  async getUsers(req: NextRequest): Promise<NextResponse> {
    try {
      const users = await usersService.fetchAllUsersWithUsage();
      return successResponse({ users, total: users.length });
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
  async getUserById(userId: string): Promise<NextResponse> {
    try {
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
  async getBillingHistory(userId: string): Promise<NextResponse> {
    try {
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
  async getTransactions(userId: string): Promise<NextResponse> {
    try {
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
    userId: string,
    adminId: string,
    body: { reason: string; notes?: string; cancelSubscription?: boolean }
  ): Promise<NextResponse> {
    try {
      const user = await adminService.deactivateUser({
        userId,
        adminId,
        reason: body.reason,
        notes: body.notes,
        cancelSubscription: body.cancelSubscription,
      });

      return successResponse({ user });
    } catch (error) {
      console.error('Error deactivating user:', error);
      return errorResponse(
        'Failed to deactivate user',
        500,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * POST /api/admin/users/[userId]/reactivate
   * Reactivate user account
   */
  async reactivateUser(userId: string, adminId: string): Promise<NextResponse> {
    try {
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
    userId: string,
    adminId: string,
    body: { tier: string }
  ): Promise<NextResponse> {
    try {
      const user = await adminService.changeUserTier({
        userId,
        adminId,
        newTier: body.tier,
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
    userId: string,
    adminId: string,
    body?: { immediate?: boolean }
  ): Promise<NextResponse> {
    try {
      await adminService.cancelUserSubscription(
        userId,
        adminId,
        body?.immediate || false
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
    userId: string,
    adminId: string,
    body: { amount?: number; reason?: string }
  ): Promise<NextResponse> {
    try {
      await adminService.refundUser({
        userId,
        adminId,
        amount: body.amount,
        reason: body.reason,
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
    userId: string,
    adminId: string,
    body: { days: number }
  ): Promise<NextResponse> {
    try {
      const user = await adminService.extendTrial(userId, adminId, body.days);

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
  async syncSubscription(userId: string, adminId: string): Promise<NextResponse> {
    try {
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
}

export const adminController = new AdminController();
