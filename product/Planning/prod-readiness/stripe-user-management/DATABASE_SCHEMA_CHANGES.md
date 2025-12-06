# Database Schema Changes

**Status:** 📋 Planning  
**Created:** December 5, 2025  
**Priority:** 🔴 High (Foundation for all features)

---

## Overview

This document outlines all database schema changes required for production-ready Stripe integration and user management. **Supabase is the source of truth** - Prisma schema will be derived from the database using `prisma db pull`.

---

## Principles

1. **Supabase First** - All schema changes applied via Supabase migrations
2. **Prisma Derives** - Run `npx prisma db pull` after Supabase migrations
3. **RLS Everywhere** - All user data protected by Row Level Security
4. **Admin Bypass** - Admin operations use service role key

---

## Migration Files

### Migration 001: Enhanced User Profiles

**File:** `src/backend/database/supabase/migrations/003_stripe_user_management.sql`

```sql
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
```

---

### Migration 002: RLS Policies

**File:** `src/backend/database/supabase/migrations/004_stripe_rls_policies.sql`

```sql
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
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    -- Prevent users from changing admin-only fields
    auth.uid() = id AND
    NEW.is_admin = OLD.is_admin AND
    NEW.tier = OLD.tier AND
    NEW.subscription_tier = OLD.subscription_tier AND
    NEW.is_active = OLD.is_active
  );

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
```

---

## Prisma Schema Sync

After running Supabase migrations, sync Prisma schema:

```bash
# Pull schema from database
npx prisma db pull

# Generate Prisma client
npx prisma generate
```

### Expected Prisma Changes

```prisma
// prisma/schema.prisma - After db pull

model User {
  id        String   @id @db.Uuid
  email     String   @unique
  name      String?
  tier      String   @default("free")
  isAdmin   Boolean  @default(false) @map("is_admin")

  // Stripe fields
  stripeCustomerId      String? @map("stripe_customer_id")
  stripeSubscriptionId  String? @map("stripe_subscription_id")
  subscriptionStatus    String? @map("subscription_status")
  subscriptionTier      String  @default("free") @map("subscription_tier")
  trialEndsAt           DateTime? @map("trial_ends_at") @db.Timestamptz(6)
  currentPeriodStart    DateTime? @map("current_period_start") @db.Timestamptz(6)
  currentPeriodEnd      DateTime? @map("current_period_end") @db.Timestamptz(6)
  cancelAtPeriodEnd     Boolean @default(false) @map("cancel_at_period_end")

  // Payment tracking
  lastPaymentStatus     String? @map("last_payment_status")
  lastPaymentError      String? @map("last_payment_error")
  lastPaymentAt         DateTime? @map("last_payment_at") @db.Timestamptz(6)

  // Account status
  isActive              Boolean @default(true) @map("is_active")
  deactivatedAt         DateTime? @map("deactivated_at") @db.Timestamptz(6)
  deactivationReason    String? @map("deactivation_reason")
  lastActiveAt          DateTime? @map("last_active_at") @db.Timestamptz(6)

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  portfolios        Portfolio[]
  usage             UsageTracking[]
  transactions      StripeTransaction[]
  deactivationsAsUser UserDeactivation[] @relation("DeactivatedUser")
  deactivationsAsAdmin UserDeactivation[] @relation("AdminPerformed")
  auditLogs         AdminAuditLog[]

  @@map("profiles")
  @@schema("public")
  @@index([email])
  @@index([tier])
  @@index([isAdmin], map: "idx_profiles_is_admin")
  @@index([subscriptionTier])
  @@index([subscriptionStatus])
  @@index([isActive])
  @@index([stripeCustomerId])
}

model StripeTransaction {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                String    @map("user_id") @db.Uuid
  
  stripeEventId         String?   @unique @map("stripe_event_id")
  stripeCustomerId      String?   @map("stripe_customer_id")
  stripeSubscriptionId  String?   @map("stripe_subscription_id")
  stripeInvoiceId       String?   @map("stripe_invoice_id")
  stripePaymentIntentId String?   @map("stripe_payment_intent_id")
  stripeRefundId        String?   @map("stripe_refund_id")
  
  eventType             String    @map("event_type")
  amountCents           Int?      @map("amount_cents")
  currency              String    @default("usd")
  
  status                String    @default("pending")
  errorMessage          String?   @map("error_message")
  errorCode             String?   @map("error_code")
  
  tierBefore            String?   @map("tier_before")
  tierAfter             String?   @map("tier_after")
  
  idempotencyKey        String?   @map("idempotency_key")
  metadata              Json      @default("{}")
  
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  processedAt           DateTime? @map("processed_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("stripe_transactions")
  @@schema("public")
  @@index([userId])
  @@index([stripeEventId])
  @@index([status])
  @@index([createdAt(sort: Desc)])
}

model UserDeactivation {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                String    @map("user_id") @db.Uuid
  adminId               String    @map("admin_id") @db.Uuid
  
  reason                String
  notes                 String?
  
  deactivatedAt         DateTime  @default(now()) @map("deactivated_at") @db.Timestamptz(6)
  reactivatedAt         DateTime? @map("reactivated_at") @db.Timestamptz(6)
  reactivatedBy         String?   @map("reactivated_by") @db.Uuid
  
  subscriptionCanceled  Boolean   @default(false) @map("subscription_canceled")
  previousTier          String?   @map("previous_tier")
  refundProcessed       Boolean   @default(false) @map("refund_processed")
  refundAmountCents     Int?      @map("refund_amount_cents")

  user  User @relation("DeactivatedUser", fields: [userId], references: [id], onDelete: Cascade)
  admin User @relation("AdminPerformed", fields: [adminId], references: [id])

  @@map("user_deactivations")
  @@schema("public")
  @@index([userId])
  @@index([deactivatedAt(sort: Desc)])
}

model AdminAuditLog {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  adminId               String    @map("admin_id") @db.Uuid
  targetUserId          String?   @map("target_user_id") @db.Uuid
  
  action                String
  entityType            String    @map("entity_type")
  entityId              String?   @map("entity_id")
  
  beforeState           Json?     @map("before_state")
  afterState            Json?     @map("after_state")
  
  ipAddress             String?   @map("ip_address") @db.Inet
  userAgent             String?   @map("user_agent")
  
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  admin User @relation(fields: [adminId], references: [id])

  @@map("admin_audit_log")
  @@schema("public")
  @@index([adminId])
  @@index([targetUserId])
  @@index([action])
  @@index([createdAt(sort: Desc)])
}

model RateLimitLog {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId                String?   @map("user_id") @db.Uuid
  ipAddress             String?   @map("ip_address") @db.Inet
  endpoint              String
  
  requestCount          Int       @default(1) @map("request_count")
  windowStart           DateTime  @default(now()) @map("window_start") @db.Timestamptz(6)
  windowEnd             DateTime? @map("window_end") @db.Timestamptz(6)
  
  blocked               Boolean   @default(false)
  blockedUntil          DateTime? @map("blocked_until") @db.Timestamptz(6)
  
  createdAt             DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt             DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  @@map("rate_limit_log")
  @@schema("public")
  @@index([userId, endpoint, windowStart])
  @@index([ipAddress, endpoint, windowStart])
}
```

