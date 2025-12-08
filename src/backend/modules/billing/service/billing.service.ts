/**
 * Billing Service Layer
 * 
 * Business logic for billing and subscription operations.
 */

import { billingDao } from '../dao/billing.dao';
import { getStripe } from '@lib/stripe/client';
import type { SubscriptionData, SubscriptionDetails, SubscriptionItem } from '@lib/types/billing';
import type Stripe from 'stripe';

export class BillingService {
  /**
   * Get subscription details for a user
   */
  async getSubscriptionInfo(userId: string): Promise<SubscriptionData> {
    // Get user subscription info from database
    const subscriptionInfo = await billingDao.getUserSubscriptionInfo(userId);

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

    return {
      hasSubscription: true,
      tier: subscriptionInfo.tier,
      subscriptionStatus: subscriptionInfo.subscriptionStatus,
      currentPeriodStart: subscriptionInfo.currentPeriodStart,
      currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      cancelAtPeriodEnd: subscriptionInfo.cancelAtPeriodEnd,
      trialEndsAt: subscriptionInfo.trialEndsAt,
      subscription: subscriptionDetails,
    };
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
