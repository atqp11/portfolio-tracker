'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { stripeController } from '@backend/modules/stripe/stripe.controller';
import { checkoutRequestSchema } from '@lib/stripe/validation';
import { getStripePriceId, PlanTier, BillingInterval } from '@backend/modules/subscriptions/config/plans.config';

/**
 * Helper to format Zod validation errors into user-friendly messages
 */
function formatValidationError(error: z.ZodError): string {
  if (error.issues && error.issues.length > 0) {
    const firstError = error.issues[0];
    const field = firstError.path.length > 0 ? firstError.path.join('.') : '';
    return field ? `${field}: ${firstError.message}` : firstError.message;
  }
  return 'Validation failed';
}

/**
 * Server Action: Create Stripe checkout session for subscription upgrade
 * 
 * Per guidelines: Server Actions call controllers, not services directly.
 * 
 * Security: Price ID is resolved server-side using resolvePriceId() with server-only
 * env vars (STRIPE_PRICE_*), not client-provided values.
 * 
 * @param data - Checkout request data (tier, billingPeriod, successUrl, cancelUrl, trialDays)
 * @returns Checkout session URL for redirect
 */
export async function createCheckoutSession(data: unknown) {
  try {
    // 1. Auth check
    await requireUser();
    const profile = await getUserProfile();
    
    if (!profile) {
      throw new Error('User profile not found');
    }

    // 2. Validate with safeParse (NOT parse)
    const result = checkoutRequestSchema.safeParse(data);
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    const { tier, billingPeriod, successUrl, cancelUrl, trialDays } = result.data;

    // 3. Resolve price ID server-side (security: don't trust client-provided priceId)
    const priceId = getStripePriceId(
      tier as PlanTier,
      billingPeriod as BillingInterval
    );

    // 4. Call controller (per guidelines: Server Actions call controllers, not services)
    const checkoutResult = await stripeController.createCheckoutSessionData(profile, {
      tier,
      priceId, // Server-resolved price ID
      successUrl,
      cancelUrl,
      trialDays,
    });

    // 5. Return checkout URL
    if (!checkoutResult.url) {
      throw new Error('Failed to create checkout session');
    }

    // 6. Revalidate paths (per guidelines)
    revalidatePath('/pricing');
    revalidatePath('/dashboard');

    return { success: true, url: checkoutResult.url };
  } catch (error) {
    // Re-throw with user-friendly message
    throw new Error(error instanceof Error ? error.message : 'Failed to create checkout session');
  }
}

/**
 * Server Action: Get checkout information for current user
 * 
 * Per guidelines: Server Actions call controllers, not services directly.
 * 
 * @returns Checkout info (current tier, stripe customer ID, availability)
 */
export async function getCheckoutInfo() {
  try {
    // 1. Auth check
    await requireUser();
    const profile = await getUserProfile();
    
    if (!profile) {
      throw new Error('User profile not found');
    }

    // 2. Call controller (per guidelines: Server Actions call controllers, not services)
    const result = await stripeController.getCheckoutInfoData(profile);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    // Re-throw with user-friendly message
    throw new Error(error instanceof Error ? error.message : 'Failed to get checkout info');
  }
}

