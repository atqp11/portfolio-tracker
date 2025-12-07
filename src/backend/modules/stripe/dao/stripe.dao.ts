/**
 * Stripe DAO Layer - Database Access
 *
 * Handles all database queries for Stripe operations
 * Pure data access layer - no business logic
 */

import { createAdminClient } from '@lib/supabase/admin';

// ============================================================================
// TYPES
// ============================================================================

export interface StripeTransaction {
  id?: string;
  user_id?: string;
  stripe_event_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_invoice_id?: string;
  stripe_payment_intent_id?: string;
  stripe_refund_id?: string;
  event_type: string;
  amount_cents?: number;
  currency?: string;
  status: string;
  error_message?: string;
  error_code?: string;
  tier_before?: string;
  tier_after?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  processed_at?: string;
}

export interface CreateTransactionParams {
  stripe_event_id?: string;
  event_type: string;
  status?: string;
  user_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_invoice_id?: string;
  stripe_payment_intent_id?: string;
  amount_cents?: number;
  currency?: string;
  tier_before?: string;
  tier_after?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface UpdateTransactionParams {
  status?: string;
  error_message?: string;
  error_code?: string;
  processed_at?: string;
}

// ============================================================================
// TRANSACTION QUERIES
// ============================================================================

/**
 * Check if a transaction exists by Stripe event ID (for idempotency)
 */
export async function findTransactionByEventId(
  eventId: string
): Promise<StripeTransaction | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('stripe_transactions')
    .select('*')
    .eq('stripe_event_id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to find transaction: ${error.message}`);
  }

  return data;
}

/**
 * Create a new Stripe transaction record
 */
export async function createTransaction(
  params: CreateTransactionParams
): Promise<StripeTransaction> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('stripe_transactions')
    .insert({
      stripe_event_id: params.stripe_event_id,
      event_type: params.event_type,
      status: params.status || 'pending',
      user_id: params.user_id,
      stripe_customer_id: params.stripe_customer_id,
      stripe_subscription_id: params.stripe_subscription_id,
      stripe_invoice_id: params.stripe_invoice_id,
      stripe_payment_intent_id: params.stripe_payment_intent_id,
      amount_cents: params.amount_cents,
      currency: params.currency || 'usd',
      tier_before: params.tier_before,
      tier_after: params.tier_after,
      idempotency_key: params.idempotency_key,
      metadata: params.metadata || {},
      created_at: params.created_at || new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  // Return the created transaction by fetching it
  if (params.stripe_event_id) {
    const transaction = await findTransactionByEventId(params.stripe_event_id);
    if (transaction) {
      return transaction;
    }
  }

  // If we can't fetch it, return a minimal representation
  return {
    event_type: params.event_type,
    status: params.status || 'pending',
  } as StripeTransaction;
}

/**
 * Update a transaction by Stripe event ID
 */
export async function updateTransactionByEventId(
  eventId: string,
  updates: UpdateTransactionParams
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {};
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }
  if (updates.error_message !== undefined) {
    updateData.error_message = updates.error_message;
  }
  if (updates.error_code !== undefined) {
    updateData.error_code = updates.error_code;
  }
  if (updates.processed_at !== undefined) {
    updateData.processed_at = updates.processed_at;
  }

  const { error } = await supabase
    .from('stripe_transactions')
    .update(updateData)
    .eq('stripe_event_id', eventId);

  if (error) {
    throw new Error(`Failed to update transaction: ${error.message}`);
  }
}

/**
 * Upsert a transaction (insert or update if exists)
 */
export async function upsertTransaction(
  params: CreateTransactionParams & UpdateTransactionParams
): Promise<StripeTransaction> {
  const supabase = createAdminClient();

  if (!params.stripe_event_id) {
    throw new Error('stripe_event_id is required for upsert');
  }

  const { error } = await supabase
    .from('stripe_transactions')
    .upsert(
      {
        stripe_event_id: params.stripe_event_id,
        event_type: params.event_type,
        status: params.status || 'pending',
        user_id: params.user_id,
        stripe_customer_id: params.stripe_customer_id,
        stripe_subscription_id: params.stripe_subscription_id,
        stripe_invoice_id: params.stripe_invoice_id,
        stripe_payment_intent_id: params.stripe_payment_intent_id,
        amount_cents: params.amount_cents,
        currency: params.currency || 'usd',
        tier_before: params.tier_before,
        tier_after: params.tier_after,
        idempotency_key: params.idempotency_key,
        metadata: params.metadata || {},
        error_message: params.error_message,
        error_code: params.error_code,
        created_at: params.created_at || new Date().toISOString(),
        processed_at: params.processed_at,
      },
      {
        onConflict: 'stripe_event_id',
      }
    );

  if (error) {
    throw new Error(`Failed to upsert transaction: ${error.message}`);
  }

  // Return the upserted transaction
  const transaction = await findTransactionByEventId(params.stripe_event_id);
  if (!transaction) {
    throw new Error('Failed to retrieve upserted transaction');
  }

  return transaction;
}

