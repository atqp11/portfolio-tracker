# Portfolio Tracker - Refactoring Master Plan
## MVP-Focused, Step-by-Step Execution Guide

**Created:** November 30, 2025  
**Context:** Solo developer with coding agent assistance, part-time, timeline-constrained MVP  
**Guiding Principle:** MVP feature-complete first, solid groundwork for mobile frontend reuse

---

## Current State Assessment

### ✅ MVC Refactoring - COMPLETED (Phase 1 & 2)

The following infrastructure and CRUD entities are **already refactored**:

#### Base Infrastructure (`src/backend/common/`)
| Component | Status | Location |
|-----------|--------|----------|
| Base Repository | ✅ Done | `common/repositories/base.repository.ts` |
| Generic CRUD Repository | ✅ Done | `common/repositories/generic-crud.repository.ts` |
| Prisma Base Repository | ✅ Done | `common/repositories/prisma-base.repository.ts` |
| Repository Types | ✅ Done | `common/repositories/types.ts` |
| Base Service | ✅ Done | `common/services/base.service.ts` |
| Error Handler Middleware | ✅ Done | `common/middleware/error-handler.middleware.ts` |
| Validation Middleware | ✅ Done | `common/middleware/validation.middleware.ts` |
| Auth Middleware | ✅ Done | `common/middleware/auth.middleware.ts` |
| Cache Middleware | ✅ Done | `common/middleware/cache.middleware.ts` |
| Quota Middleware | ✅ Done | `common/middleware/quota.middleware.ts` |
| Base DAO | ✅ Done | `common/dao/base.dao.ts` |

#### Zod Validation Schemas (`src/lib/validators/`)
| Schema | Status |
|--------|--------|
| Portfolio schemas | ✅ Done |
| Stock schemas | ✅ Done |
| Thesis schemas | ✅ Done |
| Checklist schemas | ✅ Done |
| Task schemas | ✅ Done |
| Common schemas (UUID, pagination, etc.) | ✅ Done |

#### CRUD Entities - Full MVC Pattern
| Entity | Controller | Service | Repository | Route (Thin) |
|--------|------------|---------|------------|--------------|
| **Portfolio** | ✅ | ✅ | ✅ | ✅ (~120 lines, uses controller) |
| **Stocks** | ✅ | ✅ | ✅ | ✅ (~55 lines, uses middleware + controller) |
| **Thesis** | ✅ | ✅ | ✅ | ✅ (~55 lines, uses middleware + controller) |
| **Checklist** | ✅ | ✅ | ✅ | ✅ (~55 lines, uses middleware + controller) |
| **Tasks** | ✅ | ✅ | ✅ | ✅ (~55 lines, uses middleware + controller) |
| **User** | ✅ | ✅ | ✅ | Partial |
| **News** | ✅ (DAO) | ✅ | — | — |

---

### 🔶 MVC Refactoring - REMAINING (Phase 3)

These routes are still "fat controllers" with direct logic:

| Route | Lines | Current Issues | Priority |
|-------|-------|----------------|----------|
| `/api/ai/chat` | ~220 | 8+ concerns: auth, cache, quota, AI routing, telemetry, error handling | HIGH |
| `/api/user/usage` | ~130 | Calculation logic in route, needs service layer | MEDIUM |
| `/api/risk-metrics` | ~125 | Direct calculations, cache logic in route | MEDIUM |
| `/api/sec-edgar` | ~75 | Already uses service, but needs cleanup | LOW |
| `/api/fundamentals` | ~100 | Already uses service layer, relatively clean | LOW |
| `/api/quote` | ~85 | Already uses service layer, relatively clean | LOW |
| `/api/admin/users` | ~70 | Needs admin service layer | MEDIUM |

---

### 🔴 Frontend Refactoring - NOT STARTED

#### Current State: Client-Side Rendering Heavy

**Pages using `'use client'` (need RSC evaluation):**
- `app/(protected)/dashboard/page.tsx` - **550+ lines**, heavy client logic
- `app/(protected)/thesis/page.tsx`
- `app/(protected)/stocks/[ticker]/page.tsx`
- `app/(protected)/checklist/page.tsx`
- `app/(protected)/fundamentals/page.tsx`
- `app/(protected)/risk/page.tsx`
- `app/(protected)/usage/page.tsx`
- `app/(protected)/settings/page.tsx`
- `app/(protected)/admin-panel/page.tsx`
- `app/(protected)/admin-panel/waitlist/page.tsx`
- `app/(protected)/admin-panel/costs/page.tsx`

**Components using `'use client'`:**
- Layout components: `DashboardLayout.tsx`, `Sidebar.tsx`, `TopNav.tsx`, `Navigation.tsx`
- Modals: `AddStockModal.tsx`, `EditStockModal.tsx`, `PortfolioModal.tsx`
- Interactive: `PortfolioSelector.tsx`, `StrategyAccordion.tsx`, `FinancialStatementTable.tsx`
- AI: `StonksAI.tsx`

