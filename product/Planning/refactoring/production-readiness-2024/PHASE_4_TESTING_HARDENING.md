# Phase 4: Testing & Hardening Plan

**Status:** 🔄 In Progress (Week 4-5)
**Last Updated:** December 5, 2025

---

## Overview

Phase 4 is the production hardening phase. After completing Phases 0-3 (config, cache, orchestrator, providers), Phase 4 focuses on:

1. **Comprehensive Testing** - Unit, integration, E2E, and load testing
2. **Error Handling Standardization** - Consistent error responses across all APIs
3. **Cache Resilience** - Fallback behavior when Redis/Vercel KV is down
4. **Circuit Breaker Validation** - State transitions and telemetry accuracy
5. **Load Testing** - Performance under sustained load (p95 < 1000ms target)
6. **UX Fallback** - User-friendly error messages and graceful degradation
7. **Monitoring & Alerts** - Dashboard setup and alert rules

---

## Checklist: Phase 4 Testing & Hardening

### 1. Environment Variable Verification ✅ (NEW)

**Purpose:** Validate that all required environment variables are configured in Vercel before deployment.

**Implementation:**
- ✅ Script: `scripts/verify-env.js` - checks `TIINGO_API_KEY` and `GEMINI_API_KEY`
- ✅ NPM command: `npm run check:env` - runs verification locally or in CI/CD

**How to Use:**
```bash
# Local verification (must set env vars in .env.local first)
npm run check:env

# In Vercel CI/CD: add this to build step
npm run check:env || exit 1

# Vercel CLI: list all environment variables
vercel env ls

# Add a missing key
vercel env add TIINGO_API_KEY production
```

**Success Criteria:**
- ✅ Script exits with code 0 if all required vars are set
- ✅ Script exits with code 1 if any required var is missing
- ✅ Error message includes Vercel CLI instructions

**Files:**
- `scripts/verify-env.js` - Verification script
- `package.json` - Added `check:env` npm script
- `src/lib/config/api-keys.config.ts` - Source of truth for required keys

---

### 2. Cache Resilience Tests 🔄 (IN PROGRESS)

**Purpose:** Validate that the application gracefully falls back to direct API calls when Redis/Vercel KV is unavailable.

**Test Scenarios:**
- [ ] Cache initialization fails → application starts but no caching
- [ ] Cache `get()` times out → request bypasses cache, hits API
- [ ] Cache `set()` fails → data fetched from API but not cached
- [ ] Stale cache fallback works → returns old data if API fails
- [ ] Cache connection recovers → subsequent requests use cache

**Implementation Plan:**
- Create `src/lib/cache/__tests__/cache-resilience.test.ts`
- Mock Redis connection failures
- Test each adapter (VercelKV, Upstash, InMemory)
- Verify telemetry/logging when cache fails

**Files to Create:**
- `src/lib/cache/__tests__/cache-resilience.test.ts`

---

### 3. Circuit Breaker Edge Cases 🔄 (IN PROGRESS)

**Purpose:** Validate circuit breaker state transitions and failure tracking.

**Test Scenarios:**
- [ ] Circuit breaker opens after 5 consecutive failures
- [ ] Circuit breaker half-open state (allows test request after cooldown)
- [ ] Circuit breaker closes on successful request
- [ ] Telemetry records state transitions (open → half-open → closed)
- [ ] Failure threshold resets after successful request
- [ ] Circuit breaker survives provider recovery

**Implementation Plan:**
- Expand `src/lib/data-sources/__tests__/circuit-breaker.test.ts`
- Add state transition matrix tests
- Verify telemetry events are recorded

**Files to Update:**
- `src/lib/data-sources/__tests__/circuit-breaker.test.ts`

---

### 4. Load Testing Setup ⬜ (NOT STARTED)

**Purpose:** Measure API performance under sustained load and identify bottlenecks.

**Test Scenarios:**
- Sustained load: 50 concurrent users for 2 minutes
- Spike test: 10 users → 200 users over 30 seconds
- Soak test: 20 concurrent users for 10 minutes
- Error rate under load (should be <1%)
- Cache hit rate under load (target >60%)

**Metrics to Capture:**
- Response time (p50, p95, p99)
- Throughput (req/sec)
- Error rate
- Cache hit rate

**Implementation Plan:**
- Create Artillery configuration (`artillery.yml`)
- Write scenarios for:
  - `/api/quote?symbols=AAPL,MSFT,GOOGL` - cached endpoint
  - `/api/fundamentals?ticker=AAPL` - multi-source endpoint
  - `/api/ai/generate` - expensive AI endpoint
- Run load tests in staging environment

**Files to Create:**
- `load-tests/artillery.yml` - Artillery configuration
- `load-tests/scenarios.yml` - Test scenarios
- `scripts/run-load-tests.sh` - Runner script

---

### 5. End-to-End & UX Fallback Tests ⬜ (NOT STARTED)

**Purpose:** Validate UI behavior under failure conditions (network errors, API failures, rate limits).

**Test Scenarios:**
- Quote API fails → show error message + fallback button
- AI endpoint rate limited → show "too many requests" + retry button
- News endpoint times out → show partial data + refresh option
- Circuit breaker open → show "service temporarily unavailable"
- Invalid ticker → show "not found" with suggestions

**Implementation Plan:**
- Create E2E tests using Playwright or Cypress
- Test scenarios:
  - Mock API failures (404, 503, 429)
  - Verify error messages are user-friendly
  - Verify fallback UI is shown
  - Verify retry/refresh buttons work

