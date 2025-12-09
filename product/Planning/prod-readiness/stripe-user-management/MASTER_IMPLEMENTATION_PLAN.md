# Master Implementation Plan

**Status:** 📋 Planning  
**Created:** December 5, 2025  
**Timeline:** 4-5 weeks

---

## Executive Summary

This plan covers the complete implementation of production-ready Stripe integration, user management, pricing page integration, and rate limiting. The goal is to enable a complete user journey from marketing page to paid subscription with reliable, fault-tolerant payment processing.

---

## Key Principles

| Principle | Description |
|-----------|-------------|
| **Supabase First** | Database schema defined in Supabase; Prisma derives from it |
| **RLS Security** | All user data protected by Row Level Security policies |
| **Fault Tolerance** | Stripe operations use idempotency keys to prevent duplicates |
| **Admin Visibility** | Full billing history, error states, and manual correction steps |
| **Rate Limiting** | Protection against abuse and runaway costs |

---

## Phase Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Implementation Phases                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   Week 1: Database & Foundation                                          │
│   ├── Database schema migrations                                         │
│   ├── RLS policies                                                       │
│   ├── Prisma sync                                                        │
│   └── Rate limiting service                                              │
│                                                                          │
│   Week 2: Stripe Hardening                                               │
│   ├── Idempotency keys                                                   │
│   ├── Transaction logging                                                │
│   ├── Webhook deduplication                                              │
│   └── Enhanced event handlers                                            │
│                                                                          │
│   Week 3: Pricing & Landing Pages                                        │
│   ├── Pricing page implementation                                        │
│   ├── Landing page integration                                           │
│   ├── Checkout flow                                                      │
│   └── Post-auth redirect                                                 │
│                                                                          │
│   Week 4: Admin User Management                                          │
│   ├── User list API & UI                                                 │
│   ├── User detail view                                                   │
│   ├── Admin actions (refund, cancel, etc.)                               │
│   └── Audit logging                                                      │
│                                                                          │
│   Week 5: Testing & Documentation                                        │
│   ├── Unit tests                                                         │
│   ├── Integration tests                                                  │
│   ├── E2E tests                                                          │
│   └── Documentation updates                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Week-by-Week Plan

### Week 1: Database & Foundation

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | Database migrations | `003_stripe_user_management.sql` |
| 2 | RLS policies | `004_stripe_rls_policies.sql` |
| 3 | Prisma sync | Updated `schema.prisma` |
| 4 | Rate limit service | `src/lib/rate-limit/` |
| 5 | Rate limit middleware | Integrated with AI endpoint |

**Dependencies:** None  
**Owner:** Backend Engineer  
**Docs:** `DATABASE_SCHEMA_CHANGES.md`, `RATE_LIMITING_IMPLEMENTATION.md`

### Week 2: Stripe Hardening

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | Idempotency keys | Updated `client.ts`, `checkout/route.ts` |
| 2 | Transaction logging | `stripe_transactions` table integration |
| 3 | Webhook deduplication | Event ID checking |
| 4 | Enhanced handlers | All webhook event handlers |
| 5 | Error recovery APIs | Sync subscription API |

**Dependencies:** Week 1 (database)  
**Owner:** Backend Engineer  
**Docs:** `STRIPE_INTEGRATION_GUIDE.md`

### Week 3: Pricing & Landing Pages

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | Pricing config | `src/lib/pricing/tiers.ts` |
| 2 | Pricing page | Updated `/pricing` page |
| 3 | PricingCard component | `components/pricing/` |
| 4 | Landing page integration | Pricing section on landing |
| 5 | Checkout flow | Post-auth redirect handling |

**Dependencies:** Week 2 (Stripe APIs working)  
**Owner:** Frontend Engineer  
**Docs:** `STRIPE_INTEGRATION_GUIDE.md`

### Week 4: Admin User Management

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | User list API | `/api/admin/users` |
| 2 | User detail API | `/api/admin/users/[userId]` |
| 3 | Admin actions APIs | Refund, cancel, deactivate, etc. |
| 4 | User list UI | `/admin/users` page |
| 5 | User detail UI | `/admin/users/[userId]` page |

**Dependencies:** Week 1 (database), Week 2 (Stripe)  
**Owner:** Full Stack Engineer  
**Docs:** `ADMIN_USER_MANAGEMENT.md`

### Week 5: Testing & Documentation