**Current Data Fetching Pattern:**
- React Query hooks in `src/lib/hooks/useDatabase.ts`
- Hooks fetch from API routes, not direct RSC data fetching
- This pattern is acceptable for now but leaves room for RSC optimization

---

## Prioritized Refactoring Plan

### Priority Matrix

| Priority | Focus | Rationale |
|----------|-------|-----------|
| **P0 - CRITICAL** | MVP Feature Complete | Must ship working product |
| **P1 - HIGH** | Backend MVC Cleanup | Mobile frontend reuse, testability |
| **P2 - MEDIUM** | Testing Foundation | Confidence for future changes |
| **P3 - LOW** | Frontend RSC Migration | Performance optimization, can defer |

---

## Phase A: MVC Completion (Backend Focus)

### Step A1: AI Chat Service Extraction
**Priority:** HIGH  
**Effort:** 4-6 hours  
**Risk:** LOW (existing route works, we're extracting)

**Current State:** `app/api/ai/chat/route.ts` - 220 lines with 8+ concerns

**Target Structure:**
```
src/backend/modules/ai/
├── ai.controller.ts          # Thin HTTP handling
├── service/
│   ├── chat.service.ts       # Chat orchestration
│   ├── confidence-router.service.ts  # Model selection
│   └── cache.service.ts      # Chat caching
├── dto/
│   └── chat.dto.ts           # Request/response DTOs
└── types.ts
```

**Verification Checklist:**
- [ ] Create `src/backend/modules/ai/` directory structure
- [ ] Extract ChatService with all business logic
- [ ] Create Zod schemas for chat request/response
- [ ] Refactor route to thin controller pattern
- [ ] Test: Chat works exactly as before
- [ ] Test: Cache still works
- [ ] Test: Quota still enforced
- [ ] Test: Telemetry still logged

---

### Step A2: User Usage Service Extraction
**Priority:** MEDIUM  
**Effort:** 2-3 hours  
**Risk:** LOW

**Current State:** `app/api/user/usage/route.ts` - 130 lines with calculation logic

**Target Structure:**
```
src/backend/modules/user/
├── user.controller.ts        # (existing)
├── service/
│   ├── user.service.ts       # (existing)
│   └── usage.service.ts      # NEW: Usage calculations
├── repository/
│   └── user.repository.ts    # (existing)
└── dto/
    └── usage.dto.ts          # Usage response DTO
```

**Verification Checklist:**
- [ ] Create UsageService with calculation logic
- [ ] Create usage response DTO with Zod
- [ ] Refactor route to use service
- [ ] Test: Usage stats display correctly
- [ ] Test: Period calculations correct

---

### Step A3: Risk Metrics Service Extraction
**Priority:** MEDIUM  
**Effort:** 2-3 hours  
**Risk:** LOW

**Target:** Extract calculation logic from route, create proper service

**Verification Checklist:**
- [ ] Create RiskMetricsService
- [ ] Move calculations from route to service
- [ ] Keep existing calculator functions as utilities
- [ ] Test: All risk metrics calculate correctly

---

### Step A4: Admin Service Layer
**Priority:** MEDIUM  
**Effort:** 2-3 hours  
**Risk:** LOW

**Target Structure:**
```
src/backend/modules/admin/
├── admin.controller.ts
├── service/
│   └── admin-user.service.ts
└── dto/
    └── admin-user.dto.ts
```

---

## Phase B: Testing Foundation

### Step B1: Unit Test Setup
**Priority:** MEDIUM  
**Effort:** 3-4 hours

**Deliverables:**
- [ ] Test factories for Portfolio, Stock, Thesis, Checklist, Task
- [ ] Mock utilities for Supabase client
- [ ] Jest configuration updates if needed
- [ ] Example tests for one service (PortfolioService)

### Step B2: Critical Path Integration Tests
**Priority:** MEDIUM  
**Effort:** 4-6 hours

**Focus Areas:**
- [ ] Portfolio CRUD operations
- [ ] Stock CRUD operations
- [ ] AI Chat flow (cache hit, fresh generation)
- [ ] Authentication flow

---

## Phase C: Frontend RSC Migration (Future)

> **NOTE:** This phase is documented for future reference. 
> Do NOT start until Phases A and B are complete and verified.

### Current Architecture Assessment

The frontend currently uses a valid pattern:
1. Client components with React Query
2. API routes as data layer
3. Hooks (`useDatabase.ts`) for data fetching

This pattern is **acceptable for MVP** because:
- ✅ Data fetching is abstracted in hooks
- ✅ React Query handles caching, loading states
- ✅ Easy to understand and maintain
- ✅ Works well with modals, interactive UI

### Future RSC Migration Strategy

When ready to optimize (post-MVP), follow this approach:

#### Principle: Server Fetches, Client Interacts

```tsx
// FUTURE: app/(protected)/dashboard/page.tsx
// This is a SERVER component (no 'use client')

import { prisma } from '@lib/prisma';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  // Server-side data fetching
  const portfolios = await prisma.portfolio.findMany({
    where: { user_id: /* from session */ },
    include: { stocks: true }
  });

  // Pass to client component for interactivity
  return <DashboardClient initialPortfolios={portfolios} />;
}
```

```tsx
// FUTURE: app/(protected)/dashboard/DashboardClient.tsx
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function DashboardClient({ initialPortfolios }: Props) {
  const [selectedId, setSelectedId] = useState(initialPortfolios[0]?.id);
  // Client interactivity, modals, sorting, filtering
  // Use React Query for mutations, not initial data fetch
}
```

#### Migration Order (When Ready)

1. **Layout components** - Low risk, clear benefit
2. **Static pages** (settings, usage stats) - Simple to migrate
3. **Data-heavy pages** (dashboard, thesis) - Biggest benefit, most work
4. **Interactive components** - Stay as client components

---

## Execution Guidelines

### Before Each Step

1. **Create a branch** for the work
2. **Read existing code** thoroughly
3. **Write tests first** if adding new service
4. **Keep backward compatibility** - don't break existing API contracts

### During Each Step

1. **One concern at a time** - don't refactor multiple things together
2. **Test as you go** - manual testing after each significant change
3. **Commit frequently** - small, logical commits
4. **Document decisions** - add JSDoc comments

### After Each Step

1. **Verify all checklist items** before moving on
2. **Run full test suite** (when available)
3. **Manual smoke test** critical paths
4. **Merge and tag** if step is complete

---

## Key Architecture Decisions (Reference)

### 1. Zod Schemas = Public API Contract
- All request/response validation via Zod
- Types inferred from Zod schemas
- Located in `src/lib/validators/schemas.ts` (or domain-specific files)

### 2. Supabase Types = Storage Level Truth
- Auto-generated in `src/lib/supabase/database.types.ts`
- Used by repositories
- Never exposed to API consumers

### 3. Service Layer Responsibilities
- Business logic and orchestration
- DTO transformation (DB model → API response)
- Validation (call Zod schemas)
- Error handling and logging
- Caching decisions

### 4. Controller Layer Responsibilities
- HTTP request/response handling
- Calling service methods
- Standard response formatting
- NO business logic

### 5. Repository Layer Responsibilities
- Database operations only
- Use Supabase client (RLS-protected) for user operations
- Use Prisma (admin) only for system operations
- NO business logic

---

## Quick Reference: What's Done vs What's Left

### ✅ DONE - Do Not Touch Unless Needed
- Base repository/service/middleware infrastructure
- Portfolio, Stocks, Thesis, Checklist, Tasks - full MVC
- Zod validation schemas for all CRUD entities
- API routes using thin controller pattern (5/5 CRUD entities)

### 🔶 IN PROGRESS - Complete These
- AI Chat service extraction (Step A1)
- User Usage service (Step A2)
- Risk Metrics service (Step A3)
- Admin service layer (Step A4)

### 🔴 FUTURE - Don't Start Yet
- Frontend RSC migration
- Comprehensive test suite
- Performance optimization
- Mobile frontend integration

---

## Success Metrics

| Metric | Current | Target (Post-Phase A) | Target (Post-Phase B) |
|--------|---------|----------------------|----------------------|
| Routes with direct DB access | 7/19 | 0/19 | 0/19 |
| Service layer coverage | 60% | 95% | 95% |
| Unit test coverage | ~0% | ~0% | 50%+ |
| Integration test coverage | ~0% | ~0% | 30%+ |

---

## Timeline Estimate

| Phase | Steps | Effort | Calendar Time (Part-time) |
|-------|-------|--------|---------------------------|
| Phase A | A1-A4 | 12-16 hours | 1-2 weeks |
| Phase B | B1-B2 | 7-10 hours | 1 week |
| Phase C | Future | TBD | Post-MVP |

**Total for MVP-ready backend:** ~2-3 weeks part-time

---

## Appendix: File Reference

### New Files to Create (Phase A)

```
src/backend/modules/ai/
├── ai.controller.ts
├── service/
│   └── chat.service.ts
├── dto/
│   └── chat.dto.ts
└── types.ts

src/backend/modules/user/service/
└── usage.service.ts

src/backend/modules/risk/
├── risk.controller.ts
├── service/
│   └── risk-metrics.service.ts
└── dto/
    └── risk-metrics.dto.ts

src/backend/modules/admin/
├── admin.controller.ts
├── service/
│   └── admin-user.service.ts
└── dto/
    └── admin-user.dto.ts
```

### Files to Refactor (Phase A)

```
app/api/ai/chat/route.ts        → Thin controller using ai.controller.ts
app/api/user/usage/route.ts     → Thin controller using user.controller.ts
app/api/risk-metrics/route.ts   → Thin controller using risk.controller.ts
app/api/admin/users/route.ts    → Thin controller using admin.controller.ts
```
