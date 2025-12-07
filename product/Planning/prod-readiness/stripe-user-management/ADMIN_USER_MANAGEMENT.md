# Admin User Management

**Status:** 📋 Planning  
**Created:** December 5, 2025  
**Priority:** 🔴 High (Required for Operations)

---

## Overview

This document outlines the admin panel features for user management, including subscription status viewing, billing details, user deactivation, refunds, cancellations, and trial management.

---

## Current State

### Existing Admin Panel (`/admin`)

| Feature | Status | Location |
|---------|--------|----------|
| Cost Tracking | ✅ Implemented | `/admin/costs` |
| Waitlist Management | ✅ Implemented | `/admin/waitlist` |
| User Management | ❌ Coming Soon | - |
| Analytics | ❌ Coming Soon | - |
| System Health | ❌ Coming Soon | - |

---

## User Management Features

### 1. User List View

**URL:** `/admin/users`

**Features:**
- Paginated user table (25 per page)
- Search by email, name, user ID
- Filter by:
  - Subscription status (active, trialing, past_due, canceled, none)
  - Tier (free, basic, premium)
  - Account status (active, deactivated)
- Sort by created date, last active, tier
- Quick actions (view, deactivate)

**Table Columns:**

| Column | Source | Sortable | Filterable |
|--------|--------|----------|------------|
| Email | profiles.email | ✅ | ✅ (search) |
| Name | profiles.name | ✅ | ✅ (search) |
| Tier | profiles.tier | ✅ | ✅ |
| Subscription Status | profiles.subscription_status | ✅ | ✅ |
| Last Payment | profiles.last_payment_status | ❌ | ✅ |
| Created | profiles.created_at | ✅ | ✅ (date range) |
| Actions | - | ❌ | ❌ |

### 2. User Detail View

**URL:** `/admin/users/[userId]`

**Sections:**

#### 2.1 User Profile
```
┌─────────────────────────────────────────────────────────────────┐
│  User Profile                                      [Deactivate] │
├─────────────────────────────────────────────────────────────────┤
│  Email: user@example.com                                        │
│  Name: John Doe                                                 │
│  User ID: abc-123-def-456                                       │
│  Created: Dec 5, 2025 10:30 AM                                  │
│  Last Active: Dec 5, 2025 2:15 PM                               │
│  Account Status: ● Active                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2 Subscription Details
```
┌─────────────────────────────────────────────────────────────────┐
│  Subscription                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Tier: Premium ($15.99/month)                                   │
│  Status: ● Active                                               │
│  Stripe Customer ID: cus_ABC123 [↗ View in Stripe]              │
│  Subscription ID: sub_XYZ789 [↗ View in Stripe]                 │
│                                                                 │
│  Current Period: Dec 5, 2025 → Jan 5, 2026                      │
│  Trial Ends: N/A (trial completed)                              │
│  Cancel at Period End: No                                       │
│                                                                 │
│  [Change Tier ▼] [Extend Trial] [Cancel Subscription]           │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3 Billing History
```
┌─────────────────────────────────────────────────────────────────┐
│  Billing History                                   [View All →] │
├─────────────────────────────────────────────────────────────────┤
│  Date       │ Amount  │ Status      │ Actions                   │
│─────────────┼─────────┼─────────────┼───────────────────────────│
│  Dec 5, 25  │ $15.99  │ ● Succeeded │ [Refund] [↗ Stripe]       │
│  Nov 5, 25  │ $15.99  │ ● Succeeded │ [Refund] [↗ Stripe]       │
│  Oct 5, 25  │ $15.99  │ ● Refunded  │ [↗ Stripe]                │
│  Sep 5, 25  │ $15.99  │ ● Succeeded │ [Refund] [↗ Stripe]       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.4 Transaction Log (Internal)
```
┌─────────────────────────────────────────────────────────────────┐
│  Transaction Log                                                │
├─────────────────────────────────────────────────────────────────┤
│  Dec 5, 10:30 │ checkout.session.completed │ ✅ Completed       │
│  Dec 5, 10:30 │ customer.subscription.created │ ✅ Completed    │
│  Nov 5, 10:30 │ invoice.payment_succeeded │ ✅ Completed        │
│  Oct 15, 14:22 │ refund.created │ ✅ Completed ($15.99)         │
│  Oct 5, 10:30 │ invoice.payment_succeeded │ ✅ Completed        │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.5 Error Log
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ Errors & Issues                                             │
├─────────────────────────────────────────────────────────────────┤
│  Dec 3, 2025 - Payment Failed                                   │
│  Error: Card declined (insufficient funds)                      │
│  Invoice: inv_ABC123 [↗ View in Stripe]                         │
│  Actions: [Retry Payment] [Contact User]                        │
│                                                                 │
│  ───────────────────────────────────────────────────────────────│
│  Manual Correction Steps:                                       │
│  1. Go to Stripe Dashboard → Invoices                           │
│  2. Find invoice inv_ABC123                                     │
│  3. Click "Retry" or "Mark as Paid"                             │
│  4. If successful, run [Sync Subscription] to update DB         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Admin Actions

