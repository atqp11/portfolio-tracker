# Authentication Implementation Guide

**Last Updated:** December 5, 2025  
**Status:** Production Review  
**Audience:** Developers working on authentication, security, and access control

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Row-Level Security (RLS)](#row-level-security-rls)
4. [User Validation](#user-validation)
5. [RBAC (Role-Based Access Control)](#rbac-role-based-access-control)
6. [Current Gaps & Weaknesses](#current-gaps--weaknesses)
7. [Best Practice: Next.js Middleware](#best-practice-nextjs-middleware)
8. [Implementation Roadmap](#implementation-roadmap)

---

## Overview

The Portfolio Tracker uses **Supabase Auth** with a **multi-layer authentication approach**:

- **Layer 1:** Cookie-based session management via `@supabase/ssr`
- **Layer 2:** Session helper functions for Server Components and API routes
- **Layer 3:** Auth middleware for API route protection
- **Layer 4:** Row-Level Security (RLS) policies for database-level protection

### Authentication Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                             │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP-only cookies
                       ↓
┌─────────────────────────────────────────────────────────────┐
│               Supabase Auth (OAuth + JWT)                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
┌──────────────────┐         ┌──────────────────┐
│  Regular Client  │         │   Admin Client   │
│  (anon key)      │         │ (service_role)   │
│  RLS Enforced    │         │  RLS Bypassed    │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ↓                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL with RLS Policies                   │
│  • Users see only their data (auth.uid() = user_id)        │
│  • Service role sees all data (admin operations)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Current Implementation

### Layer 1: Supabase Session (Cookie-based)

**File:** `src/lib/supabase/server.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

**Features:**
- ✅ HTTP-only cookies (secure)
- ✅ Works in Server Components
- ✅ Auto-managed by `@supabase/ssr`
- ⚠️ Session refresh requires middleware (not implemented)

---

### Layer 2: Session Helpers

**File:** `src/lib/auth/session.ts`

```typescript
/**
 * Get the currently authenticated user (or null if not authenticated)
 */
export async function getUser(): Promise<User | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return user;
}

/**
 * Require authentication - redirects to /auth/signin if not authenticated
 */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  return user;
}

/**
 * Get the user's profile from the database
 * Includes tier information for access control
 */
export async function getUserProfile(): Promise<Profile | null> {
  const user = await getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const supabase = await createClient();
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  if (error) {
    console.error('Error fetching profile:', error);
    throw new Error('Failed to fetch user profile');
  }
  
  return profile;
}
```

**Usage:**

```typescript
// In Server Components
export default async function DashboardPage() {
  const user = await requireUser();  // Redirects if not authenticated
  const profile = await getUserProfile();  // Gets tier info
  
  return <div>Welcome {profile.name}!</div>;
}

// In API Routes
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Protected logic
}
```

---

### Layer 3: Auth Middleware

**File:** `src/backend/common/middleware/auth.middleware.ts`

```typescript
export class AuthMiddleware {
  /**
   * Require authentication (throws if not authenticated)
   */
  static async requireAuth(): Promise<User> {
    const user = await getUser();
    if (!user) {
      throw new UnauthorizedError('Authentication required');
    }
    return user;
  }

  /**
   * Require user profile (throws if not found)
   */
  static async requireProfile(): Promise<UserProfile> {
    const profile = await getUserProfile();
    if (!profile) {
      throw new UnauthorizedError('User profile not found');
    }
    return profile;
  }

  /**
   * Require specific tier (throws if user doesn't have tier)
   */
  static async requireMinimumTier(tier: TierName): Promise<UserProfile> {
    const profile = await this.requireProfile();
    const hasTier = await userHasTier(tier);
    
    if (!hasTier) {
      throw new ForbiddenError(
        `This feature requires ${tier} tier or higher`
      );
    }
    
    return profile;
  }

  /**
   * Check if user is admin
   */
  static async isAdmin(): Promise<boolean> {
    const profile = await getUserProfile();
    return profile?.is_admin === true;
  }

  /**
   * Require admin access
   */
  static async requireAdmin(): Promise<UserProfile> {
    const profile = await this.requireProfile();
    
    if (!profile.is_admin) {
      throw new ForbiddenError('Admin access required');
    }
    
    return profile;
  }
}
```

**Usage in API Routes:**

```typescript
// app/api/admin/users/route.ts
export async function GET(request: NextRequest) {
  const profile = await AuthMiddleware.requireAdmin();  // Throws if not admin
  
  // Admin-only logic
  const users = await adminService.getAllUsers();
  return NextResponse.json({ users });
}
```

---

## Row-Level Security (RLS)

### RLS Policies

**File:** `src/backend/database/supabase/rls-policies.sql`

RLS is enabled on **all tables** with policies that ensure:
1. Users can only access their own data
2. Service role (admin operations) can access all data

#### Example: Portfolios Table

```sql
-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Users can view their own portfolios
CREATE POLICY "Users can view own portfolios"
  ON public.portfolios FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own portfolios
CREATE POLICY "Users can create own portfolios"
  ON public.portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own portfolios
CREATE POLICY "Users can update own portfolios"
  ON public.portfolios FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own portfolios
CREATE POLICY "Users can delete own portfolios"
  ON public.portfolios FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access (bypasses RLS)
CREATE POLICY "Service role has full access to portfolios"
  ON public.portfolios FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### RLS Coverage

| Table | RLS Enabled | User Policies | Service Role |
|-------|-------------|---------------|--------------|
| `profiles` | ✅ | Own data only | ✅ Full access |
| `portfolios` | ✅ | Own data only | ✅ Full access |
| `stocks` | ✅ | Own data only | ✅ Full access |
| `investment_theses` | ✅ | Own data only | ✅ Full access |
| `daily_checklists` | ✅ | Own data only | ✅ Full access |
| `checklist_tasks` | ✅ | Own data only | ✅ Full access |
| `usage_tracking` | ✅ | Own data only | ✅ Full access |
| `cache_*` tables | ✅ | Read-only | ✅ Full access |
| `waitlist` | ✅ | Insert-only | ✅ Full access |

---

### Two Client Pattern

#### Regular Client (RLS Enforced)

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'

export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,  // ← Anon key
    { cookies: { /* ... */ } }
  )
}

// Usage: User sees only their data
const supabase = await createClient();
const { data } = await supabase.from('portfolios').select('*');
// Returns: Only portfolios where user_id = auth.uid()
```

#### Admin Client (RLS Bypassed)

```typescript
// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← Service role key
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// Usage: Admin sees all data
const supabase = createAdminClient();
const { data } = await supabase.from('profiles').select('*');
// Returns: ALL profiles (RLS bypassed)
```

**⚠️ SECURITY WARNING:**
- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- **ONLY** use `createAdminClient()` in server-side code
- **ALWAYS** verify admin status before using admin client

---

## User Validation

### Multiple Validation Points

#### 1. Frontend (React Components)

**File:** `components/layout/Sidebar.tsx`

```tsx
'use client';

export default function Sidebar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  useEffect(() => {
    async function fetchUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const response = await fetch(`/api/auth/user?id=${authUser.id}`);
        const userData = await response.json();
        setUser(userData);
      }
    }
    
    fetchUser();
  }, []);
  
  return (
    <div>
      {user && <TierBadge tier={user.tier} />}
      {/* Navigation */}
    </div>
  );
}
```

**Status:** ⚠️ Client-side only (can be bypassed)

---

#### 2. Protected Route Layout

**File:** `app/(protected)/layout.tsx`

```tsx
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

