/**
 * Stripe Client Setup
 *
 * Initializes Stripe client and provides utilities for payment processing
 */

import Stripe from 'stripe';
import { type StripeTier, type StripePrice } from './types';

// Initialize Stripe (lazy-loaded to avoid errors at build time)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeInstance = new Stripe(apiKey);
  }
  return stripeInstance;
}

// Keep stripe export for backwards compatibility
export const stripe = new Proxy({} as any, {
  get: (target, prop) => {
    return getStripe()[prop as keyof Stripe];
  },
});

/**
 * Stripe product and price configuration
 * These should match your Stripe dashboard products and prices
 * 
 * Set these environment variables:
 * - STRIPE_PRODUCT_FREE_PRICE_ID
 * - STRIPE_PRODUCT_BASIC_PRICE_ID  
 * - STRIPE_PRODUCT_PREMIUM_PRICE_ID
 */
export const STRIPE_PRICES: Record<StripeTier, StripePrice> = {
  free: {
    id: process.env.STRIPE_PRODUCT_FREE_PRICE_ID || '',
    productId: '',
    tier: 'free',
    amount: 0,
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
  },
  basic: {
    id: process.env.STRIPE_PRODUCT_BASIC_PRICE_ID || '',
    productId: '',
    tier: 'basic',
    amount: 600, // $6.00
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
  },
  premium: {
    id: process.env.STRIPE_PRODUCT_PREMIUM_PRICE_ID || '',
    productId: '',
    tier: 'premium',
    amount: 1599, // $15.99
    currency: 'usd',
    interval: 'month',
    intervalCount: 1,
  },
};

/**
 * Get price ID for a tier
 */
export function getPriceIdForTier(tier: StripeTier): string {
  return STRIPE_PRICES[tier]?.id || '';
}

/**
 * Get tier from price ID
 */
export function getTierFromPriceId(priceId: string): StripeTier | null {
  for (const [tier, price] of Object.entries(STRIPE_PRICES)) {
    if (price.id === priceId) {
      return tier as StripeTier;
    }
  }
  return null;
}

/**
 * Create or retrieve a Stripe customer
 */
export async function createOrRetrieveCustomer(
  email: string,
  metadata?: Record<string, string>
): Promise<string> {
  // Search for existing customer
  const existingCustomers = await getStripe().customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await getStripe().customers.create({
    email,
    metadata,
  });

  return customer.id;
}

/**
 * Create a checkout session
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays?: number,
  idempotencyKey?: string
): Promise<{ sessionId: string; url: string | null }> {
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'auto',
  };

  // Add trial period if provided
  if (trialDays && trialDays > 0) {
    sessionParams.subscription_data = {
      trial_period_days: trialDays,
    };
  }

  const session = await getStripe().checkout.sessions.create(
    sessionParams,
    { idempotencyKey: idempotencyKey || `checkout_${customerId}_${Date.now()}` }
  );

  return {
    sessionId: session.id,
    url: session.url,
  };
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string) {
  return getStripe().subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  atPeriodEnd = true
): Promise<void> {
  if (atPeriodEnd) {
    await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    // Use update with immediate cancellation
    await getStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }
}

/**
 * Create customer portal session
 */
export async function createCustomerPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

/**
 * Construct webhook event from request body and signature
 */
export function constructWebhookEvent(
  body: string | Buffer,
  signature: string | undefined,
  secret: string
): Stripe.Event | null {
  if (!signature || !secret) {
    console.error('Missing webhook signature or secret');
    return null;
  }

  try {
    return getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return null;
  }
}

/**
 * Handle subscription created event
 */
export function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: (subscription.items.data[0]?.price?.id as string) || null,
  };
}

/**
 * Handle subscription updated event
 */
export function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: subscription.status,
    priceId: (subscription.items.data[0]?.price?.id as string) || null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end as boolean,
  };
}

/**
 * Handle subscription deleted event
 */
export function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  return {
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    status: 'canceled' as const,
  };
}
