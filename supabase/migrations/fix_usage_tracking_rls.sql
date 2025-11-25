-- Fix usage_tracking RLS policies
-- Run this in Supabase SQL Editor

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can create own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Service role full access" ON public.usage_tracking;

-- Enable RLS (safe if already enabled)
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create fresh policies
CREATE POLICY "Service role full access"
  ON public.usage_tracking FOR ALL
  USING (true);  -- Service role bypasses RLS, so this allows all operations

CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'usage_tracking'
ORDER BY policyname;
