# Admin Panel Guide

## Overview

The Admin Panel provides user management capabilities for administrators to manage user tiers, view usage statistics, and perform administrative tasks.

**Access:** `/admin` (only visible to admin users)

## Features

### 1. User Dashboard

**Stats Overview:**
- Total Users
- Users by Tier (Free, Basic, Premium)

### 2. User Management Table

**Displays:**
- User profile (avatar, name, email)
- Current tier with dropdown to change
- Admin status with toggle button
- Daily usage statistics (chat queries, portfolio analysis)
- Action buttons (Reset Quota)

**Actions:**
- **Change Tier:** Select new tier from dropdown - updates immediately
- **Toggle Admin:** Click admin badge to grant/revoke admin access
- **Reset Quota:** Clear all usage tracking for a user (with confirmation)

## Setup Instructions

### 1. Run Database Migration

**Via Supabase Dashboard:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Copy contents of `supabase/migrations/add_admin_field.sql`
5. Paste into SQL editor and click **Run**

**What the migration does:**
- Adds `is_admin` boolean field to profiles table
- Creates index for performance
- Adds RLS policies for admin access to:
  - All user profiles
  - All usage tracking data

### 2. Set Your First Admin User

After running the migration, set yourself as admin:

```sql
-- In Supabase SQL Editor
UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

**Verify:**
1. Log out and log back in
2. Check sidebar - you should see "Admin Panel 👑" link
3. Click to access admin panel at `/admin`

### 3. Grant Admin Access to Other Users

Once you're an admin, you can grant admin access to others:

1. Navigate to `/admin`
2. Find the user in the table
3. Click their admin status badge (changes from "User" to "Admin")

## API Endpoints

### GET `/api/admin/users`

**Description:** Fetch all users with usage data

**Authorization:** Admin only

**Response:**
```json
{
  "users": [
    {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe",
      "tier": "free",
      "is_admin": false,
      "created_at": "2025-01-01T00:00:00Z",
      "subscription_status": null,
      "usage": {
        "daily": {
          "chatQueries": 5,
          "portfolioAnalysis": 1,
          "secFilings": 0
        },
        "monthly": {
          "chatQueries": 25,
          "portfolioAnalysis": 3,
          "secFilings": 1
        }
      }
    }
  ],
  "total": 1
}
```

### PUT `/api/admin/users/[id]`

**Description:** Update user tier or admin status

**Authorization:** Admin only

**Request Body:**
```json
{
  "tier": "basic",        // optional: "free" | "basic" | "premium"
  "is_admin": true       // optional: boolean
}
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "tier": "basic",
    "is_admin": true
  }
}
```

### DELETE `/api/admin/users/[id]/quota`

**Description:** Reset user's usage quota (deletes all usage tracking records)

**Authorization:** Admin only

**Response:**
```json
{
  "message": "User quota reset successfully",
  "userId": "user-id"
}
```

## Security

### Authentication & Authorization

**How it works:**

1. **Authentication:** User must be logged in (session check)
2. **Authorization:** User's `is_admin` field must be `true`
3. **RLS Policies:** Database-level security ensures admins can only see data via approved policies

**Authorization Middleware:** `lib/auth/admin.ts`

```typescript
import { requireAdmin } from '@lib/auth/admin';

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request);
  if (authError) return authError; // Returns 401/403 if not admin

  // Admin-only logic here
}
```

### Row-Level Security (RLS)

**Admin RLS Policies:**

1. **Read all profiles:**
   - Admins can see all user profiles
   - Regular users can only see their own profile

2. **Update any profile:**
   - Admins can update any user's tier or admin status
   - Regular users can only update their own profile

3. **Read all usage:**
   - Admins can see all users' usage tracking
   - Regular users can only see their own usage

**Policy Implementation:**
```sql
-- Example: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.is_admin = true
    )
  );
```

### What Admins Can Do

✅ **Allowed:**
- View all users and their data
- Change user tiers (free, basic, premium)
- Grant/revoke admin access
- Reset user quotas
- View usage statistics

❌ **Not Allowed:**
- Delete users (not implemented for safety)
- View user passwords (handled by Supabase Auth)
- Bypass quota limits (admins still have their own quotas)
- Access other users' portfolios/stocks (requires separate permissions)

## UI Components

### Admin Page Layout

**Location:** `app/(dashboard)/admin/page.tsx`

**Components:**
1. **Header:** Title, description, refresh button
2. **Stats Cards:** User counts by tier
3. **User Table:** Main management interface

**Features:**
- Real-time updates (refreshes on actions)
- Optimistic UI updates
- Loading states during API calls
- Error handling with user feedback

### User Row

Each user row displays:
- **Avatar:** Gradient background with initials
- **User Info:** Name and email
- **Tier Dropdown:** Change tier inline
- **Admin Badge:** Click to toggle admin status
- **Usage Stats:** Daily chat/analysis counts vs limits
- **Actions:** Reset quota button

### Sidebar Integration

**Location:** `components/layout/Sidebar.tsx`

**Conditional Rendering:**
```typescript
// Admin nav item only shown if user.is_admin === true
const navItems = user?.is_admin
  ? [...baseNavItems.slice(0, -1), adminNavItem, baseNavItems[baseNavItems.length - 1]]
  : baseNavItems;
