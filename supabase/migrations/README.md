# Supabase Migrations

This directory contains SQL migrations for the Supabase database.

## Running Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy the contents of the migration file
5. Paste into the SQL editor
6. Click **Run** to execute

### Option 2: Via Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

## Migration Files

### `add_admin_field.sql` - Admin Panel Support

**Purpose:** Adds admin field to profiles table and creates RLS policies for admin access

**What it does:**
- Adds `is_admin` boolean column to profiles table (defaults to false)
- Creates index for fast admin lookups
- Adds RLS policies allowing admins to:
  - Read all user profiles
  - Update any user profile (tier, admin status)
  - Read all usage tracking data

**After running:**
1. Manually set your first admin user via SQL Editor:
   ```sql
   UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
   ```

2. Verify admin access by logging in and checking the sidebar - you should see "Admin Panel" link

**Features enabled:**
- Admin panel at `/admin`
- User management (view all users)
- Tier updates (change user tiers)
- Admin status management (grant/revoke admin access)
- Quota reset (clear usage tracking)

### Other Migrations

- `update_tier_structure.sql` - Updates tier values to (free, basic, premium)
- `enable_usage_tracking_rls.sql` - Enables RLS for usage tracking table
- `fix_usage_tracking_rls.sql` - Fixes RLS policies for usage tracking
- `add_rls_policies.sql` - Comprehensive RLS policies for all tables
- `fix_rls_clean.sql` - Cleanup and fix RLS policies
- `grant_permissions.sql` - Grant necessary permissions

## Creating New Migrations

1. Create a new `.sql` file in this directory
2. Use descriptive naming: `action_description.sql`
3. Include comments explaining what the migration does
4. Test in a development database first
5. Document the migration in this README

## Rollback

If you need to rollback a migration:

```sql
-- Example: Remove admin field
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;
DROP INDEX IF EXISTS idx_profiles_is_admin;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all usage" ON usage_tracking;
```

## Notes

- Always backup your database before running migrations
- Test migrations in development environment first
- RLS policies protect data access - test thoroughly
- Admin access is powerful - grant sparingly
