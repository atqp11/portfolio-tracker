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
const deactivateUserSchema = z.object({
  userId: userIdSchema,
  reason: z.string().optional(),
  notes: z.string().optional(),
  cancelSubscription: z.boolean().optional(),
});
const refundUserSchema = z.object({
  userId: userIdSchema,
  amountCents: z.number().int().positive(),
  reason: z.string().min(1, 'Reason is required'),
  note: z.string().optional(),
  chargeId: z.string().optional(), // Optional: specific charge to refund
});

/**
 * Helper function to format Zod validation errors into user-friendly messages
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
 * Server Action: Sync user subscription from Stripe
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function syncSubscription(userId: string) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = userIdSchema.safeParse(userId);
    if (!result.success) {
      throw new Error('Invalid user ID');
    }

    await adminController.syncSubscriptionData(result.data, admin.id);
    revalidatePath(`/admin/users/${result.data}`);
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to sync subscription');
  }
}

/**
 * Server Action: Get cancellation preview with refund calculation
 * Shows what will happen if subscription is canceled immediately
 */
export async function getCancellationPreview(userId: string) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = userIdSchema.safeParse(userId);
    if (!result.success) {
      throw new Error('Invalid user ID');
    }

    const preview = await adminController.getCancellationPreviewData(result.data);
    return { success: true, data: preview };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get cancellation preview');
  }
}

/**
 * Server Action: Cancel user subscription
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function cancelSubscription(userId: string, immediate = false) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = userIdSchema.safeParse(userId);
    if (!result.success) {
      throw new Error('Invalid user ID');
    }

    await adminController.cancelSubscriptionData(result.data, admin.id, immediate);
    revalidatePath(`/admin/users/${result.data}`);
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
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = changeTierSchema.safeParse({ userId, tier, reason });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    await adminController.changeTierData(
      result.data.userId,
      admin.id,
      result.data.tier
    );
    revalidatePath(`/admin/users/${result.data.userId}`);
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
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = extendTrialSchema.safeParse({ userId, days });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    await adminController.extendTrialData(result.data.userId, admin.id, result.data.days);
    revalidatePath(`/admin/users/${result.data.userId}`);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to extend trial');
  }
}

/**
 * Server Action: Deactivate user account
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function deactivateUser(
  userId: string,
  reason?: string,
  notes?: string,
  cancelSubscription?: boolean
) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = deactivateUserSchema.safeParse({
      userId,
      reason,
      notes,
      cancelSubscription,
    });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    await adminController.deactivateUserData(
      result.data.userId,
      admin.id,
      result.data.reason,
      result.data.notes,
      result.data.cancelSubscription
    );
    revalidatePath(`/admin/users/${result.data.userId}`);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to deactivate user');
  }
}

/**
 * Server Action: Reactivate user account
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function reactivateUser(userId: string) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = userIdSchema.safeParse(userId);
    if (!result.success) {
      throw new Error('Invalid user ID');
    }

    await adminController.reactivateUserData(result.data, admin.id);
    revalidatePath(`/admin/users/${result.data}`);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to reactivate user');
  }
}

/**
 * Server Action: Update user tier (simple update without reason requirement)
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function updateUserTier(userId: string, tier: string) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const userIdResult = userIdSchema.safeParse(userId);
    if (!userIdResult.success) {
      throw new Error('Invalid user ID');
    }

    const tierResult = tierSchema.safeParse(tier);
    if (!tierResult.success) {
      throw new Error('Invalid tier. Must be one of: free, basic, premium');
    }

    await adminController.updateUserTierData(userIdResult.data, admin.id, tierResult.data);
    revalidatePath(`/admin/users/${userIdResult.data}`);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update tier');
  }
}

/**
 * Server Action: Update user admin status
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function updateAdminStatus(userId: string, isAdmin: boolean) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const userIdResult = userIdSchema.safeParse(userId);
    if (!userIdResult.success) {
      throw new Error('Invalid user ID');
    }

    const isAdminResult = z.boolean().safeParse(isAdmin);
    if (!isAdminResult.success) {
      throw new Error('Invalid admin status. Must be true or false');
    }

    await adminController.updateAdminStatusData(userIdResult.data, admin.id, isAdminResult.data);
    revalidatePath(`/admin/users/${userIdResult.data}`);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update admin status');
  }
}

/**
 * Server Action: Reset user quota
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function resetUserQuota(userId: string) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = userIdSchema.safeParse(userId);
    if (!result.success) {
      throw new Error('Invalid user ID');
    }

    await adminController.resetUserQuotaData(result.data, admin.id);
    revalidatePath(`/admin/users/${result.data}`);
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to reset quota');
  }
}

/**
 * Server Action: Refund user payment
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 * Supports optional charge selection for users with multiple payments
 */
export async function refundUser(
  userId: string,
  amountCents: number,
  reason: string,
  note?: string,
  chargeId?: string
) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate
    const result = refundUserSchema.safeParse({
      userId,
      amountCents,
      reason,
      note,
      chargeId,
    });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    const refundResult = await adminController.refundUserData(
      result.data.userId,
      admin.id,
      result.data.amountCents,
      result.data.reason,
      result.data.note,
      result.data.chargeId
    );
    revalidatePath(`/admin/users/${result.data.userId}`);
    return { success: true, data: refundResult };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to process refund');
  }
}

/**
 * Server Action: Create Stripe customer portal session for a user (admin use)
 * 
 * Per guidelines: Server Actions call controllers, not services directly.
 * Allows admin to manage a user's subscription via Stripe Customer Portal.
 */
export async function createPortalSessionForUser(userId: string, returnUrl: string) {
  try {
    // 1. Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // 2. Validate
    const result = userIdSchema.safeParse(userId);
    if (!result.success) {
      throw new Error('Invalid user ID');
    }

    // 3. Call controller (per guidelines: Server Actions call controllers, not services)
    const portalResult = await adminController.createUserPortalSessionData(result.data, returnUrl);
    
    // 4. Revalidate paths (per guidelines)
    revalidatePath(`/admin/users/${result.data}`);

    return { success: true, url: portalResult.url };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create portal session');
  }
}
