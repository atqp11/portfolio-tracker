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

## Resources

- **Supabase Docs:** https://supabase.com/docs
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Auth Guide:** https://supabase.com/docs/guides/auth
- **RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **Next.js SSR:** https://supabase.com/docs/guides/auth/server-side/nextjs

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
