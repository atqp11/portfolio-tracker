'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { adminController } from '@backend/modules/admin/admin.controller';
import { z } from 'zod';
import {
  clearCacheInputSchema,
  retryWebhookInputSchema,
} from '@backend/modules/admin/zod/admin.schemas';

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
 * Server Action: Clear cache
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function clearCache() {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate input (empty object for clear cache)
    const result = clearCacheInputSchema.safeParse({});
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    // Call controller
    const cacheResult = await adminController.clearCacheData(admin.id);

    // Revalidate paths
    revalidatePath('/admin');
    revalidatePath('/admin/users');

    return cacheResult;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to clear cache');
  }
}

/**
 * Server Action: Retry webhook event
 * Uses controller method per guidelines (RSC pages/actions call controllers, not services)
 */
export async function retryWebhook(eventId: string) {
  try {
    // Auth check
    await requireUser();
    const admin = await getUserProfile();
    if (!admin?.is_admin) {
      throw new Error('Unauthorized');
    }

    // Validate input
    const result = retryWebhookInputSchema.safeParse({ eventId });
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    // Call controller
    const retryResult = await adminController.retryWebhookData(result.data.eventId, admin.id);

    // Revalidate paths
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/*`);

    return retryResult;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to retry webhook');
  }
}