### 3.1 User Deactivation

**Purpose:** Suspend user access without deleting data.

**API:** `POST /api/admin/users/[userId]/deactivate`

**Behavior:**
1. Set `profiles.is_active = false`
2. Add to `user_deactivations` log
3. Optionally cancel Stripe subscription
4. User cannot log in until reactivated

**UI:**
```
┌────────────────────────────────────────┐
│  Deactivate User                       │
├────────────────────────────────────────┤
│  Reason: [Dropdown: Terms Violation,   │
│           Fraud, User Request, Other]  │
│                                        │
│  Notes: [Text area]                    │
│                                        │
│  ☐ Cancel subscription immediately     │
│  ☐ Send notification email             │
│                                        │
│  [Cancel] [Deactivate]                 │
└────────────────────────────────────────┘
```

### 3.2 Refund Processing

**API:** `POST /api/admin/users/[userId]/refund`

**Request Body:**
```typescript
{
  amount_cents?: number;  // Partial refund (omit for full)
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  note?: string;
}
```

**UI:**
```
┌────────────────────────────────────────┐
│  Process Refund                        │
├────────────────────────────────────────┤
│  Charge: $15.99 (Dec 5, 2025)          │
│  Invoice: inv_ABC123                   │
│                                        │
│  Refund Type:                          │
│  ○ Full Refund ($15.99)                │
│  ○ Partial Refund: $[____]             │
│                                        │
│  Reason:                               │
│  [Dropdown: Customer Request,          │
│   Duplicate, Fraudulent]               │
│                                        │
│  Notes: [Text area]                    │
│                                        │
│  ⚠️ This will refund the customer      │
│     and may downgrade their tier.      │
│                                        │
│  [Cancel] [Process Refund]             │
└────────────────────────────────────────┘
```

### 3.3 Subscription Cancellation

**API:** `POST /api/admin/users/[userId]/cancel-subscription`

**Request Body:**
```typescript
{
  immediately?: boolean;  // false = cancel at period end
  reason?: string;
}
```

**UI:**
```
┌────────────────────────────────────────┐
│  Cancel Subscription                   │
├────────────────────────────────────────┤
│  Current Plan: Premium ($15.99/month)  │
│  Period Ends: Jan 5, 2026              │
│                                        │
│  Cancellation Type:                    │
│  ○ At Period End (Jan 5, 2026)         │
│    User keeps access until then        │
│                                        │
│  ○ Immediately                         │
│    User loses access now               │
│    ☐ Also process refund               │
│                                        │
│  Reason: [Text area]                   │
│                                        │
│  [Cancel] [Confirm Cancellation]       │
└────────────────────────────────────────┘
```

### 3.4 Trial Extension

**API:** `POST /api/admin/users/[userId]/extend-trial`

**Request Body:**
```typescript
{
  days: number;  // Days to extend
  reason?: string;
}
```

**Behavior:**
1. Call Stripe API to extend trial
2. Update `profiles.trial_ends_at`
3. Log action in `stripe_transactions`

**UI:**
```
┌────────────────────────────────────────┐
│  Extend Trial                          │
├────────────────────────────────────────┤
│  Current Trial Ends: Dec 19, 2025      │
│                                        │
│  Extend by: [7] days                   │
│  New End Date: Dec 26, 2025            │
│                                        │
│  Reason: [Text area]                   │
│                                        │
│  [Cancel] [Extend Trial]               │
└────────────────────────────────────────┘
```

### 3.5 Tier Change (Manual)

**API:** `POST /api/admin/users/[userId]/change-tier`

**Request Body:**
```typescript
{
  tier: 'free' | 'basic' | 'premium';
  update_stripe?: boolean;  // Sync with Stripe
  reason: string;
}
```

**Behavior:**
1. Update `profiles.tier` and `profiles.subscription_tier`
2. If `update_stripe`, update Stripe subscription
3. Log action in `stripe_transactions`

