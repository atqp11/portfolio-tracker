-- ============================================================================
-- Migration: 004_stripe_rls_policies.sql
-- Purpose: Row Level Security policies for Stripe and admin tables
-- Date: 2025-12-05
-- ============================================================================

-- ============================================================================
-- Enable RLS on new tables
-- ============================================================================

ALTER TABLE public.stripe_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_deactivations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Stripe Transactions Policies
-- ============================================================================

-- Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.stripe_transactions;
CREATE POLICY "Users can view own transactions"
  ON public.stripe_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.stripe_transactions;
CREATE POLICY "Admins can view all transactions"
  ON public.stripe_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Service role can do everything (for webhooks)
DROP POLICY IF EXISTS "Service role full access on stripe_transactions" ON public.stripe_transactions;
CREATE POLICY "Service role full access on stripe_transactions"
  ON public.stripe_transactions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- User Deactivations Policies
-- ============================================================================

-- Admins can view all deactivation logs
DROP POLICY IF EXISTS "Admins can view deactivations" ON public.user_deactivations;
CREATE POLICY "Admins can view deactivations"
  ON public.user_deactivations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can create deactivation logs
DROP POLICY IF EXISTS "Admins can create deactivations" ON public.user_deactivations;
CREATE POLICY "Admins can create deactivations"
  ON public.user_deactivations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can update deactivation logs (for reactivation)
DROP POLICY IF EXISTS "Admins can update deactivations" ON public.user_deactivations;
CREATE POLICY "Admins can update deactivations"
  ON public.user_deactivations FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Service role for backend operations
DROP POLICY IF EXISTS "Service role full access on user_deactivations" ON public.user_deactivations;
CREATE POLICY "Service role full access on user_deactivations"
  ON public.user_deactivations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Rate Limit Log Policies
-- ============================================================================

-- Service role only (no direct user access)
DROP POLICY IF EXISTS "Service role full access on rate_limit_log" ON public.rate_limit_log;
CREATE POLICY "Service role full access on rate_limit_log"
  ON public.rate_limit_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Admins can view for monitoring
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limit_log;
CREATE POLICY "Admins can view rate limits"
  ON public.rate_limit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- ============================================================================
-- Admin Audit Log Policies
-- ============================================================================

-- Only admins can view audit logs
DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Service role for inserts (backend creates audit entries)
DROP POLICY IF EXISTS "Service role full access on admin_audit_log" ON public.admin_audit_log;
CREATE POLICY "Service role full access on admin_audit_log"
  ON public.admin_audit_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Enhanced Profiles Policies
-- ============================================================================

-- Users can view their own profile
-- (This should already exist, but ensure it's correct)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own non-admin fields
-- Note: Field-level restrictions (is_admin, tier, etc.) are enforced at application layer
-- RLS only ensures users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Admins can update any profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Service role for webhook updates
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;
CREATE POLICY "Service role can update profiles"
  ON public.profiles FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- COMPLETED
-- ============================================================================
