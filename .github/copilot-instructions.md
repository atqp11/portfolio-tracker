# Portfolio Tracker - AI Coding Agent Instructions

> **Primary Reference:** `docs/0_AI_Coding_Agent_Guide.md` - Comprehensive architecture guide
> **Detailed Patterns:** `docs/5_Guides/DEVELOPMENT_GUIDELINES.md` - 3,500 lines of conventions

## Architecture Overview

**Stack:** Next.js 16 (App Router) + React 19 + Supabase + Prisma + Redis + TypeScript

This is a subscription-based (Stripe) portfolio tracker with 3 tiers (Free/Basic/Premium), featuring:
- Live stock quotes via Alpha Vantage/FMP with intelligent fallback
- AI chat powered by Llama-3.1-70B via OpenRouter
- 4-layer caching strategy (Redis L1 → Company facts L2 → Filing summaries L3 → Vercel Edge L4)
- Tiered quota system (resource limits + daily/monthly AI usage)

### Critical Architectural Rules

**1. 5-Layer Architecture (STRICT)**
```
API Route → Middleware Stack → Controller → Service → DAO
   ↓            ↓                  ↓          ↓        ↓
  HTTP      Auth/Validation    HTTP Logic  Business  Database
```

**2. Layer Responsibilities**
- **Middleware** (`src/backend/common/middleware/`): Auth, validation (Zod), quota, errors
- **Controller** (`src/backend/modules/[feature]/[feature].controller.ts`): Extract params → call service → format NextResponse (NO business logic)
- **Service** (`service/[feature].service.ts`): Business rules, orchestration, usage tracking
- **DAO** (`dao/[feature].dao.ts`): Database queries only (Supabase/Prisma)

**Example:**
```typescript
// app/api/portfolio/route.ts - Thin wrapper
export const GET = withErrorHandler(withAuth(withValidation(undefined, schema)(
  (req, ctx) => portfolioController.get(req, ctx)
)));

// Controller - HTTP concerns only
async get(req, { query }) {
  const portfolio = await portfolioService.findById(query.id);
  return NextResponse.json({ success: true, data: portfolio });
}

// Service - Business logic
async findById(id: string) {
  const portfolio = await portfolioDao.findById(id);
  if (!portfolio) throw new NotFoundError('Portfolio');
  return this.enrichWithMetrics(portfolio); // Business logic here
}
```

**3. Database Access Rules (CRITICAL)**
- ✅ **Supabase:** User-facing data with RLS policies (ALWAYS verify RLS enabled)
- ✅ **Prisma:** Admin-only operations (cron jobs, analytics, `src/backend/admin/` ONLY)
- ❌ **NEVER** use Prisma in user API routes
- ❌ **NEVER** expose Supabase service-role key to client

**4. Frontend Rules: Server Components vs Client Components**

### When to Use Each

**Server Components (RSC) - DEFAULT:**
- ✅ Data fetching via API routes
- ✅ Server-side authentication checks
- ✅ Static content rendering
- ✅ Layouts that don't need state

**Client Components (`'use client'`) - ONLY FOR:**
- ✅ Event handlers (onClick, onChange, onSubmit)
- ✅ React hooks (useState, useEffect, useQuery)
- ✅ Browser APIs (localStorage, window, document)
- ✅ Interactive UI (modals, forms, dropdowns)

### Database Access Rules (CRITICAL)

**❌ NEVER in Client Components or Pages:**
```tsx
// ❌ WRONG - Direct Supabase call in client component
'use client';
import { createClient } from '@supabase/supabase-js';

export default function Dashboard() {
  const supabase = createClient(url, key); // SECURITY RISK!
  const { data } = await supabase.from('portfolios').select('*');
  // ...
}

// ❌ WRONG - Direct Prisma call in page
'use client';
import { prisma } from '@lib/prisma';

export default function Dashboard() {
  const portfolios = await prisma.portfolio.findMany(); // NEVER!
  // ...
}
```

**✅ CORRECT Patterns:**

