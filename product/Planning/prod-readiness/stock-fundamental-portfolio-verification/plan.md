# Stock, Fundamental & Portfolio Value Verification Plan

**Created:** December 5, 2025  
**Status:** Planning  
**Goal:** Pre-production readiness for all stock, fundamental, and portfolio data

---

## Objective

Ensure all stock, fundamental, and portfolio values are present, accurate, and reliable using the new orchestrator/provider system. Emphasize robust testing, error handling, and reliability.

---

## Current State (as of Phase 3)

### Active Data Providers
| Provider         | Type             | Cost      | API Key | Status         |
|------------------|------------------|-----------|---------|----------------|
| **Tiingo**       | Stock Quotes     | $10/mo    | ✅ Yes  | PRIMARY        |
| **Yahoo Finance**| Stock Quotes     | Free      | ❌ No   | FALLBACK       |
| **Alpha Vantage**| Commodities      | Free tier | ✅ Yes  | Active         |
| **SEC EDGAR**    | Filings          | Free      | ❌ No   | Active         |

### Key Files
- `src/backend/modules/stocks/dao/tiingo.dao.ts` — Tiingo DAO (primary)
- `src/backend/modules/stocks/dao/yahoo-finance.dao.ts` — Yahoo Finance DAO (fallback)
- `src/backend/modules/stocks/dao/alpha-vantage.dao.ts` — Alpha Vantage DAO (commodities)
- `src/backend/modules/stocks/service/stock-data.service.ts` — Orchestrator pattern
- `src/lib/data-sources/provider-adapters.ts` — Provider adapters
- `app/api/fundamentals/route.ts` — Fundamentals API route
- `app/api/portfolio/route.ts` — Portfolio API route
- `app/api/stocks/route.ts` — Stocks API route

---

## Steps

### 1. Audit Data Flows
- [ ] Review all API routes and services for stock, fundamental, and portfolio values.
- [ ] Confirm use of orchestrator pattern (Tiingo primary, Yahoo fallback) in `stock-data.service.ts`.
- [ ] Verify all required fundamental metrics (30+, Burry-style) are present in API responses.
- [ ] Check portfolio values (total value, day P&L, return, margin usage) are computed correctly.

### 2. Identify Data Gaps
- [ ] Run integration tests and manual checks for missing/null/incorrect values.
- [ ] Log and categorize all issues found (e.g., missing P/E, null price, stale data).
- [ ] Cross-reference with PRD (9 core valuation ratios, intrinsic value, 5-year averages, sector/S&P 500 comparisons).

### 3. Error Handling Improvements
- [ ] Ensure all DAOs/services have null checks, fallback logic, and clear error messages.
- [ ] Add logging for provider failures and fallback events (see Phase 3 bug fixes for examples).
- [ ] Validate that `age` property handling and null checks are in place (ref: `app/api/fundamentals/route.ts` fix).
- [ ] Return user-friendly error messages (no raw technical errors).

### 4. Testing
- [ ] Expand unit/integration tests for all DAOs, services, and orchestrator logic.
- [ ] Add edge case tests (e.g., provider downtime, partial data, stale cache).
- [ ] Use mock data to simulate provider failures.
- [ ] Ensure all 474+ tests pass, including new edge/failure cases.
- [ ] Reference test files:
  - `src/backend/modules/stocks/dao/__tests__/tiingo.dao.test.ts`
  - `src/lib/data-sources/__tests__/provider-adapters.test.ts`
  - `src/lib/config/__tests__/providers.test.ts`

### 5. Reliability Verification
- [ ] Monitor error logs and test coverage reports after each change.
- [ ] Perform load testing and simulate high-frequency requests (see `load-tests/` folder).
- [ ] Validate cache refresh and data update intervals (tier-based TTL, stale cache fallback).
- [ ] Run build (`npm run build`) and full test suite (`npm test`) before marking complete.

### 6. Acceptance Criteria
- [ ] 100% of required values present for all supported stocks/portfolios.
- [ ] All tests passing, including edge/failure cases.
- [ ] No unhandled errors in logs.
- [ ] Documented fallback and error handling strategy.
- [ ] All metrics update within 15 min of market data (per PRD).
- [ ] Build and test suite green.

---

---

## MVC/Layer Separation Pattern (Mandatory)

All new or modified code MUST follow the strict 5-layer architecture:

