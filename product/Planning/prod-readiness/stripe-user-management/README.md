# Stripe Integration & User Management

**Status:** 🚧 In Progress - MVC Architecture Complete, All Tests Passing ✅
**Created:** December 5, 2025
**Last Updated:** December 6, 2025

---

## Overview

This folder contains planning documentation for production-ready Stripe integration and admin user management features.

**Current Progress:** ~35% - Phase 1 Complete + Admin MVC Architecture Complete (562/562 tests passing)

## Quick Links

- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - 📋 **Latest implementation details & next steps**
- **[STATUS.md](./STATUS.md)** - 📊 Current implementation status & remaining tasks
- **[MASTER_IMPLEMENTATION_PLAN.md](./MASTER_IMPLEMENTATION_PLAN.md)** - Master plan & timeline
- **Completed Work:** See `product/Planning/archive/refactoring/stripe-pricing-integration/`

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | **Latest implementation details (Dec 6)** | ✅ Current |
| [STATUS.md](./STATUS.md) | **Implementation status tracker** | 🚧 Active |
| [MASTER_IMPLEMENTATION_PLAN.md](./MASTER_IMPLEMENTATION_PLAN.md) | Master plan & 5-week timeline | 📋 Planning |
| [DATABASE_SCHEMA_CHANGES.md](./DATABASE_SCHEMA_CHANGES.md) | Supabase schema & RLS policies | ✅ Defined (not applied) |
| [STRIPE_PRODUCTION_PLAN.md](./STRIPE_PRODUCTION_PLAN.md) | Fault-tolerant Stripe integration | 🚧 Partial |
| [RATE_LIMITING_IMPLEMENTATION.md](./RATE_LIMITING_IMPLEMENTATION.md) | Rate limiting implementation | 📋 Not Started |
| [PRICING_LANDING_INTEGRATION.md](./PRICING_LANDING_INTEGRATION.md) | Pricing & landing page integration | 📋 Not Started |
| [ADMIN_USER_MANAGEMENT.md](./ADMIN_USER_MANAGEMENT.md) | Admin panel user management | 🚧 In Progress |

## Phase Status

| Phase | Status | Deliverables |
|-------|--------|--------------|
| **1. Pricing Configuration** | ✅ Complete | Canonical config, server-only price IDs, build validation |
| **2. Database Schema & RLS** | 🚧 In Progress | ✅ Migrations defined, ⏳ Not applied to Supabase |
| **3. Stripe Hardening** | 🚧 In Progress | ✅ Service layer, ✅ Webhook handlers, ⏳ DAO layer needed |
| **4. Pricing & Landing Pages** | 📋 Not Started | UI components, checkout flow |
| **5. Admin User Management** | 🚧 In Progress | ✅ MVC architecture, ✅ Main API route, ⏳ Remaining routes, ⏳ RSC conversion |
| **6. Testing & Documentation** | 🚧 In Progress | ✅ All tests passing (562/562), ⏳ New tests needed |

### Recent Accomplishments (Dec 6, 2025)

- ✅ **Admin MVC Architecture Complete** - Full DAO/Service/Controller separation
- ✅ **All Tests Passing** - 562/562 tests green
- ✅ **Documentation Enhanced** - MVC and RSC patterns documented
- ✅ **API Routes Fixed** - Standardized response format
- ✅ **Database Migrations Defined** - Ready to apply to Supabase

## Key Principles

1. **Supabase as Source of Truth** - Database schema defined in Supabase, Prisma derives from it
2. **RLS for Security** - All user data protected by Row Level Security policies
3. **Fault Tolerance** - Stripe operations must be idempotent and resilient to network errors
4. **Admin Visibility** - Full billing history, error states, and manual correction steps
5. **Rate Limiting** - Protection against abuse and runaway costs

## Timeline

| Week | Focus | Key Deliverables |
|------|-------|------------------|
| 1 | Database & Foundation | Schema, RLS, Rate Limiting |
| 2 | Stripe Hardening | Idempotency, Logging, Handlers |
| 3 | Pricing Pages | Pricing page, Landing integration |
| 4 | Admin Panel | User management, Billing details |
| 5 | Testing | Unit, Integration, E2E tests |

## Quick Start

**For New Work:**
1. Read `IMPLEMENTATION_SUMMARY.md` for current status and detailed next steps
2. Review `README.md` (this file) for architectural patterns
3. Follow the MVC/Layer Separation Pattern (below) for all new code

**For Continuing Implementation:**
1. See "Next Steps (Priority Order)" section below
2. Apply database migrations first (Phase 2)
3. Update remaining admin API routes (Phase 1)

## Dependencies

- Phase 4 Testing & Hardening (in progress)
- Rate Limiting Plan (documented in `QUOTA_VS_RATE_LIMITING.md`)
- Existing Stripe infrastructure (`src/lib/stripe/`, `app/api/stripe/`)

---

## Next Steps (Priority Order)

### ⏭️ Immediate Next Steps

1. **Apply Database Migrations** (30 min)
   - Apply `003_stripe_user_management.sql` in Supabase dashboard
   - Apply `004_stripe_rls_policies.sql` in Supabase dashboard
   - Run `npx prisma db pull` and `npx prisma generate`

2. **Update Remaining Admin API Routes** (1-2 hours)
   - Update 10 routes in `app/api/admin/users/[userId]/*` to use controller
   - Remove direct database access
   - Ensure all routes use `requireAdmin()` middleware

3. **Convert Admin Panel to RSC** (2-3 hours)
   - Convert `app/(protected)/admin-panel/users/page.tsx` to Server Component
   - Convert `app/(protected)/admin-panel/users/[userId]/page.tsx` to Server Component
   - Create Client Components for filters/interactivity only

