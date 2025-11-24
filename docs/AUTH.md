# Authentication System Documentation

## Overview

This application uses **Supabase** for authentication and database operations. The auth system provides session management, route protection, tier-based access control, and secure data isolation through Row-Level Security (RLS).

**Key Architecture Decision:** Uses `proxy.ts` (not `middleware.ts`) following Supabase's recommendation for Next.js 16+ applications.

---

## Architecture

### System Components

```
Authentication Flow:
┌─────────────────────────────────────────────────────────────┐
│ User Request → proxy.ts → Session Validation → Route Logic │
└─────────────────────────────────────────────────────────────┘

Component Structure:
├── proxy.ts                      # Authentication proxy
├── lib/auth/session.ts          # Session helpers
├── lib/supabase/
│   ├── server.ts                # Server-side Supabase client
│   ├── client.ts                # Client-side Supabase client
│   └── db.ts                    # Database helpers
├── supabase/
│   ├── schema.sql               # Database schema
│   └── rls-policies.sql         # Security policies
└── app/api/auth/
    ├── create-user/route.ts     # User profile creation
    └── user/route.ts            # User profile fetching
```

### Why proxy.ts (Not middleware.ts)

**Supabase Recommendation:**
- In Next.js 16+, Supabase recommends using `proxy.ts` for authentication
- `proxy.ts` runs on Node.js runtime with full server capabilities
- `middleware.ts` runs on Edge runtime with limitations for database connections
- Official Supabase docs use `proxy.ts` pattern for SSR authentication

**Security Pattern:**
```typescript
// proxy.ts uses getClaims() for JWT validation
const { data, error } = await supabase.auth.getClaims()
const user = !error && data ? { id: data.sub } : null
```

**Why getClaims() instead of getUser():**
- `getClaims()` validates JWT signatures against published public keys
- `getUser()` doesn't guarantee token revalidation in proxy/middleware
- Required by Supabase for secure authentication in proxy layer

---

## Implementation

