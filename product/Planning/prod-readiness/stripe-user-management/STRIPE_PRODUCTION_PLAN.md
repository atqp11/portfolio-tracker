# Stripe Production Plan

**Status:** 📋 Planning  
**Created:** December 5, 2025  
**Priority:** 🔴 High (Blocks Revenue)

---

## Executive Summary

This document outlines the plan to make Stripe integration production-ready with fault tolerance, idempotency, and comprehensive error handling. The goal is to ensure **no duplicate charges** and **reliable subscription state management**.

---

## Current State Analysis

### What Exists ✅

| Component | File | Status |
|-----------|------|--------|
| Stripe Client | `src/lib/stripe/client.ts` | ✅ Working |
| Checkout API | `app/api/stripe/checkout/route.ts` | ✅ Basic |
| Portal API | `app/api/stripe/portal/route.ts` | ✅ Basic |
| Webhook Handler | `app/api/stripe/webhook/route.ts` | ✅ Basic |
| Stripe Service | `src/backend/modules/stripe/stripe.service.ts` | ✅ Basic |
| Types | `src/lib/stripe/types.ts` | ✅ Defined |

### What's Missing ❌

| Feature | Priority | Impact |
|---------|----------|--------|
| Idempotency Keys | 🔴 Critical | Prevents duplicate charges |
| Transaction Logging | 🔴 Critical | Audit trail for disputes |
| Webhook Retry Handling | 🔴 Critical | Prevents missed events |
| Error Recovery | 🔴 Critical | Manual correction guidance |
| Rate Limiting | 🟡 Medium | Prevents abuse |
| Input Validation (Zod) | 🟡 Medium | Security & reliability |

---

## Implementation Plan

### Phase 1: Fault-Tolerant Stripe Operations

#### 1.1 Idempotency Keys

**Problem:** Network failures can cause duplicate charges if a request is retried.

**Solution:** Use Stripe idempotency keys for all POST operations.

```typescript
// src/lib/stripe/client.ts - Updated

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
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    billing_address_collection: 'auto',
    subscription_data: trialDays ? { trial_period_days: trialDays } : undefined,
  };

  const session = await getStripe().checkout.sessions.create(
    sessionParams,
    { idempotencyKey: idempotencyKey || `checkout_${customerId}_${Date.now()}` }
  );

  return { sessionId: session.id, url: session.url };
}
```

**Files to Update:**
- `src/lib/stripe/client.ts`
- `app/api/stripe/checkout/route.ts`
- `src/backend/modules/stripe/stripe.service.ts`

#### 1.2 Transaction Logging Table

**Purpose:** Track all Stripe operations for audit, debugging, and dispute resolution.

```sql
-- Supabase Migration: stripe_transactions table
CREATE TABLE stripe_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction identification
  stripe_event_id TEXT UNIQUE,           -- Stripe event ID for deduplication
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Transaction details
  event_type TEXT NOT NULL,              -- checkout.session.completed, invoice.payment_succeeded, etc.
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  error_message TEXT,
  error_code TEXT,
  
  -- Metadata
  tier_before TEXT,
  tier_after TEXT,
  idempotency_key TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  -- Indexes
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Indexes for common queries
CREATE INDEX idx_stripe_tx_user ON stripe_transactions(user_id);
CREATE INDEX idx_stripe_tx_event_id ON stripe_transactions(stripe_event_id);
CREATE INDEX idx_stripe_tx_status ON stripe_transactions(status);
CREATE INDEX idx_stripe_tx_created ON stripe_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE stripe_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own transactions
CREATE POLICY "Users can view own transactions"
  ON stripe_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role for inserts/updates (webhook handler)
CREATE POLICY "Service role full access"
  ON stripe_transactions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
```

#### 1.3 Webhook Idempotency (Event Deduplication)

**Problem:** Stripe can send the same webhook event multiple times.

**Solution:** Check `stripe_event_id` before processing.

