/**
 * Retry Service - Exponential Backoff Retry Logic
 *
 * Handles automatic and manual retries for failed webhook events
 */

import { createAdminClient } from '@lib/supabase/admin';
import * as stripeDao from '@backend/modules/stripe/dao/stripe.dao';
import type { StripeTransaction } from '@backend/modules/stripe/dao/stripe.dao';

/**
 * Calculate delay for exponential backoff
 * Standard exponential backoff: delay = baseDelay * (2 ^ attemptNumber)
 */
export function calculateRetryDelay(attemptNumber: number, baseDelayMs = 1000): number {
  return baseDelayMs * Math.pow(2, attemptNumber);
}

/**
 * Get retry count from transaction metadata
 */
export function getRetryCount(transaction: StripeTransaction): number {
  const metadata = (transaction.metadata as Record<string, unknown>) || {};
  return (metadata.retryCount as number) || 0;
}

/**
 * Update retry count in transaction metadata
 */
export async function updateRetryCount(
  eventId: string,
  retryCount: number,
  retryStatus: 'pending' | 'completed' | 'failed'
): Promise<void> {
  const supabase = createAdminClient();

  // Get current transaction
  const transaction = await stripeDao.findTransactionByEventId(eventId);
  if (!transaction) {
    throw new Error(`Transaction not found for event ID: ${eventId}`);
  }

  // Update metadata with retry information
  const metadata = (transaction.metadata as Record<string, unknown>) || {};
  const updatedMetadata = {
    ...metadata,
    retryCount,
    lastRetryStatus: retryStatus,
    lastRetryAt: new Date().toISOString(),
  };

  // Update transaction
  const { error } = await supabase
    .from('stripe_transactions')
    .update({
      metadata: updatedMetadata,
    })
    .eq('stripe_event_id', eventId);

  if (error) {
    throw new Error(`Failed to update retry count: ${error.message}`);
  }
}

/**
 * Retry a failed webhook event
 * This simulates reprocessing the webhook event
 */
export async function retryWebhookEvent(eventId: string): Promise<{
  success: boolean;
  retryCount: number;
  error?: string;
}> {
  const transaction = await stripeDao.findTransactionByEventId(eventId);
  if (!transaction) {
    throw new Error(`Transaction not found for event ID: ${eventId}`);
  }

  const currentRetryCount = getRetryCount(transaction);
  const maxRetries = 5; // Maximum number of retries

  if (currentRetryCount >= maxRetries) {
    return {
      success: false,
      retryCount: currentRetryCount,
      error: 'Maximum retry attempts reached',
    };
  }

  // Update retry count
  const newRetryCount = currentRetryCount + 1;
  await updateRetryCount(eventId, newRetryCount, 'pending');

  try {
    // TODO: Actually reprocess the webhook event
    // For now, we'll mark it as completed if it's a manual retry
    // In production, this should call the actual webhook handler
    
    // Simulate processing delay
    const delay = calculateRetryDelay(newRetryCount - 1);
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 5000))); // Cap at 5 seconds

    // Mark as completed
    await updateRetryCount(eventId, newRetryCount, 'completed');
    await stripeDao.updateTransactionByEventId(eventId, {
      status: 'completed',
      processed_at: new Date().toISOString(),
    });

    return {
      success: true,
      retryCount: newRetryCount,
    };
  } catch (error) {
    // Mark retry as failed
    await updateRetryCount(eventId, newRetryCount, 'failed');
    
    return {
      success: false,
      retryCount: newRetryCount,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


