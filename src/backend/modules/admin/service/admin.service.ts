/**
 * Admin Service Layer - Business Logic
 *
 * Handles all business logic for admin operations
 */

import * as adminDao from '../dao/admin.dao';
import type { Profile } from '@lib/supabase/db';
import { getStripe } from '@lib/stripe/client';

// ============================================================================
// TYPES
// ============================================================================

export interface GetUsersParams {
  email?: string;
  tier?: string;
  status?: string;
  isActive?: boolean;
}

export interface GetUsersResult {
  users: Profile[];
  total: number;
}

export interface DeactivateUserParams {
  userId: string;
  adminId: string;
  reason: string;
  notes?: string;
  cancelSubscription?: boolean;
}

export interface ReactivateUserParams {
  userId: string;
  adminId: string;
}

export interface ChangeTierParams {
  userId: string;
  adminId: string;
  newTier: string;
}

export interface RefundParams {
  userId: string;
  adminId: string;
  amount?: number; // If not provided, refund last payment
  reason?: string;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * Get all users with filters
 */
export async function getUsers(params: GetUsersParams): Promise<GetUsersResult> {
  const users = await adminDao.getAllUsers({
    email: params.email,
    tier: params.tier,
    status: params.status,
    isActive: params.isActive,
  });

  return {
    users,
    total: users.length,
  };
}

/**
 * Get single user details
 */
export async function getUserDetails(userId: string): Promise<Profile | null> {
  return adminDao.getUserById(userId);
}

/**
 * Get user's billing history
 */
export async function getUserBillingHistory(userId: string) {
  return adminDao.getUserBillingHistory(userId);
}

/**
 * Get user's transactions
 */
export async function getUserTransactions(userId: string) {
  return adminDao.getUserTransactions(userId);
}

// ============================================================================
// USER ACTIONS
// ============================================================================

/**
 * Deactivate a user account
 */
export async function deactivateUser(params: DeactivateUserParams): Promise<Profile> {
  const { userId, adminId, reason, notes, cancelSubscription } = params;

  // Get user before deactivation
  const userBefore = await adminDao.getUserById(userId);
  if (!userBefore) {
    throw new Error('User not found');
  }

  // Cancel Stripe subscription if requested and user has one
  if (cancelSubscription && userBefore.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(userBefore.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      console.error('Failed to cancel Stripe subscription:', error);
      // Continue with deactivation even if Stripe fails
    }
  }

  // Deactivate user
  const userAfter = await adminDao.deactivateUser(userId, reason);

  // Log deactivation
  await adminDao.logDeactivation({
    user_id: userId,
    admin_id: adminId,
    reason,
    notes,
  });

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'deactivate_user',
    entity_type: 'user',
    entity_id: userId,
    before_state: { is_active: userBefore.is_active },
    after_state: { is_active: userAfter.is_active },
  });

  return userAfter;
}

/**
 * Reactivate a user account
 */
export async function reactivateUser(params: ReactivateUserParams): Promise<Profile> {
  const { userId, adminId } = params;

  // Get user before reactivation
  const userBefore = await adminDao.getUserById(userId);
  if (!userBefore) {
    throw new Error('User not found');
  }

  // Reactivate user
  const userAfter = await adminDao.reactivateUser(userId);

  // Log reactivation
  await adminDao.logReactivation(userId, adminId);

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'reactivate_user',
    entity_type: 'user',
    entity_id: userId,
    before_state: { is_active: userBefore.is_active },
    after_state: { is_active: userAfter.is_active },
  });

  return userAfter;
}

/**
 * Change user's tier
 */
export async function changeUserTier(params: ChangeTierParams): Promise<Profile> {
  const { userId, adminId, newTier } = params;

  // Validate tier
  const validTiers = ['free', 'basic', 'premium'];
  if (!validTiers.includes(newTier)) {
    throw new Error(`Invalid tier: ${newTier}`);
  }

  // Get user before change
  const userBefore = await adminDao.getUserById(userId);
  if (!userBefore) {
    throw new Error('User not found');
  }

  // Change tier
  const userAfter = await adminDao.changeUserTier(userId, newTier);

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'change_tier',
    entity_type: 'user',
    entity_id: userId,
    before_state: { tier: userBefore.tier },
    after_state: { tier: userAfter.tier },
  });

  return userAfter;
}

/**
 * Cancel user's subscription
 */
export async function cancelUserSubscription(
  userId: string,
  adminId: string,
  immediate = false
): Promise<void> {
  const user = await adminDao.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripe_subscription_id) {
    throw new Error('User has no active subscription');
  }

  const stripe = getStripe();

  if (immediate) {
    // Cancel immediately
    await stripe.subscriptions.cancel(user.stripe_subscription_id);
  } else {
    // Cancel at period end
    await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: immediate ? 'cancel_subscription_immediate' : 'cancel_subscription_period_end',
    entity_type: 'subscription',
    entity_id: user.stripe_subscription_id,
  });
}

/**
 * Process refund for user
 */
export async function refundUser(params: RefundParams): Promise<void> {
  const { userId, adminId, amount, reason } = params;

  const user = await adminDao.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripe_customer_id) {
    throw new Error('User has no Stripe customer');
  }

  const stripe = getStripe();

  // Get the latest payment intent
  const paymentIntents = await stripe.paymentIntents.list({
    customer: user.stripe_customer_id,
    limit: 1,
  });

  if (paymentIntents.data.length === 0) {
    throw new Error('No payment found to refund');
  }

  const paymentIntent = paymentIntents.data[0];
  const refundAmount = amount || paymentIntent.amount;

  // Create refund
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntent.id,
    amount: refundAmount,
    reason: 'requested_by_customer',
    metadata: {
      admin_id: adminId,
      admin_reason: reason || 'Admin refund',
    },
  });

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'refund_payment',
    entity_type: 'payment',
    entity_id: paymentIntent.id,
    after_state: {
      refund_id: refund.id,
      amount_cents: refundAmount,
      reason,
    },
  });
}

/**
 * Extend user's trial period
 */
export async function extendTrial(
  userId: string,
  adminId: string,
  days: number
): Promise<Profile> {
  const user = await adminDao.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Calculate new trial end date
  const currentTrialEnd = user.trial_ends_at
    ? new Date(user.trial_ends_at)
    : new Date();

  const newTrialEnd = new Date(currentTrialEnd.getTime() + days * 24 * 60 * 60 * 1000);

  // Update user
  const userAfter = await adminDao.updateUser(userId, {
    trial_ends_at: newTrialEnd.toISOString(),
  });

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'extend_trial',
    entity_type: 'user',
    entity_id: userId,
    before_state: { trial_ends_at: user.trial_ends_at },
    after_state: { trial_ends_at: newTrialEnd.toISOString(), days_extended: days },
  });

  return userAfter;
}

/**
 * Sync user's subscription from Stripe
 */
export async function syncUserSubscription(
  userId: string,
  adminId: string
): Promise<Profile> {
  const user = await adminDao.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripe_subscription_id) {
    throw new Error('User has no subscription to sync');
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

  // Update user with Stripe data
  const userAfter = await adminDao.updateUser(userId, {
    subscription_status: subscription.status,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  });

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'sync_subscription',
    entity_type: 'subscription',
    entity_id: user.stripe_subscription_id,
    after_state: {
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
  });

  return userAfter;
}