```
API Route → Middleware Stack → Controller Class → Service Layer → DAO Layer
   ↓            ↓                    ↓                 ↓            ↓
  HTTP      Auth/Quota/         HTTP Logic       Business      Database
  Entry     Validation                           Logic         Access
```

### Layer Responsibilities

| Layer       | Location                                              | Allowed                                      | Forbidden                                  |
|-------------|-------------------------------------------------------|----------------------------------------------|--------------------------------------------|
| **Route**   | `app/api/*`                                           | Receive request, delegate to controller      | Business logic, validation, DB access      |
| **Controller** | `src/backend/modules/[feature]/[feature].controller.ts` | Extract, call service, format response       | Business logic, validation, DB access      |
| **Service** | `src/backend/modules/[feature]/service/*.service.ts`  | Business rules, orchestration, external APIs | HTTP concerns, direct DB queries           |
| **DAO**     | `src/backend/modules/[feature]/dao/*.dao.ts`          | DB queries, ORM, data mapping                | Business logic                             |
| **Middleware** | `src/backend/common/middleware/`                   | Auth, validation, quota, error handling      | Business logic                             |

### Example: Tiingo Route (Reference)

- **Route:** `app/api/quote/route.ts` — thin wrapper, calls controller
- **Controller:** `src/backend/modules/stocks/stocks.controller.ts`
- **Service:** `src/backend/modules/stocks/service/stock-data.service.ts`
- **DAO:** `src/backend/modules/stocks/dao/tiingo.dao.ts`

**Anti-patterns:**
- ❌ Business logic in route or controller
- ❌ Direct DB access in route/controller/service
- ❌ Validation in controller (use middleware)

---

## References
- PRD: `product/PRD/Portfolio_Platform_PRD_v1.0.md`
- Feature Roadmap: `product/Planning/roadmap/FEATURE_ROADMAP.md`
- Phase 3 Completion: `product/Planning/archive/refactoring/production-readiness-v1/PHASE_3_COMPLETION_SUMMARY.md`
- CLAUDE.md: `CLAUDE.md` (coding guidelines)
- AI Coding Agent Guide: `docs/0_AI_Coding_Agent_Guide.md` (layer separation, MVC pattern)

---

## RSC/Server Actions Refactoring (Pre-prod Scope)

For all paths touched in this plan, ensure:
- Pages under `app/(protected)/dashboard/`, `app/(protected)/stocks/`, `app/(protected)/fundamentals/` are **Server Components** by default.
- Data fetching occurs in Server Components, not Client Components.
- Client Components are used only for interactivity (sorting, filtering, modals).
- Where mutations are needed, prefer **Server Actions** over API routes.
- All Server Actions include Zod validation and use `revalidatePath` for cache invalidation.

### Pages/Routes to Migrate (Quick Reference)

| Page/Route                                      | Current           | Target (RSC/Server Action)         | Notes                                  |
|-------------------------------------------------|-------------------|------------------------------------|----------------------------------------|
| `app/(protected)/dashboard/page.tsx`            | Client Component  | Server Component + Client interactivity | Data fetch in RSC, interactivity in CC |
| `app/(protected)/stocks/[ticker]/page.tsx`      | Client Component  | Server Component + Client interactivity | Stock detail, fundamentals, news       |
| `app/(protected)/fundamentals/page.tsx`         | Client Component  | Server Component + Client interactivity | Fundamentals data fetched in RSC       |
| `app/(protected)/risk/page.tsx`                 | Client Component  | Server Component + Client interactivity | Risk metrics fetched in RSC            |
| `components/PortfolioSelector.tsx`              | Client Component  | Client Component (interactivity)   | Keep as CC for dropdown/selection      |
| `components/EditStockModal.tsx`                 | Client Component  | Server Action for mutation         | Use Server Action for save             |
| `components/AddStockModal.tsx`                  | Client Component  | Server Action for mutation         | Use Server Action for add              |

**Post-MVP:** Full RSC/Server Actions refactoring is tracked in `product/Planning/post-mvp/RSC_SERVER_ACTIONS_REFACTOR.md`.

---

## Next Steps
1. Run all tests and build to establish baseline.
2. Audit each API route for data completeness.
3. Add/expand tests for any gaps found.
4. Fix any missing/null values or error handling issues.
5. Refactor touched pages to RSC/Server Actions where feasible.
6. Document all changes and update this plan as complete.