```typescript
// src/backend/modules/stripe/stripe.service.ts - Updated

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
  const supabase = createAdminClient();
  const { data: existingTx } = await supabase
    .from('stripe_transactions')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single();

  if (existingTx) {
    console.log(`Duplicate webhook event ${event.id}, skipping`);
    return { received: true, duplicate: true };
  }

  // Log the incoming event
  const { error: logError } = await supabase
    .from('stripe_transactions')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

  if (logError) {
    console.error('Failed to log webhook event:', logError);
    // Continue processing - logging failure shouldn't block the webhook
  }

  try {
    // Process event...
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      // ... other handlers
    }

    // Mark as completed
    await supabase
      .from('stripe_transactions')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('stripe_event_id', event.id);

    return { received: true };
  } catch (error) {
    // Mark as failed with error details
    await supabase
      .from('stripe_transactions')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id);

    throw error;
  }
}
```

---

### Phase 2: Subscription State Management

#### 2.1 Enhanced User Profile Schema

```sql
-- Supabase Migration: Enhanced profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'none',  -- none, trialing, active, past_due, canceled, unpaid
  subscription_tier TEXT DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  last_payment_status TEXT,                  -- succeeded, failed, pending
  last_payment_error TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for subscription queries
CREATE INDEX idx_profiles_subscription_status ON profiles(subscription_status);
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
```

#### 2.2 Subscription State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                    Subscription State Machine                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   [none] ─────checkout.session.completed────▶ [trialing/active]  │
│                                                                   │
│   [trialing] ──trial_will_end (3 days)─────▶ [trial_ending]      │
│                                                                   │
│   [trial_ending] ──payment_succeeded───────▶ [active]            │
│                   └─payment_failed─────────▶ [past_due]          │
│                                                                   │
│   [active] ────invoice.payment_failed──────▶ [past_due]          │
│            └───subscription.deleted────────▶ [canceled]          │
│                                                                   │
│   [past_due] ──invoice.payment_succeeded───▶ [active]            │
│              └─subscription.deleted────────▶ [canceled]          │
│                                                                   │
│   [canceled] ──checkout.session.completed──▶ [active]            │
│              └─(auto-cleanup after 30d)────▶ [none]              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

#### 2.3 Webhook Event Handlers

**Complete webhook handler implementation:**

```typescript
// src/backend/modules/stripe/webhook-handlers.ts

import Stripe from 'stripe';
import { createAdminClient } from '@lib/supabase/admin';

interface WebhookContext {
  event: Stripe.Event;
  supabase: ReturnType<typeof createAdminClient>;
}

// ============================================================================
// CHECKOUT COMPLETED
// ============================================================================

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  ctx: WebhookContext
): Promise<void> {
  const { supabase } = ctx;
  
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const userId = session.metadata?.userId;

  if (!userId) {
    throw new Error('No userId in checkout session metadata');
  }

  // Get subscription details
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = getTierFromPriceId(priceId) || 'free';

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
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
  const { supabase } = ctx;

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

  // Update user profile
  const { error } = await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_tier: newTier,
      cancel_at_period_end: subscription.cancel_at_period_end,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
  const { supabase } = ctx;

  if (!invoice.subscription) return; // Skip one-time payments

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
  await logTransaction(ctx, {
    user_id: user.id,
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: invoice.payment_intent as string,
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
  const { supabase } = ctx;

  if (!invoice.subscription) return;

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
  const { supabase } = ctx;

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
  const { supabase, event } = ctx;

  await supabase
    .from('stripe_transactions')
    .upsert({
      stripe_event_id: event.id,
      ...data,
      processed_at: new Date().toISOString(),
    }, {
      onConflict: 'stripe_event_id',
    });
}
```

---

### Phase 3: Refund & Cancellation Handling

#### 3.1 Admin Refund API

