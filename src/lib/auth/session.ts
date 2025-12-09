/**
 * Session Management Helpers for Supabase Auth
 *
 * These helpers make it easy to:
 * - Get the current authenticated user
 * - Require authentication (redirect if not authenticated)
 * - Get user profile with tier information
 */

import { createClient } from '@lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@lib/supabase/db';

// Re-export types for middleware
export type { User } from '@supabase/supabase-js';
export type UserProfile = Profile;

/**
 * Get the currently authenticated user (or null if not authenticated)
 * Use this in Server Components or API routes
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error fetching user:', error);

    // Corrected method to log session token
    const session = await supabase.auth.getSession();
    console.error('Supabase session token:', session?.data?.session?.access_token || 'No session token');

    return null;
  }

  console.log('User fetched successfully:', user);
  return user;
}

/**
 * Require authentication - redirects to /auth/signin if not authenticated
 * Use this in protected pages/layouts
 *
 * @example
 * export default async function DashboardPage() {
 *   const user = await requireUser();
 *   return <div>Welcome {user.email}!</div>;
 * }
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return user;
}

/**
 * Get the user's profile from the database
 * Includes tier information for access control
 *
 * @example
 * const profile = await getUserProfile();
 * if (profile.tier === 'free') {
 *   // Show upgrade prompt
 * }
 */
export async function getUserProfile(): Promise<Profile | null> {
  const user = await getUser();

  if (!user) {
    console.error('No user found. Unable to fetch profile.');
    throw new Error('User not authenticated');
  }

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile for user ID:', user.id, error);
    throw new Error('Failed to fetch user profile');
  }

  console.log('Profile fetched successfully for user ID:', user.id);
  return profile;
}

/**
 * Require user profile - redirects if not authenticated or profile not found
 * Use this when you need both authentication AND profile data
 *
 * @example
 * export default async function SettingsPage() {
 *   const profile = await requireUserProfile();
 *   return <div>Tier: {profile.tier}</div>;
 * }
 */
export async function requireUserProfile(): Promise<Profile> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('Error fetching profile:', error);
    // Profile should exist due to trigger, but if not, redirect to setup
    redirect('/auth/setup-profile');
  }

  return profile;
}

/**
 * Check if user has a specific tier or higher
 * Tier hierarchy: free < basic < premium
 *
 * @example
 * const hasAccess = await userHasTier('basic');
 * if (!hasAccess) {
 *   // Show paywall
 * }
 */
export async function userHasTier(
  requiredTier: 'free' | 'basic' | 'premium'
): Promise<boolean> {
  const profile = await getUserProfile();

  if (!profile) {
    return false;
  }

  const tierHierarchy = { free: 0, basic: 1, premium: 2 };
  const userTierLevel = tierHierarchy[profile.tier as keyof typeof tierHierarchy] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier];

  return userTierLevel >= requiredTierLevel;
}

/**
 * Require admin access - redirects if not admin
 * Use this in admin-only pages
 *
 * @example
 * export default async function AdminPage() {
 *   const profile = await requireAdmin();
 *   return <AdminPanel />;
 * }
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUserProfile();
  
  if (!profile.is_admin) {
    redirect('/dashboard');
  }

  return profile;
}

/**
 * Require a specific tier - redirects to pricing page if user doesn't have access
 *
 * @example
 * export default async function PremiumFeaturePage() {
 *   await requireTier('premium');
 *   return <div>Premium content here</div>;
 * }
 */
export async function requireTier(
  requiredTier: 'basic' | 'premium'
): Promise<Profile> {
  const profile = await requireUserProfile();

  const tierHierarchy = { free: 0, basic: 1, premium: 2 };
  const userTierLevel = tierHierarchy[profile.tier as keyof typeof tierHierarchy] || 0;
  const requiredTierLevel = tierHierarchy[requiredTier];

  if (userTierLevel < requiredTierLevel) {
    redirect(`/pricing?required=${requiredTier}`);
  }

  return profile;
}

/**
 * Sign out the current user
 * Use this in Server Actions or API routes
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
