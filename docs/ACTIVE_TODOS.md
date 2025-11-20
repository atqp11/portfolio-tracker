# 📋 Active TODOs

**Last Updated:** November 19, 2025
**Status:** 60-70% Complete | Focus on completing Sprint 1 before new features

---


## 🔴 CRITICAL (Must Do Before Production)

### 1. Multi-Model AI Router ✅ COMPLETE
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


### 2. Cost Tracking Dashboard ✅ COMPLETE
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

## 🟡 HIGH PRIORITY (Improves UX & Maintainability)

### 3. Upgrade to Latest Next.js ✅ COMPLETE
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

### 4. Navigation Structure
**Why:** Better UX, scalability for new features
**Time:** 4-6 hours
**Blocker:** No

**Tasks:**
- [ ] Create `components/layout/DashboardLayout.tsx`
- [ ] Create `components/layout/TopNav.tsx`
- [ ] Create `components/layout/Sidebar.tsx`
- [ ] Create `components/layout/Breadcrumbs.tsx`
- [ ] Implement route groups in `app/`
- [ ] Add navigation to all pages
- [ ] Style for mobile (collapsible sidebar)

**Navigation Items:**
- Dashboard (overview)
- Holdings
- Fundamentals
- Risk Analytics
- Thesis Tracker
- Checklist
- Settings

---

### 5. Refactor app/page.tsx
**Why:** Maintainability, performance
**Time:** 6-8 hours
**Blocker:** Navigation structure recommended first

**Tasks:**
- [ ] Check current line count: `wc -l app/page.tsx`
- [ ] Create route group: `app/(dashboard)/`
- [ ] Create `app/(dashboard)/layout.tsx`
- [ ] Extract holdings view to `app/(dashboard)/holdings/page.tsx`
- [ ] Extract risk view to `app/(dashboard)/risk/page.tsx`
- [ ] Extract thesis view to `app/(dashboard)/thesis/page.tsx`
- [ ] Create dashboard overview at `app/(dashboard)/page.tsx`
- [ ] Update routing and links
- [ ] Test all pages work independently

---

### 6. Performance Optimization Pass
**Why:** Better UX, meet <1.5s page load target
**Time:** 6-8 hours
**Blocker:** No

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

### 7. Testing Infrastructure
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
- [ ] Setup CI/CD for tests
- [ ] Aim for >70% code coverage

---

### 8. Mobile UX Improvements
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

### 9. Security & Production Prep
**Time:** 4-6 hours
**Blocker:** No

**Tasks:**
- [ ] Review all API routes for auth (if multi-user)
- [ ] Add rate limiting to public endpoints
- [ ] Implement CSP headers in `next.config.js`
- [ ] Sanitize all user input
- [ ] Check for exposed API keys
- [ ] Enable production error logging (Sentry)
- [ ] Setup monitoring (Vercel Analytics)
- [ ] Create production deployment checklist

---

## ⚪ LOW PRIORITY (Nice to Have)

### 10. Additional Features
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

---

## 📊 PROGRESS TRACKING

### Overall Status
- **Database & Core:** ✅ 100% Complete
- **Features (Sprint 2-4):** ✅ 75% Complete
- **AI Infrastructure (Sprint 1):** ❌ 30% Complete ← Focus here
- **UX & Polish (Sprint 5):** ⚠️ 20% Complete
- **Testing (Sprint 6):** ❌ 10% Complete

### Critical Path to Production
```
1. Multi-Model AI Router (6h)
   ↓
2. Cost Tracking (4h)
   ↓
3. Navigation Structure (6h)
   ↓
4. Refactor page.tsx (8h)
   ↓
5. Performance Pass (8h)
   ↓
6. Testing Infrastructure (12h)
   ↓
7. Security Audit (6h)
   ↓
🚀 Production Ready
```

**Total Time to Production:** ~50 hours (~2-3 weeks full-time, 4-6 weeks part-time)

---

## 🎯 THIS WEEK'S FOCUS

**Top 3 Priorities:**

1. ✅ **Multi-Model AI Router** (4-6 hours)
   - Reduces costs
   - Adds reliability
   - Enables fallbacks

2. ✅ **Cost Tracking Dashboard** (3-4 hours)
   - Prevents budget overruns
   - Monitors usage
   - Alerts before problems

3. ✅ **Verify Existing Features** (2 hours)
   - Test thesis scoring
   - Check event tasks
   - Measure performance

**Weekly Goal:** Complete AI infrastructure (items 1-2) + verification

---

## 📅 SPRINT PLAN

### Week 1 (Current)
- [ ] Multi-Model AI Router
- [ ] Cost Tracking Dashboard
- [ ] Feature verification

### Week 2
- [ ] Navigation Structure
- [ ] Refactor app/page.tsx
- [ ] Performance optimization

### Week 3
- [ ] Testing infrastructure
- [ ] Mobile UX improvements
- [ ] Security audit

### Week 4
- [ ] Final polish
- [ ] Documentation
- [ ] Production deployment

---

## 📝 NOTES

**Before Starting Any Task:**
1. ✅ Create git branch: `git checkout -b feature/task-name`
2. ✅ Commit frequently with clear messages
3. ✅ Test thoroughly before merging
4. ✅ Update this TODO when complete

**Cost Management:**
- Keep AI costs under $20/month
- Use Tier 1 models (cheap) for simple queries
- Use Tier 2/3 models only for complex reasoning
- Cache aggressively (already done ✅)

**Quality Standards:**
- Write tests for new features
- Document complex logic
- Follow conventions in CLAUDE.md
- Mobile-first responsive design
- Performance: page load <1.5s

---

## 🔗 Related Documents

- **CLAUDE.md** - Comprehensive development guide
- **REFACTORING_STATUS_ANALYSIS.md** - Detailed progress analysis
- **docs/archive/REFACTORING_PLAN_ORIGINAL.md** - Original 12-week plan
- **DOCUMENTATION_CLEANUP_RECOMMENDATIONS.md** - Doc cleanup strategy

---

## ✨ QUICK WINS (Easy Items)

If you have 30 minutes:
- [ ] Add skeleton loading states to one component
- [ ] Write one unit test
- [ ] Optimize one image with next/image
- [ ] Add one loading.tsx file
- [ ] Document one complex function

If you have 1 hour:
- [ ] Add breadcrumbs to current pages
- [ ] Write tests for calculator functions
- [ ] Create one reusable component
- [ ] Optimize one slow API route

---

**Remember:** Focus on completing AI infrastructure (items 1-2) before adding new features!

🎯 **Current Priority:** Multi-Model AI Router → Cost Tracking → Navigation
