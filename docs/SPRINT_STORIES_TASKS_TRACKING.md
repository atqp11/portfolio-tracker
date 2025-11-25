# 📋 Sprint Stories & Tasks Tracking

> **📖 PURPOSE:** Current sprint work items, active tasks, and immediate development priorities.
> **WHEN TO USE:** Daily development work - check this for what to work on next, track progress, update status.
> **UPDATE FREQUENCY:** Daily or as tasks are completed/added during active development.
> **AUDIENCE:** Active developers, project managers, sprint planners.

**Last Updated:** November 22, 2025
**Status:** 40-50% Complete | **CRITICAL: Auth/User Tiers + AI Features must be done before MVP Launch**

---


## 🔴 CRITICAL (Must Do Before MVP Launch)

### 1. Authentication System ✅ **COMPLETE**
**Why:** Required for user tiers, monetization, and multi-user support
**Time:** 8-12 hours → **Actual: ~10 hours**
**Blocker:** No (but blocks items 2-3)
**Priority:** **HIGH**
**Status:** Email auth and Google OAuth fully functional

**Tasks:**
- [x] Choose auth provider: Supabase ✅
  - Selected Supabase for database + auth in one platform
  - 50K MAU free tier
  - Open source, self-hostable
- [x] Install Supabase: `npm install @supabase/supabase-js @supabase/ssr` ✅
- [x] Set up authentication configuration ✅
  - Created `lib/supabase/client.ts` (browser client)
  - Created `lib/supabase/server.ts` (server client)
  - Created `lib/supabase/db.ts` (database helpers)
  - Created `lib/auth/session.ts` (session management)
- [x] Create sign-up/sign-in pages ✅
  - `/auth/signup` - Email/password signup with glassmorphism design
  - `/auth/signin` - Email/password signin with animated background
  - `/auth/callback` - OAuth callback handler
- [x] Add protected route middleware ✅
  - `requireUser()` - Redirect if not authenticated
  - `requireUserProfile()` - Require authenticated profile
  - `requireTier()` - Require specific tier
- [x] Create user session management ✅
  - `getUser()`, `getUserProfile()`, `userHasTier()`, `signOut()`
- [x] Add user profile to database (Prisma schema) ✅
  - User model with tier support (free/pro/premium)
  - UsageTracking model
  - Database trigger creates profile on user signup
- [x] Test authentication flow (sign up, sign in, sign out) ✅
- [x] Add authentication to API routes ✅
  - All routes can use `getUser()` for auth checks

**OAuth Integration:**
- [x] Enable Google OAuth in Supabase dashboard ✅
  - [x] Get Google Cloud credentials ✅
  - [x] Configure in Supabase → Authentication → Providers ✅
  - [x] Add Google sign-in button to `/auth/signin` and `/auth/signup` ✅
  - [x] Test Google OAuth flow ✅

