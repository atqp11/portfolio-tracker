-- Update tier structure to (free, basic, premium)
-- Run this in Supabase SQL Editor

-- 1. First, temporarily disable the constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;

-- 2. Update any existing 'pro' users to 'premium' (if any exist)
UPDATE public.profiles SET tier = 'premium' WHERE tier = 'pro';

-- 3. Add the new constraint with updated values
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tier_check
  CHECK (tier IN ('free', 'basic', 'premium'));

-- 4. Verify the change
SELECT tier, COUNT(*) as count
FROM public.profiles
GROUP BY tier;
