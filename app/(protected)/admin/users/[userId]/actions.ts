'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { adminController } from '@backend/modules/admin/admin.controller';
import { z } from 'zod';

// Validation schemas
const userIdSchema = z.string().uuid();
const tierSchema = z.enum(['free', 'basic', 'premium']);
const changeTierSchema = z.object({
  userId: userIdSchema,
  tier: tierSchema,
  reason: z.string().min(1, 'Reason is required'),
});
const extendTrialSchema = z.object({
  userId: userIdSchema,
  days: z.number().int().positive().max(365, 'Cannot extend trial more than 365 days'),
});

/**
 * Server Action: Sync user subscription from Stripe
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function syncSubscription(userId: string) {
  // Auth check
  await requireUser();
  const admin = await getUserProfile();
  if (!admin?.is_admin) {
    throw new Error('Unauthorized');
  }

  // Validate
  const validatedUserId = userIdSchema.parse(userId);

  try {
    await adminController.syncSubscriptionData(validatedUserId, admin.id);
    revalidatePath(`/admin/users/${validatedUserId}`);
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to sync subscription');
  }
}

/**
 * Server Action: Cancel user subscription
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function cancelSubscription(userId: string) {
  // Auth check
  await requireUser();
  const admin = await getUserProfile();
  if (!admin?.is_admin) {
    throw new Error('Unauthorized');
  }

  // Validate
  const validatedUserId = userIdSchema.parse(userId);

  try {
    await adminController.cancelSubscriptionData(validatedUserId, admin.id, false);
    revalidatePath(`/admin/users/${validatedUserId}`);
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to cancel subscription');
  }
}

/**
 * Server Action: Change user tier
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function changeTier(userId: string, tier: string, reason: string) {
  // Auth check
  await requireUser();
  const admin = await getUserProfile();
  if (!admin?.is_admin) {
    throw new Error('Unauthorized');
  }

  // Validate
  const validated = changeTierSchema.parse({ userId, tier, reason });

  try {
    await adminController.changeTierData(
      validated.userId,
      admin.id,
      validated.tier
    );
    revalidatePath(`/admin/users/${validated.userId}`);
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to change tier');
  }
}

/**
 * Server Action: Extend user trial
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function extendTrial(userId: string, days: number) {
  // Auth check
  await requireUser();
  const admin = await getUserProfile();
  if (!admin?.is_admin) {
    throw new Error('Unauthorized');
  }

  // Validate
  const validated = extendTrialSchema.parse({ userId, days });

  try {
    await adminController.extendTrialData(validated.userId, admin.id, validated.days);
    revalidatePath(`/admin/users/${validated.userId}`);
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to extend trial');
  }
}