**Database Schema:** ✅ **COMPLETE**
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  tier      String   @default("free") // "free" | "pro" | "premium"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  portfolios Portfolio[]
  usage      UsageTracking[]
}
```

---

### 2. User Tier Management & Quota System
**Why:** Enable monetization, control AI costs, prevent abuse
**Time:** 10-15 hours
**Blocker:** Item 1 (Authentication)
**Priority:** **HIGHEST**

**Tasks:**
- [ ] Database-backed usage tracking (replace in-memory)
  - [ ] Create `UsageTracking` model in Prisma schema
  - [ ] Migrate existing in-memory logic to database
  - [ ] Add daily/monthly reset logic
- [ ] Integrate quota checks into AI chat route (`/api/ai/chat`)
  - [ ] Check user tier before processing request
  - [ ] Return 429 when quota exceeded
  - [ ] Add "Upgrade to Pro" message in error response
- [ ] Create user dashboard (`/dashboard/usage`)
  - [ ] Display current tier and quota limits
  - [ ] Show quota consumption (progress bars)
  - [ ] Add usage graphs (daily/weekly trends)
  - [ ] "Upgrade" button when approaching limits
- [ ] Tier badge in UI (show "Free", "Pro", "Premium")
- [ ] Email notifications for quota warnings
  - [ ] 80% quota used
  - [ ] 100% quota exceeded
- [ ] Admin panel for tier management
  - [ ] View all users and their tiers
  - [ ] Manually adjust tiers (for testing/support)
  - [ ] View usage statistics by tier

**Prisma Schema Updates:**
```prisma
model UsageTracking {
  id              String   @id @default(cuid())
  userId          String
  tier            String
  chatQueries     Int      @default(0)
  portfolioAnalysis Int    @default(0)
  secFilings      Int      @default(0)
  periodStart     DateTime
  periodEnd       DateTime
  createdAt       DateTime @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([periodStart, periodEnd])
}
```

---

### 3. Payment Integration (Stripe)
**Why:** Collect revenue from Pro/Premium users
**Time:** 12-16 hours
**Blocker:** Items 1-2 (Auth + Tiers)
**Priority:** **HIGH**

**Tasks:**
- [ ] Create Stripe account and get API keys
- [ ] Install Stripe SDK: `npm install stripe @stripe/stripe-js`
- [ ] Create Stripe products for Pro ($9.99) and Premium ($29.99)
- [ ] Create checkout flow
  - [ ] `/pricing` page showing tier comparison
  - [ ] Checkout session creation API route
  - [ ] Success/cancel redirect pages
- [ ] Webhook handler for subscription events
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] Update user tier in database based on webhook
- [ ] Customer portal integration
  - [ ] Allow users to manage subscription
  - [ ] Cancel/upgrade/downgrade flows
  - [ ] View billing history
- [ ] Handle trial periods (7-day Pro trial)
- [ ] Test with Stripe test mode
- [ ] Add payment method management

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

### 4. AI Features - Phase 2 Implementation
**Why:** Complete AI pipeline system as designed in mvp_ai_system_design.md
**Time:** 15-20 hours
**Blocker:** No (but benefits from items 1-3 for tier-based routing)
**Priority:** **HIGH**

**Tasks:**
- [ ] Implement 4-layer caching system
  - [x] L1: Redis Query Cache (already exists via Vercel KV)
  - [ ] L2: Company Fact Sheets (Supabase + Redis)
  - [ ] L3: Filing Summaries (Supabase)
  - [x] L4: Vercel Edge Cache (already configured)
- [ ] Create Supabase tables for caching
  - [ ] `company_fact_sheets` table
  - [ ] `filing_summaries` table
  - [ ] Run SQL schema from mvp_ai_system_design.md
- [ ] Implement lazy loading for SEC filings
  - [ ] Generate summaries on-demand (first request)
  - [ ] Cache summaries for 30 days
  - [ ] Integrate with existing SEC EDGAR API
- [ ] Tier-based AI model routing
  - [x] Flash only for Free tier
  - [ ] Flash + Pro escalation for Pro tier
  - [ ] Flash + Pro (priority) for Premium tier
  - [ ] Update router to check user tier
- [ ] Monitoring and cost tracking integration
  - [ ] Track cache hit rates (L1, L2, L3, L4)
  - [ ] Monitor costs by tier
  - [ ] Alert when costs exceed projections
- [ ] Performance optimization
  - [ ] Ensure <200ms response from cache
  - [ ] Stream responses for long-running queries
  - [ ] Implement request deduplication

**Database Schema (Supabase):**
```sql
-- Company fact sheets
CREATE TABLE company_fact_sheets (
  ticker VARCHAR(10) PRIMARY KEY,
  cik VARCHAR(20) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  ceo VARCHAR(100),
  description TEXT,
  fundamental_metrics JSONB,
  latest_financials JSONB,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fact_sheets_cik ON company_fact_sheets(cik);

-- Filing summaries
CREATE TABLE filing_summaries (
  id SERIAL PRIMARY KEY,
  cik VARCHAR(20) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  filing_type VARCHAR(10) NOT NULL,
  period_end DATE NOT NULL,
  summary_text TEXT NOT NULL,
  kpis_json JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cik, filing_type, period_end)
);

CREATE INDEX idx_filing_summaries_lookup
  ON filing_summaries(cik, filing_type, period_end);