**Status:** ❌ No auth check (weakness - should call `requireUser()`)

---

#### 3. API Routes (Primary Defense)

```typescript
// Pattern 1: Manual check
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Protected logic
}

// Pattern 2: Using middleware helper
export async function POST(request: NextRequest) {
  const profile = await AuthMiddleware.requireProfile();  // Throws if not authenticated
  
  // Protected logic
}
```

**Status:** ✅ Primary security layer

---

## RBAC (Role-Based Access Control)

### Admin Authorization

**File:** `src/lib/auth/admin.ts`

```typescript
/**
 * Check if the current user is an admin
 */
export async function checkAdminAuth(request: NextRequest): Promise<{
  isAdmin: boolean;
  userId: string | null;
  error?: string;
}> {
  try {
    const user = await getUser();
    
    if (!user) {
      return {
        isAdmin: false,
        userId: null,
        error: 'Not authenticated',
      };
    }
    
    const adminStatus = await isUserAdmin(user.id);
    
    if (!adminStatus) {
      return {
        isAdmin: false,
        userId: user.id,
        error: 'Unauthorized - admin access required',
      };
    }
    
    return {
      isAdmin: true,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error checking admin auth:', error);
    return {
      isAdmin: false,
      userId: null,
      error: 'Authentication error',
    };
  }
}

/**
 * Middleware wrapper for admin-only routes
 */
export async function requireAdmin(
  request: NextRequest
): Promise<NextResponse | null> {
  const authCheck = await checkAdminAuth(request);
  
  if (!authCheck.isAdmin) {
    return NextResponse.json(
      {
        error: authCheck.error || 'Unauthorized',
        code: 'ADMIN_REQUIRED',
      },
      { status: authCheck.userId ? 403 : 401 }
    );
  }
  
  return null;  // Auth passed
}
```

