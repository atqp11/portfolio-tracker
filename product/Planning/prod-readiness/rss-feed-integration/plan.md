# RSS Feed Integration Plan

**Created:** December 5, 2025  
**Status:** Planning  
**Goal:** Pre-production readiness for news/RSS feed integration

---

## Objective

Integrate additional RSS feeds (e.g., CNBC, Nasdaq, MarketBeat, Global Finance, Fortune) into the news DAO/service with robust testing, error handling, and reliability.

---

## Current State (as of Phase 3)

### Active News Providers
| Provider           | Type         | Cost | API Key | Status         |
|--------------------|--------------|------|---------|----------------|
| **Yahoo Finance**  | RSS          | Free | ❌ No   | Active         |
| **Google News**    | RSS          | Free | ❌ No   | Active         |
| **Seeking Alpha**  | RSS          | Free | ❌ No   | Active         |
| **MarketWatch**    | RSS          | Free | ❌ No   | Active         |
| **Investing.com**  | RSS          | Free | ❌ No   | Active         |

### Key Files
- `src/backend/modules/news/dao/rss-feed.dao.ts` — RSS Feed DAO (all feeds)
- `src/backend/modules/news/service/news.service.ts` — News Service
- `app/api/news/copper/route.ts` — Copper news API
- `app/api/news/energy/route.ts` — Energy news API

### Current RSS_FEEDS in DAO
```typescript
YAHOO_TOP_STORIES, YAHOO_STOCK_NEWS (symbol),
GOOGLE_FINANCE, GOOGLE_BUSINESS,
SEEKING_ALPHA_MARKET,
MARKETWATCH_TOP, MARKETWATCH_REALTIME,
INVESTING_FUNDAMENTALS, INVESTING_COMMODITIES, INVESTING_IDEAS
```

---

## New RSS Feeds to Add

| Feed Source      | URL                                                                                       | Category                |
|------------------|-------------------------------------------------------------------------------------------|-------------------------|
| **CNBC**         | https://www.cnbc.com/id/100003114/device/rss/rss.html (Top News)                          | Market/General          |
| **Seeking Alpha**| https://seekingalpha.com/feed.xml (General)                                               | Market/General          |
| **Motley Fool**  | https://www.fool.com/a/feeds/partner/googlechromefollow?apikey=... (partner feed)         | Stock/General           |
| **Nasdaq**       | https://www.nasdaq.com/feed/nasdaq-original/rss.xml                                       | Market/Stock            |
| **MarketBeat**   | https://www.marketbeat.com/feed                                                           | Stock/Sentiment         |
| **Global Finance**| https://gfmag.com/feed/                                                                  | Market/Macro            |
| **Fortune**      | https://fortune.com/feed/fortune-feeds                                                    | Business/General        |

> **Note:** Related stock news feeds for stock page are **post-MVP** and should be tracked separately.

---

## Steps

### 1. Source Validation
- [ ] Test each new RSS feed URL for availability and response format.
- [ ] Document each feed's focus (stock, market, commodity, sentiment, etc.).
- [ ] Confirm feeds are free and do not require API keys.

### 2. DAO/Service Update
- [ ] Add new feed URLs to `RSS_FEEDS` constant in `rss-feed.dao.ts`.
- [ ] Update keyword filters as needed for new categories (e.g., sentiment, macro).
- [ ] Ensure deduplication and sorting logic covers new feeds.
- [ ] Add helper methods if needed (e.g., `getMarketNews()`, `getSentimentNews()`).

### 3. API Route Testing
- [ ] Test `/api/news/*` endpoints for new feed coverage and correct filtering.
- [ ] Add/expand tests for new sources and edge cases (e.g., malformed feeds, downtime).
- [ ] Ensure all articles have: title, description, url, publishedAt, source.

### 4. Error Handling
- [ ] Add error handling for feed fetch failures, timeouts (10s), and invalid data.
- [ ] Log all errors and fallback events (use existing pattern in `rss-feed.dao.ts`).
- [ ] Return user-friendly error messages (no raw technical errors).
- [ ] Ensure fallback redundancy: if one feed fails, others still work.

### 5. Reliability Verification
- [ ] Monitor news update frequency and coverage after integration.
- [ ] Simulate feed outages and verify fallback/alerting.
- [ ] Review logs for recurring issues.
- [ ] Validate cache TTL (15-minute TTL for news).

### 6. Acceptance Criteria
- [ ] All new feeds integrated and visible in UI/API.
- [ ] All tests passing, including error/failure scenarios.
- [ ] No unhandled errors in logs.
- [ ] Documentation updated for all sources and logic.
- [ ] Build and test suite green.

---

## Post-MVP: Stock Page News Feeds

The following enhancements are for **post-MVP** work:
- Per-symbol news feeds (e.g., `YAHOO_STOCK_NEWS(symbol)`)
- Social media sentiment feeds (Twitter/X, StockTwits, Reddit)
- Additional commodity-specific feeds

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

### Example: News Route (Reference)

- **Route:** `app/api/news/copper/route.ts` — thin wrapper, calls controller/service
- **Service:** `src/backend/modules/news/service/news.service.ts`
- **DAO:** `src/backend/modules/news/dao/rss-feed.dao.ts`

**Anti-patterns:**
- ❌ Business logic in route or controller
- ❌ Direct DB/RSS access in route/controller
- ❌ Validation in controller (use middleware)

---

## References
- PRD: `product/PRD/Portfolio_Platform_PRD_v1.0.md`
- Feature Roadmap: `product/Planning/roadmap/FEATURE_ROADMAP.md`
- Phase 3 News Update: `product/Planning/archive/refactoring/production-readiness-v1/PHASE_3_NEWS_UPDATE.md`
- CLAUDE.md: `CLAUDE.md` (coding guidelines)
- AI Coding Agent Guide: `docs/0_AI_Coding_Agent_Guide.md` (layer separation, MVC pattern)

---

## RSC/Server Actions Refactoring (Pre-prod Scope)

For all paths touched in this plan, ensure:
- News/RSS components under `app/(protected)/` and `components/` are **Server Components** for data fetching.
- Client Components are used only for interactivity (filtering, expanding articles, etc.).
- Where mutations are needed (e.g., user preferences), prefer **Server Actions** over API routes.
- All Server Actions include Zod validation and use `revalidatePath` for cache invalidation.

### Pages/Routes to Migrate (Quick Reference)

| Page/Route                                      | Current           | Target (RSC/Server Action)         | Notes                                  |
|-------------------------------------------------|-------------------|------------------------------------|----------------------------------------|
| `app/(protected)/dashboard/page.tsx`            | Client Component  | Server Component + Client interactivity | News feed fetched in RSC               |
| `app/(protected)/stocks/[ticker]/page.tsx`      | Client Component  | Server Component + Client interactivity | Stock-specific news fetched in RSC     |
| `components/NewsCard.tsx`                       | Client Component  | Server Component (if no interactivity) | Or pass data from parent RSC           |
| `components/CommodityCard.tsx`                  | Client Component  | Server Component (if no interactivity) | Or pass data from parent RSC           |

**Post-MVP:** Full RSC/Server Actions refactoring is tracked in `product/Planning/post-mvp/RSC_SERVER_ACTIONS_REFACTOR.md`.

---

## Next Steps
1. Validate new feed URLs and document categories.
2. Add feeds to `rss-feed.dao.ts` and update tests.
3. Test API routes and verify UI coverage.
4. Fix any error handling or reliability issues.
5. Refactor touched components to RSC/Server Actions where feasible.
6. Document all changes and update this plan as complete.
