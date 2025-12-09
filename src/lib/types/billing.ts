/**
 * Billing & Subscription Types
 * 
 * Shared types for billing and subscription management across the application.
 */

import type { TierName } from '@lib/tiers';
import type Stripe from 'stripe';

/**
 * Subscription data returned by billing API
 */
export interface SubscriptionData {
  hasSubscription: boolean;
  tier: TierName;
  subscriptionStatus: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  subscription: SubscriptionDetails | null;
  hasMismatch?: boolean;
  mismatchDetails?: {
    statusMismatch?: boolean;
    tierMismatch?: boolean;
    expectedTier?: string;
    expectedStatus?: string;
  };
  syncAttempted?: boolean;
  syncError?: string;
}

/**
 * Detailed subscription information from Stripe
 */
export interface SubscriptionDetails {
  id: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_end: number | null;
  items: SubscriptionItem[];
}

/**
 * Subscription item with price details
 */
export interface SubscriptionItem {
  id: string;
  price: {
    id: string;
    amount: number | null;
    currency: string;
    interval: string | null;
  };
}

/**
 * Billing history response
 */
export interface BillingHistoryData {
  invoices: Stripe.Invoice[];
}

/**
 * Subscription info for internal service use
 */
export interface SubscriptionInfo {
  hasSubscription: boolean;
  tier: TierName;
  subscriptionStatus: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: string | null;
  stripeSubscriptionId: string | null;
  stripeCustomerId: string | null;
}