---

### Admin API Route Protection

**File:** `app/api/admin/users/route.ts`

```typescript
import { requireAdmin } from '@lib/auth/admin';
import { adminController } from '@backend/modules/admin/admin.controller';

export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request);
  if (authError) return authError;  // Returns 401/403 if not admin
  
  // Admin-only logic using admin client
  return adminController.getUsers(request);
}
```

**Status:** ✅ API routes properly protected

---

### Admin UI Protection

**File:** `app/(protected)/admin/page.tsx`

```tsx
'use client';

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  
  useEffect(() => {
    async function fetchUsers() {
      const response = await fetch('/api/admin/users');
      
      if (response.status === 401 || response.status === 403) {
        router.push('/dashboard');  // Redirect non-admins
        return;
      }
      
      const data = await response.json();
      setUsers(data.users);
    }
    
    fetchUsers();
  }, []);
  
  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin UI */}
    </div>
  );
}
```

**Status:** ⚠️ Client-side only (flashing content, should be SSR)

---

### Admin Navigation

**File:** `components/layout/Sidebar.tsx`

```tsx
const baseNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Settings', href: '/settings', icon: '⚙️' },
];

const adminNavItem: NavItem = {
  label: 'Admin Panel',
  href: '/admin',
  icon: '👑',
};

export default function Sidebar() {
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Add admin nav item if user is admin
  const navItems = user?.is_admin
    ? [...baseNavItems.slice(0, -1), adminNavItem, baseNavItems[baseNavItems.length - 1]]
    : baseNavItems;
  
  return (
    <nav>
      {navItems.map(item => (
        <Link key={item.href} href={item.href}>
          {item.icon} {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

**Status:** ✅ Conditional rendering based on admin status

---

## Current Gaps & Weaknesses

### 1. ❌ NO NEXT.JS MIDDLEWARE 🔴 **CRITICAL**

**Problem:**
- No `middleware.ts` file at root
- No server-side auth checks before page renders
- Client components do redirects (flashing unauthorized content)
- Session doesn't auto-refresh before expiry
- No edge-level protection

**Impact:**
```
User visits /admin
    ↓
Next.js renders page (no middleware check)
    ↓
Client component loads
    ↓
useEffect checks auth (200ms delay)
    ↓
Redirect to /dashboard (flash of admin UI visible)
```

**Risk:** Unauthorized users briefly see protected content

---

### 2. ⚠️ Protected Layout Missing Auth

**File:** `app/(protected)/layout.tsx`

```tsx
// ❌ CURRENT: No auth check
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

// ✅ SHOULD BE: Server-side auth enforcement
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();  // Redirects if not authenticated
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

**Impact:** Pages load without auth check, rely on client-side validation

---

### 3. ⚠️ Admin Page is Client Component

**File:** `app/(protected)/admin/page.tsx`

```tsx
// ❌ CURRENT: Client-side auth check
'use client';

export default function AdminPage() {
  useEffect(() => {
    // Check admin status after page loads
  }, []);
  
  return <div>Admin Panel</div>;
}

// ✅ SHOULD BE: Server-side auth enforcement
export default async function AdminPage() {
  const user = await requireUser();
  const profile = await getUserProfile();
  
  if (!profile.is_admin) {
    redirect('/dashboard');
  }
  
  return <div>Admin Panel</div>;
}
```

**Impact:** Brief flash of admin UI before redirect

---

### 4. ⚠️ No Automatic Session Refresh

**Problem:**
- Sessions expire after a period
- No middleware to refresh sessions automatically
- Users get logged out unexpectedly

**Solution:** Middleware can refresh sessions on every request

---

## Best Practice: Next.js Middleware

### Why Middleware is Better

| Feature | Current (Layout/Client) | With Middleware |
|---------|------------------------|-----------------|
| **Execution** | After page load | Before page renders |
| **Performance** | Client-side redirect | Edge redirect (faster) |
| **Security** | Can view source briefly | Never serves protected HTML |
| **Session Refresh** | Manual | Automatic |
| **DX** | Check in every page | One file protects all |
| **Flash of Content** | ⚠️ Visible | ✅ None |
| **Network Requests** | 2+ (page + auth) | 1 (combined) |

