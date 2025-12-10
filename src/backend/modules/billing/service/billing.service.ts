/**
 * Billing Service Layer
 * 
 * Business logic for billing and subscription operations.
 */

import { billingDao } from '../dao/billing.dao';
import { getStripe } from '@lib/stripe/client';
import { getTierFromPriceId } from '@backend/modules/subscriptions/config/plans.config';
import { createAdminClient } from '@lib/supabase/admin';
import type { SubscriptionData, SubscriptionDetails, SubscriptionItem } from '@lib/types/billing';
import type Stripe from 'stripe';

/**
 * Subscription mismatch information
 */
export interface SubscriptionMismatch {
  userId: string;
  email: string | null;
  stripeSubscriptionId: string;
  stripeStatus: string;
  stripeTier: string;
  dbSubscriptionId: string | null;
  dbStatus: string | null;
  dbTier: string;
  hasMismatch: boolean;
  missingInDb: boolean;
}

export class BillingService {
  /**
   * Get subscription details for a user
   */
  async getSubscriptionInfo(userId: string): Promise<SubscriptionData> {
    // Get user subscription info from database
    let subscriptionInfo = await billingDao.getUserSubscriptionInfo(userId);

    // Get subscription details from Stripe
    const stripe = getStripe();
    if (!stripe) {
      // Stripe not configured - return basic info without Stripe details
      // This allows the app to work even when Stripe is not configured
      return {
        hasSubscription: !!subscriptionInfo.stripeSubscriptionId,
        tier: subscriptionInfo.tier,
        subscriptionStatus: subscriptionInfo.subscriptionStatus,
        currentPeriodStart: subscriptionInfo.currentPeriodStart,
        currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptionInfo.cancelAtPeriodEnd,
        trialEndsAt: subscriptionInfo.trialEndsAt,
        subscription: null, // No Stripe details available
      };
    }

    let stripeSubscription: Stripe.Subscription | null = null;

    // Try to get subscription from DB stripe_subscription_id
    if (subscriptionInfo.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripe.subscriptions.retrieve(subscriptionInfo.stripeSubscriptionId);
      } catch (error) {
        // Subscription might not exist in Stripe anymore
        console.warn('Subscription not found by ID, will try metadata lookup:', error);
      }
    }