### 📊 Detailed Roadmap

See `IMPLEMENTATION_SUMMARY.md` for:
- Complete next steps with time estimates
- Files that need updating
- Testing requirements
- Known issues and technical debt

**Estimated Time to Production-Ready:** 8-12 hours

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

### Example: Stripe/Admin Routes (Reference)

- **Route:** `app/api/admin/users/route.ts` — thin wrapper, calls controller
- **Controller:** `src/backend/modules/admin/admin.controller.ts` — HTTP logic
- **Service:** `src/backend/modules/admin/service/admin.service.ts` — business rules
- **DAO:** `src/backend/modules/admin/dao/admin.dao.ts` — database queries

**Anti-patterns:**
- ❌ Business logic in route or controller
- ❌ Direct DB access in route/controller
- ❌ Validation in controller (use middleware or Zod at route level)
- ❌ HTTP concerns (req/res) in service layer

### Current Implementation Gaps

The following code currently violates MVC pattern and needs refactoring:

1. **Admin APIs** (`app/api/admin/users/*`):
   - ❌ Direct Supabase calls in routes
   - ❌ No controller layer
   - ❌ No service layer for business logic
   - ❌ No DAO layer for data access

2. **Stripe Service** (`src/backend/modules/stripe/stripe.service.ts`):
   - ✅ Service layer exists
   - ❌ No DAO layer for `stripe_transactions` queries
   - ✅ Good separation from HTTP concerns

3. **Admin Panel UI** (`app/(protected)/admin-panel/users/page.tsx`):
   - ❌ Client Component with `useEffect` for data fetching
   - ❌ Should be Server Component with direct data fetching

---

## RSC/Server Actions Refactoring (Pre-prod Scope)

For all paths touched in this plan, ensure:
- Admin panel pages under `app/(protected)/admin-panel/` are **Server Components** for data fetching.
- Client Components are used only for interactivity (filtering, form actions, modals).
- Where mutations are needed (deactivate user, refund, etc.), prefer **Server Actions** over API routes.
- All Server Actions include Zod validation and use `revalidatePath` for cache invalidation.

### Pages/Routes to Migrate (Quick Reference)

| Page/Route                                      | Current           | Target (RSC/Server Action)         | Notes                                  |
|-------------------------------------------------|-------------------|------------------------------------|----------------------------------------|
| `app/(protected)/admin-panel/users/page.tsx`    | Client Component  | Server Component + Client interactivity | User list fetched in RSC               |
| `app/(protected)/admin-panel/users/[userId]/page.tsx` | Client Component  | Server Component + Client interactivity | User detail fetched in RSC             |
| `app/(public)/pricing/page.tsx`                 | Mixed             | Server Component (pricing data) + Client (checkout) | Pricing tier data from server |
| `components/pricing/*`                          | To be created     | Server Components where possible   | PricingCard can be server component    |

### Migration Strategy

1. **Phase 1: Convert Admin Panel to RSC**
   - Move data fetching from `useEffect` to Server Component `async` functions
   - Use `createAdminClient()` directly in Server Components
   - Pass data as props to Client Components for interactivity

2. **Phase 2: Implement Server Actions for Mutations**
   - Create `actions/admin.ts` for admin actions (deactivate, reactivate, etc.)
   - Replace `fetch('/api/admin/users/...')` with Server Action calls
   - Add Zod validation and error handling in actions
   - Use `revalidatePath` to invalidate cache after mutations

3. **Phase 3: Optimize API Routes**
   - Keep API routes only for external/third-party integrations
   - Use Server Actions for internal mutations
   - Maintain thin wrapper pattern for remaining API routes

**Post-MVP:** Full RSC/Server Actions refactoring tracked separately.

---

## Code Quality Checklist

Before marking any phase as complete, verify:

### Path Aliases
- [ ] All imports use `@/` or `@lib/` path aliases (no `../../../`)
- [ ] `src/backend/*` imports use `@/src/backend/` or relative within backend
- [ ] `src/lib/*` imports use `@lib/`
- [ ] `components/*` imports use `@/components/`

### Layer Separation
- [ ] API routes contain ONLY: receive request → delegate → return response
- [ ] Controllers contain ONLY: extract params → call service → format response
- [ ] Services contain business logic, no HTTP concerns
- [ ] DAOs contain only database queries, no business logic

### Error Handling
- [ ] All routes return consistent error format: `{ error: string }` or `{ success: boolean, data?, error? }`
- [ ] Admin routes return 403 for non-admin, not 401
- [ ] All database errors are caught and logged
- [ ] User-facing errors are sanitized (no stack traces)

### Security
- [ ] RLS policies verified for all new tables
- [ ] Admin routes check `is_admin` flag
- [ ] No sensitive data in client-side code
- [ ] Stripe webhook signature verification
- [ ] Idempotency keys on all Stripe mutations

### Testing
- [ ] Unit tests for all new services/DAOs
- [ ] Integration tests for all new API routes
- [ ] Test response format matches expected schema
- [ ] Test error cases (unauthorized, not found, invalid input)

---

## References

- PRD: `product/PRD/Portfolio_Platform_PRD_v1.0.md`
- AI Coding Agent Guide: `docs/0_AI_Coding_Agent_Guide.md` (layer separation, MVC pattern)
- CLAUDE.md: `CLAUDE.md` (coding guidelines, path aliases)
- Development Guidelines: `docs/5_Guides/DEVELOPMENT_GUIDELINES.md`

