-- ============================================================================
-- Migration: 003_stripe_user_management.sql
-- Purpose: Add Stripe subscription fields and user management columns
-- Date: 2025-12-05
-- ============================================================================

-- ============================================================================
-- PART 1: Enhanced User Profile Fields
-- ============================================================================

-- Add new columns to profiles table (if not exists)
DO $$
BEGIN
  -- Subscription tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_ends_at') THEN
    ALTER TABLE public.profiles ADD COLUMN trial_ends_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'current_period_start') THEN
    ALTER TABLE public.profiles ADD COLUMN current_period_start TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'current_period_end') THEN
    ALTER TABLE public.profiles ADD COLUMN current_period_end TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'cancel_at_period_end') THEN
    ALTER TABLE public.profiles ADD COLUMN cancel_at_period_end BOOLEAN DEFAULT FALSE;
  END IF;

  -- Payment tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_payment_status') THEN
    ALTER TABLE public.profiles ADD COLUMN last_payment_status TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_payment_error') THEN
    ALTER TABLE public.profiles ADD COLUMN last_payment_error TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_payment_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_payment_at TIMESTAMPTZ;
  END IF;

  -- User management
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'deactivated_at') THEN
    ALTER TABLE public.profiles ADD COLUMN deactivated_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'deactivation_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN deactivation_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_active_at') THEN
    ALTER TABLE public.profiles ADD COLUMN last_active_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier 
  ON public.profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status 
  ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active 
  ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends 
  ON public.profiles(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.profiles.subscription_tier IS 'Subscription tier from Stripe: free, basic, premium';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Stripe subscription status: none, trialing, active, past_due, canceled, unpaid';
COMMENT ON COLUMN public.profiles.trial_ends_at IS 'When trial period ends (null if not in trial)';
COMMENT ON COLUMN public.profiles.cancel_at_period_end IS 'Whether subscription will cancel at period end';
COMMENT ON COLUMN public.profiles.is_active IS 'Whether user account is active (admin can deactivate)';
COMMENT ON COLUMN public.profiles.last_active_at IS 'Last activity timestamp for admin reporting';

-- ============================================================================
-- PART 2: Stripe Transactions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Stripe identifiers
  stripe_event_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_refund_id TEXT,
  
  -- Transaction details
  event_type TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  error_code TEXT,
  
  -- Tier changes
  tier_before TEXT,
  tier_after TEXT,
  
  -- Idempotency
  idempotency_key TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_tx_user 
  ON public.stripe_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_tx_event_id 
  ON public.stripe_transactions(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_tx_status 
  ON public.stripe_transactions(status);
CREATE INDEX IF NOT EXISTS idx_stripe_tx_created 
  ON public.stripe_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stripe_tx_event_type 
  ON public.stripe_transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_tx_customer 
  ON public.stripe_transactions(stripe_customer_id);

-- Comments
COMMENT ON TABLE public.stripe_transactions IS 'Audit log of all Stripe webhook events and admin actions';
COMMENT ON COLUMN public.stripe_transactions.stripe_event_id IS 'Stripe event ID for deduplication';
COMMENT ON COLUMN public.stripe_transactions.idempotency_key IS 'Idempotency key used for Stripe API calls';

-- ============================================================================
-- PART 3: User Deactivations Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_deactivations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Deactivation details
  reason TEXT NOT NULL,
  notes TEXT,
  
  -- Timestamps
  deactivated_at TIMESTAMPTZ DEFAULT NOW(),
  reactivated_at TIMESTAMPTZ,
  reactivated_by UUID REFERENCES public.profiles(id),
  
  -- Related actions
  subscription_canceled BOOLEAN DEFAULT FALSE,
  previous_tier TEXT,
  refund_processed BOOLEAN DEFAULT FALSE,
  refund_amount_cents INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deactivations_user 
  ON public.user_deactivations(user_id);
CREATE INDEX IF NOT EXISTS idx_deactivations_date 
  ON public.user_deactivations(deactivated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deactivations_admin 
  ON public.user_deactivations(admin_id);

-- Comments
COMMENT ON TABLE public.user_deactivations IS 'Log of user account deactivations for audit purposes';

-- ============================================================================
-- PART 4: Rate Limiting Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET,
  endpoint TEXT NOT NULL,
  
  -- Request details
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,
  
  -- Blocking
  blocked BOOLEAN DEFAULT FALSE,
  blocked_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (optimized for lookups)
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_endpoint 
  ON public.rate_limit_log(user_id, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint 
  ON public.rate_limit_log(ip_address, endpoint, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_blocked 
  ON public.rate_limit_log(blocked) WHERE blocked = TRUE;

-- Comments
COMMENT ON TABLE public.rate_limit_log IS 'Rate limiting tracking for API endpoints';

-- ============================================================================
-- PART 5: Admin Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id),
  target_user_id UUID REFERENCES public.profiles(id),
  
  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  
  -- Before/after state
  before_state JSONB,
  after_state JSONB,
  
  -- Request context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_admin 
  ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_target 
  ON public.admin_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action 
  ON public.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created 
  ON public.admin_audit_log(created_at DESC);

-- Comments
COMMENT ON TABLE public.admin_audit_log IS 'Audit trail of all admin actions';

-- ============================================================================
-- COMPLETED
-- ============================================================================