```

**Navigation Item:**
```typescript
{
  label: 'Admin Panel',
  href: '/admin',
  icon: '👑'
}
```

## Common Tasks

### Making a User Admin

**Via Admin Panel:**
1. Go to `/admin`
2. Find user in table
3. Click their admin badge ("User" → "Admin")
4. User must log out and log back in to see changes

**Via SQL:**
```sql
UPDATE profiles SET is_admin = true WHERE email = 'user@example.com';
```

### Changing a User's Tier

**Via Admin Panel:**
1. Go to `/admin`
2. Find user in table
3. Click tier dropdown
4. Select new tier (Free, Basic, Premium)
5. Changes take effect immediately

**Via SQL:**
```sql
UPDATE profiles SET tier = 'premium' WHERE email = 'user@example.com';
```

### Resetting a User's Quota

**Via Admin Panel:**
1. Go to `/admin`
2. Find user in table
3. Click "Reset Quota" button
4. Confirm the action
5. User's usage resets to zero

**Via SQL:**
```sql
DELETE FROM usage_tracking WHERE user_id = 'user-id';
```

### Viewing Usage Statistics

**Via Admin Panel:**
1. Go to `/admin`
2. Check "Daily Usage" column for each user
3. See chat queries and portfolio analysis counts
4. Compare against tier limits

**Via SQL:**
```sql
-- Get all users with current usage
SELECT
  p.email,
  p.tier,
  u.chat_queries,
  u.portfolio_analysis,
  u.sec_filings
FROM profiles p
LEFT JOIN usage_tracking u ON p.id = u.user_id
WHERE u.period_start >= CURRENT_DATE;
```

## Troubleshooting

### "Admin Panel" link not showing

**Cause:** User's `is_admin` field is `false`

**Solution:**
```sql
UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

### Getting 403 Forbidden error

**Cause:** Not authenticated as admin

**Solution:**
1. Check `is_admin` field in database
2. Log out and log back in to refresh session
3. Verify RLS policies are applied

### Can't see all users in admin panel

**Cause:** RLS policies not applied or incorrect

**Solution:**
1. Re-run migration: `supabase/migrations/add_admin_field.sql`
2. Check policies exist:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
   ```

### Changes not taking effect

**Cause:** Client-side cache not updated

**Solution:**
1. Click "Refresh" button in admin panel
2. Or hard refresh browser (Ctrl+Shift+R)

## Architecture

### Database Schema

```sql
-- profiles table
ALTER TABLE public.profiles
  ADD COLUMN is_admin BOOLEAN DEFAULT false NOT NULL;

CREATE INDEX idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin = true;
```

### Authorization Flow

```
User Request → Admin Middleware → Database RLS → API Handler
     ↓               ↓                  ↓             ↓
  Session      Check is_admin     Policy Check    Execute
```

**Steps:**
1. **Session Check:** User must be authenticated
2. **Admin Check:** `lib/auth/admin.ts` checks `is_admin` field
3. **RLS Policy:** Database verifies admin status via RLS
4. **Execute:** API handler processes request

### File Structure

```
portfolio-tracker/
├── app/
│   ├── (dashboard)/
│   │   └── admin/
│   │       └── page.tsx              # Admin UI page
│   └── api/
│       └── admin/
│           ├── users/
│           │   ├── route.ts          # GET /api/admin/users
│           │   └── [id]/
│           │       ├── route.ts      # PUT /api/admin/users/[id]
│           │       └── quota/
│           │           └── route.ts  # DELETE /api/admin/users/[id]/quota
│
├── components/
│   └── layout/
│       └── Sidebar.tsx               # Admin nav link
│
├── lib/
│   ├── auth/
│   │   └── admin.ts                  # Admin authorization helpers
│   └── supabase/
│       └── db.ts                     # Admin helper functions
│
└── supabase/
    └── migrations/
        ├── add_admin_field.sql       # Admin schema migration
        └── README.md                 # Migration guide
```

## Best Practices

### 1. Grant Admin Access Sparingly

Admin access is powerful - only grant to trusted users.

**Guidelines:**
- Limit admins to 2-3 people
- Use admin access for support, not regular operations
- Regularly audit who has admin access

### 2. Log Admin Actions

Consider adding audit logging for admin actions:

```typescript
// app/api/admin/users/[id]/route.ts
console.log(`Admin ${adminId} updated user ${userId} tier to ${tier}`);
```

### 3. Verify Changes

After making changes:
1. Check the user table for confirmation
2. Verify user sees updated tier/permissions
3. Test quota enforcement with new tier

### 4. Backup Before Bulk Changes

Before resetting multiple quotas or changing many tiers:

```sql
-- Backup usage_tracking table
CREATE TABLE usage_tracking_backup AS SELECT * FROM usage_tracking;

-- Backup profiles table
CREATE TABLE profiles_backup AS SELECT * FROM profiles;
```

## Future Enhancements

Potential improvements:

- [ ] Audit log for admin actions
- [ ] Bulk operations (change multiple users at once)
- [ ] Usage analytics dashboard
- [ ] Email users when tier changes
- [ ] Search/filter users by email, tier, or admin status
- [ ] Export user data to CSV
- [ ] User impersonation (for support debugging)
- [ ] Activity timeline for each user

## Support

For issues or questions:
1. Check database migrations are applied
2. Verify RLS policies exist
3. Check browser console for errors
4. Review server logs for API errors
5. Test with fresh browser session (clear cookies)

---

**Admin Panel Version:** 1.0.0
**Last Updated:** November 25, 2025
