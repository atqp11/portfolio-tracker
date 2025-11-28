# Supabase Schema Management

This directory previously contained individual migration files. All migrations have been consolidated into the canonical schema files in the parent directory.

## Current Schema Files (Use These)

### 1. `../schema.sql` - Complete Database Schema

**Contains:**
- All table definitions (profiles, portfolios, stocks, investment_theses, daily_checklists, checklist_tasks, usage_tracking, waitlist)
- All indexes and constraints
- Triggers and functions
- **Admin support:** `is_admin` field in profiles table

**How to use:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of `schema.sql`
5. Run the script

### 2. `../rls-policies.sql` - Row-Level Security Policies

**Contains:**
- RLS policies for all tables
- Service role policies for admin access

**Admin Access Pattern:**
- Regular users use the standard Supabase client (RLS enforced)
- Admin operations use the service role client (RLS bypassed)
- This avoids infinite recursion issues with RLS policies

**How to use:**
1. Run this **AFTER** running `schema.sql`
2. Copy contents from `rls-policies.sql` to SQL Editor
3. Execute to enable RLS on all tables

### 3. `../check_policies.sql` - Utility Script

**Purpose:** Query to verify RLS is enabled and check existing policies

**How to use:**
```sql
-- Copy and run in SQL Editor to verify RLS setup
```

## Setting Up a New Database

To set up a fresh Supabase database for this project:

```bash
# 1. Create a new Supabase project at https://supabase.com/dashboard

# 2. Run schema.sql in SQL Editor
# This creates all tables, indexes, and triggers

# 3. Run rls-policies.sql in SQL Editor
# This enables RLS and creates security policies

# 4. Run check_policies.sql to verify setup
# Should show RLS enabled on all tables

# 5. Set your first admin user
UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

## Making Schema Changes

When you need to modify the database schema:

1. **Update `schema.sql`** with the changes
2. **Update `rls-policies.sql`** if security policies are affected
3. **Test in development** environment first
4. **Apply changes** via Supabase SQL Editor or CLI

## Notes

- All previous migration files have been consolidated
- Schema files in parent directory are the source of truth
- Admin operations use service role client to bypass RLS
- Always backup database before running schema changes
