
import Stripe from 'stripe';
import { createAdminClient } from '@lib/supabase/admin';
import { getStripe, getTierFromPriceId } from '@lib/stripe/client';
import * as stripeDao from '@backend/modules/stripe/dao/stripe.dao';

interface WebhookContext {
  event: Stripe.Event;
}

// ============================================================================
// CHECKOUT COMPLETED
// ============================================================================

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  ctx: WebhookContext
): Promise<void> {
  const supabase = createAdminClient();
  
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.userId;

  if (!userId) {
    throw new Error('No userId in checkout session metadata');
  }

  // Get subscription details
  const subscriptionResponse = await getStripe().subscriptions.retrieve(subscriptionId);
  // Extract subscription data (Stripe Response wrapper adds headers)
  const subscription = subscriptionResponse as Stripe.Subscription;
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = getTierFromPriceId(priceId) || 'free';

  // Access subscription period dates (type-safe for Stripe v20+)
  const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start;
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  // Update user profile
  const { error } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: subscription.status,
      subscription_tier: tier,
      trial_ends_at: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }

  // Log transaction
  await logTransaction(ctx, {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    event_type: 'checkout.session.completed',
    tier_before: 'free',
    tier_after: tier,
    status: 'completed',
  });

  console.log(`✅ Checkout completed: User ${userId} → ${tier}`);
}

// ============================================================================
// SUBSCRIPTION UPDATED
// ============================================================================

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  ctx: WebhookContext
): Promise<void> {
  const supabase = createAdminClient();

  // Find user by customer ID
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (userError || !user) {
    console.error('User not found for subscription update:', subscription.customer);
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id;
  const newTier = getTierFromPriceId(priceId) || 'free';

  // Access subscription period dates (type-safe for Stripe v20+)
  const periodStart = (subscription as unknown as { current_period_start: number }).current_period_start;
  const periodEnd = (subscription as unknown as { current_period_end: number }).current_period_end;

  // Update user profile
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_tier: newTier,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(periodStart * 1000).toISOString(),
      current_period_end: new Date(periodEnd * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`);
  }

  // Log transaction
  await logTransaction(ctx, {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    event_type: 'customer.subscription.updated',
    tier_before: user.subscription_tier,
    tier_after: newTier,
    status: 'completed',
  });

  console.log(`✅ Subscription updated: User ${user.id} → ${newTier} (${subscription.status})`);
}

// ============================================================================
// INVOICE PAYMENT SUCCEEDED
// ============================================================================

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  ctx: WebhookContext
): Promise<void> {
  const supabase = createAdminClient();

  // Type-safe access to potentially missing properties (Stripe v20+)
  const subscriptionId = (invoice as unknown as { subscription?: string | null }).subscription;
  if (!subscriptionId) return; // Skip one-time payments

  // Find user by customer ID
  const { data: user } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (!user) return;

  // Update payment status
  await supabase
    .from('profiles')
    .update({
      last_payment_status: 'succeeded',
      last_payment_error: null,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Log transaction
  const paymentIntentId = (invoice as unknown as { payment_intent?: string | null }).payment_intent;
  await logTransaction(ctx, {
    user_id: user.id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: paymentIntentId ?? undefined,
    event_type: 'invoice.payment_succeeded',
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
    status: 'completed',
  });

  console.log(`✅ Payment succeeded: User ${user.id}, $${(invoice.amount_paid / 100).toFixed(2)}`);
}

// ============================================================================
// INVOICE PAYMENT FAILED
// ============================================================================

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  ctx: WebhookContext
): Promise<void> {
  const supabase = createAdminClient();

  // Type-safe access to potentially missing properties (Stripe v20+)
  const subscriptionId = (invoice as unknown as { subscription?: string | null }).subscription;
  if (!subscriptionId) return;

  // Find user by customer ID
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('stripe_customer_id', invoice.customer as string)
    .single();

  if (!user) return;

  const errorMessage = invoice.last_finalization_error?.message 
    || 'Payment failed';

  // Update payment status
  await supabase
    .from('profiles')
    .update({
      last_payment_status: 'failed',
      last_payment_error: errorMessage,
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Log transaction
  await logTransaction(ctx, {
    user_id: user.id,
    stripe_invoice_id: invoice.id,
    event_type: 'invoice.payment_failed',
    amount_cents: invoice.amount_due,
    currency: invoice.currency,
    status: 'failed',
    error_message: errorMessage,
  });

  // TODO: Send email notification to user
  console.log(`❌ Payment failed: User ${user.id} - ${errorMessage}`);
}

// ============================================================================
// SUBSCRIPTION DELETED (CANCELED)
// ============================================================================

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  ctx: WebhookContext
): Promise<void> {
  const supabase = createAdminClient();

  // Find user by customer ID
  const { data: user } = await supabase
    .from('profiles')
    .select('id, subscription_tier')
    .eq('stripe_customer_id', subscription.customer as string)
    .single();

  if (!user) return;

  // Downgrade to free
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      subscription_tier: 'free',
      tier: 'free', // Update the tier field used by quota system
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  // Log transaction
  await logTransaction(ctx, {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    event_type: 'customer.subscription.deleted',
    tier_before: user.subscription_tier,
    tier_after: 'free',
    status: 'completed',
  });

  console.log(`✅ Subscription canceled: User ${user.id} → free`);
}

// ============================================================================
// HELPERS
// ============================================================================

async function logTransaction(
  ctx: WebhookContext,
  data: Record<string, unknown>
): Promise<void> {
  const { event } = ctx;

  // Convert data to DAO format
  await stripeDao.upsertTransaction({
    stripe_event_id: event.id,
    event_type: (data.event_type as string) || event.type,
    status: (data.status as string) || 'completed',
    user_id: data.user_id as string | undefined,
    stripe_customer_id: data.stripe_customer_id as string | undefined,
    stripe_subscription_id: data.stripe_subscription_id as string | undefined,
    stripe_invoice_id: data.stripe_invoice_id as string | undefined,
    stripe_payment_intent_id: data.stripe_payment_intent_id as string | undefined,
    amount_cents: data.amount_cents as number | undefined,
    currency: data.currency as string | undefined,
    tier_before: data.tier_before as string | undefined,
    tier_after: data.tier_after as string | undefined,
    error_message: data.error_message as string | undefined,
    processed_at: new Date().toISOString(),
  });
}