```

---

### 5. Multi-Model AI Router ✅ COMPLETE
**Why:** Reduce costs, add fallback reliability
**Time:** 4-6 hours
**Blocker:** No

**Tasks:**
- [x] Sign up for OpenRouter account
- [x] Install openrouter package: `npm install openrouter`
- [x] Create `lib/ai/router.ts` with tiered routing logic
- [x] Create `lib/ai/models.ts` with model configurations
- [x] Add OpenRouter API key to `.env.local`
- [x] Update `app/api/ai/generate/route.ts` to use router
- [x] Test with multiple models (DeepSeek, Qwen, Claude)

**Models Integrated:**
- Tier 1: DeepSeek v3, Qwen Plus (cheap, fast)
- Tier 2: Qwen Max, Claude Sonnet 4 (quality)
- Tier 3: Claude Sonnet 4, DeepSeek Reasoner (reasoning)
- Fallback: Google Gemini (current)

---

### 6. Cost Tracking Dashboard ✅ COMPLETE
**Why:** Monitor $20/month budget, prevent overruns
**Time:** 3-4 hours
**Blocker:** No

**Tasks:**
- [x] Create `lib/ai/cost-tracker.ts` with logging functions
- [x] Create `app/api/telemetry/ai-costs/route.ts` API endpoint
- [x] Add cost logging to AI router calls
- [x] Create `components/dashboard/CostTracker.tsx` component
- [x] Add CostTracker to dashboard page
- [x] Implement budget alert at 80% threshold
- [x] Add daily/weekly/monthly cost charts

**Display Metrics:**
- Total cost today/week/month
- Cost per model
- Queries per model
- Average cost per query
- Budget remaining
- Alert if >$20/month projected

---

## 🟡 HIGH PRIORITY (After Critical Items)

### 7. Upgrade to Latest Next.js ✅ COMPLETE
**Why:** Security updates, performance improvements, bug fixes
**Time:** 2-3 hours → **Actual: 1.5 hours**
**Blocker:** No

**Tasks:**
- [x] Check current Next.js version: `npm list next`
- [x] Review Next.js changelog for breaking changes
- [x] Update Next.js: `npm install next@latest react@latest react-dom@latest`
- [x] Update dependencies that depend on Next.js version
- [x] Run build and fix any breaking changes
- [x] Test all pages and API routes
- [x] Update Husky pre-push hook (remove deprecated lines)

**Upgraded Versions:**
- Next.js: 14.2.33 → **16.0.3** (includes Turbopack!)
- React: 18.3.1 → **19.2.0**
- React DOM: 18.3.1 → **19.2.0**

**Results:**
- ✅ Build: Clean (no warnings)
- ✅ Tests: All passing (3/3 suites)
- ✅ Turbopack: Enabled by default
- ✅ No breaking changes required

---

### 8. Navigation Structure & Landing Page ✅ COMPLETE
**Why:** Better UX, scalability for new features, professional landing page
**Time:** 4-6 hours + 10-12 hours for landing → **Actual: ~14 hours total**
**Blocker:** No

**Tasks:**
- [x] Create `components/layout/DashboardLayout.tsx` ✅
- [x] Create `components/layout/TopNav.tsx` ✅
- [x] Create `components/layout/Sidebar.tsx` ✅
- [x] Create `components/layout/Breadcrumbs.tsx` ✅
- [x] Implement route groups in `app/` ✅
- [x] Add navigation to all pages ✅
- [x] Style for mobile (collapsible sidebar) ✅
- [x] Create landing page (`/landing`) ✅
  - Modern glassmorphism design
  - Animated particle background
  - Hero section with CTAs
  - Feature highlights
  - Pricing tiers
  - Sign up/Sign in integration
- [x] Create professional auth pages ✅
  - Consistent glassmorphism design
  - Animated galaxy backgrounds
  - Email/password forms

**Navigation Items:**
- Dashboard (overview)
- Holdings
- Fundamentals
- Risk Analytics
- Thesis Tracker
- Checklist
- Settings

---

### 9. Refactor app/page.tsx ✅ COMPLETE
**Why:** Maintainability, performance
**Time:** 6-8 hours
**Blocker:** Navigation structure recommended first

**Tasks:**
- [x] Check current line count: `wc -l app/page.tsx`
- [x] Create route group: `app/(dashboard)/`
- [x] Create `app/(dashboard)/layout.tsx`
- [x] Extract holdings view to `app/(dashboard)/holdings/page.tsx`
- [x] Extract risk view to `app/(dashboard)/risk/page.tsx`
- [x] Extract thesis view to `app/(dashboard)/thesis/page.tsx`
- [x] Create dashboard overview at `app/(dashboard)/page.tsx`
- [x] Update routing and links
- [x] Test all pages work independently

---

### 10. Performance Optimization Pass
**Why:** Better UX, meet <1.5s page load target
**Time:** 6-8 hours
**Blocker:** Complete Auth/Tiers/AI features first
**Priority:** **MEDIUM** (do this AFTER items 1-4)

**Tasks:**
- [ ] Install React Query: `npm install @tanstack/react-query`
- [ ] Setup React Query provider in layout
- [ ] Convert data fetching to useQuery hooks
- [ ] Add skeleton loading components
- [ ] Lazy load chart components with `next/dynamic`
- [ ] Implement code splitting by route
- [ ] Optimize all images with `next/image`
- [ ] Add loading.tsx files for each route
- [ ] Measure page load times (target <1.5s)

---

## 🟢 MEDIUM PRIORITY (Quality & Polish)

### 11. Testing Infrastructure
**Time:** 8-12 hours
**Blocker:** No

**Tasks:**
- [ ] Install Playwright: `npm install -D @playwright/test`
- [ ] Write unit tests for `lib/calculator.ts`
- [ ] Write unit tests for `lib/metrics.ts`
- [ ] Write component tests for key components
- [ ] Write E2E tests for critical flows:
  - [ ] Login/portfolio view
  - [ ] Stock quote fetching
  - [ ] AI copilot interaction
  - [ ] Checklist completion
  - [ ] Subscription checkout flow
- [ ] Setup CI/CD for tests
- [ ] Aim for >70% code coverage

---

### 12. Mobile UX Improvements
**Time:** 4-6 hours
**Blocker:** Navigation structure

**Tasks:**
- [ ] Test on mobile devices (iOS/Android)
- [ ] Implement bottom navigation for mobile
- [ ] Make sidebar collapsible/drawer on mobile
- [ ] Add touch-friendly interactions (larger tap targets)
- [ ] Simplify mobile views (hide non-critical data)
- [ ] Test landscape orientation
- [ ] Add PWA manifest for offline
- [ ] Test with 3G network throttling

---

### 13. Security & Production Prep
**Time:** 4-6 hours
**Blocker:** Authentication must be complete first

**Tasks:**
- [ ] Review all API routes for auth (require user session)
- [ ] Add rate limiting to public endpoints
- [ ] Implement CSP headers in `next.config.js`
- [ ] Sanitize all user input
- [ ] Check for exposed API keys
- [ ] Enable production error logging (Sentry)
- [ ] Setup monitoring (Vercel Analytics)
- [ ] Create production deployment checklist

---

## ⚪ LOW PRIORITY (Nice to Have)

### 14. Additional Features
**Time:** Varies
**Blocker:** Complete critical items first

**Tasks:**
- [ ] Stock comparison view (side-by-side)
- [ ] Stress testing scenarios
- [ ] Command palette (Cmd+K)
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle (if not done)
- [ ] Export portfolio data (CSV/JSON)
- [ ] Import holdings from CSV
- [ ] Notification system
- [ ] Stock screener (Phase 3)

---

## ✅ VERIFICATION NEEDED

### Items to Manually Test

**Tasks:**
- [x] Test thesis health scoring works correctly
- [x] Verify event-driven tasks are auto-generated
- [x] Check stress test scenarios (if implemented)
- [x] Test stock comparison view (if exists)
- [x] Measure actual page load times
- [x] Test on real mobile devices
- [x] Check all API endpoints work
- [x] Verify caching works as expected
- [x] Test with rate-limited API keys
- [ ] Test authentication flow (sign up, login, logout)
- [ ] Test tier upgrade/downgrade flow
- [ ] Test quota enforcement (reach limits, verify blocked)
- [ ] Test Stripe checkout flow (test mode)
- [ ] Test AI caching layers (L1, L2, L3, L4)

---

## 📊 PROGRESS TRACKING

### Overall Status
- **Database & Core:** ✅ 100% Complete
- **Features (Sprint 2-4):** ✅ 75% Complete
- **Auth & Monetization:** ⚠️ 70% Complete ← **Auth complete, payments pending**
  - ✅ Email/Password Authentication (80% of use cases)
  - ✅ Google OAuth (fully integrated)
  - ✅ User & UsageTracking models in database
  - ✅ Session management helpers
  - ✅ Protected route middleware
  - ❌ Stripe payment integration (pending)
- **AI Infrastructure (Sprint 1):** ⚠️ 50% Complete (router done, caching partial)
- **UX & Polish (Sprint 5):** ✅ 70% Complete
  - ✅ Landing page with glassmorphism design
  - ✅ Professional auth pages
  - ✅ Navigation structure
  - ⚠️ Mobile optimization (partial)
- **Testing (Sprint 6):** ❌ 10% Complete

### Critical Path to MVP Launch (Updated)

```
1. Authentication System (12h)                    ✅ COMPLETE (10h done)
   ↓
