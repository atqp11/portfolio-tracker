'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { stripeController } from '@backend/modules/stripe/stripe.controller';
import { billingService } from '@backend/modules/billing/service/billing.service';
import { getStripe } from '@lib/stripe/client';

/**
 * Server Action: Create Stripe customer portal session
 * 
 * Per guidelines: Server Actions call controllers, not services directly.
 */
export async function createPortalSession(returnUrl: string) {
  try {
    // 1. Auth check
    await requireUser();
    const profile = await getUserProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    // 2. Call controller (per guidelines: Server Actions call controllers, not services)
    const result = await stripeController.createPortalSessionData(profile, returnUrl);
    
    // 3. Revalidate paths (per guidelines)
    revalidatePath('/billing');
    revalidatePath('/dashboard');

    return { success: true, url: result.url };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create portal session');
  }
}

/**
 * Server Action: Sync user's own subscription from Stripe
 * 
 * Allows users to sync their own subscription when mismatches are detected.
 * This is a user-facing action (not admin-only).
 */
export async function syncMySubscription() {
  try {
    // 1. Auth check
    await requireUser();
    const profile = await getUserProfile();
    
    if (!profile) {
      throw new Error('Unauthorized');
    }

    if (!profile.stripe_subscription_id) {
      throw new Error('No subscription found to sync');
    }

    // 2. Get subscription from Stripe
    const stripe = getStripe();
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);

    // 3. Sync subscription (user-facing method)
    await billingService.syncSubscriptionFromStripe(profile.id, subscription);
    
    // 4. Revalidate paths
    revalidatePath('/billing');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to sync subscription');
  }
}