```tsx
// ✅ CORRECT - Client component fetches via API
'use client';
import { useQuery } from '@tanstack/react-query';

export default function Dashboard() {
  const { data } = useQuery({
    queryKey: ['portfolios'],
    queryFn: async () => {
      const res = await fetch('/api/portfolio');
      return res.json();
    }
  });
  // ...
}

// ✅ CORRECT - Server component with API call in page
// app/(protected)/some-page/page.tsx (NO 'use client')
export default async function ServerPage() {
  const res = await fetch('http://localhost:3000/api/portfolio', {
    cache: 'no-store', // or 'force-cache' depending on needs
  });
  const { data: portfolios } = await res.json();
  
  return <PortfolioList portfolios={portfolios} />;
}

// ✅ CORRECT - Layout with server-side auth check
// app/(protected)/layout.tsx (NO 'use client')
import { requireUser } from '@lib/auth/session';

export default async function ProtectedLayout({ children }) {
  await requireUser(); // Redirects if not authenticated
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

### How to Audit Client/Server Boundaries

**Check for violations:**
```bash
# Find client components with DB imports (DANGEROUS)
grep -r "'use client'" app/ | xargs grep -l "createClient\|prisma\."

# Find pages without 'use client' that use hooks (WILL BREAK)
grep -rL "'use client'" app/**/page.tsx | xargs grep -l "useState\|useEffect"
```

**Red flags in code review:**
- 🚨 `'use client'` + `import { createClient }` from Supabase
- 🚨 `'use client'` + `import { prisma }` 
- 🚨 API keys (NEXT_PUBLIC_* or private) accessed in client files
- 🚨 `useState` in file without `'use client'` directive
- 🚨 Server-side functions (`requireUser`, `getUser`) called in client components

### Theme Support (REQUIRED)
All UI must support light/dark via `dark:` prefix:
```tsx
// ✅ CORRECT
<div className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white" />

// ❌ WRONG - hardcoded dark theme
<div className="bg-gray-950 text-white" />
```

## Path Aliases (REQUIRED)

```typescript
// tsconfig.json paths
@/          → ./
@backend/*  → ./src/backend/*
@lib/*      → ./src/lib/*
@test/*     → ./src/__tests__/*

// ✅ ALWAYS use aliases
import { portfolioService } from '@backend/modules/portfolio/service/portfolio.service';

// ❌ NEVER use relative paths
import { portfolioService } from '../../../backend/modules/portfolio/service/portfolio.service';
```

## Key Patterns & Conventions

### Import Order
1. Next.js/React imports
2. Third-party packages
3. @/ aliased imports
4. Relative imports (same directory only)

### TypeScript Rules
- **Strict mode ON** (`tsconfig.json`)
- **Always type returns explicitly**
- **No `any` types** - use Supabase-generated types
- **Use `??` for null coalescing** (not `||` - `0` is falsy!)

### Caching Strategy
**4-Layer Cache** (`src/lib/cache/`):
1. **L1 Redis (12-24h):** Query results → 60-80% hit rate
2. **L2 Company Facts:** Hot (Redis) + persistent (Supabase)
3. **L3 Filing Summaries (30d):** Supabase `filing_summaries` table
4. **L4 Vercel Edge:** `stale-while-revalidate`

**TTL Guidelines:**
- Stock quotes: 5 min (market hours) / 1 hour (after hours)
- Company profiles: 24 hours
- Filing summaries: 30-90 days
- AI query cache: 12-24 hours

### Quota System (Tiered Limits)

**Two Distinct Systems:**
1. **Resource Quotas** (count limits): Max portfolios, max stocks per portfolio
   - Checked via `withPortfolioQuota`, `withStockQuota` middleware
   - Applied to POST routes ONLY (creation)

2. **AI Usage Quotas** (daily/monthly): Chat queries, portfolio analysis, SEC filings
   - Tracked in `usage_tracking` table (UTC timestamps)
   - Checked via `withCacheAndQuota` middleware
   - Portfolio changes: 3/day (Free), unlimited (Basic/Premium)

**Never confuse:** Creating portfolios ≠ AI usage

### Data Source Orchestration

**DataSourceOrchestrator** (`@lib/data-sources`):
- **Circuit breaker pattern:** Auto-disables failing providers
- **Request deduplication:** Eliminates concurrent duplicates (10%+ savings)
- **Stale fallback:** Returns expired cache when all providers fail
- **Three methods:**
  1. `fetchWithFallback()` - Sequential provider fallback
  2. `fetchWithMerge()` - Combine multiple sources
  3. `batchFetch()` - Batch optimization (70% API call reduction)

## Testing

**Structure:** Tests in `__tests__/` folders adjacent to code
```
src/backend/modules/portfolio/
├── service/
│   └── portfolio.service.ts
└── __tests__/
    └── portfolio.service.test.ts
```

**Commands:**
- `npm test` - Jest unit tests (runs in band)
- `npm run e2e` - Playwright E2E tests
- `npm run test:load` - Artillery load tests

**Key Files:**
- `jest.config.cjs` - Jest setup with path aliases
- `src/__tests__/setup.ts` - Test environment setup
- `e2e/auth.setup.ts` - Playwright auth fixtures

## Development Workflow

**Build:** `npm run build` (runs Prisma generate first)
**Dev:** `npm run dev`
**Sync DB:** `npm run db:sync` (Prisma pull + generate)
**Check Types:** `npm run tsc`

**Pre-deploy Checklist:**
- [ ] TypeScript compiles (`npm run tsc`)
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Path aliases used (no `../../../`)
- [ ] Theme support (light/dark) for UI changes
- [ ] Error/loading states handled

## Security Checklist (CRITICAL)

- [ ] **RLS Policies:** Enabled on all Supabase user tables
- [ ] **Auth Middleware:** Applied to protected routes via `withAuth`
- [ ] **Service Role Key:** Used ONLY in `src/backend/admin/` or cron
- [ ] **Input Validation:** Zod schemas via `withValidation` middleware
- [ ] **No Client Secrets:** Never expose API keys/service keys to client
- [ ] **No Direct DB Access:** Client components ONLY fetch via `/api/*` routes
- [ ] **Server Components:** Default to RSC, `'use client'` only for interactivity

### Quick Security Audit Commands

```powershell
# Find dangerous patterns in client components
Select-String -Path "app/**/*.tsx" -Pattern "'use client'" | Select-String -Pattern "createClient|prisma\.|SUPABASE_SERVICE"

