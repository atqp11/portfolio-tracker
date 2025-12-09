/**
 * Admin Service Layer - Business Logic
 *
 * Handles all business logic for admin operations
 */

import * as adminDao from '@backend/modules/admin/dao/admin.dao';
import type { Profile } from '@lib/supabase/db';
import { getStripe } from '@lib/stripe/client';
import { getCacheAdapter } from '@lib/cache/adapter';
import type Stripe from 'stripe';

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
 * Get user's billing history (Stripe invoices)
 */
export async function getUserBillingHistory(userId: string) {
  // Get user's Stripe customer ID
  const user = await adminDao.getUserById(userId);
  if (!user?.stripe_customer_id) {
    return []; // Return empty array if no customer ID
  }

  // Get invoices from Stripe
  const stripe = getStripe();
  if (!stripe) {
    return []; // Return empty array if Stripe not configured
  }

  const invoices = await stripe.invoices.list({
    customer: user.stripe_customer_id,
    limit: 100,
  });

  return invoices.data;
}

/**
 * Get user's transactions
 */
export async function getUserTransactions(userId: string) {
  return adminDao.getUserTransactions(userId);
}

/**
 * Get Stripe subscription status for diagnostics
 * Returns status, tier, and mismatch information
 */
export async function getStripeSubscriptionStatus(userId: string): Promise<{ 
  status: string | null; 
  tier: string | null;
  lastSync: string | null;
  hasMismatch?: boolean;
  mismatchDetails?: {
    statusMismatch?: boolean;
    tierMismatch?: boolean;
    expectedTier?: string;
    expectedStatus?: string;
  };
}> {
  const user = await adminDao.getUserById(userId);
  if (!user?.stripe_subscription_id) {
    return { status: null, tier: null, lastSync: null };
  }

  const stripe = getStripe();
  if (!stripe) {
    return { status: null, tier: null, lastSync: null }; // Stripe not configured
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    
    // Get tier from subscription's price ID
    const priceId = subscription.items.data[0]?.price?.id;
    const { getTierFromPriceId } = await import('@lib/stripe/client');
    const expectedTier = getTierFromPriceId(priceId) || 'free';
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const expectedFinalTier = isActive ? expectedTier : 'free';
    
    // Check for mismatches
    const dbStatus = user.subscription_status || null;
    const stripeStatus = subscription.status;
    const statusMismatch = dbStatus !== stripeStatus;
    const tierMismatch = user.tier !== expectedFinalTier;
    const hasMismatch = statusMismatch || tierMismatch;
    
    return {
      status: stripeStatus,
      tier: expectedFinalTier,
      lastSync: user.updated_at || null,
      hasMismatch,
      mismatchDetails: hasMismatch ? {
        statusMismatch,
        tierMismatch,
        expectedTier: expectedFinalTier,
        expectedStatus: stripeStatus,
      } : undefined,
    };
  } catch (error) {
    console.error('Error fetching Stripe subscription:', error);
    return { status: null, tier: null, lastSync: null };
  }
}

// ============================================================================
// USER ACTIONS
// ============================================================================

/**
 * Deactivate a user account
 */
