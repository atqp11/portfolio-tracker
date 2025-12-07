/**
 * Admin DAO Layer - Database Access
 *
 * Handles all database queries for admin operations
 */

import { createAdminClient } from '@lib/supabase/admin';
import type { Profile } from '@lib/supabase/db';

// ============================================================================
// TYPES
// ============================================================================

export interface UserFilters {
  email?: string;
  tier?: string;
  status?: string;
  isActive?: boolean;
}

export interface DeactivationLog {
  user_id: string;
  admin_id: string;
  reason: string;
  notes?: string;
}

export interface AdminAuditLog {
  admin_id: string;
  target_user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

// ============================================================================
// USER QUERIES
// ============================================================================

/**
 * Get all users with optional filters
 */
export async function getAllUsers(filters?: UserFilters): Promise<Profile[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.email) {
    query = query.ilike('email', `%${filters.email}%`);
  }

  if (filters?.tier) {
    query = query.eq('tier', filters.tier);
  }

  if (filters?.status) {
    query = query.eq('subscription_status', filters.status);
  }

  if (filters?.isActive !== undefined) {
    query = query.eq('is_active', filters.isActive);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data || [];
}

/**
 * Get single user by ID
 */
export async function getUserById(userId: string): Promise<Profile | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  return data;
}

/**
 * Get user's billing history
 */
export async function getUserBillingHistory(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('stripe_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch billing history: ${error.message}`);
  }

  return data || [];
}

/**
 * Get user's transaction log
 */
export async function getUserTransactions(userId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('stripe_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return data || [];
}

/**
 * Count active admin users
 */
export async function countActiveAdmins(): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to count active admins: ${error.message}`);
  }

  return data?.length || 0;
}

// ============================================================================
// USER MUTATIONS
// ============================================================================

/**
 * Update user profile
 */
export async function updateUser(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update user: ${error.message}`);
  }

  return data;
}

/**
 * Deactivate user account
 */
export async function deactivateUser(
  userId: string,
  reason: string
): Promise<Profile> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      deactivated_at: new Date().toISOString(),
      deactivation_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to deactivate user: ${error.message}`);
  }

  return data;
}

/**
 * Reactivate user account
 */
export async function reactivateUser(userId: string): Promise<Profile> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: true,
      deactivated_at: null,
      deactivation_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to reactivate user: ${error.message}`);
  }

  return data;
}

/**
 * Change user tier
 */
export async function changeUserTier(
  userId: string,
  newTier: string
): Promise<Profile> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      tier: newTier,
      subscription_tier: newTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to change user tier: ${error.message}`);
  }

  return data;
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

/**
 * Log deactivation event
 */
export async function logDeactivation(log: DeactivationLog): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('user_deactivations')
    .insert({
      ...log,
      deactivated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to log deactivation:', error);
    // Don't throw - logging failure shouldn't block the operation
  }
}

/**
 * Log reactivation event
 */
export async function logReactivation(
  userId: string,
  adminId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Find the most recent deactivation log
  const { data: deactivation } = await supabase
    .from('user_deactivations')
    .select('id')
    .eq('user_id', userId)
    .is('reactivated_at', null)
    .order('deactivated_at', { ascending: false })
    .limit(1)
    .single();

  if (deactivation) {
    const { error } = await supabase
      .from('user_deactivations')
      .update({
        reactivated_at: new Date().toISOString(),
        reactivated_by: adminId,
      })
      .eq('id', deactivation.id);

    if (error) {
      console.error('Failed to log reactivation:', error);
    }
  }
}

/**
 * Log admin action to audit trail
 */
export async function logAdminAction(log: AdminAuditLog): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('admin_audit_log')
    .insert({
      ...log,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failure shouldn't block the operation
  }
}

/**
 * Get admin audit log with optional filters
 */
export async function getAdminAuditLog(filters?: {
  adminId?: string;
  targetUserId?: string;
  action?: string;
  limit?: number;
}) {
  const supabase = createAdminClient();

  let query = supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.adminId) {
    query = query.eq('admin_id', filters.adminId);
  }

  if (filters?.targetUserId) {
    query = query.eq('target_user_id', filters.targetUserId);
  }

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit log: ${error.message}`);
  }

  return data || [];
}
