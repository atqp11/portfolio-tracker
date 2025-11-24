-- ============================================================================
-- Supabase Database Schema for Portfolio Tracker
-- ============================================================================
-- This replaces Prisma + Vercel Postgres with Supabase PostgreSQL
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & PROFILES
-- ============================================================================
-- Note: Supabase creates auth.users automatically
-- We extend it with a public.profiles table

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'premium')),

  -- Stripe integration (for future payment system)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, tier)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- USAGE TRACKING
-- ============================================================================

CREATE TABLE public.usage_tracking (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,

  chat_queries INT NOT NULL DEFAULT 0,
  portfolio_analysis INT NOT NULL DEFAULT 0,
  sec_filings INT NOT NULL DEFAULT 0,

  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX idx_usage_tracking_user_id ON public.usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_period ON public.usage_tracking(period_start, period_end);

-- ============================================================================
-- PORTFOLIOS
-- ============================================================================

CREATE TABLE public.portfolios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  type TEXT NOT NULL,
  initial_value DECIMAL(12, 2) NOT NULL,
  target_value DECIMAL(12, 2) NOT NULL,
  borrowed_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  margin_call_level DECIMAL(12, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_portfolios_type ON public.portfolios(type);

CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- STOCKS
-- ============================================================================

CREATE TABLE public.stocks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,

  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  shares INT NOT NULL,
  avg_price DECIMAL(10, 4) NOT NULL,
  current_price DECIMAL(10, 4),
  actual_value DECIMAL(12, 2),

  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stocks_portfolio_id ON public.stocks(portfolio_id);
CREATE INDEX idx_stocks_symbol ON public.stocks(symbol);

-- ============================================================================
-- INVESTMENT THESES
-- ============================================================================

CREATE TABLE public.investment_theses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,

  ticker TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT NOT NULL,
  bear_case TEXT,
  risks TEXT[], -- Array of risk strings

  key_metrics JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of ThesisMetric objects
  stop_loss_rules JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of StopLossRule objects
  exit_criteria JSONB NOT NULL DEFAULT '{}'::JSONB, -- ExitCriteria object

  thesis_health_score DECIMAL(5, 2) NOT NULL,
  urgency TEXT NOT NULL CHECK (urgency IN ('green', 'yellow', 'red')),
  last_validated TIMESTAMPTZ,
  validation_history JSONB DEFAULT '[]'::JSONB, -- Array of ValidationRecord objects
  status TEXT NOT NULL DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_theses_portfolio_id ON public.investment_theses(portfolio_id);
CREATE INDEX idx_theses_status ON public.investment_theses(status);
CREATE INDEX idx_theses_urgency ON public.investment_theses(urgency);
CREATE INDEX idx_theses_ticker ON public.investment_theses(ticker);

CREATE TRIGGER theses_updated_at
  BEFORE UPDATE ON public.investment_theses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- DAILY CHECKLISTS
-- ============================================================================

CREATE TABLE public.daily_checklists (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  portfolio_id TEXT NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,

  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_tasks INT NOT NULL,
  completed_tasks INT NOT NULL DEFAULT 0,
  completion_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_portfolio_id ON public.daily_checklists(portfolio_id);
CREATE INDEX idx_checklists_date ON public.daily_checklists(date);

CREATE TRIGGER checklists_updated_at
  BEFORE UPDATE ON public.daily_checklists
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- CHECKLIST TASKS
-- ============================================================================

CREATE TABLE public.checklist_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  checklist_id TEXT NOT NULL REFERENCES public.daily_checklists(id) ON DELETE CASCADE,
  portfolio_id TEXT NOT NULL,

  task TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  urgency TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  condition TEXT,
  due_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_checklist_id ON public.checklist_tasks(checklist_id);
CREATE INDEX idx_tasks_portfolio_id ON public.checklist_tasks(portfolio_id);
CREATE INDEX idx_tasks_category ON public.checklist_tasks(category);
CREATE INDEX idx_tasks_completed ON public.checklist_tasks(completed);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.checklist_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- WAITLIST (for landing page)
-- ============================================================================

CREATE TABLE public.waitlist (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON public.waitlist(email);
CREATE INDEX idx_waitlist_created_at ON public.waitlist(created_at);

-- ============================================================================
-- COMPLETED! Next: Run the RLS policies file (rls-policies.sql)
-- ============================================================================