export async function deactivateUser(params: DeactivateUserParams): Promise<Profile> {
  const { userId, adminId, reason, notes, cancelSubscription } = params;

  // Prevent self-deactivation
  if (userId === adminId) {
    throw new Error('You cannot deactivate your own account');
  }

  // Get user before deactivation
  const userBefore = await adminDao.getUserById(userId);
  if (!userBefore) {
    throw new Error('User not found');
  }

  // Prevent deactivating the last active admin
  if (userBefore.is_admin) {
    const activeAdminCount = await adminDao.countActiveAdmins();
    if (activeAdminCount <= 1) {
      throw new Error('Cannot deactivate the last active admin. At least one admin must remain active.');
    }
  }

  // Cancel Stripe subscription if requested and user has one
  if (cancelSubscription && userBefore.stripe_subscription_id) {
    try {
      const stripe = getStripe();
      if (stripe) {
        await stripe.subscriptions.update(userBefore.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      } else {
        console.warn('Stripe not configured, skipping subscription cancellation');
      }
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
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

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
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

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
 * This includes syncing subscription status AND tier based on the subscription's price ID
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
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  
  const subscriptionResponse = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
  
  // Stripe SDK returns Response<Subscription> wrapper, extract the subscription
  // The period fields exist at runtime but aren't in the type definition
  type SubscriptionWithPeriods = {
    current_period_start: number;
    current_period_end: number;
  };
  const subscription = subscriptionResponse as unknown as Stripe.Subscription & SubscriptionWithPeriods;

  // Get tier from subscription's price ID
  const priceId = subscription.items.data[0]?.price?.id;
  const { getTierFromPriceId } = await import('@lib/stripe/client');
  const tier = getTierFromPriceId(priceId) || 'free';

  // Determine if subscription is active (for tier assignment)
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const finalTier = isActive ? tier : 'free';

  // Update user with Stripe data including tier
  const userAfter = await adminDao.updateUser(userId, {
    subscription_status: subscription.status,
    subscription_tier: tier, // Store the tier from subscription
    tier: finalTier, // Update the tier field used by quota system (free if not active)
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_ends_at: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
  });

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'sync_subscription',
    entity_type: 'subscription',
    entity_id: user.stripe_subscription_id,
    before_state: {
      status: user.subscription_status,
      tier: user.tier,
    },
    after_state: {
      status: subscription.status,
      tier: finalTier,
      cancel_at_period_end: subscription.cancel_at_period_end,
    },
  });

  return userAfter;
}

// ============================================================================
// BILLING OVERVIEW
// ============================================================================

/**
 * Get user statistics
 */
export async function getUserStats() {
  const allUsers = await adminDao.getAllUsers();
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const totalUsers = allUsers.length;
  const newUsers = allUsers.filter((u) => {
    const createdAt = new Date(u.created_at);
    return createdAt >= thirtyDaysAgo;
  }).length;
  const inactiveUsers = allUsers.filter((u) => !u.is_active).length;

  return {
    totalUsers,
    newUsers,
    inactiveUsers,
  };
}

/**
 * Get billing overview metrics
 */
export async function getBillingOverview() {
  const allUsers = await adminDao.getAllUsers();
  const stripe = getStripe();
  const isStripeAvailable = stripe !== null;

  // User stats (always available - from DB)
  const userStats = await getUserStats();

  // Subscription stats (always available - from DB)
  const activeSubscriptions = allUsers.filter(
    (u) => u.subscription_status === 'active'
  ).length;

  const freeCount = allUsers.filter((u) => u.tier === 'free').length;
  const basicCount = allUsers.filter((u) => u.tier === 'basic').length;
  const premiumCount = allUsers.filter((u) => u.tier === 'premium').length;

  // MRR and Churn (require Stripe)
  let mrr = 0;
  let churn30Days = 0;
  let churn90Days = 0;
  let upcomingInvoices = { count: 0, totalAmount: 0 };

  if (isStripeAvailable) {
    mrr = await calculateMRR();
    churn30Days = await getChurnEvents(30);
    churn90Days = await getChurnEvents(90);

    // Upcoming invoices
    const upcomingInvoicesList = await stripe!.invoices.list({
      status: 'open',
      limit: 100,
    });

    const draftInvoices = await stripe!.invoices.list({
      status: 'draft',
      limit: 100,
    });

    const allUpcomingInvoices = [...upcomingInvoicesList.data, ...draftInvoices.data];
    upcomingInvoices = {
      count: allUpcomingInvoices.length,
      totalAmount: allUpcomingInvoices.reduce(
        (sum, inv) => sum + (inv.amount_due || 0),
        0
      ),
    };
  }

  return {
    userStats,
    subscriptionStats: {
      activeSubscriptions,
      tierBreakdown: {
        free: freeCount,
        basic: basicCount,
        premium: premiumCount,
      },
    },
    mrr,
    churn: {
      last30Days: churn30Days,
      last90Days: churn90Days,
    },
    upcomingInvoices,
    stripeConfigured: isStripeAvailable, // Add flag for UI
  };
}

/**
 * Calculate Monthly Recurring Revenue (MRR)
 */
export async function calculateMRR(): Promise<number> {
  const stripe = getStripe();
  if (!stripe) {
    return 0; // Return 0 if Stripe not configured
  }

  const allUsers = await adminDao.getAllUsers();
  const STRIPE_PRICES = {
    basic: 600, // $6.00 in cents
    premium: 1599, // $15.99 in cents
  };

  let mrr = 0;

  // Get active paid subscriptions
  const activePaidUsers = allUsers.filter(
    (u) =>
      u.subscription_status === 'active' &&
      (u.tier === 'basic' || u.tier === 'premium')
  );

  // For each active paid user, get their subscription from Stripe to get the actual amount
  // (in case of discounts or custom pricing)
  for (const user of activePaidUsers) {
    if (!user.stripe_subscription_id) {
      // Fallback to tier-based pricing if no Stripe subscription
      if (user.tier === 'basic') {
        mrr += STRIPE_PRICES.basic;
      } else if (user.tier === 'premium') {
        mrr += STRIPE_PRICES.premium;
      }
      continue;
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(
        user.stripe_subscription_id
      );
      // Get the amount from the subscription's price
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) {
        const price = await stripe.prices.retrieve(priceId);
        // MRR is the recurring amount per month
        if (price.recurring?.interval === 'month') {
          mrr += price.unit_amount || 0;
        } else if (price.recurring?.interval === 'year') {
          // Convert annual to monthly
          mrr += (price.unit_amount || 0) / 12;
        }
      }
    } catch (error) {
      console.error(
        `Error fetching subscription ${user.stripe_subscription_id}:`,
        error
      );
      // Fallback to tier-based pricing
      if (user.tier === 'basic') {
        mrr += STRIPE_PRICES.basic;
      } else if (user.tier === 'premium') {
        mrr += STRIPE_PRICES.premium;
      }
    }
  }

  return mrr;
}