### 3.6 Sync from Stripe

**API:** `POST /api/admin/users/[userId]/sync-subscription`

**Purpose:** Force-sync user's subscription state from Stripe to database.

**Use Cases:**
- Webhook failed or was missed
- Manual fix needed after Stripe Dashboard action
- Tier mismatch between DB and Stripe

---

## Database Schema Additions

### User Deactivations Table

```sql
CREATE TABLE user_deactivations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  
  reason TEXT NOT NULL,
  notes TEXT,
  
  deactivated_at TIMESTAMPTZ DEFAULT NOW(),
  reactivated_at TIMESTAMPTZ,
  reactivated_by UUID REFERENCES profiles(id),
  
  subscription_canceled BOOLEAN DEFAULT FALSE,
  previous_tier TEXT,
  
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id),
  CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES profiles(id)
);

CREATE INDEX idx_deactivations_user ON user_deactivations(user_id);
CREATE INDEX idx_deactivations_date ON user_deactivations(deactivated_at DESC);
```

### Profile Additions

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  is_active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT;

CREATE INDEX idx_profiles_active ON profiles(is_active);
```

---

## RLS Policies

### Admin Access Policies

```sql
-- Admin can view all users
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin can update user profiles
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin can view all transactions
CREATE POLICY "Admins can view all transactions"
  ON stripe_transactions FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin can view deactivation logs
CREATE POLICY "Admins can view deactivation logs"
  ON user_deactivations FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );

-- Admin can insert deactivation logs
CREATE POLICY "Admins can create deactivation logs"
  ON user_deactivations FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = TRUE)
  );
```

---

## API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | List users (paginated, filterable) |
| `/api/admin/users/[userId]` | GET | Get user details with billing |
| `/api/admin/users/[userId]/deactivate` | POST | Deactivate user |
| `/api/admin/users/[userId]/reactivate` | POST | Reactivate user |
| `/api/admin/users/[userId]/refund` | POST | Process refund |
| `/api/admin/users/[userId]/cancel-subscription` | POST | Cancel subscription |
| `/api/admin/users/[userId]/extend-trial` | POST | Extend trial period |
| `/api/admin/users/[userId]/change-tier` | POST | Manual tier change |
| `/api/admin/users/[userId]/sync-subscription` | POST | Sync from Stripe |
| `/api/admin/users/[userId]/billing-history` | GET | Get billing history |
| `/api/admin/users/[userId]/transactions` | GET | Get transaction log |

---

## File Structure

```
app/
├── (protected)/
│   └── admin/
│       └── users/
│           ├── page.tsx                    # User list
│           ├── [userId]/
│           │   ├── page.tsx                # User detail
│           │   └── components/
│           │       ├── UserProfile.tsx
│           │       ├── SubscriptionCard.tsx
│           │       ├── BillingHistory.tsx
│           │       ├── TransactionLog.tsx
│           │       └── ErrorLog.tsx
│           └── components/
│               ├── UserTable.tsx
│               ├── UserFilters.tsx
│               └── UserActions.tsx
└── api/
    └── admin/
        └── users/
            ├── route.ts                    # GET: List users
            └── [userId]/
                ├── route.ts                # GET: User details
                ├── deactivate/route.ts
                ├── reactivate/route.ts
                ├── refund/route.ts
                ├── cancel-subscription/route.ts
                ├── extend-trial/route.ts
                ├── change-tier/route.ts
                ├── sync-subscription/route.ts
                ├── billing-history/route.ts
                └── transactions/route.ts

components/
└── admin/
    ├── UserListTable.tsx
    ├── UserDetailCard.tsx
    ├── RefundModal.tsx
    ├── CancelSubscriptionModal.tsx
    ├── ExtendTrialModal.tsx
    └── DeactivateUserModal.tsx
```

---

## Success Criteria

- [ ] Admin can search and filter users
- [ ] Admin can view complete user billing history
- [ ] Admin can deactivate/reactivate users
- [ ] Admin can process refunds with Stripe
- [ ] Admin can cancel subscriptions
- [ ] Admin can extend trials
- [ ] All admin actions are logged
- [ ] Error states show manual correction steps
- [ ] RLS policies prevent non-admin access

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Database Schema | 1 day | Tables, RLS policies |
| API Endpoints | 3 days | All admin APIs |
| UI Components | 3 days | User list, detail, modals |
| Testing | 2 days | E2E tests, manual QA |

**Total: ~9 days**
