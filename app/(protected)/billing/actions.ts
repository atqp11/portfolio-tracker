'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { createStripePortalSession } from '@backend/modules/stripe/stripe.service';

/**
 * Server Action: Create Stripe customer portal session
 */
export async function createPortalSession(returnUrl: string) {
  // Auth check
  await requireUser();
  const profile = await getUserProfile();
  
  if (!profile) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await createStripePortalSession({
      profile,
      returnUrl,
    });
    
    return { success: true, url: result.url };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create portal session');
  }
}
