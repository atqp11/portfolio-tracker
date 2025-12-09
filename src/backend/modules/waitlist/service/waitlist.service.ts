/**
 * Waitlist Service Layer - Business Logic
 *
 * Orchestrates waitlist operations and enforces business rules.
 * Handles pagination, filtering, and data transformation.
 */

import * as waitlistDao from '../dao/waitlist.dao';
import type {
  ListWaitlistQuery,
  ListWaitlistResponseDto,
  DeleteWaitlistResponseDto,
  UpdateWaitlistStatusResponseDto,
  CreateWaitlistEntryResponseDto,
  PaginationDto,
} from '../dto/waitlist.dto';
import { NotFoundError } from '@backend/common/middleware/error-handler.middleware';

// ============================================================================
// BUSINESS LOGIC
// ============================================================================

/**
 * List all waitlist entries with pagination and filtering
 *
 * @param query - Query parameters (page, limit, notified, search)
 * @returns Paginated list of waitlist entries
 */
export async function listWaitlistEntries(
  query: ListWaitlistQuery
): Promise<ListWaitlistResponseDto> {
  const { page, limit, notified, search } = query;

  // Build filters
  const filters: waitlistDao.WaitlistFilters = {};
  
  if (notified === 'true') {
    filters.notified = true;
  } else if (notified === 'false') {
    filters.notified = false;
  }
  
  if (search && search.trim()) {
    filters.search = search.trim();
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Fetch data and count in parallel
  const [entries, total] = await Promise.all([
    waitlistDao.findAllWaitlistEntries(filters, skip, limit),
    waitlistDao.countWaitlistEntries(filters),
  ]);

  // Build pagination metadata
  const totalPages = Math.ceil(total / limit);
  const pagination: PaginationDto = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return {
    entries,
    pagination,
  };
}

/**
 * Delete a waitlist entry by ID
 *
 * @param id - Waitlist entry ID
 * @returns Deletion confirmation with deleted email
 * @throws NotFoundError if entry doesn't exist
 */
export async function deleteWaitlistEntry(
  id: string
): Promise<DeleteWaitlistResponseDto> {
  // Check if entry exists
  const entry = await waitlistDao.findWaitlistEntryById(id);
  
  if (!entry) {
    throw new NotFoundError('Waitlist entry');
  }

  // Delete the entry
  await waitlistDao.deleteWaitlistEntry(id);

  return {
    message: 'Waitlist entry deleted successfully',
    deletedEmail: entry.email,
  };
}

/**
 * Update notification status for multiple waitlist entries
 *
 * @param ids - Array of waitlist entry IDs
 * @param notified - New notification status
 * @returns Update confirmation with count
 */
export async function updateWaitlistNotificationStatus(
  ids: string[],
  notified: boolean
): Promise<UpdateWaitlistStatusResponseDto> {
  // Update entries
  const updatedCount = await waitlistDao.updateWaitlistNotificationStatus(
    ids,
    notified
  );

  return {
    message: `Updated ${updatedCount} waitlist ${updatedCount === 1 ? 'entry' : 'entries'}`,
    updatedCount,
  };
}

/**
 * Get waitlist statistics
 *
 * @returns Statistics about waitlist entries
 */
export async function getWaitlistStats(): Promise<{
  total: number;
  notified: number;
  pending: number;
}> {
  const [total, notified] = await Promise.all([
    waitlistDao.countWaitlistEntries({}),
    waitlistDao.countWaitlistEntries({ notified: true }),
  ]);

  return {
    total,
    notified,
    pending: total - notified,
  };
}

/**
 * Create a new waitlist entry (public signup)
 *
 * @param email - Email address
 * @param name - Optional name
 * @returns Creation response with entry ID and status
 */
export async function createWaitlistEntry(
  email: string,
  name: string | null
): Promise<CreateWaitlistEntryResponseDto> {
  // Check if entry already exists
  const existing = await waitlistDao.findWaitlistEntryByEmail(email);

  if (existing) {
    return {
      message: "You're already on the waitlist! We'll notify you when we launch.",
      id: existing.id,
      alreadyExists: true,
    };
  }

  // Create new entry
  const entry = await waitlistDao.createWaitlistEntry(email, name);

  return {
    message: 'Thank you for joining our waitlist!',
    id: entry.id,
    alreadyExists: false,
  };
}