---

### Recommended Implementation

**Create:** `middleware.ts` at project root

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Create Supabase client with cookie management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired (automatic session management)
  const { data: { user } } = await supabase.auth.getUser()

  // Protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const redirectUrl = new URL('/auth/signin', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Check admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Protect all (protected) routes
  const protectedPaths = [
    '/dashboard',
    '/fundamentals',
    '/risk',
    '/thesis',
    '/checklist',
    '/usage',
    '/settings',
  ]

  const isProtectedPath = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

### Benefits of Middleware

1. **🚀 Performance:**
   - Edge execution (Vercel Edge Functions)
   - No client-side JavaScript needed
   - Redirects happen before page loads

2. **🔒 Security:**
   - Protected pages never render for unauthorized users
   - No source code leakage
   - Automatic session refresh

3. **✨ User Experience:**
   - No flash of unauthorized content
   - Seamless redirects
   - Preserves intended destination (`redirect` param)

4. **🛠️ Developer Experience:**
   - Single file protects all routes
   - No auth checks in every page
   - Centralized security logic

---

## Implementation Roadmap

### Priority 1: Basic Auth Middleware (2 hours)

**Tasks:**
1. Create `middleware.ts` at project root
2. Implement session refresh logic
3. Protect `/dashboard/*` routes
4. Add redirect to `/auth/signin` for unauthenticated users
5. Preserve intended destination with `redirect` query param

**Files to create:**
- `middleware.ts`

**Testing:**
```bash
# Test unauthenticated access
curl http://localhost:3000/dashboard
# Should redirect to /auth/signin?redirect=/dashboard

# Test authenticated access
# Login via /auth/signin with Google
# Visit /dashboard
# Should load without redirect
```

---

### Priority 2: Admin Protection (1 hour)

**Tasks:**
1. Add admin check to middleware
2. Protect `/admin/*` routes at edge
3. Return 403 for authenticated but non-admin users

**Files to modify:**
- `middleware.ts` (add admin check)

**Testing:**
```bash
# Test non-admin user accessing /admin
# Should redirect to /dashboard

# Test admin user accessing /admin
# Should load admin panel
```

---

### Priority 3: Convert Protected Routes to SSR (2 hours)

**Tasks:**
1. Update `app/(protected)/layout.tsx` to Server Component
2. Add `await requireUser()` call
3. Convert `app/(protected)/admin/page.tsx` to Server Component
4. Add admin check in Server Component

**Files to modify:**
- `app/(protected)/layout.tsx`
- `app/(protected)/admin/page.tsx`

**Before:**
```tsx
// ❌ Client Component
'use client';
export default function AppLayout({ children }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

**After:**
```tsx
// ✅ Server Component with auth
export default async function AppLayout({ children }) {
  await requireUser();  // Server-side auth check
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

---

### Priority 4: Session Refresh Optimization (1 hour)

**Tasks:**
1. Verify middleware refreshes sessions automatically
2. Test session expiry handling
3. Add logging for session refresh events

**Testing:**
- Expire session manually in browser
- Visit protected route
- Verify automatic refresh works

---

## Summary

### What's Good ✅

- ✅ RLS policies are comprehensive and well-designed
- ✅ Service role separation is correct (admin client vs user client)
- ✅ Admin API routes are properly protected
- ✅ Cookie-based session management is secure
- ✅ Auth helper functions are well-structured
- ✅ Tier-based access control is implemented

### What Needs Fixing ⚠️

- 🔴 **Add Next.js middleware** for edge-level auth (CRITICAL)
- ⚠️ Convert protected layouts to Server Components with `requireUser()`
- ⚠️ Convert admin page to SSR with server-side admin check
- ⚠️ Implement automatic session refresh via middleware
- ⚠️ Add redirect preservation for better UX

### Time Estimate

| Task | Priority | Time | Impact |
|------|----------|------|--------|
| Create middleware.ts | 🔴 High | 2h | High security improvement |
| Admin edge protection | 🟡 Medium | 1h | Medium security improvement |
| Convert to SSR | 🟡 Medium | 2h | Better UX, less flash |
| Session refresh | 🟢 Low | 1h | Better UX |
| **Total** | | **6h** | Production-ready auth |

---

**Recommendation:** Implement middleware as **Priority 1** before production launch. This is the industry-standard approach for Next.js authentication and provides the best security and user experience.