/**
 * Get churn events (subscription cancellations) for a given period
 */
export async function getChurnEvents(days: number): Promise<number> {
  const { createAdminClient } = await import('@lib/supabase/admin');
  const supabase = createAdminClient();
  const daysAgo = new Date();
  daysAgo.setDate(daysAgo.getDate() - days);

  const { data, error } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('event_type', 'customer.subscription.deleted')
    .gte('created_at', daysAgo.toISOString())
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching churn events:', error);
    return 0;
  }

  return data?.length || 0;
}

/**
 * Get webhook logs with latency and retry information (without pagination)
 */
export async function getWebhookLogs(limit = 100) {
  const { createAdminClient } = await import('@lib/supabase/admin');
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('stripe_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch webhook logs: ${error.message}`);
  }

  return (data || []).map((transaction) => {
    // Calculate latency
    let latency: number | null = null;
    if (transaction.created_at && transaction.processed_at) {
      const created = new Date(transaction.created_at).getTime();
      const processed = new Date(transaction.processed_at).getTime();
      latency = processed - created;
    }

    // Get retry count from metadata
    const metadata = (transaction.metadata as Record<string, unknown>) || {};
    const retryCount = (metadata.retryCount as number) || 0;
    const recoveryStatus = retryCount > 0 ? 'auto' : 'manual';

    return {
      id: transaction.id,
      eventId: transaction.stripe_event_id,
      eventType: transaction.event_type,
      status: transaction.status,
      latency,
      retryCount,
      recoveryStatus,
      createdAt: transaction.created_at,
      processedAt: transaction.processed_at,
      errorMessage: transaction.error_message,
    };
  });
}

/**
 * Get webhook logs with pagination
 * @param page - Page number (1-indexed)
 * @param limit - Items per page
 */
