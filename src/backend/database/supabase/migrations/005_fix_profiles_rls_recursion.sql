-- ============================================================================
-- Fix Infinite Recursion in Profiles RLS Policies
-- ============================================================================
-- Problem: Admin policies query profiles table, causing infinite recursion
-- Solution: Create security definer function to check admin status
-- ============================================================================

-- Create a security definer function to check if user is admin
-- This function bypasses RLS, preventing infinite recursion
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(admin_status, FALSE);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;

-- Drop the problematic admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate admin policies using the security definer function
-- This prevents infinite recursion because the function bypasses RLS
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_user_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_user_admin(auth.uid()));

-- ============================================================================
-- Fix Other Tables with Admin Policies
-- ============================================================================
-- Update other tables to use the is_user_admin() function for consistency
-- and better performance (function call vs subquery)
-- ============================================================================

-- Stripe Transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.stripe_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.stripe_transactions FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- User Deactivations
DROP POLICY IF EXISTS "Admins can view deactivations" ON public.user_deactivations;
CREATE POLICY "Admins can view deactivations"
  ON public.user_deactivations FOR SELECT
  USING (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create deactivations" ON public.user_deactivations;
CREATE POLICY "Admins can create deactivations"
  ON public.user_deactivations FOR INSERT
  WITH CHECK (public.is_user_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update deactivations" ON public.user_deactivations;
CREATE POLICY "Admins can update deactivations"
  ON public.user_deactivations FOR UPDATE
  USING (public.is_user_admin(auth.uid()));

-- Rate Limit Log
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limit_log;
CREATE POLICY "Admins can view rate limits"
  ON public.rate_limit_log FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- Admin Audit Log
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (public.is_user_admin(auth.uid()));

-- ============================================================================
-- COMPLETED
-- ============================================================================