# Find client components that should be server components (no interactivity)
Select-String -Path "app/**/page.tsx" -Pattern "'use client'" | Select-String -NotMatch -Pattern "useState|useEffect|onClick"

# Find server-side auth used in wrong context
Select-String -Path "components/**/*.tsx" -Pattern "requireUser|getServerSession"
```

## AI System (MVP)

**Model:** Llama-3.1-70B (via OpenRouter)
**Philosophy:** Build for retail investors, not quants (95% of queries = "Should I sell X?")
**MVP Rules:**
- ❌ NO RAG, embeddings, or vector DB in MVP
- ❌ NO multi-model routing (single primary model)
- ✅ Lazy generation: Summaries on-demand, cache forever
- ✅ 4-layer cache = 95%+ hit rate, <$1.50/user/month

**Implementation:** See `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md`

## Common Anti-Patterns

❌ **Bloated Controllers:** Business logic in controllers (belongs in services)
❌ **Middleware Bypass:** Validation/auth in controllers (use middleware composition)
❌ **Relative Imports:** `../../../lib/utils` (use `@lib/utils`)
❌ **Missing Types:** Function returns without explicit types
❌ **Hardcoded Themes:** Dark-only colors (support both light/dark)
❌ **Direct DB Access:** Prisma in user routes (Supabase with RLS instead)
❌ **Client-Side DB Calls:** Any Supabase/Prisma import in `'use client'` files
❌ **Unnecessary Client Components:** Using `'use client'` for pages with no interactivity
❌ **Missing Auth Checks:** API routes without `withAuth` middleware
❌ **Exposed Service Keys:** `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_*` secrets in client code

### Detection Patterns

| Anti-Pattern | How to Detect | Fix |
|--------------|---------------|-----|
| Client DB calls | `'use client'` + `createClient`/`prisma` | Use `fetch('/api/...')` instead |
| Wrong component type | Page with `'use client'` + no hooks/handlers | Remove `'use client'`, make it RSC |
| Missing auth | API route without `withAuth` | Wrap with `withAuth(...)` |
| Exposed secrets | `NEXT_PUBLIC_` prefix on sensitive keys | Use server-only env vars |
| Bloated controller | Controller >50 lines or has business logic | Move logic to service layer |

## Reference Documentation

- **Architecture:** `docs/3_Architecture/ARCHITECTURE.md`
- **Guidelines:** `docs/5_Guides/DEVELOPMENT_GUIDELINES.md` (3,550 lines)
- **AI System:** `docs/4_Feature_Deep_Dives/AI_SYSTEM_DESIGN_MVP.md`
- **Tiers:** `src/lib/tiers/README.md`
- **Data Sources:** `src/lib/data-sources/README.md`

## Review Output Format

When reviewing code, structure feedback as:
- **Summary:** 1-sentence quality assessment
- **Critical Issues (🐞):** Security, RLS, logic bugs
- **Improvements (✨):** Performance, maintainability
- **Refactored Code:** Corrected implementation