export async function getWebhookLogsPaginated(page = 1, limit = 50) {
  const { createAdminClient } = await import('@lib/supabase/admin');
  const supabase = createAdminClient();

  // Calculate offset
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Fetch total count
  const { count: total } = await supabase
    .from('stripe_transactions')
    .select('*', { count: 'exact', head: true });

  // Fetch paginated logs
  const { data, error } = await supabase
    .from('stripe_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch webhook logs: ${error.message}`);
  }

  const logs = (data || []).map((transaction) => {
    // Calculate latency
    let latency: number | null = null;
    if (transaction.created_at && transaction.processed_at) {
      const created = new Date(transaction.created_at).getTime();
      const processed = new Date(transaction.processed_at).getTime();
      latency = processed - created;
    }

    // Get retry count from metadata
    const metadata = (transaction.metadata as Record<string, unknown>) || {};
    const retryCount = (metadata.retryCount as number) || 0;
    const recoveryStatus = retryCount > 0 ? 'auto' : 'manual';

    return {
      id: transaction.id,
      eventId: transaction.stripe_event_id,
      eventType: transaction.event_type,
      status: transaction.status,
      latency,
      retryCount,
      recoveryStatus,
      createdAt: transaction.created_at,
      processedAt: transaction.processed_at,
      errorMessage: transaction.error_message,
    };
  });

  // Calculate pagination metadata
  const totalPages = Math.ceil((total || 0) / limit);
  const pagination = {
    page,
    limit,
    total: total || 0,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return {
    logs,
    pagination,
  };
}

/**
 * Get sync errors (failed webhooks with mismatch detection)
 */
export async function getSyncErrors() {
  const { createAdminClient } = await import('@lib/supabase/admin');
  const supabase = createAdminClient();
  const stripe = getStripe();
  const isStripeAvailable = stripe !== null;

  // Get all failed webhook transactions
  const { data: failedTransactions, error } = await supabase
    .from('stripe_transactions')
    .select('*')
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch sync errors: ${error.message}`);
  }

  const syncErrors = [];

  for (const transaction of failedTransactions || []) {
    if (!transaction.user_id || !transaction.stripe_subscription_id) {
      continue;
    }

    // Get user from DB
    const user = await adminDao.getUserById(transaction.user_id);
    if (!user) continue;

    // Get subscription from Stripe (only if Stripe is available)
    let stripeStatus: string | null = null;
    if (isStripeAvailable) {
      try {
        const subscription = await stripe!.subscriptions.retrieve(
          transaction.stripe_subscription_id
        );
        stripeStatus = subscription.status;
      } catch (error) {
        console.error(
          `Error fetching Stripe subscription ${transaction.stripe_subscription_id}:`,
          error
        );
      }
    }

    // Check for mismatch (only if we have Stripe status)
    const dbStatus = user.subscription_status;
    const hasMismatch = stripeStatus && stripeStatus !== dbStatus;

    // Check last retry status - if last retry succeeded after last failure, don't show error
    const metadata = (transaction.metadata as Record<string, unknown>) || {};
    const lastRetryStatus = metadata.lastRetryStatus as string | undefined;
    const lastRetryAt = metadata.lastRetryAt as string | undefined;

    // If last retry succeeded and was after the failure, don't show this error
    if (
      lastRetryStatus === 'completed' &&
      lastRetryAt &&
      transaction.created_at &&
      new Date(lastRetryAt) > new Date(transaction.created_at)
    ) {
      continue; // Skip this error as it was resolved
    }

    if (hasMismatch || transaction.status === 'failed') {
      syncErrors.push({
        userId: transaction.user_id,
        stripeEventId: transaction.stripe_event_id,
        mismatch: hasMismatch
          ? `Stripe says ${stripeStatus}, DB says ${dbStatus}`
          : transaction.error_message || 'Webhook processing failed',
        lastRetryStatus: lastRetryStatus || 'none',
        transactionId: transaction.id,
      });
    }
  }

  return syncErrors;
}

/**
 * Clear cache service
 * Clears all Redis cache entries and returns stats
 */
export async function clearCache(): Promise<{
  success: boolean;
  timestamp: string;
  message: string;
  stats?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}> {
  const cache = getCacheAdapter();

  // Get stats before clear
  const statsBefore = await cache.getStats();

  // Clear all cache entries
  await cache.clear();

  // Get stats after clear
  const statsAfter = await cache.getStats();

  // Convert CacheStats to Record<string, unknown> for DTO compatibility
  const statsBeforeRecord: Record<string, unknown> = {
    type: statsBefore.type,
    size: statsBefore.size,
    hits: statsBefore.hits,
    misses: statsBefore.misses,
  };
  
  const statsAfterRecord: Record<string, unknown> = {
    type: statsAfter.type,
    size: statsAfter.size,
    hits: statsAfter.hits,
    misses: statsAfter.misses,
  };

  return {
    success: true,
    timestamp: new Date().toISOString(),
    message: 'Redis cache cleared successfully',
    stats: {
      before: statsBeforeRecord,
      after: statsAfterRecord,
    },
  };
}
