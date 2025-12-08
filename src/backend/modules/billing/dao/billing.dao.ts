/**
 * Billing DAO Layer
 * 
 * Data access operations for billing-related queries.
 */

import { createClient } from '@lib/supabase/server';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';
import type { SubscriptionInfo } from '@lib/types/billing';
import type { TierName } from '@lib/tiers';

export class BillingDao {
  /**
   * Get user subscription info from profile
   */
  async getUserSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tier, subscription_status, current_period_start, current_period_end, cancel_at_period_end, trial_ends_at, stripe_subscription_id, stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundError('User profile not found');
    }

    return {
      hasSubscription: !!profile.stripe_subscription_id,
      tier: profile.tier as TierName,
      subscriptionStatus: profile.subscription_status,
      currentPeriodStart: profile.current_period_start,
      currentPeriodEnd: profile.current_period_end,
      cancelAtPeriodEnd: profile.cancel_at_period_end || false,
      trialEndsAt: profile.trial_ends_at,
      stripeSubscriptionId: profile.stripe_subscription_id,
      stripeCustomerId: profile.stripe_customer_id,
    };
  }

  /**
   * Get Stripe customer ID for a user
   */
  async getStripeCustomerId(userId: string): Promise<string | null> {
    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new NotFoundError('User profile not found');
    }

    return profile.stripe_customer_id;
  }
}

export const billingDao = new BillingDao();
