'use server';

import { z } from 'zod';
import { createWaitlistEntryData } from '@backend/modules/waitlist/waitlist.controller';
import { createWaitlistEntrySchema } from '@backend/modules/waitlist/dto/waitlist.dto';

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
 * Server Action: Join waitlist (public, no auth required)
 * Uses controller RSC method per guidelines (Server Actions call controllers, not services)
 */
export async function joinWaitlist(data: { email: string; name?: string }) {
  try {
    // Validate input with safeParse (per guidelines)
    const result = createWaitlistEntrySchema.safeParse(data);
    if (!result.success) {
      throw new Error(formatValidationError(result.error));
    }

    // Call controller RSC method (returns DTO directly, no HTTP wrapping)
    const serviceResult = await createWaitlistEntryData(result.data);
    
    return {
      success: true,
      ...serviceResult,
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to join waitlist');
  }
}

