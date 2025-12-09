/**
 * Billing Service Layer
 * 
 * Business logic for billing and subscription operations.
 */

import { billingDao } from '../dao/billing.dao';
import { getStripe, getTierFromPriceId } from '@lib/stripe/client';
import { createAdminClient } from '@lib/supabase/admin';
import type { SubscriptionData, SubscriptionDetails, SubscriptionItem } from '@lib/types/billing';
import type Stripe from 'stripe';

export class BillingService {
  /**
   * Get subscription details for a user
   */
  async getSubscriptionInfo(userId: string): Promise<SubscriptionData> {
    // Get user subscription info from database
    let subscriptionInfo = await billingDao.getUserSubscriptionInfo(userId);

    // If no subscription, return basic info
    if (!subscriptionInfo.stripeSubscriptionId || !subscriptionInfo.stripeCustomerId) {
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

    // Get subscription details from Stripe
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    let stripeSubscription: Stripe.Subscription | null = null;
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(subscriptionInfo.stripeSubscriptionId);
    } catch (error) {
      // Subscription might not exist in Stripe anymore
      console.warn('Subscription not found in Stripe:', error);
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

    // Check for mismatches between Stripe and database
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

      hasMismatch = statusMismatch || tierMismatch;
      
      // Auto-sync if mismatch detected
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
    // Get customer ID from database
    const customerId = await billingDao.getStripeCustomerId(userId);

    // If no customer ID, return empty array
    if (!customerId) {
      return [];
    }

    // Get invoices from Stripe
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 100,
    });

    return invoices.data;
  }
}

export const billingService = new BillingService();