```typescript
// app/api/admin/users/[userId]/refund/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@lib/stripe/client';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/supabase/server';

const refundSchema = z.object({
  amount_cents: z.number().int().positive().optional(), // Partial refund
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin
    const profile = await getUserProfile();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = refundSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { amount_cents, reason, note } = validation.data;
    const { userId } = params;

    // Get user's Stripe info
    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer ID' },
        { status: 400 }
      );
    }

    // Get latest payment intent
    const charges = await getStripe().charges.list({
      customer: user.stripe_customer_id,
      limit: 1,
    });

    if (!charges.data.length) {
      return NextResponse.json(
        { error: 'No charges found for this customer' },
        { status: 400 }
      );
    }

    const charge = charges.data[0];

    // Create refund with idempotency key
    const idempotencyKey = `refund_${charge.id}_${Date.now()}`;
    const refund = await getStripe().refunds.create(
      {
        charge: charge.id,
        amount: amount_cents, // Omit for full refund
        reason: reason,
        metadata: {
          admin_user_id: profile.id,
          note: note || '',
          target_user_id: userId,
        },
      },
      { idempotencyKey }
    );

    // Log the refund
    await supabase.from('stripe_transactions').insert({
      user_id: userId,
      stripe_customer_id: user.stripe_customer_id,
      event_type: 'refund.created',
      amount_cents: refund.amount,
      currency: refund.currency,
      status: refund.status === 'succeeded' ? 'completed' : 'pending',
      idempotency_key: idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    console.error('Refund error:', error);
    return NextResponse.json(
      {
        error: 'Refund failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        manual_steps: [
          '1. Go to Stripe Dashboard → Payments',
          '2. Find the charge by customer email',
          '3. Click "Refund" and enter the amount',
          '4. Update user tier in Supabase if needed',
        ],
      },
      { status: 500 }
    );
  }
}
```

#### 3.2 Admin Cancellation API

```typescript
// app/api/admin/users/[userId]/cancel-subscription/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@lib/stripe/client';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/supabase/server';

const cancelSchema = z.object({
  immediately: z.boolean().default(false), // Cancel at period end by default
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin
    const profile = await getUserProfile();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const validation = cancelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { immediately, reason } = validation.data;
    const { userId } = params;

    // Get user's subscription
    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, subscription_tier, email')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'User has no active subscription' },
        { status: 400 }
      );
    }

    // Cancel subscription
    const idempotencyKey = `cancel_${user.stripe_subscription_id}_${Date.now()}`;
    
    let subscription;
    if (immediately) {
      subscription = await getStripe().subscriptions.cancel(
        user.stripe_subscription_id,
        { idempotencyKey }
      );
    } else {
      subscription = await getStripe().subscriptions.update(
        user.stripe_subscription_id,
        { cancel_at_period_end: true },
        { idempotencyKey }
      );
    }

    // Update user in database
    await supabase
      .from('profiles')
      .update({
        subscription_status: immediately ? 'canceled' : 'active',
        subscription_tier: immediately ? 'free' : user.subscription_tier,
        tier: immediately ? 'free' : user.subscription_tier,
        cancel_at_period_end: !immediately,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    // Log the action
    await supabase.from('stripe_transactions').insert({
      user_id: userId,
      stripe_subscription_id: user.stripe_subscription_id,
      event_type: 'admin.subscription.canceled',
      tier_before: user.subscription_tier,
      tier_after: immediately ? 'free' : user.subscription_tier,
      status: 'completed',
      idempotency_key: idempotencyKey,
    });

    return NextResponse.json({
      success: true,
      cancel_at_period_end: !immediately,
      effective_date: immediately 
        ? 'Immediately' 
        : new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      {
        error: 'Cancellation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        manual_steps: [
          '1. Go to Stripe Dashboard → Subscriptions',
          '2. Search by customer email',
          '3. Click "Cancel subscription"',
          '4. Update user tier in Supabase: profiles.tier = "free"',
        ],
      },
      { status: 500 }
    );
  }
}
```

---

### Phase 4: Error Recovery & Manual Correction

#### 4.1 Error States & Recovery Steps

