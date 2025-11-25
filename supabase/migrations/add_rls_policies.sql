-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================
-- These policies allow users to access their own data while keeping it secure
-- ============================================================================

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON public.profiles;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Service role can do everything (for admin operations)
CREATE POLICY "Service role has full access to profiles"
  ON public.profiles
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- USAGE TRACKING TABLE
-- ============================================================================

-- Enable RLS on usage_tracking table
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own usage" ON public.usage_tracking;
DROP POLICY IF EXISTS "Service role has full access to usage_tracking" ON public.usage_tracking;

-- Policy: Users can read their own usage
CREATE POLICY "Users can read own usage"
  ON public.usage_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (needed for usage tracking system)
CREATE POLICY "Service role has full access to usage_tracking"
  ON public.usage_tracking
  FOR ALL
  USING (true);

-- ============================================================================
-- PORTFOLIOS TABLE
-- ============================================================================

-- Enable RLS on portfolios table
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can insert own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can update own portfolios" ON public.portfolios;
DROP POLICY IF EXISTS "Users can delete own portfolios" ON public.portfolios;

-- Policy: Users can read their own portfolios
CREATE POLICY "Users can read own portfolios"
  ON public.portfolios
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own portfolios
CREATE POLICY "Users can insert own portfolios"
  ON public.portfolios
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own portfolios
CREATE POLICY "Users can update own portfolios"
  ON public.portfolios
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own portfolios
CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STOCKS TABLE
-- ============================================================================

-- Enable RLS on stocks table
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read stocks from own portfolios" ON public.stocks;
DROP POLICY IF EXISTS "Users can insert stocks to own portfolios" ON public.stocks;
DROP POLICY IF EXISTS "Users can update stocks in own portfolios" ON public.stocks;
DROP POLICY IF EXISTS "Users can delete stocks from own portfolios" ON public.stocks;

-- Policy: Users can read stocks from their own portfolios
CREATE POLICY "Users can read stocks from own portfolios"
  ON public.stocks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Policy: Users can insert stocks to their own portfolios
CREATE POLICY "Users can insert stocks to own portfolios"
  ON public.stocks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Policy: Users can update stocks in their own portfolios
CREATE POLICY "Users can update stocks in own portfolios"
  ON public.stocks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Policy: Users can delete stocks from their own portfolios
CREATE POLICY "Users can delete stocks from own portfolios"
  ON public.stocks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = stocks.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- ============================================================================
-- INVESTMENT THESES TABLE
-- ============================================================================

-- Enable RLS on investment_theses table
ALTER TABLE public.investment_theses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read theses from own portfolios" ON public.investment_theses;
DROP POLICY IF EXISTS "Users can insert theses to own portfolios" ON public.investment_theses;
DROP POLICY IF EXISTS "Users can update theses in own portfolios" ON public.investment_theses;
DROP POLICY IF EXISTS "Users can delete theses from own portfolios" ON public.investment_theses;

-- Policy: Users can read theses from their own portfolios
CREATE POLICY "Users can read theses from own portfolios"
  ON public.investment_theses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Policy: Users can insert theses to their own portfolios
CREATE POLICY "Users can insert theses to own portfolios"
  ON public.investment_theses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Policy: Users can update theses in their own portfolios
CREATE POLICY "Users can update theses in own portfolios"
  ON public.investment_theses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- Policy: Users can delete theses from their own portfolios
CREATE POLICY "Users can delete theses from own portfolios"
  ON public.investment_theses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = investment_theses.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DAILY CHECKLISTS TABLE
-- ============================================================================

-- Enable RLS on daily_checklists table
ALTER TABLE public.daily_checklists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage checklists for own portfolios" ON public.daily_checklists;

-- Policy: Users can manage checklists for their own portfolios
CREATE POLICY "Users can manage checklists for own portfolios"
  ON public.daily_checklists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios
      WHERE portfolios.id = daily_checklists.portfolio_id
      AND portfolios.user_id = auth.uid()
    )
  );

-- ============================================================================
-- CHECKLIST TASKS TABLE
-- ============================================================================

-- Enable RLS on checklist_tasks table
ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage tasks for own checklists" ON public.checklist_tasks;

-- Policy: Users can manage tasks for their own checklists
CREATE POLICY "Users can manage tasks for own checklists"
  ON public.checklist_tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_checklists dc
      JOIN public.portfolios p ON p.id = dc.portfolio_id
      WHERE dc.id = checklist_tasks.checklist_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- WAITLIST TABLE (optional - allow public reads for marketing)
-- ============================================================================

-- Enable RLS on waitlist table
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.waitlist;
DROP POLICY IF EXISTS "Service role has full access to waitlist" ON public.waitlist;

-- Policy: Anyone can insert to waitlist
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (true);

-- Policy: Only service role can read/update waitlist
CREATE POLICY "Service role has full access to waitlist"
  ON public.waitlist
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