---

## Migration Order

1. **003_stripe_user_management.sql** - Create tables and columns
2. **004_stripe_rls_policies.sql** - Apply RLS policies
3. **Prisma db pull** - Sync Prisma schema
4. **Prisma generate** - Generate updated client

---

## Rollback Scripts

### Rollback 003

```sql
-- Rollback: 003_stripe_user_management.sql

DROP TABLE IF EXISTS public.admin_audit_log;
DROP TABLE IF EXISTS public.rate_limit_log;
DROP TABLE IF EXISTS public.user_deactivations;
DROP TABLE IF EXISTS public.stripe_transactions;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS subscription_tier,
  DROP COLUMN IF EXISTS trial_ends_at,
  DROP COLUMN IF EXISTS current_period_start,
  DROP COLUMN IF EXISTS current_period_end,
  DROP COLUMN IF EXISTS cancel_at_period_end,
  DROP COLUMN IF EXISTS last_payment_status,
  DROP COLUMN IF EXISTS last_payment_error,
  DROP COLUMN IF EXISTS last_payment_at,
  DROP COLUMN IF EXISTS is_active,
  DROP COLUMN IF EXISTS deactivated_at,
  DROP COLUMN IF EXISTS deactivation_reason,
  DROP COLUMN IF EXISTS last_active_at;
```

### Rollback 004

```sql
-- Rollback: 004_stripe_rls_policies.sql

DROP POLICY IF EXISTS "Users can view own transactions" ON public.stripe_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.stripe_transactions;
DROP POLICY IF EXISTS "Service role full access on stripe_transactions" ON public.stripe_transactions;

DROP POLICY IF EXISTS "Admins can view deactivations" ON public.user_deactivations;
DROP POLICY IF EXISTS "Admins can create deactivations" ON public.user_deactivations;
DROP POLICY IF EXISTS "Admins can update deactivations" ON public.user_deactivations;
DROP POLICY IF EXISTS "Service role full access on user_deactivations" ON public.user_deactivations;

DROP POLICY IF EXISTS "Service role full access on rate_limit_log" ON public.rate_limit_log;
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limit_log;

DROP POLICY IF EXISTS "Admins can view audit log" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Service role full access on admin_audit_log" ON public.admin_audit_log;
```

---

## Success Criteria

- [ ] All migrations run without errors
- [ ] RLS policies correctly restrict access
- [ ] Prisma schema synced with database
- [ ] Prisma client generated successfully
- [ ] Existing functionality unaffected
- [ ] Admin can query all tables
- [ ] Users can only see their own data