| Error State | Symptoms | Admin Action | Manual Stripe Steps |
|-------------|----------|--------------|---------------------|
| **Webhook Failed** | User paid but tier not updated | Run `/api/admin/sync-subscription/[userId]` | Check Stripe Dashboard → Events |
| **Duplicate Charge** | User charged twice | Process refund via Admin Panel | Stripe → Payments → Refund |
| **Payment Failed** | subscription_status = past_due | Contact user, retry payment | Stripe → Invoices → Retry |
| **Orphan Customer** | Stripe customer, no DB user | Link customer to user | Update profiles.stripe_customer_id |
| **Tier Mismatch** | DB tier ≠ Stripe subscription | Sync from Stripe | Update profiles.tier manually |

#### 4.2 Sync Subscription API

```typescript
// app/api/admin/users/[userId]/sync-subscription/route.ts

export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin
    const profile = await getUserProfile();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = params;
    const supabase = createAdminClient();

    // Get user's Stripe customer ID
    const { data: user } = await supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, tier')
      .eq('id', userId)
      .single();

    if (!user?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'User has no Stripe customer ID' },
        { status: 400 }
      );
    }

    // Get current subscription from Stripe
    const subscriptions = await getStripe().subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'all',
      limit: 1,
    });

    const subscription = subscriptions.data[0];
    
    if (!subscription) {
      // No subscription - ensure user is on free tier
      await supabase
        .from('profiles')
        .update({
          tier: 'free',
          subscription_tier: 'free',
          subscription_status: 'none',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      return NextResponse.json({
        success: true,
        action: 'downgraded_to_free',
        reason: 'No active Stripe subscription found',
      });
    }

    // Sync subscription data
    const priceId = subscription.items.data[0]?.price?.id;
    const tier = getTierFromPriceId(priceId) || 'free';

    await supabase
      .from('profiles')
      .update({
        tier: tier,
        subscription_tier: tier,
        subscription_status: subscription.status,
        stripe_subscription_id: subscription.id,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      action: 'synced',
      tier: tier,
      status: subscription.status,
      period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## Testing Checklist

### Unit Tests

- [ ] Idempotency key generation
- [ ] Webhook signature verification
- [ ] Event deduplication logic
- [ ] Tier mapping from price IDs
- [ ] Transaction logging

### Integration Tests

- [ ] Checkout flow → webhook → tier update
- [ ] Payment failed → past_due status
- [ ] Subscription canceled → free tier
- [ ] Refund processing
- [ ] Trial period handling

### E2E Tests

- [ ] Complete signup → payment → access flow
- [ ] Admin refund flow
- [ ] Admin cancellation flow
- [ ] Webhook retry handling

---

## Environment Variables

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs
STRIPE_PRODUCT_FREE_PRICE_ID=price_xxx
STRIPE_PRODUCT_BASIC_PRICE_ID=price_xxx
STRIPE_PRODUCT_PREMIUM_PRICE_ID=price_xxx

# Trial Configuration
STRIPE_TRIAL_DAYS=14
```

---

## Success Criteria

- [ ] No duplicate charges possible (idempotency keys)
- [ ] All Stripe events logged in `stripe_transactions`
- [ ] Webhook deduplication working
- [ ] Admin can refund any charge
- [ ] Admin can cancel any subscription
- [ ] Admin can sync subscription state from Stripe
- [ ] Error states include manual correction steps
- [ ] All critical paths have tests

---

## Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Fault Tolerance | 3 days | None |
| Phase 2: State Management | 2 days | Phase 1 |
| Phase 3: Refund/Cancel | 2 days | Phase 1 & 2 |
| Phase 4: Error Recovery | 1 day | Phase 1-3 |
| Testing | 2 days | All phases |

**Total: ~10 days**

---

## References

- [Stripe Idempotency](https://stripe.com/docs/api/idempotent_requests)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Existing Code Review](../../docs/5_Guides/STRIPE_CODE_REVIEW.md)
- [Rate Limiting Plan](../production-readiness-2024/QUOTA_VS_RATE_LIMITING.md)
