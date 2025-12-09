/**
 * Waitlist DAO Layer - Database Access
 *
 * Handles all database queries for waitlist operations.
 * Uses Supabase with RLS policies for user-facing data (when needed).
 * Admin operations use service role client.
 */

import { createAdminClient } from '@lib/supabase/admin';
import type { WaitlistEntryDto } from '../dto/waitlist.dto';

// ============================================================================
// TYPES
// ============================================================================

export interface WaitlistFilters {
  notified?: boolean;
  search?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all waitlist entries with optional filters and pagination
 *
 * @param filters - Optional filters (notified status, search)
 * @param skip - Number of records to skip (for pagination)
 * @param limit - Maximum number of records to return
 * @returns Array of waitlist entries
 */
export async function findAllWaitlistEntries(
  filters: WaitlistFilters = {},
  skip: number = 0,
  limit: number = 50
): Promise<WaitlistEntryDto[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('waitlist')
    .select('*')
    .order('created_at', { ascending: false })
    .range(skip, skip + limit - 1);

  // Apply notified filter
  if (filters.notified !== undefined) {
    query = query.eq('notified', filters.notified);
  }

  // Apply search filter (email or name)
  if (filters.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch waitlist entries: ${error.message}`);
  }

  return (data || []).map(mapToDto);
}

/**
 * Count total waitlist entries with optional filters
 *
 * @param filters - Optional filters (notified status, search)
 * @returns Total count of matching entries
 */
export async function countWaitlistEntries(
  filters: WaitlistFilters = {}
): Promise<number> {
  const supabase = createAdminClient();

  let query = supabase
    .from('waitlist')
    .select('*', { count: 'exact', head: true } as any);

  // Apply notified filter
  if (filters.notified !== undefined) {
    query = query.eq('notified', filters.notified);
  }

  // Apply search filter (email or name)
  if (filters.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
    );
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count waitlist entries: ${error.message}`);
  }

  return count || 0;
}

/**
 * Find a single waitlist entry by ID
 *
 * @param id - Waitlist entry ID
 * @returns Waitlist entry or null if not found
 */
export async function findWaitlistEntryById(
  id: string
): Promise<WaitlistEntryDto | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('waitlist')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch waitlist entry: ${error.message}`);
  }

  return mapToDto(data);
}

/**
 * Delete a waitlist entry by ID
 *
 * @param id - Waitlist entry ID
 * @returns Deleted entry
 * @throws Error if entry not found or deletion fails
 */
export async function deleteWaitlistEntry(
  id: string
): Promise<WaitlistEntryDto> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('waitlist')
    .delete()
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Waitlist entry not found');
    }
    throw new Error(`Failed to delete waitlist entry: ${error.message}`);
  }

  return mapToDto(data);
}

/**
 * Update notification status for multiple waitlist entries
 *
 * @param ids - Array of waitlist entry IDs
 * @param notified - New notification status
 * @returns Number of updated entries
 */
export async function updateWaitlistNotificationStatus(
  ids: string[],
  notified: boolean
): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('waitlist')
    .update({ notified })
    .in('id', ids)
    .select();

  if (error) {
    throw new Error(`Failed to update waitlist entries: ${error.message}`);
  }

  return data?.length || 0;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Map database row to DTO
 */
function mapToDto(row: any): WaitlistEntryDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    notified: row.notified,
    createdAt: row.created_at,
  };
}
