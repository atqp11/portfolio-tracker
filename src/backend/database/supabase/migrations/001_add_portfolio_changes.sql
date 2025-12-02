-- ============================================================================
-- Migration: Add `portfolio_changes` column safely
-- ============================================================================
-- This migration performs an in-place safe upgrade of `public.usage_tracking` to
-- ensure the `portfolio_changes` column exists and the table schema/order
-- matches the Prisma model. It follows this approach:
--  1. Drop RLS policies on `usage_tracking` (they will be recreated)
--  2. Rename the current table to a backup
--  3. Create the new `usage_tracking` table with the desired columns,
--     constraints and indexes (matching `prisma/schema.prisma` order)
--  4. Copy data from backup (set `portfolio_changes` = 0 if missing)
--  5. Recreate RLS policies for `usage_tracking`
--  6. Drop the backup table
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- IMPORTANT: Test in a staging environment before running in production.
-- ============================================================================

BEGIN;

-- 1) Drop usage_tracking RLS policies (if present)
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can view own usage') THEN
		EXECUTE 'DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking';
	END IF;
	EXECUTE 'DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking';
	EXECUTE 'DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking';
	EXECUTE 'DROP POLICY IF EXISTS "Service role has full access to usage" ON public.usage_tracking';
EXCEPTION WHEN undefined_table THEN
	-- If the table doesn't exist, ignore
	RAISE NOTICE 'usage_tracking table not present yet';
END$$;

-- 2) Rename existing table to backup (if it exists)
ALTER TABLE IF EXISTS public.usage_tracking RENAME TO usage_tracking_backup;

-- 3) Create the new table matching Prisma order and constraints
CREATE TABLE public.usage_tracking (
	id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
	user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
	tier TEXT NOT NULL,

	chat_queries INT NOT NULL DEFAULT 0,
	portfolio_analysis INT NOT NULL DEFAULT 0,
	sec_filings INT NOT NULL DEFAULT 0,
	portfolio_changes INT NOT NULL DEFAULT 0,

	period_start TIMESTAMPTZ NOT NULL,
	period_end TIMESTAMPTZ NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);

-- 4) Copy data from backup (if backup exists)
-- Use a dynamic SQL block to avoid referencing a column that may not exist
DO $$
DECLARE
	backup_has boolean;
	target_has boolean;
	sql text;
BEGIN
	-- Check if the backup table has the portfolio_changes column
	SELECT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'usage_tracking_backup'
			AND column_name = 'portfolio_changes'
	) INTO backup_has;

	-- Check if the target table has the portfolio_changes column
	SELECT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'public'
			AND table_name = 'usage_tracking'
			AND column_name = 'portfolio_changes'
	) INTO target_has;

	IF target_has THEN
		IF backup_has THEN
			sql := $q$
				INSERT INTO public.usage_tracking (id, user_id, tier, chat_queries, portfolio_analysis, sec_filings, portfolio_changes, period_start, period_end, created_at)
				SELECT id, user_id::uuid, tier, COALESCE(chat_queries, 0), COALESCE(portfolio_analysis, 0), COALESCE(sec_filings, 0), COALESCE(portfolio_changes, 0), period_start, period_end, created_at
				FROM public.usage_tracking_backup
				ON CONFLICT (id) DO NOTHING;
			$q$;
		ELSE
			sql := $q$
				INSERT INTO public.usage_tracking (id, user_id, tier, chat_queries, portfolio_analysis, sec_filings, portfolio_changes, period_start, period_end, created_at)
				SELECT id, user_id::uuid, tier, COALESCE(chat_queries, 0), COALESCE(portfolio_analysis, 0), COALESCE(sec_filings, 0), 0, period_start, period_end, created_at
				FROM public.usage_tracking_backup
				ON CONFLICT (id) DO NOTHING;
			$q$;
		END IF;
	ELSE
		-- Target table missing portfolio_changes column; insert without it
		sql := $q$
			INSERT INTO public.usage_tracking (id, user_id, tier, chat_queries, portfolio_analysis, sec_filings, period_start, period_end, created_at)
			SELECT id, user_id::uuid, tier, COALESCE(chat_queries, 0), COALESCE(portfolio_analysis, 0), COALESCE(sec_filings, 0), period_start, period_end, created_at
			FROM public.usage_tracking_backup
			ON CONFLICT (id) DO NOTHING;
		$q$;
	END IF;

	EXECUTE sql;
END $$;

-- 5) Recreate RLS policies for usage_tracking (same as rls-policies.sql)
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
	ON public.usage_tracking FOR SELECT
	USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
	ON public.usage_tracking FOR INSERT
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
	ON public.usage_tracking FOR UPDATE
	USING (auth.uid() = user_id)
	WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role has full access to usage"
	ON public.usage_tracking FOR ALL
	USING (auth.jwt()->>'role' = 'service_role');

-- 6) Drop backup table
DROP TABLE IF EXISTS public.usage_tracking_backup CASCADE;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'usage_tracking' AND table_schema = 'public';
 