**Files to Create:**
- `e2e/__tests__/error-scenarios.spec.ts` - Error handling E2E tests
- `e2e/__tests__/fallback-ui.spec.ts` - UI fallback tests

---

### 6. Monitoring Dashboard Checklist ⬜ (NOT STARTED)

**Purpose:** Document required monitoring dashboards, alerts, and key metrics.

**Dashboards to Create:**
- [ ] Main Dashboard
  - Cache hit rate (target >60%)
  - API error rate (target <1%)
  - Circuit breaker state (all should be "closed")
  - Vercel KV usage (target <$10/month)

- [ ] Data Sources Dashboard
  - Per-provider success rate
  - Per-provider response time
  - Per-provider circuit breaker state
  - Fallback invocation rate

- [ ] Performance Dashboard
  - API response times (p50, p95, p99)
  - Throughput (req/sec)
  - Database query performance
  - AI generation cost per request

- [ ] Errors & Alerts Dashboard
  - Error rate by endpoint
  - Error type breakdown (network, timeout, API error, validation)
  - Alert history and resolution time

**Alerts to Configure:**
- [ ] Cache hit rate drops below 50%
- [ ] Any provider error rate >5%
- [ ] Circuit breaker opens (any provider)
- [ ] Vercel KV connection errors
- [ ] API response time p95 >2000ms
- [ ] Gemini API cost spike (>$30/day)

**Implementation Plan:**
- Create monitoring guide: `MONITORING_SETUP.md`
- Document Vercel KV dashboard link
- Document upstash.com dashboard (if using direct Upstash)
- Document alert rules and thresholds

**Files to Create:**
- `product/Planning/refactoring/production-readiness-2024/MONITORING_SETUP.md`

---

## Execution Plan

### Week 4 (This Week)

**Day 1-2: Environment Verification** ✅ DONE
- [x] Create `verify-env.js` script
- [x] Add `npm run check:env` command
- [x] Document verification steps in PRODUCTION_READINESS_PLAN.md

**Day 3-4: Cache Resilience Tests** 🔄 IN PROGRESS
- [ ] Create `cache-resilience.test.ts`
- [ ] Test all cache adapters (VercelKV, Upstash, InMemory)
- [ ] Test fallback behavior (cache miss → API call)
- [ ] Test stale cache fallback

**Day 5: Circuit Breaker Edge Cases** ⬜ TODO
- [ ] Expand circuit breaker tests
- [ ] Test state transitions
- [ ] Verify telemetry

### Week 5

**Days 1-2: Load Testing Setup** ⬜ TODO
- [ ] Create Artillery config
- [ ] Write test scenarios
- [ ] Run load tests in staging
- [ ] Document results

**Days 3-4: End-to-End Tests** ⬜ TODO
- [ ] Set up Playwright/Cypress
- [ ] Write error scenario tests
- [ ] Write UX fallback tests
- [ ] Verify error messages

**Day 5: Monitoring Setup** ⬜ TODO
- [ ] Create monitoring guide
- [ ] Document dashboard requirements
- [ ] Document alert rules
- [ ] Set up Vercel dashboard

---

## Success Criteria

By end of Phase 4:

- [ ] **Test Coverage:** 70%+ on services (was ~20%)
- [ ] **Cache Resilience:** Application works with cache down (fallback to direct API)
- [ ] **Circuit Breaker:** State transitions logged, telemetry accurate
- [ ] **Load Test Results:**
  - p95 response time <1000ms (target)
  - Error rate <1%
  - Cache hit rate 60-80%
- [ ] **Error Handling:** User-friendly messages, proper HTTP codes (400, 429, 503)
- [ ] **Monitoring:** Dashboards and alerts configured in Vercel
- [ ] **Documentation:** All Phase 4 work documented
- [ ] **Ready for Production:** All tests passing, no blocker issues

---

## Key Metrics & Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Test Coverage | ~20% | 70%+ | 🔄 In Progress |
| Cache Hit Rate | 60-80% | 60-80% | ✅ Verified |
| API Error Rate | Unknown | <1% | ⬜ To Test |
| Response Time (p95) | Unknown | <1000ms | ⬜ To Test |
| Circuit Breaker State | Unknown | All "closed" | ⬜ To Verify |
| Monitoring Dashboards | 0 | 4+ | ⬜ To Create |

---

## Phase 4 Deliverables

- [x] Environment variable verification script
- [ ] Cache resilience test suite
- [ ] Circuit breaker edge case tests
- [ ] Load testing configuration and scenarios
- [ ] End-to-end error handling tests
- [ ] Monitoring dashboard setup guide
- [ ] Phase 4 completion summary

---

## Dependencies & Prerequisites

- ✅ Phases 0-3 completed (cache, orchestrator, providers)
- ✅ All tests passing (499/499)
- ✅ Build succeeds with no errors
- ✅ TypeScript strict mode throughout
- Artillery.io installed (optional for load testing)

---

## Next Steps

1. ⬜ Run cache resilience tests (test cache-adapter down scenarios)
2. ⬜ Expand circuit breaker tests (state transitions)
3. ⬜ Set up load testing (Artillery)
4. ⬜ Write E2E tests (Playwright/Cypress)
5. ⬜ Create monitoring guide and dashboards

---

**Timeline:** Week 4-5 (10 days remaining)
**Estimated Hours:** 30-40 hours
**Team:** 1-2 engineers
**Blocker:** None (can run in parallel with Phase 5 prep)
