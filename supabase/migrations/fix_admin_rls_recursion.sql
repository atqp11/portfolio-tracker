-- Fix infinite recursion in admin RLS policies
-- The issue: Admin policies were checking profiles table, which triggered the same policy

-- ============================================================================
-- STEP 1: Drop problematic admin policies
-- ============================================================================

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all usage" ON public.usage_tracking;

-- ============================================================================
-- STEP 2: Keep simple user policies (no recursion)
-- ============================================================================

-- Users can read their own profile (already exists, but recreate to be safe)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (already exists)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- STEP 3: Service role still has full access (for admin operations)
-- ============================================================================

-- Service role policy (already exists from previous migration)
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;
CREATE POLICY "Service role has full access to profiles"
  ON public.profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- EXPLANATION
-- ============================================================================

-- Admin operations will use the Supabase service role client, which bypasses RLS.
-- This is the correct approach for admin operations:
--
-- 1. Regular users → Use regular Supabase client → RLS enforced (own profile only)
-- 2. Admin operations → Use service role client → RLS bypassed (all profiles)
--
-- The service role client is used in:
-- - lib/supabase/db.ts (getAllUsers, updateUserTier, etc.)
-- - These functions are only called by admin API routes after auth check

COMMENT ON COLUMN public.profiles.is_admin IS 'Admin flag - checked server-side, not via RLS to avoid recursion';