| Day | Task | Deliverables |
|-----|------|--------------|
| 1 | Unit tests | Tests for all new services |
| 2 | Integration tests | Stripe webhook tests |
| 3 | E2E tests | Full checkout flow tests |
| 4 | Admin E2E tests | User management tests |
| 5 | Documentation | Updated docs, cleanup |

**Dependencies:** All previous weeks  
**Owner:** QA / Full Stack Engineer

---

## Critical Path

```
Database Schema ─▶ RLS Policies ─▶ Prisma Sync ─▶ Stripe Hardening
                                                        │
                                                        ▼
                                    ┌──────────────────────────────────┐
                                    │                                  │
                                    ▼                                  ▼
                            Pricing Pages              Admin User Management
                                    │                                  │
                                    │                                  │
                                    └──────────────┬───────────────────┘
                                                   │
                                                   ▼
                                               Testing
```

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe API changes | 🟡 Medium | Use stable API version, monitor deprecations |
| Webhook delivery failures | 🔴 High | Idempotency, manual sync API, logging |
| Duplicate charges | 🔴 Critical | Idempotency keys on all mutations |
| RLS policy errors | 🔴 High | Thorough testing, admin bypass |
| Rate limit false positives | 🟡 Medium | Fail open, generous limits |

---

## Environment Variables Required

```env
# Stripe (already configured)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# New: Public Price IDs (for frontend)
NEXT_PUBLIC_STRIPE_PRICE_BASIC_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_BASIC_ANNUAL=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_ANNUAL=price_xxx

# Rate Limiting (uses existing Vercel KV)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
```

---

## Success Criteria

### MVP (End of Week 3)
- [ ] User can complete full checkout flow
- [ ] Webhooks update user tier correctly
- [ ] No duplicate charges possible
- [ ] Pricing page integrated with landing

### Complete (End of Week 5)
- [ ] Admin can view all users with billing info
- [ ] Admin can refund, cancel, extend trials
- [ ] All admin actions logged
- [ ] Error states show manual correction steps
- [ ] Rate limiting active on AI endpoints
- [ ] 80%+ test coverage on new code

---

## Quick Reference: Files to Create

### Database
- `src/backend/database/supabase/migrations/003_stripe_user_management.sql`
- `src/backend/database/supabase/migrations/004_stripe_rls_policies.sql`

### Rate Limiting
- `src/lib/rate-limit/index.ts`
- `src/lib/rate-limit/rate-limiter.ts`
- `src/lib/rate-limit/middleware.ts`
- `src/lib/rate-limit/__tests__/rate-limiter.test.ts`

### Pricing
- `src/lib/pricing/tiers.ts`
- `components/pricing/PricingCard.tsx`
- `components/pricing/BillingToggle.tsx`

### Admin
- `app/api/admin/users/route.ts`
- `app/api/admin/users/[userId]/route.ts`
- `app/api/admin/users/[userId]/refund/route.ts`
- `app/api/admin/users/[userId]/cancel-subscription/route.ts`
- `app/api/admin/users/[userId]/extend-trial/route.ts`
- `app/api/admin/users/[userId]/deactivate/route.ts`
- `app/api/admin/users/[userId]/sync-subscription/route.ts`
- `app/(protected)/admin/users/page.tsx`
- `app/(protected)/admin/users/[userId]/page.tsx`

### Stripe Updates
- `src/backend/modules/stripe/webhook-handlers.ts`
- Updated `src/lib/stripe/client.ts`
- Updated `src/backend/modules/stripe/stripe.service.ts`

---

## How to Start

1. **Read the documentation** in this folder in order:
   - `DATABASE_SCHEMA_CHANGES.md`
   - `RATE_LIMITING_IMPLEMENTATION.md`
   - `STRIPE_INTEGRATION_GUIDE.md`
   - `ADMIN_USER_MANAGEMENT.md`

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/stripe-user-management
   ```

3. **Start with database migrations:**
   - Apply Supabase migrations
   - Run `npx prisma db pull`
   - Run `npx prisma generate`

4. **Proceed through weeks in order**

---

## Questions?

If any aspect of this plan is unclear, please discuss before implementation. Key decisions:

1. **Trial length:** Currently 14 days for all paid tiers. Change?
2. **Annual pricing:** Currently ~17% discount. Adjust?
3. **Rate limits:** Currently 20/min for AI. Too restrictive?
4. **Admin permissions:** Who should have admin access?