2. User Tier Management (15h)                     ← START HERE
   ↓
3. Payment Integration (16h)
   ↓
4. AI Features Phase 2 (20h)
   ↓
5. Performance Optimization (8h)
   ↓
6. Security & Production Prep (6h)
   ↓
7. Testing Infrastructure (12h)
   ↓
🚀 MVP LAUNCH READY
```

**Total Time to MVP Launch:** ~89 hours total
**Completed:** ~20 hours (auth complete + landing page + navigation)
**Remaining:** ~69 hours (~3 weeks full-time, 5-6 weeks part-time)

---

## 🎯 THIS WEEK'S FOCUS

**NEW Top 3 Priorities (Updated for MVP Launch):**

1. **🔴 User Tier Management** (15 hours) ← **START HERE**
   - Enable monetization
   - Control AI costs
   - Prevent abuse
   - Database-backed quota tracking
   - Tier enforcement in AI routes
   - Usage dashboard

2. **🔴 Payment Integration** (16 hours)
   - Stripe checkout
   - Subscription management
   - Revenue collection
   - Customer portal
   - Webhook handlers

**Weekly Goal:** Complete User Tiers + Start Payment Integration

---

## 📅 SPRINT PLAN (Updated)

### Week 1 (Current) - **CRITICAL: Tiers & Payments**
- [x] Authentication System (item 1) ✅ **COMPLETE**
- [ ] User Tier Management (item 2) ← **IN PROGRESS**
- [ ] Start Payment Integration (item 3)

### Week 2 - **Payment & AI Features**
- [ ] Complete Payment Integration (item 3)
- [ ] AI Features Phase 2 (item 4)
- [ ] Cache layer implementation

### Week 3 - **Performance & Security**
- [ ] Performance Optimization (item 10)
- [ ] Security & Production Prep (item 13)
- [ ] Testing Infrastructure (item 11)

### Week 4 - **Polish & Launch**
- [ ] Mobile UX Improvements (item 12)
- [ ] Final testing and bug fixes
- [ ] Production deployment
- [ ] 🚀 **MVP LAUNCH**

---

## 💡 DECISION POINTS

### 1. Authentication Provider Choice

**NextAuth.js:**
- ✅ Free, open-source
- ✅ Self-hosted, full control
- ✅ Flexible, customizable
- ❌ More setup required
- ❌ Need to manage sessions

**Clerk:**
- ✅ Managed service, easier setup
- ✅ Beautiful pre-built UI components
- ✅ Free tier: 10,000 MAU
- ❌ Vendor lock-in
- ❌ Paid after 10k users

**Recommendation:** Start with **Clerk** for faster MVP, migrate to NextAuth later if needed.

### 2. Payment Processing

**Stripe** (Recommended):
- ✅ Industry standard
- ✅ Excellent documentation
- ✅ Easy webhook integration
- ✅ Customer portal built-in

**Alternative:** Paddle (if international tax handling is critical)

---

## 🚨 BLOCKERS & RISKS

### Current Blockers
1. **No user tiers** → Can't monetize or control AI costs
2. **No payment system** → Can't collect revenue

### Risks
1. **Stripe integration complexity** → Webhooks can be tricky
2. **AI cost explosion** → Without tiers, hard to control costs
3. **User adoption** → Need effective marketing strategy

---

## 🔗 Related Documents

- **CLAUDE.md** - Comprehensive development guide
- **USER_TIER_LIMITS.md** - Complete tier system documentation
- **mvp_ai_system_design.md** - AI pipeline Phase 2 architecture
- **REFACTORING_STATUS_ANALYSIS.md** - Detailed progress analysis
- **docs/archive/REFACTORING_PLAN_ORIGINAL.md** - Original 12-week plan

---

## ✨ QUICK WINS (Easy Items)

If you have 30 minutes:
- [ ] Add Clerk account and get API keys
- [ ] Create Stripe account
- [ ] Draft pricing page mockup
- [ ] Write Prisma schema for User model
- [ ] Document authentication flow

If you have 1 hour:
- [ ] Install and configure Clerk
- [ ] Create sign-up/sign-in pages
- [ ] Add protected route middleware
- [ ] Test authentication flow locally
- [ ] Create Stripe products (Pro, Premium)

---

**Remember:**
- **DO NOT start Performance Optimization until Tiers/Payment are done!**
- **Tiers + Payment = Foundation for MVP monetization**
- **Focus on revenue-generating features first**

🎯 **NEW Priority Order:**
1. ✅ Authentication (item 1) - **COMPLETE**
2. User Tiers (item 2) ← **NEXT**
3. Payment Integration (item 3)
4. AI Phase 2 (item 4)
5. THEN Performance Optimization (item 10)
