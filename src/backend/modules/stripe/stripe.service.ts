/**
 * Stripe Service - Business Logic Layer
 * 
 * Handles all Stripe-related business logic separate from API routes
 */

import { 
  createOrRetrieveCustomer, 
  createCheckoutSession, 
  createCustomerPortalSession,
  constructWebhookEvent,
  getTierFromPriceId
} from '@lib/stripe/client';
import { updateUserTier } from '@lib/supabase/db';
import type { StripeTier } from '@lib/stripe/types';
import type Stripe from 'stripe';
import type { Profile } from '@lib/supabase/db';
import { 
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed,
  handleCheckoutCompleted,
} from '@backend/modules/stripe/webhook-handlers';
import * as stripeDao from '@backend/modules/stripe/dao/stripe.dao';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateCheckoutSessionParams {
  profile: Profile;
  tier: StripeTier;
  priceId?: string; // Optional: if provided, use this instead of tier-based lookup
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
  duplicate?: boolean;
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
  const { profile, tier, priceId: providedPriceId, successUrl, cancelUrl, trialDays } = params;

  // Business rule: Free tier doesn't need checkout
  if (tier === 'free') {
    throw new Error('Free tier does not require checkout');
  }

  // Get or create Stripe customer
  const customerId = await createOrRetrieveCustomer(profile.email, {
    userId: profile.id,
  });

  // Use provided priceId (must be server-resolved via resolvePriceId(), not client-provided)
  if (!providedPriceId) {
    throw new Error(`Price ID is required for ${tier} tier`);
  }
  const priceId = providedPriceId;

  // Create idempotency key
  const idempotencyKey = `checkout_${profile.id}_${Date.now()}`;

  // Create checkout session with userId metadata for webhook processing
  const { sessionId, url } = await createCheckoutSession(
    customerId,
    priceId,
    successUrl,
    cancelUrl,
    trialDays,
    idempotencyKey,
    { userId: profile.id } // Critical: Include userId so webhook can update correct user
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

  // Check for duplicate event (idempotency)
  const existingTx = await stripeDao.findTransactionByEventId(event.id);

  if (existingTx) {
    console.log(`Duplicate webhook event ${event.id}, skipping`);
    return { received: true, duplicate: true };
  }

  // Log the incoming event
  try {
    await stripeDao.createTransaction({
      stripe_event_id: event.id,
      event_type: event.type,
      status: 'pending',
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('Failed to log webhook event:', logError);
    // Continue processing - logging failure shouldn't block the webhook
  }

  try {
    const context = { event };
    // Process event...
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, context);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, context);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, context);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, context);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, context);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark as completed
    await stripeDao.updateTransactionByEventId(event.id, {
      status: 'completed',
      processed_at: new Date().toISOString(),
    });

    return { received: true };
  } catch (error) {
    // Mark as failed with error details
    await stripeDao.updateTransactionByEventId(event.id, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      processed_at: new Date().toISOString(),
    });

    throw error;
  }
}

