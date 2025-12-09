# Portfolio Tracker - Refactoring Master Plan
## MVP-Focused, Step-by-Step Execution Guide

**Created:** November 30, 2025  
**Last Updated:** November 30, 2025  
**Context:** Solo developer with coding agent assistance, part-time, timeline-constrained MVP  
**Guiding Principle:** MVP feature-complete first, solid groundwork for mobile frontend reuse

---

## Current State Assessment

### ✅ Phase 1 & 2: Base Infrastructure - COMPLETE

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
| Cache Constants | ✅ Done | `common/constants/cache.constants.ts` |
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
| **Portfolio** | ✅ | ✅ | ✅ | ✅ |
| **Stocks** | ✅ | ✅ | ✅ | ✅ |
| **Thesis** | ✅ | ✅ | ✅ | ✅ |
| **Checklist** | ✅ | ✅ | ✅ | ✅ |
| **Tasks** | ✅ | ✅ | ✅ | ✅ |
| **User** | ✅ | ✅ | ✅ | ✅ |
| **News** | ✅ (DAO) | ✅ | — | ✅ |

---

### ✅ Phase A: MVC Completion - COMPLETE

All complex routes have been refactored to use proper MVC layers:

| Step | Route | Status | Structure |
|------|-------|--------|-----------|
| **A1** | `/api/ai/chat` | ✅ Complete | `modules/ai/` - controller, service, cache service, DTOs |
| **A2** | `/api/user/usage` | ✅ Complete | `modules/user/` - controller, usage.service, DTOs |
| **A3** | `/api/risk-metrics` | ✅ Complete | `modules/risk/` - controller, service, DTOs |
| **A4** | `/api/admin/users` | ✅ Complete | `modules/admin/` - controller, users.service, DTOs |

#### Additional Improvements Completed
| Item | Status | Notes |
|------|--------|-------|
| Strict typing in Admin DTO | ✅ | Replaced `z.any()` with `AdminUsageMetric` schema |
| ChatCacheEntry type | ✅ | Fixed `any` type in `chat.service.ts` |
| ErrorResponse normalization | ✅ | Risk controller uses `ErrorResponse.*` wrappers |
| Cache constants deduplication | ✅ | Created `common/constants/cache.constants.ts` |
| SEC Edgar error normalization | ✅ | Uses `ErrorResponse.*` wrappers |
| Telemetry admin auth | ✅ | Telemetry accessed via `/admin/costs` dashboard |
| Waitlist Zod validation | ✅ | Public route uses Zod + `SuccessResponse`/`ErrorResponse` |
| Admin waitlist management | ✅ | GET/DELETE/PATCH with pagination, auth, tests |

---

### ✅ Routes Using Service Layer (No Changes Needed)

These routes already follow best practices:

| Route | Status | Notes |
|-------|--------|-------|
| `/api/fundamentals` | ✅ Clean | Uses `financialDataService`, `stockDataService` |
| `/api/quote` | ✅ Clean | Uses `stockDataService`, normalized responses |
| `/api/commodities/*` | ✅ Clean | Uses `marketDataService` |
| `/api/news/portfolio/[id]` | ✅ Clean | Uses `NewsService`, `portfolioController` |
| `/api/scrape-news` | ✅ Removed | Deprecated endpoint removed (Finnhub service removed in Phase 3) |

---

### ✅ Simple Routes (No Service Layer Needed)

These routes are simple CRUD with no complex business logic:

| Route | Status | Notes |
|-------|--------|-------|
| `/api/waitlist` | ✅ Clean | Public signup, Zod validation, normalized responses |
| `/api/admin/waitlist` | ✅ Clean | Admin CRUD, pagination, auth, integration tests |
| Telemetry | ✅ Clean | Accessed via `/admin/costs` dashboard (RSC pattern) |

**Design Decision:** Simple CRUD routes without complex business logic don't require a service layer. Mobile apps can call these REST endpoints directly.

---

## ✅ Phase B: Testing Foundation - COMPLETE

### Test Coverage Summary

