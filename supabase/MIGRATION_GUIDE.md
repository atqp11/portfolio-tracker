# Migration Guide: Prisma → Supabase PostgreSQL

This guide walks you through migrating from Vercel Postgres + Prisma to Supabase PostgreSQL with Row-Level Security (RLS).

## Benefits of Migration

✅ **Cost Savings:** Eliminate $24/mo Vercel Postgres cost
✅ **Security:** Row-Level Security (RLS) ensures data isolation
✅ **Consolidation:** Database + Auth in one platform
✅ **Real-time:** Built-in real-time subscriptions (future feature)
✅ **Better Free Tier:** 500MB database + 50K MAU (vs Vercel's limited free tier)

---

## Prerequisites

1. **Supabase Account:** Sign up at https://supabase.com
2. **Supabase Project:** Create a new project (choose region closest to users)
3. **API Keys:** Get from Supabase Dashboard → Settings → API
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (anon key)
   - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

These should already be in your `.env.local` file.

---

## Migration Steps

### Step 1: Run Schema SQL in Supabase

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Run the SQL script
4. Verify tables are created in Database → Tables

**Tables created:**
- `public.profiles` (extends auth.users)
- `public.portfolios`
- `public.stocks`
- `public.investment_theses`
- `public.daily_checklists`
- `public.checklist_tasks`
- `public.usage_tracking`
- `public.waitlist`

### Step 2: Run RLS Policies SQL

1. In Supabase SQL Editor
2. Copy contents of `supabase/rls-policies.sql`
3. Run the SQL script
4. Verify RLS is enabled in Database → Tables → [table] → RLS

**What RLS does:**
- Users can only see/edit their own data
- Prevents data leaks between users
- Service role can bypass RLS for admin operations

### Step 3: Migrate Existing Data (Optional)

If you have existing data in Vercel Postgres:

```bash
npx tsx supabase/migrate-data.ts
```

This will:
1. Export data from Prisma to `supabase/export/*.json`
2. Import data to Supabase PostgreSQL
3. Map Prisma fields → Supabase columns

**Note:** User IDs must match between Supabase Auth and Prisma User table.

### Step 4: Update Database URL (Optional)

If you want to keep using Prisma temporarily with Supabase:

```env
# .env.local
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.pxvogkztejbjelsstyws.supabase.co:5432/postgres"
```

Get the connection string from Supabase Dashboard → Settings → Database.

**However, we recommend switching to Supabase client entirely (see Step 5).**

### Step 5: Update API Routes

Replace Prisma client with Supabase helpers.

**Before (Prisma):**
```typescript
import { prisma } from '@/lib/prisma';

const portfolios = await prisma.portfolio.findMany({
  where: { userId: user.id }
});
```

**After (Supabase):**
```typescript
import { getUserPortfolios } from '@/lib/supabase/db';

const portfolios = await getUserPortfolios(user.id);
```

**Update these API routes:**
- `app/api/portfolio/route.ts`
- `app/api/stocks/route.ts`
- `app/api/thesis/route.ts`
- `app/api/checklist/route.ts`
- `app/api/tasks/route.ts`
- `app/api/auth/create-user/route.ts`
- `app/api/auth/user/route.ts`

See `lib/supabase/db.ts` for all available helper functions.

### Step 6: Create Middleware for Session Management

Create `middleware.ts` in the root directory:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

This refreshes the session on every request.

### Step 7: Create Session Helpers

Create `lib/auth/session.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/auth/signin');
  }
  return user;
}

export async function getUserProfile() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
```

Use in server components:
```typescript
import { requireUser, getUserProfile } from '@/lib/auth/session';

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getUserProfile();

  return <div>Welcome {profile.name}!</div>;
}
```

### Step 8: Remove Prisma Dependencies

Once migration is complete and tested:

```bash
npm uninstall prisma @prisma/client
rm -rf prisma/
rm lib/prisma.ts
```

Update `.env.local`:
```env
# Remove (Vercel Postgres)
# DATABASE_URL="..."

# Keep (Supabase)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

---

## Testing RLS Policies

1. **Create Test User #1:**
   - Sign up at `/auth/signup`
   - Create a portfolio
   - Note the user ID

2. **Create Test User #2:**
   - Sign up with different email
   - Create a portfolio
   - Note the user ID

3. **Test Data Isolation:**
   - Try to fetch User #1's portfolio while signed in as User #2
   - RLS should block the query (no data returned)

4. **Check Supabase Dashboard:**
   - Go to Database → Policies
   - Verify RLS is enabled on all tables
   - Test policies with SQL Editor

---

## Rollback Plan

If something goes wrong:

1. **Keep Vercel Postgres running** until migration is verified
2. **Don't delete Prisma files** until testing is complete
3. **Export data before migration** (done automatically by migrate-data.ts)
4. **Backup .env.local** before making changes

To rollback:
```bash
# Restore DATABASE_URL in .env.local
DATABASE_URL="postgresql://..."

# Reinstall Prisma
npm install prisma @prisma/client

# Run Prisma migrations
npx prisma migrate deploy
```

---

## Troubleshooting

### "User not found" errors
- Make sure `handle_new_user()` trigger is enabled
- Check that auth.users and profiles are synced
- Run migration script to create profiles for existing users

### RLS blocking legitimate queries
- Check that `auth.uid()` is set (user is authenticated)
- Verify user_id fields match auth.uid()
- Use service role key for admin operations

### Migration script fails
- Check that Supabase tables are created first (schema.sql)
- Verify SUPABASE_SERVICE_ROLE_KEY is correct
- Check for duplicate IDs or constraint violations

---

## Post-Migration Checklist

- [ ] Schema created in Supabase
- [ ] RLS policies enabled and tested
- [ ] Data migrated successfully
- [ ] API routes updated to use Supabase client
- [ ] Middleware created for session management
- [ ] Session helpers created
- [ ] All pages and components tested
- [ ] Prisma dependencies removed
- [ ] Vercel Postgres database deleted (cost savings!)

---

## Next Steps

After migration:

1. **Add OAuth Providers:** Google, Apple, Phone (see FEATURE_ROADMAP.md)
2. **Enable Real-time:** Subscribe to portfolio changes
3. **Add Stripe Integration:** For subscription payments
4. **Monitor Costs:** Track Supabase usage in Dashboard

---

## Support

- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

---

**Happy migrating! 🚀**
