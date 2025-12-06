# Post-MVP: RSC-First & Server Actions Refactoring Plan

**Created:** December 5, 2025  
**Status:** Post-MVP Planning  
**Goal:** Migrate to React Server Components (RSC) and Server Actions for performance, security, and maintainability

---

## Objective

Refactor the frontend and backend to adopt a **RSC-first architecture** and replace client-side data fetching/mutation patterns with **Server Components** and **Server Actions**, per the target architecture in `docs/3_Architecture/ARCHITECTURE.md` and `docs/0_AI_Coding_Agent_Guide.md`.

---

## Why RSC & Server Actions?

- **Faster TTFB:** Data fetching on the server, less client JS.
- **Cheaper compute:** Offload work from client to server.
- **Security:** No database/API credentials on client.
- **Simpler caching:** Server-side caching, revalidation, partial refresh.
- **Smaller bundles:** Client Components only for interactivity.
- **Mutations:** Server Actions replace many API routes, reducing boilerplate.

---

## Target Architecture Principles

### 1. Pages are Server Components (default)
- All pages under `app/` must be Server Components unless browser APIs are strictly required.

### 2. Fetch data ONLY in Server Components
- No fetching in Client Components for core domain data.
- No browser-side fetching for data required for SSR.
- Reserve React Query/SWR for truly real-time, frequently updating use-cases only.

### 3. Client Components ONLY for interactivity
- Sorting, filtering, dropdowns, tabs, modals, animations, local storage access.
- Never data fetching for core domain data.

### 4. Server Actions for mutations
- All data mutations via Server Actions, not API routes.
- All Server Actions must include Zod validation.
- Use `revalidatePath` for cache invalidation after mutation.

### 5. Use RSC Boundaries strategically
- Isolate data-fetching logic within specific Server Components.
- Enable fine-grained partial re-rendering (e.g., holdings list refreshes independently from portfolio chart).

---

## Refactoring Scope

### Current State
- Many pages/components use `'use client'` and React Query/custom hooks for data fetching.
- Mutations often go through `/api/*` routes called from client.
- Some components mix data fetching and interactivity.

### Target State
- Pages are Server Components by default.
- Data fetched in Server Components, passed as props to Client Components.
- Client Components only for interactivity (sorting, filtering, modals, etc.).
- Mutations via Server Actions, not API routes (where possible).
- API routes remain for external integrations, webhooks, and edge cases.

---

## Paths to Refactor

### High Priority (touched in prod-readiness)
| Path/Component | Current | Target |
|----------------|---------|--------|
| `app/(protected)/dashboard/page.tsx` | Client Component | Server Component + Client interactivity |
| `app/(protected)/stocks/page.tsx` | Client Component | Server Component + Client interactivity |
| `app/(protected)/fundamentals/page.tsx` | Client Component | Server Component + Client interactivity |
| `app/(protected)/thesis/page.tsx` | Client Component | Server Component + Client interactivity |
| `components/StonksAI/*` | Client Component | Server Component for data, Client for chat UI |
| News/RSS components | Client Component | Server Component for feed, Client for filters |

### Medium Priority
| Path/Component | Current | Target |
|----------------|---------|--------|
| Portfolio modals/forms | Client Component | Server Action for mutations |
| Stock add/edit modals | Client Component | Server Action for mutations |
| Checklist UI | Client Component | Server Component + Client interactivity |
| Risk metrics panel | Client Component | Server Component for data |

### Low Priority (future)
| Path/Component | Current | Target |
|----------------|---------|--------|
| Settings pages | Client Component | Server Component + Server Action |
| Admin panel | Client Component | Server Component + Server Action |
| Usage dashboard | Client Component | Server Component |

---

## Refactoring Checklist

For each page/component:
- [ ] Identify data fetching logic (hooks, fetch calls).
- [ ] Move data fetching to Server Component (or parent RSC).
- [ ] Pass fetched data as props to Client Components.
- [ ] Remove `'use client'` from pages unless required for interactivity.
- [ ] Replace API route mutations with Server Actions.
- [ ] Add Zod validation to all Server Actions.
- [ ] Use `revalidatePath` for cache invalidation.
- [ ] Test SSR, hydration, and interactivity.
- [ ] Update/expand tests for new patterns.

---

## Example: Dashboard Refactor

**Before (Client Component):**
```tsx
'use client';
import { usePortfolio } from '@/lib/hooks/usePortfolio';

export default function DashboardPage() {
  const { portfolio, loading } = usePortfolio('energy');
  if (loading) return <Loading />;
  return <Dashboard portfolio={portfolio} />;
}
```

**After (Server Component + Client interactivity):**
```tsx
// app/(protected)/dashboard/page.tsx (Server Component)
import { getPortfolio } from '@/backend/modules/portfolio/portfolio.service';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const portfolio = await getPortfolio('energy');
  return <DashboardClient portfolio={portfolio} />;
}

// DashboardClient.tsx (Client Component)
'use client';
export default function DashboardClient({ portfolio }) {
  // Only interactivity here (sorting, filtering, modals, etc.)
  return <Dashboard portfolio={portfolio} />;
}
```

---

## Example: Server Action for Mutation

**Before (API route):**
```tsx
// app/api/portfolio/route.ts
export async function POST(req) { ... }
```

**After (Server Action):**
```tsx
// app/(protected)/portfolio/actions.ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { portfolioService } from '@/backend/modules/portfolio/portfolio.service';

const schema = z.object({ name: z.string().min(1) });

export async function createPortfolio(formData: FormData) {
  const parsed = schema.parse(Object.fromEntries(formData));
  await portfolioService.create(parsed);
  revalidatePath('/dashboard');
}
```

---

## References
- Target Architecture: `docs/3_Architecture/ARCHITECTURE.md` (1.1–1.5)
- AI Coding Agent Guide: `docs/0_AI_Coding_Agent_Guide.md`
- CLAUDE.md: `CLAUDE.md`
- Feature Roadmap: `product/Planning/roadmap/FEATURE_ROADMAP.md`

---

## Next Steps (Post-MVP)
1. Audit all pages/components for current data fetching patterns.
2. Prioritize refactoring by user impact and complexity.
3. Refactor high-priority paths first (dashboard, stocks, fundamentals).
4. Add/expand tests for Server Components and Server Actions.
5. Update documentation as patterns are adopted.
