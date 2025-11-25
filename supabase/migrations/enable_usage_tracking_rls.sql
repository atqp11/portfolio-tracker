-- Enable Row Level Security for usage_tracking table
-- Run this in Supabase SQL Editor

-- Enable RLS
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own usage
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own usage records
CREATE POLICY "Users can create own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own usage records
CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for server-side operations)
-- This allows the server to create/update usage records without user context
CREATE POLICY "Service role full access"
  ON public.usage_tracking FOR ALL
  USING (auth.role() = 'service_role');

-- Verify policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'usage_tracking';