    // If no DB subscription_id or retrieval failed, try metadata-based lookup
    if (!stripeSubscription) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          limit: 100,
          expand: ['data.customer'],
        });
        
        console.log(`[getSubscriptionInfo] Searching for user ${userId} in ${subscriptions.data.length} Stripe subscriptions`);
        
        // Check both userid (lowercase) and userId (camelCase) for backwards compatibility
        stripeSubscription = subscriptions.data.find(
          (sub) => sub.metadata?.userid === userId || sub.metadata?.userId === userId
        ) || null;
        
        if (stripeSubscription) {
          console.log(`[getSubscriptionInfo] Found subscription via metadata for user ${userId}: ${stripeSubscription.id}`);
        } else {
          console.log(`[getSubscriptionInfo] No subscription found with metadata.userid/userId = ${userId}`);
          // Log all subscriptions with metadata for debugging
          const subsWithMetadata = subscriptions.data.filter(sub => sub.metadata?.userid || sub.metadata?.userId);
          console.log(`[getSubscriptionInfo] Subscriptions with userid metadata:`, 
            subsWithMetadata.map(s => ({ id: s.id, userid: s.metadata?.userid, userId: s.metadata?.userId }))
          );
        }
      } catch (error) {
        console.error('Error listing Stripe subscriptions:', error);
      }
    }

    // If no subscription found in Stripe, return basic info
    if (!stripeSubscription) {
      return {
        hasSubscription: false,
        tier: subscriptionInfo.tier,
        subscriptionStatus: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        subscription: null,
      };
    }

    // Build subscription details
    const subscriptionDetails: SubscriptionDetails | null = stripeSubscription ? {
      id: stripeSubscription.id,
      status: stripeSubscription.status,
      // Note: Stripe v20 removed current_period_start/end from Subscription type
      // Use values from profile which are kept in sync via webhooks
      current_period_start: subscriptionInfo.currentPeriodStart 
        ? new Date(subscriptionInfo.currentPeriodStart).getTime() / 1000 
        : 0,
      current_period_end: subscriptionInfo.currentPeriodEnd 
        ? new Date(subscriptionInfo.currentPeriodEnd).getTime() / 1000 
        : 0,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      canceled_at: stripeSubscription.canceled_at,
      trial_end: stripeSubscription.trial_end,
      items: stripeSubscription.items.data.map(item => ({
        id: item.id,
        price: {
          id: item.price.id,
          amount: item.price.unit_amount,
          currency: item.price.currency,
          interval: item.price.recurring?.interval || null,
        },
      })) as SubscriptionItem[],
    } : null;

    // Check for mismatches between Stripe and database (regardless of tier)
    let hasMismatch = false;
    let mismatchDetails: { statusMismatch?: boolean; tierMismatch?: boolean; expectedTier?: string; expectedStatus?: string } = {};
    let syncAttempted = false;
    let syncError: string | null = null;
    
    if (stripeSubscription) {
      const dbStatus = subscriptionInfo.subscriptionStatus;
      const stripeStatus = stripeSubscription.status;
      
      // Check for status mismatch
      const statusMismatch = dbStatus !== stripeStatus;
      
      // Check for tier mismatch
      const priceId = stripeSubscription.items.data[0]?.price?.id;
      const expectedTier = getTierFromPriceId(priceId) || 'free';
      const isActive = stripeStatus === 'active' || stripeStatus === 'trialing';
      const expectedFinalTier = isActive ? expectedTier : 'free';
      const tierMismatch = subscriptionInfo.tier !== expectedFinalTier;

      // Detect mismatch regardless of tier (removed tier-specific logic)
      hasMismatch = statusMismatch || tierMismatch;
      
      // Auto-sync if mismatch detected (works for all tiers)
      if (hasMismatch) {
        syncAttempted = true;
        try {
          await this.syncSubscriptionFromStripe(userId, stripeSubscription);
          
          // Re-fetch user data to check if sync fixed the mismatch
          subscriptionInfo = await billingDao.getUserSubscriptionInfo(userId);
          const stillHasStatusMismatch = subscriptionInfo.subscriptionStatus !== stripeStatus;
          const stillHasTierMismatch = subscriptionInfo.tier !== expectedFinalTier;
          
          // Update mismatch status after sync attempt
          hasMismatch = stillHasStatusMismatch || stillHasTierMismatch;
          
          if (hasMismatch) {
            mismatchDetails = {
              statusMismatch: stillHasStatusMismatch,
              tierMismatch: stillHasTierMismatch,
              expectedTier: expectedFinalTier,
              expectedStatus: stripeStatus,
            };
          }
        } catch (error) {
          // Sync failed - show mismatch with error
          syncError = error instanceof Error ? error.message : 'Failed to sync subscription';
          mismatchDetails = {
            statusMismatch,
            tierMismatch,
            expectedTier: expectedFinalTier,
            expectedStatus: stripeStatus,
          };
        }
      }
    }
    
    // Also check if user has NO subscription in DB but might have one in Stripe
    // This catches the case where subscription was created before the userid metadata fix
    if (!subscriptionInfo.stripeSubscriptionId) {
      // Try to find subscription in Stripe by userid metadata
      try {
        const stripe = getStripe();
        if (stripe) {
          const subscriptions = await stripe.subscriptions.list({
            limit: 10,
            expand: ['data.customer'],
          });
          
          // Check both userid (lowercase) and userId (camelCase) for backwards compatibility
          const userSub = subscriptions.data.find(
            (sub) => sub.metadata?.userid === userId || sub.metadata?.userId === userId
          );
          
          if (userSub) {
            console.warn(`⚠️  User ${userId} has Stripe subscription but no DB record`);
            hasMismatch = true;
            syncAttempted = true;
            
            try {
              await this.syncMissingSubscription(userId);
              
              // Re-fetch user data after sync
              subscriptionInfo = await billingDao.getUserSubscriptionInfo(userId);
              
              // Check if sync succeeded
              if (subscriptionInfo.stripeSubscriptionId) {
                console.log(`✅ Successfully synced missing subscription for user ${userId}`);
              } else {
                syncError = 'Failed to sync missing subscription';
                mismatchDetails = {
                  statusMismatch: true,
                  tierMismatch: true,
                  expectedTier: getTierFromPriceId(userSub.items.data[0]?.price?.id) || 'free',
                  expectedStatus: userSub.status,
                };
              }
            } catch (error) {
              syncError = error instanceof Error ? error.message : 'Failed to sync missing subscription';
              mismatchDetails = {
                statusMismatch: true,
                tierMismatch: true,
                expectedTier: getTierFromPriceId(userSub.items.data[0]?.price?.id) || 'free',
                expectedStatus: userSub.status,
              };
            }
          }
        }
      } catch (error) {
        console.error('Error checking for missing subscription in Stripe:', error);
      }
    }

    return {
      hasSubscription: true,
      tier: subscriptionInfo.tier,
      subscriptionStatus: subscriptionInfo.subscriptionStatus,
      currentPeriodStart: subscriptionInfo.currentPeriodStart,
      currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptionInfo.cancelAtPeriodEnd,
      trialEndsAt: subscriptionInfo.trialEndsAt,
      subscription: subscriptionDetails,
      hasMismatch,
      mismatchDetails: hasMismatch ? mismatchDetails : undefined,
      syncAttempted,
      syncError: syncError || undefined,
    };
  }

  /**
   * Sync subscription from Stripe (user-facing, updates own subscription)
   * This can be called by users to sync their own subscription
   */
  async syncSubscriptionFromStripe(
    userId: string,
    subscription: Stripe.Subscription
  ): Promise<void> {
    const supabase = createAdminClient();
    
    // Get tier from subscription's price ID
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = getTierFromPriceId(priceId) || 'free';
    
    // Determine if subscription is active (for tier assignment)
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    const finalTier = isActive ? tier : 'free';

    // Access subscription period dates
    type SubscriptionWithPeriods = {
      current_period_start: number;
      current_period_end: number;
    };
    const subscriptionWithPeriods = subscription as unknown as Stripe.Subscription & SubscriptionWithPeriods;
    const periodStart = subscriptionWithPeriods.current_period_start;
    const periodEnd = subscriptionWithPeriods.current_period_end;

    // Update user profile with Stripe data
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: subscription.status,
        subscription_tier: tier,
        tier: finalTier, // Update the tier field used by quota system
        current_period_start: new Date(periodStart * 1000).toISOString(),
        current_period_end: new Date(periodEnd * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        trial_ends_at: subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString() 
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to sync subscription: ${error.message}`);
    }

    console.log(`✅ Synced subscription: User ${userId} → ${finalTier} (${subscription.status})`);
  }

  /**
   * Get billing history (invoices) for a user
   */
  async getBillingHistory(userId: string): Promise<Stripe.Invoice[]> {
    try {
      // Get customer ID from database
      let customerId = await billingDao.getStripeCustomerId(userId);

      // If no customer ID, return empty array
      if (!customerId) {
        console.log(`[getBillingHistory] No customer ID found for user ${userId}`);
        return [];
      }

      // Fix: If customerId is a JSON string (from old data), parse it and extract the ID
      if (typeof customerId === 'string' && customerId.startsWith('{')) {
        try {
          const parsed = JSON.parse(customerId);
          customerId = parsed.id || customerId;
          console.log(`[getBillingHistory] Parsed customer ID from JSON: ${customerId}`);
        } catch (e) {
          console.error('[getBillingHistory] Failed to parse customer ID JSON:', e);
        }
      }

      // Get invoices from Stripe
      const stripe = getStripe();
      if (!stripe) {
        // Stripe not configured - return empty array
        // This allows the app to work even when Stripe is not configured
        console.log('[getBillingHistory] Stripe not configured');
        return [];
      }

      const invoices = await stripe.invoices.list({
        customer: customerId ?? undefined,
        limit: 100,
      });

      return invoices.data;
    } catch (error) {
      console.error('[getBillingHistory] Error fetching billing history:', error);
      // Return empty array on error instead of throwing
      // This makes the billing page more resilient
      return [];
    }
  }

  /**
   * Detect all subscription mismatches between Stripe and Supabase
   * Queries all Stripe subscriptions with userid metadata and compares with DB
   * Returns mismatches regardless of tier
   */
  async detectAllMismatches(): Promise<SubscriptionMismatch[]> {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const supabase = createAdminClient();
    const mismatches: SubscriptionMismatch[] = [];

    console.log('🔍 Detecting subscription mismatches...');

    // Get all Stripe subscriptions with userid metadata
    const allSubscriptions: Stripe.Subscription[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.subscriptions.list({
        limit: 100,
        starting_after: startingAfter,
        expand: ['data.customer'],
      });

      allSubscriptions.push(...response.data);
      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`📊 Found ${allSubscriptions.length} Stripe subscriptions`);

    // Filter subscriptions that have userid metadata (check both lowercase and camelCase)
    const subscriptionsWithUserId = allSubscriptions.filter(
      (sub) => sub.metadata?.userid || sub.metadata?.userId
    );

    console.log(`📊 Found ${subscriptionsWithUserId.length} subscriptions with userid metadata`);

    // Get all user profiles from Supabase
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, stripe_subscription_id, subscription_status, tier, stripe_customer_id');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Create a map of userId -> profile for quick lookup
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Check each Stripe subscription
    for (const stripeSub of subscriptionsWithUserId) {
      // Extract userId from metadata (check both lowercase and camelCase)
      const userId = stripeSub.metadata.userid || stripeSub.metadata.userId;
      if (!userId) continue;

      const profile = profileMap.get(userId);
      const priceId = stripeSub.items.data[0]?.price?.id;
      const stripeTier = getTierFromPriceId(priceId) || 'free';
      const isActive = stripeSub.status === 'active' || stripeSub.status === 'trialing';
      const expectedTier = isActive ? stripeTier : 'free';

      if (!profile) {
        // User not found in Supabase - severe mismatch
        mismatches.push({
          userId,
          email: null,
          stripeSubscriptionId: stripeSub.id,
          stripeStatus: stripeSub.status,
          stripeTier,
          dbSubscriptionId: null,
          dbStatus: null,
          dbTier: 'unknown',
          hasMismatch: true,
          missingInDb: true,
        });
        console.warn(`⚠️  User ${userId} has Stripe subscription but no profile in DB`);
        continue;
      }

      // Check for mismatches
      const hasSubscriptionIdMismatch = profile.stripe_subscription_id !== stripeSub.id;
      const hasStatusMismatch = profile.subscription_status !== stripeSub.status;
      const hasTierMismatch = profile.tier !== expectedTier;
      const hasMismatch = hasSubscriptionIdMismatch || hasStatusMismatch || hasTierMismatch;

      if (hasMismatch) {
        mismatches.push({
          userId,
          email: profile.email,
          stripeSubscriptionId: stripeSub.id,
          stripeStatus: stripeSub.status,
          stripeTier,
          dbSubscriptionId: profile.stripe_subscription_id,
          dbStatus: profile.subscription_status,
          dbTier: profile.tier,
          hasMismatch: true,
          missingInDb: !profile.stripe_subscription_id,
        });

        console.warn(
          `⚠️  Mismatch for user ${userId} (${profile.email}):`,
          `\n   Stripe: ${stripeSub.id} (${stripeSub.status}, ${stripeTier})`,
          `\n   DB: ${profile.stripe_subscription_id || 'null'} (${profile.subscription_status || 'null'}, ${profile.tier})`
        );
      }
    }

    console.log(`✅ Detected ${mismatches.length} mismatches`);
    return mismatches;
  }

  /**
   * Sync a specific user's subscription from Stripe to Supabase
   * Uses userid metadata from Stripe subscription to find the user
   * Creates or updates the subscription record in Supabase
   */
  async syncMissingSubscription(userId: string): Promise<void> {
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const supabase = createAdminClient();

    console.log(`🔄 Syncing subscription for user ${userId}...`);

    // Find Stripe subscription by userid metadata
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      expand: ['data.customer'],
    });

    // Check both userid (lowercase) and userId (camelCase) for backwards compatibility
    const userSubscription = subscriptions.data.find(
      (sub) => sub.metadata?.userid === userId || sub.metadata?.userId === userId
    );

    if (!userSubscription) {
      throw new Error(`No active Stripe subscription found with userid metadata: ${userId}`);
    }

    console.log(`✅ Found Stripe subscription: ${userSubscription.id}`);

    // Get tier from price ID
    const priceId = userSubscription.items.data[0]?.price?.id;
    const tier = getTierFromPriceId(priceId) || 'free';
    const isActive = userSubscription.status === 'active' || userSubscription.status === 'trialing';
    const finalTier = isActive ? tier : 'free';

    // Access subscription period dates
    type SubscriptionWithPeriods = {
      current_period_start?: number;
      current_period_end?: number;
    };
    const subscriptionWithPeriods = userSubscription as unknown as Stripe.Subscription & SubscriptionWithPeriods;
    const periodStart = subscriptionWithPeriods.current_period_start;
    const periodEnd = subscriptionWithPeriods.current_period_end;

    // Update user profile with Stripe data
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: userSubscription.customer as string,
        stripe_subscription_id: userSubscription.id,
        subscription_status: userSubscription.status,
        subscription_tier: tier,
        tier: finalTier,
        current_period_start: periodStart 
          ? new Date(periodStart * 1000).toISOString()
          : null,
        current_period_end: periodEnd 
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        cancel_at_period_end: userSubscription.cancel_at_period_end,
        trial_ends_at: userSubscription.trial_end
          ? new Date(userSubscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to sync subscription: ${error.message}`);
    }

    console.log(`✅ Synced subscription: User ${userId} → ${finalTier} (${userSubscription.status})`);
  }

  /**
   * Sync all missing subscriptions from Stripe to Supabase
   * Detects mismatches and syncs each one
   */
  async syncAllMissingSubscriptions(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const mismatches = await this.detectAllMismatches();
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`🔄 Syncing ${mismatches.length} mismatched subscriptions...`);

    for (const mismatch of mismatches) {
      try {
        await this.syncMissingSubscription(mismatch.userId);
        synced++;
      } catch (error) {
        failed++;
        const errorMsg = `Failed to sync user ${mismatch.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);
    return { synced, failed, errors };
  }
}

export const billingService = new BillingService();