| Module | Unit Tests | Integration Tests | Total Tests |
|--------|------------|-------------------|-------------|
| AI Chat | ✅ `chat.service.test.ts` | ✅ `ai-chat.integration.test.ts` | 9 |
| AI Cache | ✅ `chat-cache.service.test.ts` | — | 5 |
| User Usage | ✅ `usage.service.test.ts` | ✅ `user-usage.integration.test.ts` | 12 |
| Risk Metrics | ✅ `risk.service.test.ts` | ✅ `risk.integration.test.ts` | 13 |
| Admin Users | ✅ `users.service.test.ts` | ✅ `admin-users.integration.test.ts` | 8 |
| Admin Waitlist | — (simple CRUD) | ✅ `admin-waitlist.integration.test.ts` | 12 |
| Portfolio | — | ✅ `portfolio.test.ts` | — |
| Stocks | — | ✅ `stocks.test.ts` | — |
| Thesis | — | ✅ `thesis.test.ts` | — |
| Checklist | — | ✅ `checklist.test.ts` | — |
| Tasks | — | ✅ `tasks.test.ts` | — |

**Current Status:** 188 tests passing across 26 test suites

### Test Infrastructure
- ✅ Jest configuration with path aliases
- ✅ `extractJSON` helper for NextResponse parsing
- ✅ Mock utilities for Supabase, Prisma, auth
- ✅ Integration test patterns established

---

## 🔴 Phase C: Frontend RSC Migration - FUTURE

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
- `app/(protected)/admin/page.tsx`
- `app/(protected)/admin/waitlist/page.tsx`
- `app/(protected)/admin/costs/page.tsx`

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

### ✅ DONE - Complete
- Base repository/service/middleware infrastructure
- Portfolio, Stocks, Thesis, Checklist, Tasks - full MVC
- Zod validation schemas for all CRUD entities
- API routes using thin controller pattern (5/5 CRUD entities)
- **Phase A:** AI Chat, User Usage, Risk Metrics, Admin Users - full MVC
- **Phase B:** 188 tests passing across 26 test suites
- Utility routes: SEC Edgar, Telemetry, Waitlist - normalized

### 🔴 FUTURE - Not Started
- Frontend RSC migration
- Performance optimization
- Mobile frontend integration

---

## Success Metrics

| Metric | Current | Status |
|--------|---------|--------|
| Routes with direct DB access | 0/19 | ✅ Target met |
| Service layer coverage | 95% | ✅ Target met |
| Test suites | 26 | ✅ Comprehensive |
| Total tests passing | 188 | ✅ All passing |

---

## Timeline Summary

| Phase | Status | Effort |
|-------|--------|--------|
| Phase A (MVC Completion) | ✅ COMPLETE | ~16 hours |
| Phase B (Testing Foundation) | ✅ COMPLETE | ~10 hours |
| Phase C (Frontend RSC) | 🔴 FUTURE | TBD |

**Backend refactoring complete!** Ready for mobile frontend integration.

---

## Appendix: Module Structure Reference

### Completed MVC Modules

```
src/backend/modules/
├── ai/
│   ├── ai.controller.ts
│   ├── service/
│   │   ├── chat.service.ts
│   │   └── chat-cache.service.ts
│   ├── dto/
│   │   └── chat.dto.ts
│   └── __tests__/
│       ├── ai-chat.integration.test.ts
│       ├── chat.service.test.ts
│       └── chat-cache.service.test.ts
├── user/
│   ├── user.controller.ts
│   ├── service/
│   │   ├── user.service.ts
│   │   └── usage.service.ts
│   ├── dto/
│   │   └── usage.dto.ts
│   └── __tests__/
│       ├── user-usage.integration.test.ts
│       └── usage.service.test.ts
├── risk/
│   ├── risk.controller.ts
│   ├── service/
│   │   └── risk.service.ts
│   ├── dto/
│   │   └── risk.dto.ts
│   └── __tests__/
│       ├── risk.integration.test.ts
│       └── risk.service.test.ts
├── admin/
│   ├── admin.controller.ts
│   ├── service/
│   │   └── users.service.ts
│   ├── dto/
│   │   └── admin.dto.ts
│   └── __tests__/
│       ├── admin-users.integration.test.ts
│       ├── admin-waitlist.integration.test.ts
│       └── users.service.test.ts
└── common/
    └── constants/
        └── cache.constants.ts
```
