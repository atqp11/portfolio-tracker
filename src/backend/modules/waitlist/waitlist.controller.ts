/**
 * Waitlist Controller - HTTP Layer
 *
 * Handles HTTP concerns (request/response formatting).
 * Delegates business logic to service layer.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as waitlistService from './service/waitlist.service';
import type {
  ListWaitlistQuery,
  DeleteWaitlistRequest,
  UpdateWaitlistStatusRequest,
  CreateWaitlistEntryRequest,
} from './dto/waitlist.dto';
import { SuccessResponse } from '@lib/types/base/response.dto';

// ============================================================================
// CONTROLLER METHODS
// ============================================================================

/**
 * GET /api/admin/waitlist
 * List all waitlist entries with pagination and filtering
 */
export async function listWaitlistEntries(
  request: NextRequest,
  context: { params?: any; query?: ListWaitlistQuery }
): Promise<NextResponse> {
  const result = await waitlistService.listWaitlistEntries(context.query!);

  return NextResponse.json(SuccessResponse.create(result));
}

/**
 * DELETE /api/admin/waitlist
 * Remove a waitlist entry by ID
 */
export async function deleteWaitlistEntry(
  request: NextRequest,
  context: { params?: any; body?: DeleteWaitlistRequest }
): Promise<NextResponse> {
  const result = await waitlistService.deleteWaitlistEntry(context.body!.id);

  return NextResponse.json(SuccessResponse.create(result));
}

/**
 * PATCH /api/admin/waitlist
 * Update notification status for multiple waitlist entries
 */
export async function updateWaitlistNotificationStatus(
  request: NextRequest,
  context: { params?: any; body?: UpdateWaitlistStatusRequest }
): Promise<NextResponse> {
  const { ids, notified } = context.body!;
  const result = await waitlistService.updateWaitlistNotificationStatus(
    ids,
    notified
  );

  return NextResponse.json(SuccessResponse.create(result));
}

// ============================================================================
// RSC PAGE METHODS (Non-HTTP, return DTOs directly)
// ============================================================================

/**
 * Get waitlist entries (for RSC pages)
 * Validates input with Zod schema
 * Returns DTO directly, no NextResponse wrapping
 */
export async function listWaitlistEntriesData(query: ListWaitlistQuery) {
  // Validate input
  const validated = await import('./dto/waitlist.dto').then(m => 
    m.listWaitlistQuerySchema.parse(query)
  );
  
  return await waitlistService.listWaitlistEntries(validated);
}

/**
 * Create waitlist entry (for RSC pages and server actions)
 * Validates input with Zod schema
 * Returns DTO directly, no NextResponse wrapping
 */
export async function createWaitlistEntryData(data: CreateWaitlistEntryRequest) {
  // Validate input
  const { createWaitlistEntrySchema } = await import('./dto/waitlist.dto');
  const validated = createWaitlistEntrySchema.parse(data);
  
  return await waitlistService.createWaitlistEntry(
    validated.email,
    validated.name || null
  );
}
