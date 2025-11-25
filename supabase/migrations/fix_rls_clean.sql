-- ============================================================================
-- Clean RLS Setup - Drop ALL existing policies and recreate properly
-- ============================================================================

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create clean policies for profiles
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- USAGE TRACKING - Clean policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Service role has full access to usage_tracking" ON public.usage_tracking;

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_select_own"
  ON public.usage_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "usage_all_service_role"
  ON public.usage_tracking
  FOR ALL
  USING (true);
