/**
 * Stripe Client Setup
 *
 * Initializes Stripe client and provides utilities for payment processing
 */

import Stripe from 'stripe';
import { type StripeTier, type StripePrice } from './types';

// Initialize Stripe (lazy-loaded to avoid errors at build time)
let stripeInstance: Stripe | null = null;

/**
 * Get Stripe client instance
 * Returns null if STRIPE_SECRET_KEY is not configured (graceful degradation)
 */
export function getStripe(): Stripe | null {
  if (!stripeInstance) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      return null; // Return null instead of throwing for graceful degradation
    }
    stripeInstance = new Stripe(apiKey);
  }
  return stripeInstance;
}

/**
 * Check if Stripe is configured
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// Keep stripe export for backwards compatibility
// Note: This will throw if Stripe is not configured, but most code should use getStripe() directly
export const stripe = new Proxy({} as any, {
  get: (target, prop) => {
    const stripeClient = getStripe();
    if (!stripeClient) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    return stripeClient[prop as keyof Stripe];
  },
});


/**
 * Create or retrieve a Stripe customer
 */
export async function createOrRetrieveCustomer(
  email: string,
  metadata?: Record<string, string>
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    metadata,
  });

  return customer.id;
}

/**
 * Validate that a price ID exists and is active in Stripe
 * This helps catch configuration errors before creating checkout sessions
 */
export async function validatePriceId(priceId: string): Promise<{ valid: boolean; error?: string }> {
  const stripe = getStripe();
  if (!stripe) {
    return { valid: false, error: 'Stripe is not configured' };
  }

  try {
    const price = await stripe.prices.retrieve(priceId);
    
    if (!price.active) {
      return { valid: false, error: `Price ID ${priceId} is not active` };
    }

    if (!price.recurring) {
      return { valid: false, error: `Price ID ${priceId} is not a recurring subscription price` };
    }

    return { valid: true };
  } catch (error) {
    if (error instanceof Error) {
      return { valid: false, error: `Price ID ${priceId} not found: ${error.message}` };
    }
    return { valid: false, error: `Price ID ${priceId} validation failed` };
  }
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
  idempotencyKey?: string,
  metadata?: Record<string, string>
): Promise<{ sessionId: string; url: string | null }> {
  // Validate price ID before creating checkout session
  const validation = await validatePriceId(priceId);
  if (!validation.valid) {
    throw new Error(`Invalid price ID: ${validation.error}`);
  }

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
    metadata: metadata || {}, // Metadata on the checkout session
    subscription_data: {
      metadata: metadata || {}, // IMPORTANT: Also add metadata to the subscription itself
    },
  };

  // Add trial period if provided
  if (trialDays && trialDays > 0) {
    sessionParams.subscription_data!.trial_period_days = trialDays;
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const session = await stripe.checkout.sessions.create(
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
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  atPeriodEnd = true
): Promise<void> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  if (atPeriodEnd) {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    // Use update with immediate cancellation
    await stripe.subscriptions.update(subscriptionId, {
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
  const stripe = getStripe();
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const session = await stripe.billingPortal.sessions.create({
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
    const stripe = getStripe();
    if (!stripe) {
      console.error('Stripe is not configured');
      return null;
    }
    return stripe.webhooks.constructEvent(body, signature, secret);
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
