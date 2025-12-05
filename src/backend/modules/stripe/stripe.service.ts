/**
 * Stripe Service - Business Logic Layer
 * 
 * Handles all Stripe-related business logic separate from API routes
 */

import { 
  createOrRetrieveCustomer, 
  createCheckoutSession, 
  getPriceIdForTier,
  createCustomerPortalSession,
  constructWebhookEvent,
  getTierFromPriceId
} from '@lib/stripe/client';
import { updateUserTier } from '@lib/supabase/db';
import { createAdminClient } from '@lib/supabase/admin';
import type { StripeTier } from '@lib/stripe/types';
import type Stripe from 'stripe';
import type { Profile } from '@lib/supabase/db';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCheckoutSessionParams {
  profile: Profile;
  tier: StripeTier;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}

export interface CreateCheckoutSessionResult {
  sessionId: string;
  url: string | null;
  tier: StripeTier;
}

export interface GetCheckoutInfoResult {
  currentTier: string;
  stripeCustomerId: string | null | undefined;
  available: boolean;
}

export interface CreatePortalSessionParams {
  profile: Profile;
  returnUrl: string;
}

export interface CreatePortalSessionResult {
  url: string;
}

export interface ProcessWebhookParams {
  body: string;
  signature: string;
  webhookSecret: string;
}

export interface ProcessWebhookResult {
  received: boolean;
}

// ============================================================================
// CHECKOUT SERVICE
// ============================================================================

/**
 * Create a Stripe checkout session for subscription upgrade
 */
export async function createStripeCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<CreateCheckoutSessionResult> {
  const { profile, tier, successUrl, cancelUrl, trialDays } = params;

  // Business rule: Free tier doesn't need checkout
  if (tier === 'free') {
    throw new Error('Free tier does not require checkout');
  }

  // Get or create Stripe customer
  const customerId = await createOrRetrieveCustomer(profile.email, {
    userId: profile.id,
  });

  // Get price ID for tier
  const priceId = getPriceIdForTier(tier);
  if (!priceId) {
    throw new Error(`Price ID not configured for ${tier} tier`);
  }

  // Create checkout session
  const { sessionId, url } = await createCheckoutSession(
    customerId,
    priceId,
    successUrl,
    cancelUrl,
    trialDays
  );

  return {
    sessionId,
    url,
    tier,
  };
}

/**
 * Get checkout information for current user
 */
export async function getCheckoutInfo(profile: Profile): Promise<GetCheckoutInfoResult> {
  return {
    currentTier: profile.tier,
    stripeCustomerId: profile.stripe_customer_id,
    available: true,
  };
}

// ============================================================================
// PORTAL SERVICE
// ============================================================================

/**
 * Create a Stripe customer portal session
 */
export async function createStripePortalSession(
  params: CreatePortalSessionParams
): Promise<CreatePortalSessionResult> {
  const { profile, returnUrl } = params;

  // Get or create Stripe customer
  const customerId = await createOrRetrieveCustomer(profile.email, {
    userId: profile.id,
  });

  // Create portal session
  const url = await createCustomerPortalSession(customerId, returnUrl);

  return { url };
}

/**
 * Get portal information for current user
 */
export async function getPortalInfo(profile: Profile) {
  return {
    hasPortalAccess: !!profile.stripe_customer_id,
    tier: profile.tier,
  };
}

// ============================================================================
// WEBHOOK SERVICE
// ============================================================================

/**
 * Process incoming Stripe webhook event
 */
export async function processStripeWebhook(
  params: ProcessWebhookParams
): Promise<ProcessWebhookResult> {
  const { body, signature, webhookSecret } = params;

  // Verify webhook signature
  const event = constructWebhookEvent(body, signature, webhookSecret);
  if (!event) {
    throw new Error('Invalid webhook signature');
  }

  console.log(`Processing Stripe webhook event: ${event.type}`);

  // Route event to appropriate handler
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return { received: true };
}

// ============================================================================
// WEBHOOK EVENT HANDLERS
// ============================================================================

interface SubscriptionMetadata {
  userId?: string;
}

/**
 * Handle subscription created or updated events
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  // Get the price ID from subscription
  const priceId = subscription.items.data[0]?.price?.id as string;
  if (!priceId) {
    throw new Error('No price ID found in subscription');
  }

  // Get tier from price ID
  const tier = getTierFromPriceId(priceId);
  if (!tier) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }

  // Get user ID from subscription metadata
  const metadata = subscription.metadata as SubscriptionMetadata;
  const userId = metadata?.userId;

  if (!userId) {
    throw new Error('Cannot determine user ID for subscription');
  }

  // Update user tier in database
  const result = await updateUserTier(userId, tier);
  if (!result) {
    throw new Error(`Failed to update user tier for user ${userId}`);
  }

  console.log(`Successfully updated user ${userId} to tier: ${tier}`);

  // Store subscription info
  await storeSubscriptionInfo(userId, subscription.id, tier, 'active');
}

/**
 * Handle subscription canceled events
 */
async function handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
  const metadata = subscription.metadata as SubscriptionMetadata;
  const userId = metadata?.userId;

  if (!userId) {
    throw new Error('Cannot determine user ID for canceled subscription');
  }

  // Downgrade user to free tier
  const result = await updateUserTier(userId, 'free');
  if (!result) {
    throw new Error(`Failed to downgrade user ${userId} to free tier`);
  }

  // Update subscription status
  await storeSubscriptionInfo(userId, subscription.id, 'free', 'canceled');

  console.log(`Successfully downgraded user ${userId} to free tier`);
}

/**
 * Handle successful payment events
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  console.log('Payment succeeded:', invoice.id);
  // Add additional logic here for successful payments (e.g., send receipt email)
}

/**
 * Handle failed payment events
 */
async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log('Payment failed:', invoice.id);
  // Add logic here for failed payments (e.g., send notification to user)
}

/**
 * Store subscription information in database
 */
async function storeSubscriptionInfo(
  userId: string,
  subscriptionId: string,
  tier: string,
  status: string
): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to store subscription info: ${error.message}`);
  }

  console.log(
    `Stored subscription ${subscriptionId} for user ${userId} (tier: ${tier}, status: ${status})`
  );
}
