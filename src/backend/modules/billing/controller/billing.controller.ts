/**
 * Billing Controller Layer
 * 
 * Handles validation and orchestration for billing operations.
 * Thin wrapper that delegates to service layer.
 */

import { billingService, type SubscriptionMismatch } from '../service/billing.service';
import type { TierName } from '@lib/tiers';

export class BillingController {
  /**
   * Detect all subscription mismatches between Stripe and Supabase
   * Admin-only operation
   * 
   * @returns Array of subscription mismatches
   */
  async detectAllMismatches(): Promise<SubscriptionMismatch[]> {
    return await billingService.detectAllMismatches();
  }

  /**
   * Sync a specific user's subscription from Stripe to Supabase
   * Admin-only operation
   * 
   * @param userId - User ID to sync
   */
  async syncMissingSubscription(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }

    await billingService.syncMissingSubscription(userId);
  }

  /**
   * Sync all missing subscriptions from Stripe to Supabase
   * Admin-only operation
   * 
   * @returns Summary of sync results
   */
  async syncAllMissingSubscriptions(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    return await billingService.syncAllMissingSubscriptions();
  }
}

export const billingController = new BillingController();
