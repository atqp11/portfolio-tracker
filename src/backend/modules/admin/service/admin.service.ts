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
  subscriptionId?: string | null;
  hasMismatch?: boolean;
  mismatchDetails?: {
    statusMismatch?: boolean;
    tierMismatch?: boolean;
    expectedTier?: string;
    expectedStatus?: string;
  };
}> {
  const user = await adminDao.getUserById(userId);
  
  const stripe = getStripe();
  if (!stripe) {
    return { status: null, tier: null, lastSync: null }; // Stripe not configured
  }

  let subscription: Stripe.Subscription | null = null;

  // Try to get subscription from DB stripe_subscription_id
  if (user?.stripe_subscription_id) {
    try {
      subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    } catch (error) {
      console.warn('Subscription not found by ID, will try metadata lookup:', error);
    }
  }

  // If no DB subscription_id or retrieval failed, try metadata-based lookup
  if (!subscription) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        limit: 100,
        expand: ['data.customer'],
      });
      
      console.log(`[getStripeSubscriptionStatus] Searching for user ${userId} in ${subscriptions.data.length} Stripe subscriptions`);
      
      // Check both userid (lowercase) and userId (camelCase) for backwards compatibility
      subscription = subscriptions.data.find(
        (sub) => sub.metadata?.userid === userId || sub.metadata?.userId === userId
      ) || null;
      
      if (subscription) {
        console.log(`[getStripeSubscriptionStatus] Found subscription via metadata: ${subscription.id}`);
      } else {
        console.log(`[getStripeSubscriptionStatus] No subscription found with metadata.userid/userId = ${userId}`);
        // Log all subscriptions with metadata for debugging
        const subsWithMetadata = subscriptions.data.filter(sub => sub.metadata?.userid || sub.metadata?.userId);
        console.log(`[getStripeSubscriptionStatus] Subscriptions with userid metadata:`, 
          subsWithMetadata.map(s => ({ id: s.id, userid: s.metadata?.userid, userId: s.metadata?.userId }))
        );
      }
    } catch (error) {
      console.error('Error listing Stripe subscriptions:', error);
    }
  }

  // If still no subscription found, return null values
  if (!subscription) {
    return { status: null, tier: null, lastSync: null, subscriptionId: null };
  }

  try {
    
    // Get tier from subscription's price ID
    const priceId = subscription.items.data[0]?.price?.id;
    const { getTierFromPriceId } = await import('@backend/modules/subscriptions/config/plans.config');
    const expectedTier = getTierFromPriceId(priceId) || 'free';
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const expectedFinalTier = isActive ? expectedTier : 'free';
    
    // Check for mismatches (only if user exists in DB)
    const dbStatus = user?.subscription_status || null;
    const stripeStatus = subscription.status;
    const statusMismatch = dbStatus !== stripeStatus;
    const tierMismatch = user?.tier !== expectedFinalTier;
    const hasMismatch = statusMismatch || tierMismatch;
    
    return {
      status: stripeStatus,
      tier: expectedFinalTier,
      lastSync: user?.updated_at || null,
      subscriptionId: subscription.id,
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
 * Updates database and syncs with Stripe subscription if user has one
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

  // If user has a Stripe subscription and changing to a paid tier, update Stripe subscription
  const stripe = getStripe();
  if (stripe && userBefore.stripe_subscription_id && newTier !== 'free') {
    try {
      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(userBefore.stripe_subscription_id);
      
      // Get the appropriate price ID for the new tier (use existing billing interval)
      const currentPriceId = subscription.items.data[0]?.price?.id;
      const { getStripePriceId, PlanTier, BillingInterval } = await import('@backend/modules/subscriptions/config/plans.config');
      
      // Determine current billing interval
      let interval: any = BillingInterval.MONTHLY;
      if (currentPriceId) {
        // Check if current price is annual
        const price = await stripe.prices.retrieve(currentPriceId);
        if (price.recurring?.interval === 'year') {
          interval = BillingInterval.ANNUAL;
        }
      }
      
      // Get new price ID for the target tier
      const tierMap: Record<string, any> = {
        'basic': PlanTier.BASIC,
        'premium': PlanTier.PREMIUM,
      };
      const newPriceId = getStripePriceId(tierMap[newTier], interval);
      
      // Update subscription with new price ID
      await stripe.subscriptions.update(userBefore.stripe_subscription_id, {
        items: [{
          id: subscription.items.data[0].id,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Create prorated charges/credits
      });
      
      console.log(`✅ Updated Stripe subscription to ${newTier} tier (price: ${newPriceId})`);
    } catch (error) {
      console.error('Failed to update Stripe subscription:', error);
      // Continue with database update even if Stripe fails
      // Webhook will eventually sync when subscription updates
    }
  } else if (newTier === 'free' && userBefore.stripe_subscription_id) {
    // If downgrading to free, cancel the subscription
    console.warn(`⚠️  Changing to free tier but user has active subscription. Consider canceling subscription first.`);
  }

  // Change tier in database
  const userAfter = await adminDao.changeUserTier(userId, newTier);

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'change_tier',
    entity_type: 'user',
    entity_id: userId,
    before_state: { 
      tier: userBefore.tier,
      stripe_subscription_id: userBefore.stripe_subscription_id,
    },
    after_state: { 
      tier: userAfter.tier,
      stripe_synced: !!userBefore.stripe_subscription_id,
    },
  });

  return userAfter;
}

/**
 * Get cancellation preview with refund calculation
 * Calculates what will happen if subscription is canceled immediately vs at period end
 */
export async function getCancellationPreview(userId: string) {
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

  // Get subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

  // Note: Stripe SDK types don't include these properties, but they exist at runtime
  type SubscriptionWithPeriods = {
    current_period_start?: number;
    current_period_end?: number;
  };
  const subscriptionWithPeriods = subscription as unknown as Stripe.Subscription & SubscriptionWithPeriods;

  // Handle trialing subscriptions - use trial_end as the cancellation point
  if (subscription.status === 'trialing' && subscription.trial_end) {
    const now = Math.floor(Date.now() / 1000);
    const trialEnd = subscription.trial_end;
    const remainingSeconds = trialEnd - now;
    const totalDays = Math.round(remainingSeconds / 86400);

    // For trialing subscriptions, no refund is issued on cancellation
    return {
      immediate: {
        refundAmount: 0,
        refundCurrency: subscription.items.data[0]?.price?.currency || 'usd',
        unusedDays: totalDays,
        totalDays,
        elapsedDays: 0,
      },
      periodEnd: {
        accessUntil: new Date(trialEnd * 1000).toISOString(),
        noRefund: true,
        daysRemaining: totalDays,
      },
    };
  }

  // For active subscriptions, use billing period dates
  const periodStart = subscriptionWithPeriods.current_period_start;
  const periodEnd = subscriptionWithPeriods.current_period_end;

  if (typeof periodStart !== 'number' || typeof periodEnd !== 'number') {
    throw new Error('Subscription period information is invalid or missing');
  }

  if (periodStart <= 0 || periodEnd <= 0) {
    throw new Error('Invalid subscription period timestamps');
  }

  const now = Math.floor(Date.now() / 1000);
  const totalSeconds = periodEnd - periodStart;
  const elapsedSeconds = now - periodStart;
  const remainingSeconds = periodEnd - now;

  // Calculate prorated refund for immediate cancellation
  const priceId = subscription.items.data[0]?.price?.id;
  const amount = subscription.items.data[0]?.price?.unit_amount || 0;
  const currency = subscription.items.data[0]?.price?.currency || 'usd';

  // Calculate refund: (unused time / total time) * amount
  const refundAmount = Math.round((remainingSeconds / totalSeconds) * amount);
  
  // Calculate days
  const totalDays = Math.round(totalSeconds / 86400);
  const elapsedDays = Math.round(elapsedSeconds / 86400);
  const unusedDays = Math.round(remainingSeconds / 86400);

  // Safely create date from Unix timestamp
  const accessUntilDate = new Date(periodEnd * 1000);
  if (isNaN(accessUntilDate.getTime())) {
    throw new Error(`Invalid period end date: ${periodEnd}`);
  }

  return {
    immediate: {
      refundAmount,
      refundCurrency: currency,
      unusedDays,
      totalDays,
      elapsedDays,
    },
    periodEnd: {
      accessUntil: accessUntilDate.toISOString(),
      noRefund: true,
      daysRemaining: unusedDays,
    },
  };
}

/**
 * Cancel user's subscription
 * Cancels in Stripe and immediately updates database to stay in sync
 * If immediate=true, automatically processes prorated refund
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

  let updatedSubscription: any;
  let refundId: string | null = null;

  if (immediate) {
    // Get subscription for refund calculation
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    
    // For trialing subscriptions, no refund is needed - just cancel
    if (subscription.status === 'trialing') {
      updatedSubscription = await stripe.subscriptions.cancel(user.stripe_subscription_id);
      refundId = null; // No refund for trial cancellation
    } else {
      // For active subscriptions, calculate prorated refund
      // Note: Stripe SDK types don't include these properties, but they exist at runtime
      type SubscriptionWithPeriods = {
        current_period_start: number;
        current_period_end: number;
      };
      const subscriptionWithPeriods = subscription as unknown as Stripe.Subscription & SubscriptionWithPeriods;
      
      const periodStart = subscriptionWithPeriods.current_period_start;
      const periodEnd = subscriptionWithPeriods.current_period_end;

      if (typeof periodStart !== 'number' || typeof periodEnd !== 'number') {
        throw new Error('Subscription period information is invalid or missing');
      }

      if (periodStart <= 0 || periodEnd <= 0) {
        throw new Error('Invalid subscription period timestamps');
      }

      const now = Math.floor(Date.now() / 1000);
      const totalSeconds = periodEnd - periodStart;
      const remainingSeconds = periodEnd - now;

      // Cancel immediately in Stripe
      updatedSubscription = await stripe.subscriptions.cancel(user.stripe_subscription_id);
      
      // Process automatic prorated refund if there's unused time
      if (remainingSeconds > 0 && user.stripe_customer_id) {
        try {
          // Get latest invoice/payment
          const invoices = await stripe.invoices.list({
            customer: user.stripe_customer_id,
            subscription: user.stripe_subscription_id,
            limit: 1,
          });

          if (invoices.data.length > 0) {
            const invoice = invoices.data[0];
            const amount = invoice.amount_paid;
            
            // Calculate prorated refund
            const refundAmount = Math.round((remainingSeconds / totalSeconds) * amount);
            
            // Type assertion for charge field (exists at runtime but not in type definition)
            type InvoiceWithCharge = { charge?: string | Stripe.Charge | null };
            const invoiceWithCharge = invoice as Stripe.Invoice & InvoiceWithCharge;
            const chargeId = typeof invoiceWithCharge.charge === 'string' 
              ? invoiceWithCharge.charge 
              : invoiceWithCharge.charge?.id;
            
            if (refundAmount > 0 && chargeId) {
              // Create refund
              const refund = await stripe.refunds.create({
                charge: chargeId,
                amount: refundAmount,
                reason: 'requested_by_customer',
                metadata: {
                  admin_id: adminId,
                  reason: 'Prorated refund for immediate cancellation',
                  unused_days: Math.round(remainingSeconds / 86400).toString(),
                },
              });
              
              refundId = refund.id;
              console.log(`✅ Automatic refund processed: ${refundAmount / 100} ${invoice.currency} (Refund ID: ${refundId})`);
            }
          }
        } catch (refundError) {
          console.error('Failed to process automatic refund:', refundError);
          // Continue with cancellation even if refund fails
          // Admin can manually refund later
        }
      }
    }

    // Update database immediately - downgrade to free
    await adminDao.updateUser(userId, {
      subscription_status: 'canceled',
      subscription_tier: 'free',
      tier: 'free',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    });
  } else {
    // Cancel at period end in Stripe
    updatedSubscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    
    // Update database immediately to reflect cancel_at_period_end flag
    await adminDao.updateUser(userId, {
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    });
  }

  // Log admin action
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: immediate ? 'cancel_subscription_immediate' : 'cancel_subscription_period_end',
    entity_type: 'subscription',
    entity_id: user.stripe_subscription_id,
    after_state: {
      canceled: true,
      immediate,
      cancel_at_period_end: updatedSubscription.cancel_at_period_end,
      refund_id: refundId,
      refund_processed: !!refundId,
    },
  });
}

/**
 * Process refund for user
 * Uses charges.list for better reliability (handles multiple payment methods)
 * Supports charge selection and validates max refundable amount
 */
export async function refundUser(params: RefundParams & { chargeId?: string }): Promise<{
  refundId: string;
  amountCents: number;
  currency: string;
  chargeId: string;
}> {
  const { userId, adminId, amount, reason, chargeId } = params;

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

  let targetCharge: Stripe.Charge | null = null;

  if (chargeId) {
    // Refund specific charge
    targetCharge = await stripe.charges.retrieve(chargeId);
    
    // Verify charge belongs to this customer
    if (targetCharge.customer !== user.stripe_customer_id) {
      throw new Error('Charge does not belong to this customer');
    }
  } else {
    // Get the latest succeeded charge
    const charges = await stripe.charges.list({
      customer: user.stripe_customer_id,
      limit: 10,
    });

    targetCharge = charges.data.find(c => c.status === 'succeeded') || null;

    if (!targetCharge) {
      throw new Error('No payment found to refund');
    }
  }

  // Calculate refund amount and validate
  const refundable = targetCharge.amount - targetCharge.amount_refunded;
  const refundAmount = amount || refundable;

  // Validate max refund amount
  if (refundAmount > refundable) {
    const currency = targetCharge.currency.toUpperCase();
    const maxFormatted = (refundable / 100).toFixed(2);
    const requestedFormatted = (refundAmount / 100).toFixed(2);
    throw new Error(
      `Cannot refund ${currency} ${requestedFormatted}. Maximum refundable amount for this charge is ${currency} ${maxFormatted}.`
    );
  }

  if (refundAmount <= 0) {
    throw new Error('This charge has already been fully refunded');
  }

  // Create refund using charge ID (more reliable than payment_intent)
  const refund = await stripe.refunds.create({
    charge: targetCharge.id,
    amount: refundAmount,
    reason: 'requested_by_customer',
    metadata: {
      admin_id: adminId,
      admin_reason: reason || 'Admin refund',
      user_id: userId,
    },
  });

  // Log admin action with detailed audit info
  await adminDao.logAdminAction({
    admin_id: adminId,
    target_user_id: userId,
    action: 'refund_payment',
    entity_type: 'refund',
    entity_id: refund.id,
    before_state: {
      charge_id: targetCharge.id,
      charge_amount: targetCharge.amount,
      amount_refunded_before: targetCharge.amount_refunded,
      refundable_before: refundable,
    },
    after_state: {
      refund_id: refund.id,
      refund_amount_cents: refundAmount,
      refund_currency: targetCharge.currency,
      refund_reason: reason,
      refund_status: refund.status,
      amount_refunded_after: targetCharge.amount_refunded + refundAmount,
    },
  });

  return {
    refundId: refund.id,
    amountCents: refundAmount,
    currency: targetCharge.currency,
    chargeId: targetCharge.id,
  };
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
 * Now supports metadata-based lookup for subscriptions without DB record
 */
export async function syncUserSubscription(
  userId: string,
  adminId: string
): Promise<Profile> {
  const user = await adminDao.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  let subscription: Stripe.Subscription;

  // Try to sync from existing DB subscription ID first
  if (user.stripe_subscription_id) {
    const subscriptionResponse = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    subscription = subscriptionResponse as Stripe.Subscription;
  } else {
    // No DB subscription - use metadata-based lookup (for legacy subscriptions)
    console.log(`No DB subscription for user ${userId}, checking Stripe metadata...`);
    
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer'],
    });

    // Check both userid (lowercase) and userId (camelCase) for backwards compatibility
    const userSub = subscriptions.data.find(
      (sub) => sub.metadata?.userid === userId || sub.metadata?.userId === userId
    );

    if (!userSub) {
      throw new Error('No active subscription found in Stripe. User may need to subscribe first, or subscription metadata is missing.');
    }

    subscription = userSub;
    console.log(`Found subscription ${subscription.id} via metadata for user ${userId}`);
  }
  
  // Stripe SDK returns Response<Subscription> wrapper, extract the subscription
  // The period fields exist at runtime but aren't in the type definition
  type SubscriptionWithPeriods = {
    current_period_start: number;
    current_period_end: number;
  };
  const subscriptionWithPeriods = subscription as unknown as Stripe.Subscription & SubscriptionWithPeriods;

  // Get tier from subscription's price ID (using correct import)
  const priceId = subscription.items.data[0]?.price?.id;
  const { getTierFromPriceId } = await import('@backend/modules/subscriptions/config/plans.config');
  const tier = getTierFromPriceId(priceId) || 'free';

  // Determine if subscription is active (for tier assignment)
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const finalTier = isActive ? tier : 'free';

  // Update user with Stripe data including tier and subscription IDs
  const userAfter = await adminDao.updateUser(userId, {
    stripe_customer_id: subscription.customer as string, // Add customer ID if missing
    stripe_subscription_id: subscription.id, // Add/update subscription ID
    subscription_status: subscription.status,
    subscription_tier: tier, // Store the tier from subscription
    tier: finalTier, // Update the tier field used by quota system (free if not active)
    current_period_start: subscriptionWithPeriods.current_period_start 
      ? new Date(subscriptionWithPeriods.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscriptionWithPeriods.current_period_end 
      ? new Date(subscriptionWithPeriods.current_period_end * 1000).toISOString()
      : null,
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
    entity_id: subscription.id,
    before_state: {
      subscription_id: user.stripe_subscription_id || null,
      status: user.subscription_status,
      tier: user.tier,
    },
    after_state: {
      subscription_id: subscription.id,
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

/**
 * Get refund status for a user
 * Fetches pending refunds, payment history, and charge details from Stripe
 * Returns enhanced DTO with charge selection support, failed refund indicators, and max refundable amount
 */
export async function getRefundStatus(userId: string): Promise<import('@backend/modules/admin/dto/admin.dto').RefundStatusDto | null> {
  // Get user to find stripe_customer_id
  const user = await adminDao.getUserById(userId);

  if (!user || !user.stripe_customer_id) {
    return null;
  }

  // Fetch refunds from Stripe
  const stripe = getStripe();
  if (!stripe) {
    return null; // Return null if Stripe not configured
  }

  // Get charges for the customer first
  const chargesResponse = await stripe.charges.list({
    customer: user.stripe_customer_id,
    limit: 100,
  });

  const chargesData = chargesResponse.data;

  // Build charge info array for UI selection
  const charges: Array<{
    id: string;
    amount: number;
    amountRefunded: number;
    refundable: number;
    currency: string;
    status: string;
    created: number;
    date: string;
    description: string | null;
    paymentMethod: string | null;
  }> = [];

  // Collect all refunds from the charges
  const allRefunds: Array<{
    id: string;
    amount: number;
    status: string;
    reason: string | null;
    created: number;
    currency: string;
    chargeId: string | null;
    failureReason: string | null;
  }> = [];

  let hasFailedRefunds = false;
  let maxRefundable = 0;

  for (const charge of chargesData) {
    // Only include succeeded charges
    if (charge.status === 'succeeded') {
      const refundable = charge.amount - charge.amount_refunded;
      maxRefundable += refundable;
      
      charges.push({
        id: charge.id,
        amount: charge.amount,
        amountRefunded: charge.amount_refunded,
        refundable,
        currency: charge.currency,
        status: charge.status,
        created: charge.created,
        date: new Date(charge.created * 1000).toISOString(),
        description: charge.description,
        paymentMethod: charge.payment_method_details?.type || null,
      });
    }

    // Extract refunds from charge
    if (charge.refunds && charge.refunds.data.length > 0) {
      for (const refund of charge.refunds.data) {
        const isFailed = refund.status === 'failed' || refund.status === 'canceled';
        if (isFailed) hasFailedRefunds = true;

        allRefunds.push({
          id: refund.id,
          amount: refund.amount,
          status: refund.status || 'unknown',
          reason: refund.reason,
          created: refund.created,
          currency: refund.currency || charge.currency,
          chargeId: charge.id,
          failureReason: refund.failure_reason || null,
        });
      }
    }
  }

  // Fallback to refunds.list if no charges found
  if (chargesData.length === 0) {
    const refundsList = await stripe.refunds.list({ limit: 100 });
    for (const refund of refundsList.data) {
      let currency = refund.currency || 'usd';
      let chargeId: string | null = null;
      try {
        if (refund.charge) {
          const charge = await stripe.charges.retrieve(refund.charge as string);
          if ((charge.customer as string) !== user.stripe_customer_id) {
            continue;
          }
          currency = charge.currency || currency;
          chargeId = charge.id;
        }
      } catch {
        continue;
      }
      
      const isFailed = refund.status === 'failed' || refund.status === 'canceled';
      if (isFailed) hasFailedRefunds = true;

      allRefunds.push({
        id: refund.id,
        amount: refund.amount,
        status: refund.status || 'unknown',
        reason: refund.reason,
        created: refund.created,
        currency,
        chargeId,
        failureReason: refund.failure_reason || null,
      });
    }
  }

  // Get last payment information (most recent succeeded charge)
  const lastSucceededCharge = chargesData.find(c => c.status === 'succeeded');
  const lastPayment = lastSucceededCharge ? {
    amount: lastSucceededCharge.amount,
    currency: lastSucceededCharge.currency,
    date: lastSucceededCharge.created,
    chargeId: lastSucceededCharge.id,
  } : null;

  // Calculate totals - only include pending/succeeded refunds
  const pendingRefunds = allRefunds.filter(
    r => r.status === 'pending' || r.status === 'succeeded'
  );
  const totalPendingAmount = pendingRefunds.reduce((sum, r) => sum + r.amount, 0);

  // Return enhanced DTO
  return {
    hasPendingRefunds: pendingRefunds.length > 0,
    totalPendingAmount,
    currency: lastPayment?.currency || allRefunds[0]?.currency || 'usd',
    refunds: allRefunds.map(r => ({
      id: r.id,
      amount: r.amount,
      status: r.status,
      reason: r.reason,
      created: r.created,
      chargeId: r.chargeId,
      failureReason: r.failureReason,
    })),
    lastPayment,
    charges,
    hasFailedRefunds,
    maxRefundable,
  };
}

/**
 * Create Stripe customer portal session for a user (admin use)
 * Returns the portal URL for managing subscriptions
 */
export async function createUserPortalSession(userId: string, returnUrl: string): Promise<string> {
  // Get user profile to find stripe_customer_id
  const user = await adminDao.getUserById(userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.stripe_customer_id) {
    throw new Error('User does not have a Stripe customer ID');
  }

  // Create portal session using Stripe client
  const { createCustomerPortalSession } = await import('@lib/stripe/client');
  const portalUrl = await createCustomerPortalSession(user.stripe_customer_id, returnUrl);

  return portalUrl;
}
