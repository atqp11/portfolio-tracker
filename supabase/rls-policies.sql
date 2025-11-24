-- ============================================================================
-- Row-Level Security (RLS) Policies for Portfolio Tracker
-- ============================================================================
-- Run this AFTER running schema.sql
-- This ensures users can only access their own data
-- ============================================================================

-- ============================================================================
-- DROP EXISTING POLICIES (for clean recreation)
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Usage tracking policies
DROP POLICY IF EXISTS "Users can view own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can update own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Service role can manage all usage" ON public.usage_tracking;

-- Portfolio policies
DROP POLICY IF EXISTS "Users can view own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can update own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Service role can manage all portfolios" ON public.portfolios;

-- Stocks policies
DROP POLICY IF EXISTS "Users can view own stocks" ON public.stocks;
DROP POLICY IF EXISTS "Users can insert own stocks" ON public.stocks;
DROP POLICY IF EXISTS "Users can update own stocks" ON public.stocks;
DROP POLICY IF EXISTS "Users can delete own stocks" ON public.stocks;
DROP POLICY IF EXISTS "Service role can manage all stocks" ON public.stocks;

-- Investment theses policies
DROP POLICY IF EXISTS "Users can view own theses" ON public.investment_theses;
DROP POLICY IF EXISTS "Users can insert own theses" ON public.investment_theses;
DROP POLICY IF EXISTS "Users can update own theses" ON public.investment_theses;
DROP POLICY IF EXISTS "Users can delete own theses" ON public.investment_theses;
DROP POLICY IF EXISTS "Service role can manage all theses" ON public.investment_theses;

-- Checklist policies
DROP POLICY IF EXISTS "Users can view own checklists" ON public.daily_checklists;
DROP POLICY IF EXISTS "Users can insert own checklists" ON public.daily_checklists;
DROP POLICY IF EXISTS "Users can update own checklists" ON public.daily_checklists;
DROP POLICY IF EXISTS "Users can delete own checklists" ON public.daily_checklists;
DROP POLICY IF EXISTS "Service role can manage all checklists" ON public.daily_checklists;

-- Tasks policies
DROP POLICY IF EXISTS "Users can view own tasks" ON public.checklist_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.checklist_tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.checklist_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.checklist_tasks;
DROP POLICY IF EXISTS "Service role can manage all tasks" ON public.checklist_tasks;

-- Waitlist policies
DROP POLICY IF EXISTS "Anyone can insert waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Service role can manage waitlist" ON public.waitlist;

-- ============================================================================
-- CREATE POLICIES
-- ============================================================================

-- ============================================================================
-- PROFILES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do everything (for admin operations)
CREATE POLICY "Service role can manage all profiles"
  ON public.profiles
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage tracking
CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own usage tracking
CREATE POLICY "Users can insert own usage"
  ON public.usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage tracking
CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all usage"
  ON public.usage_tracking
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PORTFOLIOS
-- ============================================================================

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Users can view their own portfolios
CREATE POLICY "Users can view own portfolios"
  ON public.portfolios FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own portfolios
CREATE POLICY "Users can create own portfolios"
  ON public.portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own portfolios
CREATE POLICY "Users can update own portfolios"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own portfolios
CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all portfolios"
  ON public.portfolios
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- STOCKS
-- ============================================================================

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Users can view stocks in their portfolios
CREATE POLICY "Users can view own stocks"
  ON public.stocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can create stocks in their portfolios
CREATE POLICY "Users can create own stocks"
  ON public.stocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can update stocks in their portfolios
CREATE POLICY "Users can update own stocks"
  ON public.stocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can delete stocks in their portfolios
CREATE POLICY "Users can delete own stocks"
  ON public.stocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage all stocks"
  ON public.stocks
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- INVESTMENT THESES
-- ============================================================================

ALTER TABLE public.investment_theses ENABLE ROW LEVEL SECURITY;

-- Users can view theses in their portfolios
CREATE POLICY "Users can view own theses"
  ON public.investment_theses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can create theses in their portfolios
CREATE POLICY "Users can create own theses"
  ON public.investment_theses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can update theses in their portfolios
CREATE POLICY "Users can update own theses"
  ON public.investment_theses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can delete theses in their portfolios
CREATE POLICY "Users can delete own theses"
  ON public.investment_theses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage all theses"
  ON public.investment_theses
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- DAILY CHECKLISTS
-- ============================================================================

ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;

-- Users can view checklists in their portfolios
CREATE POLICY "Users can view own checklists"
  ON public.daily_checklists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = daily_checklists.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can create checklists in their portfolios
CREATE POLICY "Users can create own checklists"
  ON public.daily_checklists FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = daily_checklists.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can update checklists in their portfolios
CREATE POLICY "Users can update own checklists"
  ON public.daily_checklists FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = daily_checklists.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = daily_checklists.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can delete checklists in their portfolios
CREATE POLICY "Users can delete own checklists"
  ON public.daily_checklists FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = daily_checklists.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage all checklists"
  ON public.daily_checklists
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- CHECKLIST TASKS
-- ============================================================================

ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;

-- Users can view tasks in their checklists
CREATE POLICY "Users can view own tasks"
  ON public.checklist_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      JOIN public.portfolios ON portfolios.id = daily_checklists.portfolio_id
      WHERE daily_checklists.id = checklist_tasks.checklist_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can create tasks in their checklists
CREATE POLICY "Users can create own tasks"
  ON public.checklist_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      JOIN public.portfolios ON portfolios.id = daily_checklists.portfolio_id
      WHERE daily_checklists.id = checklist_tasks.checklist_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can update tasks in their checklists
CREATE POLICY "Users can update own tasks"
  ON public.checklist_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      JOIN public.portfolios ON portfolios.id = daily_checklists.portfolio_id
      WHERE daily_checklists.id = checklist_tasks.checklist_id
      AND portfolios.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      JOIN public.portfolios ON portfolios.id = daily_checklists.portfolio_id
      WHERE daily_checklists.id = checklist_tasks.checklist_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Users can delete tasks in their checklists
CREATE POLICY "Users can delete own tasks"
  ON public.checklist_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checklists
      JOIN public.portfolios ON portfolios.id = daily_checklists.portfolio_id
      WHERE daily_checklists.id = checklist_tasks.checklist_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Service role can do everything
CREATE POLICY "Service role can manage all tasks"
  ON public.checklist_tasks
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- WAITLIST (Public table - anyone can insert)
-- ============================================================================

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert into waitlist
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- Only service role can view waitlist
CREATE POLICY "Service role can view waitlist"
  ON public.waitlist FOR SELECT
  USING (auth.jwt()->>'role' = 'service_role');

-- Service role can manage waitlist
CREATE POLICY "Service role can manage waitlist"
  ON public.waitlist
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- COMPLETED! RLS policies are now active
-- ============================================================================
-- Test by signing in as a user and trying to access another user's data
-- It should be blocked by RLS
-- ============================================================================