### 1. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-only, never expose
```

**Security Notes:**
- `NEXT_PUBLIC_*` variables are embedded in client bundle
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS - only use server-side
- Never commit `.env.local` to git

### 2. Database Setup

Run these SQL scripts in Supabase Dashboard → SQL Editor:

**Step 1: Create Tables** (supabase/schema.sql)
- `profiles` - User profiles with tier system
- `portfolios` - User portfolios
- `stocks` - Stock positions
- `investment_theses` - Investment theses
- `daily_checklists` - Daily checklists
- `checklist_tasks` - Checklist tasks
- `usage_tracking` - Usage limits
- `waitlist` - Waitlist entries

**Step 2: Enable RLS** (supabase/rls-policies.sql)
- Users can only access their own data
- Prevents data leaks between users
- Service role can bypass for admin operations

### 3. Proxy Configuration

**proxy.ts** handles:
- Session refresh on every request
- JWT validation with `getClaims()`
- Route protection (redirects unauthenticated users)
- Auth page redirects (redirects authenticated users away from login)

**Protected Routes:**
- `/dashboard`
- `/portfolio`
- `/stocks`
- `/thesis`
- `/checklist`

**Excluded from Proxy:**
- Static files (`_next/static`, `_next/image`)
- API routes (`/api/*`)
- Public assets (images, favicon)

---

## Usage Guide

### Server Components & API Routes

**Require Authentication:**
```typescript
import { requireUser } from '@/lib/auth/session';

export default async function ProtectedPage() {
  const user = await requireUser(); // Redirects to /auth/signin if not authenticated

  return <div>Welcome, {user.email}!</div>;
}
```

**Get User Profile:**
```typescript
import { getUserProfile } from '@/lib/auth/session';

export default async function DashboardPage() {
  const profile = await getUserProfile();

  if (!profile) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome, {profile.name}!</h1>
      <p>Your tier: {profile.tier}</p>
    </div>
  );
}
```

**Require Specific Tier:**
```typescript
import { requireTier } from '@/lib/auth/session';

export default async function PremiumPage() {
  const profile = await requireTier('premium'); // Redirects to /pricing if not premium

  return <div>Premium content here</div>;
}
```

**API Route with Auth:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch user-specific data
  const data = await fetchUserData(user.id);
  return NextResponse.json(data);
}
```

### Client Components

**Sign Out:**
```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

**Get Current User:**
```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function UserProfile() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  return <div>{user?.email}</div>;
}
```

### Database Operations

**Fetch User's Portfolios:**
```typescript
import { requireUser } from '@/lib/auth/session';
import { getUserPortfolios } from '@/lib/supabase/db';

export default async function PortfolioPage() {
  const user = await requireUser();
  const portfolios = await getUserPortfolios(user.id);

  return (
    <div>
      {portfolios.map(portfolio => (
        <div key={portfolio.id}>
          <h2>{portfolio.name}</h2>
          <p>Type: {portfolio.type}</p>
        </div>
      ))}
    </div>
  );
}
```

**Create Portfolio:**
```typescript
import { createPortfolio } from '@/lib/supabase/db';

const portfolio = await createPortfolio({
  user_id: user.id,
  name: 'Energy Portfolio',
  type: 'energy',
  initial_value: 10000,
  target_value: 15000,
  borrowed_amount: 3000,
  margin_call_level: 7000
});
```

**Update Stock:**
```typescript
import { updateStock } from '@/lib/supabase/db';

await updateStock(stockId, {
  shares: 150,
  current_price: 42.50
});
```

---

## Session Helpers Reference

### Available Functions

**Authentication:**
- `getUser()` - Get current user or null
- `requireUser()` - Require auth, redirect if not authenticated
- `signOut()` - Sign out user

**Profile Management:**
- `getUserProfile()` - Get user profile with tier
- `requireUserProfile()` - Require profile, redirect if not found

**Tier Access Control:**
- `userHasTier(tier)` - Check if user has specific tier (returns boolean)
- `requireTier(tier)` - Require tier, redirect to /pricing if not met

**Tier Hierarchy:**
- `free` (lowest)
- `pro`
- `premium` (highest)

---

## Security Features

### Row-Level Security (RLS)

**How it works:**
- Every database table has RLS policies enabled
- Queries automatically filtered by `user_id`
- Users can only see/edit their own data
- No risk of data leaks between users

**Example Policy:**
```sql
-- Users can only read their own profiles
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can only update their own profiles
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

### Service Role Key

**When to use:**
- Admin operations that need to bypass RLS
- System tasks (user creation triggers)
- Batch operations across users

**Security:**
- Only use server-side (API routes, Server Components)
- Never expose to client
- Configured in environment variables

**Example:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
```

### Session Management

**Features:**
- Sessions refreshed on every request via proxy
- Sessions stored in HTTP-only cookies
- CSRF protection built-in
- Automatic token refresh

**Cookie Settings:**
- `httpOnly: true` - Not accessible via JavaScript
- `secure: true` - HTTPS only (production)
- `sameSite: 'lax'` - CSRF protection

---

## Authentication Pages

### Sign Up

**Location:** `app/auth/signup/page.tsx`

**Features:**
- Name, email, password fields
- Animated galaxy background
- Glassmorphic design
- Form validation
- Loading states
- Error messages
- Profile auto-creation via database trigger

**User Flow:**
1. User fills sign up form
2. Supabase Auth creates user account
3. Database trigger (`handle_new_user`) creates profile automatically
4. User redirected to `/dashboard`

### Sign In

**Location:** `app/auth/signin/page.tsx`

**Features:**
- Email, password fields
- Animated background
- Loading states
- Error handling
- Remember session
- Redirect to original destination after login

### Email Verification (Optional)

**Location:** `app/auth/callback/route.ts`

**Setup:**
1. Enable email confirmation in Supabase Dashboard → Authentication → Email Templates
2. Callback URL handles email verification
3. User redirected after confirmation

---

## Database Schema

### Tables

**profiles**
```typescript
{
  id: string (UUID, references auth.users)
  email: string
  name: string | null
  tier: 'free' | 'pro' | 'premium'
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  created_at: timestamp
  updated_at: timestamp
}
```

**portfolios**
```typescript
{
  id: string
  user_id: string (references profiles)
  name: string
  type: string
  initial_value: number
  target_value: number
  borrowed_amount: number
  margin_call_level: number
  created_at: timestamp
  updated_at: timestamp
}
```

**stocks**
```typescript
{
  id: string
  portfolio_id: string (references portfolios)
  symbol: string
  name: string
  shares: number
  avg_price: number
  current_price: number | null
  actual_value: number | null
  last_updated: timestamp
  created_at: timestamp
}
```

### Triggers

**handle_new_user()**
- Automatically creates profile when user signs up
- Extracts name from user metadata
- Sets default tier to 'free'
- Prevents duplicate profiles

---

## Troubleshooting

### "User not found" after signup

**Cause:** Database trigger didn't run or failed

**Fix:**
1. Check if trigger exists: Run `supabase/schema.sql` again
2. Verify trigger in Supabase Dashboard → Database → Functions
3. Check Supabase logs for errors

### RLS blocking queries

**Cause:** User not authenticated or `user_id` mismatch

**Debug:**
```typescript
// Check authenticated user
const { data: { user } } = await supabase.auth.getUser();
console.log('Authenticated user:', user?.id);

// Check RLS policies
// Supabase Dashboard → Database → Tables → [table] → RLS tab
```

**Fix:**
- Ensure `auth.uid()` matches `user_id` in database
- Verify RLS policies are correct
- Check if service role key needed for admin operations

### Proxy not protecting routes

**Cause:** Incorrect matcher configuration or proxy not running

**Fix:**
1. Verify `proxy.ts` exists in project root
2. Check `export const config` matcher patterns
3. Restart dev server: `rm -rf .next && npm run dev`

### Environment variables not working

**Cause:** Missing or incorrect environment variables

**Fix:**
1. Check `.env.local` has all required variables
2. Restart dev server after adding variables
3. Verify Supabase project URL and keys are correct

### Session not persisting

**Cause:** Cookie issues or session storage problems

**Debug:**
```typescript
// In browser console
document.cookie // Check for Supabase cookies
```

**Fix:**
1. Clear browser cookies
2. Check if running on `localhost` (not IP address)
3. Verify `createServerClient` cookie handlers in proxy.ts

---

## Testing Checklist

### Manual Testing

**1. Sign Up Flow:**
- [ ] Visit `/auth/signup`
- [ ] Fill in name, email, password
- [ ] Submit form
- [ ] Verify redirect to `/dashboard`
- [ ] Check Supabase Dashboard → Authentication → Users (new user exists)
- [ ] Check Database → profiles table (profile created)

**2. Sign In Flow:**
- [ ] Sign out
- [ ] Visit `/auth/signin`
- [ ] Enter credentials
- [ ] Verify redirect to `/dashboard`
- [ ] Check session persists on page refresh

**3. Route Protection:**
- [ ] Sign out
- [ ] Try visiting `/dashboard` (should redirect to `/auth/signin`)
- [ ] Try visiting `/portfolio` (should redirect to `/auth/signin`)
- [ ] Sign in
- [ ] Verify can now access protected pages

**4. Auth Page Redirects:**
- [ ] Sign in successfully
- [ ] Try visiting `/auth/signin` (should redirect to `/dashboard`)
- [ ] Try visiting `/auth/signup` (should redirect to `/dashboard`)

**5. Sign Out:**
- [ ] Click sign out button
- [ ] Verify redirect to `/auth/signin`
- [ ] Verify cannot access protected pages
- [ ] Verify session cleared

---

## Migration from Prisma

### Changes Made

**Database:**
- Migrated from Prisma + Vercel Postgres to Supabase PostgreSQL
- Replaced Prisma client with Supabase client
- Added RLS policies for security
- Created database triggers for automation

**API Routes:**
- `app/api/auth/create-user/route.ts` - Now uses Supabase client
- `app/api/auth/user/route.ts` - Now uses Supabase client
- Service role key for admin operations

**Auth System:**
- Added `proxy.ts` for session management
- Created `lib/auth/session.ts` helpers
- Created `lib/supabase/db.ts` database helpers
- Implemented tier-based access control

### Data Migration (If Needed)

If you have existing Prisma data to migrate:

1. Export data from Prisma database
2. Transform to match Supabase schema
3. Use `supabase/migrate-data.ts` script
4. Verify data integrity
5. Test authentication with migrated users

---

## Best Practices

### Security

1. **Never expose service role key to client**
   - Only use in API routes and Server Components
   - Check environment variable configuration

2. **Always validate user identity**
   - Use `requireUser()` for protected pages
   - Check `user_id` matches authenticated user

3. **Use RLS policies**
   - Never bypass RLS in client-facing operations
   - Trust RLS for data isolation

4. **Validate input**
   - Sanitize all user input before database operations
   - Use TypeScript types for type safety

### Performance

1. **Cache user profile**
   - Profile doesn't change often
   - Fetch once and reuse across page

2. **Use Server Components**
   - Fetch data server-side when possible
   - Reduces client bundle size

3. **Optimize queries**
   - Only fetch needed fields
   - Use proper database indexes

### Development

1. **Test RLS policies**
   - Sign in as different users
   - Verify data isolation

2. **Handle edge cases**
   - User without profile
   - Expired sessions
   - Network failures

3. **Log important events**
   - User sign up/sign in
   - Profile updates
   - Tier changes

---

## Future Enhancements

### Optional Features

**1. OAuth Providers**
```typescript
// Google Sign-In
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
```

Enable in: Supabase Dashboard → Authentication → Providers → Google

**2. Password Reset**
```typescript
// Send reset email
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`
});
```

**3. Email Verification**
Already configured in signup page. Enable in:
Supabase Dashboard → Authentication → Email Templates → Confirm signup

**4. Two-Factor Authentication**
Supabase supports TOTP-based 2FA. See official docs for implementation.

**5. Usage Tracking**
```typescript
import { createUsageRecord } from '@/lib/supabase/db';

await createUsageRecord({
  user_id: user.id,
  tier: profile.tier,
  chat_queries: 1,
  portfolio_analysis: 0,
  sec_filings: 0,
  period_start: new Date().toISOString(),
  period_end: addDays(new Date(), 30).toISOString()
});
```

---

## User Management: Disabling & Restricting Access

This section covers how to disable or restrict previously signed up users in your Supabase authentication system.

### Method 1: Supabase Dashboard (Quick Manual Approach)

**Best for:** Quick manual user management by admins

**Steps:**

1. **Navigate to Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to **Authentication** → **Users**

2. **Disable a User**
   - Find the user in the list
   - Click on the user row
   - Look for **"Disable User"** or **"Ban User"** option
   - Click to disable the account

**What happens:**
- User cannot sign in
- Existing sessions remain valid until they expire
- User data remains in database
- Can be re-enabled at any time

**Limitation:** Existing sessions are not immediately invalidated. User stays logged in until session expires or they refresh the page.

---

### Method 2: Supabase Auth Admin API (Programmatic)

**Best for:** Automated user management, bulk operations, admin panels

**Implementation:**

Create an API route for admin operations:

```typescript
// app/api/admin/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// PUT /api/admin/users/[userId] - Disable user
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // TODO: Add admin authentication check here
  // const isAdmin = await checkAdminRole(request);
  // if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { action } = await request.json();

  if (action === 'disable') {
    // Disable user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      params.userId,
      { ban_duration: 'none' } // Permanently ban
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User disabled successfully',
      user: data.user
    });
  }

  if (action === 'enable') {
    // Re-enable user
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      params.userId,
      { ban_duration: '0h' } // Remove ban
    );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User enabled successfully',
      user: data.user
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE /api/admin/users/[userId] - Permanently delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // TODO: Add admin authentication check

  // Delete user from Supabase Auth (cascades to profiles table via ON DELETE CASCADE)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(
    params.userId
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'User deleted successfully'
  });
}
```

**Usage from client:**

```typescript
// Disable user
await fetch(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'disable' })
});

// Re-enable user
await fetch(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'enable' })
});

// Permanently delete user
await fetch(`/api/admin/users/${userId}`, {
  method: 'DELETE'
});
```

**Important:** This approach requires implementing admin authentication. See "Admin Authentication" section below.

---

### Method 3: Database Status Field (Custom Approach)

**Best for:** Fine-grained control, custom restriction reasons, audit trails

**Step 1: Update Database Schema**

Add status field to profiles table:

```sql
-- Run in Supabase SQL Editor

-- Add status column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'suspended', 'banned', 'pending_review'));

-- Add blocked_reason column for audit trail
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS blocked_reason TEXT;

-- Add blocked_at timestamp
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Add blocked_by for admin tracking
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES auth.users(id);

-- Add index for status lookups
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
```

**Step 2: Update RLS Policies**

Modify existing policies to check status:

```sql
-- Run in Supabase SQL Editor

-- Drop and recreate "Users can view own profile" policy with status check
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id AND status = 'active'
  );

-- Drop and recreate update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id AND status = 'active'
  )
  WITH CHECK (
    auth.uid() = id AND status = 'active'
  );
```

**Step 3: Update Proxy to Check Status**

Modify `proxy.ts` to check user status:

```typescript
// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  // Check if user account is active (NEW)
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, blocked_reason')
      .eq('id', user.id)
      .single();

    if (profile && profile.status !== 'active') {
      // User is blocked/suspended - redirect to restricted page
      const url = request.nextUrl.clone()
      url.pathname = '/auth/restricted'
      url.searchParams.set('reason', profile.blocked_reason || 'Account suspended')
      return NextResponse.redirect(url)
    }
  }

  // Protected routes - redirect to sign-in if not authenticated
  if (!user && (
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/portfolio') ||
    request.nextUrl.pathname.startsWith('/stocks') ||
    request.nextUrl.pathname.startsWith('/thesis') ||
    request.nextUrl.pathname.startsWith('/checklist')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (
    request.nextUrl.pathname.startsWith('/auth/signin') ||
    request.nextUrl.pathname.startsWith('/auth/signup')
  )) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 4: Create Restricted Page**

```typescript
// app/auth/restricted/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function RestrictedPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'Your account has been restricted';
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Account Restricted</h2>
          <p className="mt-2 text-sm text-gray-600">{reason}</p>
          <p className="mt-4 text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
          <button
            onClick={handleSignOut}
            className="mt-6 w-full bg-gray-800 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Admin API Route to Update Status**

```typescript
// app/api/admin/users/[userId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  // TODO: Add admin authentication check

  const { status, reason } = await request.json();

  // Validate status
  const validStatuses = ['active', 'suspended', 'banned', 'pending_review'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  // Update profile status
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      status,
      blocked_reason: status !== 'active' ? reason : null,
      blocked_at: status !== 'active' ? new Date().toISOString() : null,
      // blocked_by: adminUserId, // TODO: Get from auth
    })
    .eq('id', params.userId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, profile: data });
}
```

**Usage:**

```typescript
// Suspend user
await fetch(`/api/admin/users/${userId}/status`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'suspended',
    reason: 'Violation of terms of service'
  })
});

// Reactivate user
await fetch(`/api/admin/users/${userId}/status`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    status: 'active',
    reason: null
  })
});
```

---

### Admin Authentication

**IMPORTANT:** The admin API routes above need proper authentication. Here are recommended approaches:

#### Option 1: Environment Variable Check (Simple, for MVP)

```typescript
// app/api/admin/users/[userId]/route.ts
export async function PUT(request: NextRequest) {
  const adminKey = request.headers.get('x-admin-key');

  if (adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Admin operation
}
```

**Usage:**
```typescript
await fetch(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'x-admin-key': process.env.NEXT_PUBLIC_ADMIN_KEY
  },
  body: JSON.stringify({ action: 'disable' })
});
```

#### Option 2: Role-Based Access Control (Production)

Add admin role to profiles:

```sql
-- Add role column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
```

Check role in API routes:

```typescript
// lib/auth/admin.ts
import { createClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
    throw new Error('Not authorized - admin access required');
  }

  return { user, profile };
}

// Use in API routes
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();
    // Admin operation
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }
}
```

---

### Comparison of Methods

| Method | Pros | Cons | Use Case |
|--------|------|------|----------|
| **Dashboard** | Quick, no code needed | Manual, no automation | Quick bans, testing |
| **Auth Admin API** | Official Supabase method, sessions invalidated | Limited customization | Standard user bans |
| **Database Status** | Fine-grained control, custom reasons, audit trail | More code, custom implementation | Enterprise features |

---

### Recommended Workflow

**For production apps, combine approaches:**

1. **Use Database Status Field** for application-level restrictions
   - Allows custom statuses (suspended, banned, pending_review)
   - Provides audit trail (who blocked, when, why)
   - Enforced in middleware for immediate effect

2. **Use Supabase Auth Admin API** for permanent bans
   - Completely disables authentication
   - Use when user should never access system again

3. **Use Dashboard** for emergency situations
   - Quick manual intervention
   - Testing restrictions

**Example combined workflow:**

```typescript
async function suspendUser(userId: string, reason: string) {
  // 1. Update database status (immediate effect via middleware)
  await fetch(`/api/admin/users/${userId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'suspended', reason })
  });

  // 2. If permanent ban, also ban in Supabase Auth
  if (reason.includes('permanent')) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ action: 'disable' })
    });
  }
}
```

---

### Testing User Restrictions

**Manual Testing Checklist:**

1. Create test user account via signup
2. Get user ID from Supabase Dashboard → Authentication → Users
3. Suspend user using one of the methods above
4. Try to:
   - [ ] Access protected pages (should redirect to /auth/restricted)
   - [ ] Sign in again (should fail if using Auth API ban)
   - [ ] Make API calls (should fail due to RLS policies)
   - [ ] View profile data (should be blocked by RLS)
5. Reactivate user
6. Verify user can access app again

**Automated Testing:**

```typescript
// tests/user-restrictions.test.ts
describe('User Restrictions', () => {
  it('should block suspended users from accessing protected pages', async () => {
    // Create test user
    const user = await createTestUser();

    // Suspend user
    await fetch(`/api/admin/users/${user.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'suspended', reason: 'Test' })
    });

    // Try to access protected page
    const response = await fetch('/dashboard', {
      headers: { Authorization: `Bearer ${user.token}` }
    });

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toContain('/auth/restricted');
  });
});
```

---

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Auth Guide:** https://supabase.com/docs/guides/auth
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Next.js SSR:** https://supabase.com/docs/guides/auth/server-side/nextjs
- **Supabase Auth Admin API:** https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid

---

## Quick Reference

### Common Commands

```bash
# Start dev server
npm run dev

# Apply database changes
# (Run SQL in Supabase Dashboard)

# Check Supabase connection
# (Test API routes: /api/auth/user?userId=...)

# Clear Next.js cache
rm -rf .next && npm run dev
```

### File Locations

```
proxy.ts                         # Auth proxy
lib/auth/session.ts             # Session helpers
lib/supabase/server.ts          # Server client
lib/supabase/client.ts          # Client client
lib/supabase/db.ts              # Database helpers
supabase/schema.sql             # Database schema
supabase/rls-policies.sql       # RLS policies
app/auth/signin/page.tsx        # Sign in page
app/auth/signup/page.tsx        # Sign up page
app/api/auth/create-user/       # Create user API
app/api/auth/user/              # Get user API
```

### Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=         # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=  # Anon key
SUPABASE_SERVICE_ROLE_KEY=        # Service role key (server-only)
```
