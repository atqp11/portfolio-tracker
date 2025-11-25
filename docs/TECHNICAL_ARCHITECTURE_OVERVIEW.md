# Technical Architecture Overview

> **📖 PURPOSE:** Complete high-level technical architecture for the entire Portfolio Tracker system.
> **WHEN TO USE:** Understanding the full system design, tech stack, data flow, and how all components integrate.
> **UPDATE FREQUENCY:** After major architectural changes, new subsystems added, or tech stack updates.
> **AUDIENCE:** New developers, technical leads, architects, anyone needing the big picture.

**Last Updated**: 2025-11-25
**Status**: ✅ Complete

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture Layers](#architecture-layers)
4. [Core Subsystems](#core-subsystems)
5. [Data Flow](#data-flow)
6. [External Integrations](#external-integrations)
7. [Key Design Patterns](#key-design-patterns)
8. [Detailed Documentation](#detailed-documentation)

---

## System Overview

**Portfolio Tracker** is a live portfolio management application for retail investors tracking Energy & Copper portfolios with real-time market data, AI-powered insights, risk analytics, and investment thesis tracking.

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                       │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Portfolio   │  │   AI Chat    │  │  Risk        │        │
│  │  Dashboard   │  │  (StonksAI)  │  │  Analytics   │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌────────────────────────────────────────────────────────────────┐
│                     API Routes (Next.js)                        │
│                                                                 │
│  /api/portfolio  /api/quote  /api/ai/generate  /api/risk       │
│  /api/thesis     /api/news   /api/sec-edgar    /api/checklist  │
│                                                                 │
└─────────┬──────────────────┬──────────────────┬─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│   Supabase      │  │  External APIs  │  │  AI Models       │
│   PostgreSQL    │  │  - Alpha Vantage│  │  - Llama 3.1     │
│   - Portfolios  │  │  - Polygon      │  │  - Gemini        │
│   - Stocks      │  │  - FMP          │  │  (OpenRouter)    │
│   - Users       │  │  - NewsAPI      │  │                  │
│   - Theses      │  │  - SEC EDGAR    │  │                  │
└─────────────────┘  └─────────────────┘  └──────────────────┘
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.0.3 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **UI**: React 19.2.0, Tailwind CSS
- **State Management**: React hooks, client-side state
- **Caching**: localStorage, IndexedDB
- **Charts**: D3.js, Recharts

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma (with Supabase integration)
- **Authentication**: Supabase Auth (email/password, Google OAuth)
- **Authorization**: Row-Level Security (RLS) policies

### External Services
- **Stock Data**: Alpha Vantage (primary), FMP (fallback), Polygon
- **AI**: OpenRouter (Llama-3.1-70B, Gemini), Google Gemini API
- **News**: NewsAPI, Brave Search, Finnhub
- **SEC Filings**: SEC EDGAR API, EdgarTools
- **Commodities**: Polygon (WTI, NG, Copper)

### Infrastructure
- **Hosting**: Vercel (Edge Functions, serverless)
- **Caching**: Vercel KV (Redis), Edge CDN
- **Storage**: Supabase Storage (file uploads)
- **Monitoring**: Vercel Analytics

---

## Architecture Layers

**Pattern**: MVC (Model-View-Controller) with clear separation of concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│              (React Components - Client-Side)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Controller Layer                           │
│              (API Routes - Request Handling)                 │
│  • Input validation                                          │
│  • Request/response mapping                                  │
│  • Error handling                                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│              (Business Logic & Orchestration)                │
│  • Business logic                                            │
│  • Caching strategy (Redis, localStorage)                   │
│  • Data transformation                                       │
│  • Orchestration between DAOs                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      DAO Layer                               │
│            (Data Access - Downstream Clients)                │
│  • Database clients (Prisma, Supabase)                      │
│  • External API clients (Alpha Vantage, FMP)                │
│  • Third-party integrations (Gemini AI, SEC EDGAR)          │
└─────────────────────────────────────────────────────────────┘
```

### 1. Presentation Layer (View)

**Pattern**: Client-first architecture (intentional design choice)

```
app/
├── page.tsx                    # Main portfolio dashboard ('use client')
├── layout.tsx                  # Root layout
├── (dashboard)/                # Route group for authenticated pages
│   ├── portfolio/
│   ├── holdings/
│   ├── analytics/
│   └── settings/
└── (marketing)/                # Route group for public pages
    ├── landing/
    └── pricing/
```

**Key Components**:
- `PortfolioHeader.tsx` - Portfolio summary & metrics
- `AssetCard.tsx` - Individual stock position display
- `RiskMetricsPanel.tsx` - Risk analytics visualization
- `StonksAI.tsx` - AI chat sidebar interface
- `ThesisCard.tsx` - Investment thesis tracking
- `DailyChecklistView.tsx` - Task management UI

**Why Client-First**:
- Real-time interactivity (live prices, calculations)
- Offline support (IndexedDB caching)
- Complex state management (sorting, filtering)
- Browser APIs (localStorage, notifications)
- No SEO requirements (authenticated app)

### 2. Controller Layer (Routes)

**Pattern**: RESTful API routes with request validation and error handling

**Location**: `app/api/`

```
app/api/
├── quote/route.ts              # Stock quotes (batch/single)
├── portfolio/route.ts          # Portfolio CRUD
├── stocks/route.ts             # Stock positions CRUD
├── thesis/route.ts             # Investment theses CRUD
├── checklist/route.ts          # Daily checklist CRUD
├── fundamentals/route.ts       # Stock fundamentals
├── risk-metrics/route.ts       # Portfolio risk calculations
├── ai/
│   ├── generate/route.ts       # AI text generation
│   └── chat/route.ts           # AI chat with context
├── news/
│   ├── energy/route.ts         # Energy sector news
│   └── copper/route.ts         # Copper sector news
├── commodities/
│   ├── energy/route.ts         # WTI, NG prices
│   └── copper/route.ts         # Copper prices
└── sec-edgar/route.ts          # SEC filings lookup
```

**Responsibilities**:
- HTTP request/response handling
- Input validation (query params, body)
- Authentication/authorization checks
- Delegate to Service Layer
- Error mapping to HTTP status codes
- Rate limiting enforcement

**Example Pattern**:
```typescript
// app/api/quote/route.ts (Controller)
export async function GET(request: NextRequest) {
  // 1. Extract & validate input
  const symbols = searchParams.get('symbols')?.split(',');
  if (!symbols) return NextResponse.json({ error: 'Missing symbols' }, { status: 400 });

  // 2. Delegate to Service Layer
  const quotes = await quoteService.getBatchQuotes(symbols);

  // 3. Return response
  return NextResponse.json(quotes);
}
```

### 3. Service Layer (Business Logic)

**Pattern**: Business logic, caching, and orchestration between data sources

**Location**: `lib/services/` (to be created) and existing `lib/` modules

```
lib/
├── services/                   # Service layer (business logic)
│   ├── quoteService.ts         # Stock quote orchestration + caching
│   ├── portfolioService.ts     # Portfolio calculations + aggregation
│   ├── riskMetricsService.ts   # Risk metrics computation
│   ├── newsService.ts          # News aggregation from multiple sources
│   ├── aiService.ts            # AI prompt management + caching
│   └── commodityService.ts     # Commodity price aggregation
├── calculator.ts               # Portfolio calculations & risk metrics
├── metrics.ts                  # Performance metrics
├── cache.ts                    # Client-side caching (localStorage)
├── aiCache.ts                  # AI prompt caching (Gemini)
└── rateLimitTracker.ts         # Rate limit tracking
```

**Responsibilities**:
- Business logic and calculations
- Multi-source data aggregation
- Caching strategy (check cache → fetch → cache result)
- Data transformation and mapping
- Orchestration between multiple DAOs
- Rate limit handling

**Example Pattern**:
```typescript
// lib/services/quoteService.ts (Service)
export async function getBatchQuotes(symbols: string[]) {
  // 1. Check cache
  const cached = cacheDAO.get('quotes', symbols);
  if (cached && !cacheDAO.isStale(cached)) return cached;

  // 2. Check rate limits
  if (rateLimitTracker.isLimited()) {
    return cached || fallbackDAO.getLastKnownQuotes(symbols);
  }

  // 3. Fetch from DAO
  const quotes = await alphaVantageDAO.fetchBatchQuotes(symbols);

  // 4. Cache result
  cacheDAO.set('quotes', symbols, quotes, { ttl: 300000 });

  return quotes;
}
```

### 4. DAO Layer (Data Access Objects)

**Pattern**: Downstream clients for external APIs and databases

**Location**: `lib/dao/` (to be created) and existing `lib/api/`, `lib/supabase/`

```
lib/
├── dao/                        # Data Access Objects
│   ├── database/
│   │   ├── portfolioDAO.ts     # Prisma/Supabase portfolio queries
│   │   ├── stockDAO.ts         # Stock positions queries
│   │   ├── thesisDAO.ts        # Investment thesis queries
│   │   └── checklistDAO.ts     # Checklist queries
│   ├── external/
│   │   ├── alphaVantageDAO.ts  # Alpha Vantage API client
│   │   ├── fmpDAO.ts           # FMP API client
│   │   ├── yahooFinanceDAO.ts  # Yahoo Finance scraper
│   │   ├── geminiDAO.ts        # Google Gemini API client
│   │   ├── secEdgarDAO.ts      # SEC EDGAR API client
│   │   ├── newsApiDAO.ts       # NewsAPI client
│   │   └── polygonDAO.ts       # Polygon.io client
│   └── cache/
│       ├── redisDAO.ts         # Redis cache client
│       └── localStorageDAO.ts  # Browser storage wrapper
│
├── api/                        # External API clients (existing)
│   ├── alphavantage.ts
│   ├── fmp.ts
│   ├── yahooFinance.ts
│   ├── secEdgar.ts
│   └── commodities/
├── supabase/                   # Database clients (existing)
│   ├── server.ts               # SSR client (RLS)
│   ├── admin.ts                # Admin client (bypass RLS)
│   └── db.ts                   # Database utilities
└── ai/                         # AI integration (existing)
    └── gemini.ts
```

**Responsibilities**:
- Raw data fetching (HTTP requests, DB queries)
- Connection management
- Error handling (network, timeout, auth)
- Response parsing and typing
- No business logic (pure data access)

**Example Pattern**:
```typescript
// lib/dao/external/alphaVantageDAO.ts (DAO)
export async function fetchBatchQuotes(symbols: string[]): Promise<Quote[]> {
  const url = `https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${symbols.join(',')}&apikey=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();
  return parseQuotes(data); // Transform to internal format
}
```

### 5. Data Layer (Database Schema)

**Schema**: Supabase PostgreSQL

```sql
-- Users & Authentication
profiles (id, tier, stripe_customer_id, created_at)

-- Portfolio Management
portfolios (id, user_id, name, type, initial_cash, stop_loss, take_profit)
stocks (id, portfolio_id, symbol, shares, avg_price, current_price)

-- Investment Tracking
investment_theses (id, portfolio_id, symbol, thesis, health_score)
daily_checklists (id, portfolio_id, date, completed, streak)
checklist_tasks (id, checklist_id, task, completed, priority)

-- Usage & Quota
usage_tracking (id, user_id, tier, chat_queries, portfolio_analysis, sec_filings)

-- AI Caching (Phase 2)
company_fact_sheets (ticker, cik, company_name, sector, fundamentals, financials)
filing_summaries (id, cik, filing_type, period_end, summary_text, kpis_json)
```

---

## Core Subsystems

### 1. Authentication & Authorization

**Files**: `lib/auth/session.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`

**Design**: Supabase Auth + Row-Level Security (RLS)

**Two Client Pattern**:
- **SSR Client**: User-scoped, RLS-protected (for dashboard queries)
- **Admin Client**: Bypasses RLS (for system operations, usage tracking)

**See**: `docs/ARCHITECTURE.md` for detailed tier system architecture

### 2. Stock Data Pipeline

**Files**: `lib/api/alphavantage.ts`, `lib/api/fmp.ts`, `app/api/quote/route.ts`

**Flow**:
1. Client requests quote → `/api/quote?symbols=AAPL,MSFT`
2. Check cache (localStorage 5min TTL)
3. If miss → fetch from Alpha Vantage (batch or single)
4. Rate limit handling (25 req/day limit)
5. Return data + cache

**Providers**:
- **Primary**: Alpha Vantage (supports OTC stocks like TRMLF)
- **Fallback**: FMP (250 req/day, uses `/stable` endpoints)

**See**: `docs/CLAUDE.md` → "API Provider System"

### 3. AI System (MVP)

**Files**: `lib/ai/gemini.ts`, `components/StonksAI/`, `app/api/ai/generate/`

**Current State**: Gemini 2.5 Flash (client-side caching)
**Target State**: Llama-3.1-70B via OpenRouter (4-layer caching)

**Architecture**:
```
L1: Redis Query Cache (12-24h TTL) → 60-80% hit rate
L2: Company Fact Sheets (7d TTL) → 95%+ cumulative
L3: Filing Summaries (30d TTL) → 98%+ cumulative
L4: Vercel Edge Cache → <200ms stale responses
```

**See**: `docs/AI_SYSTEM_DESIGN_MVP.md` for implementation guide

### 4. Risk Analytics

**Files**: `lib/calculator.ts`, `lib/metrics.ts`, `app/api/risk-metrics/`

**Metrics**:
- Sharpe Ratio
- Sortino Ratio
- Alpha, Beta
- Calmar Ratio
- Max Drawdown
- Value at Risk (VaR)

**Calculation**: Server-side (API route) + client-side display

### 5. Tier & Quota System

**Files**: `lib/tiers/config.ts`, `lib/tiers/usage-tracker.ts`

**Tiers**:
- **Free**: $0/mo (10 chat/day, 1 analysis/day, 3 filings/mo)
- **Basic**: $9.99/mo (100 chat/day, 10 analysis/day, unlimited filings)
- **Premium**: $19.99/mo (unlimited everything)

**Enforcement**: Cache-first (cached responses don't count), lazy resets (no cron jobs)

**See**: `docs/ARCHITECTURE.md` for complete tier system design

### 6. News & Market Data

**Files**: `lib/api/news/`, `lib/api/commodities/`

**Sources**:
- NewsAPI (top headlines)
- Brave Search (web scraping)
- Finnhub (financial news)
- Polygon (commodity prices: WTI, NG, Copper)

**Caching**: 24-72 hours (news), 5 minutes (commodities)

---

## Data Flow

**Pattern**: Routes → Service → DAO (MVC Architecture)

### Example 1: User Portfolio View

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION (Client)                                     │
│    User visits dashboard (app/page.tsx)                      │
│    usePortfolio() hook triggers API call                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER (Route)                                        │
│    GET /api/portfolio?type=energy                            │
│    • Validate query params                                   │
│    • Check authentication                                    │
│    • Call portfolioService.getPortfolio('energy')            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE (Business Logic)                                  │
│    portfolioService.getPortfolio('energy')                   │
│    • Check cache (localStorage/Redis)                        │
│    • If miss: Call portfolioDAO.findByType('energy')         │
│    • Calculate aggregated metrics                            │
│    • Format response                                         │
│    • Cache result (5min TTL)                                 │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DAO (Data Access)                                         │
│    portfolioDAO.findByType('energy')                         │
│    • Execute Prisma query                                    │
│    • Query Supabase (SSR client, RLS-protected)              │
│    • Return raw data                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN PATH                                               │
│    DAO → Service → Controller → Client                       │
│    • Service transforms data                                 │
│    • Controller returns JSON response                        │
│    • Client renders UI with data                             │
└─────────────────────────────────────────────────────────────┘
```

### Example 2: Stock Quote Fetching

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION (Client)                                     │
│    useQuotes() hook requests live prices                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER (Route)                                        │
│    GET /api/quote?symbols=CNQ,SU,TRMLF                       │
│    • Validate symbols parameter                              │
│    • Check rate limiting                                     │
│    • Call quoteService.getBatchQuotes(['CNQ','SU','TRMLF'])  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE (Business Logic + Caching)                        │
│    quoteService.getBatchQuotes(symbols)                      │
│    • Check L1 cache (localStorage) → 5min TTL                │
│    • Check L2 cache (Redis) → 15min TTL                      │
│    • If cache miss:                                          │
│      - Check rate limits (25 req/day)                        │
│      - Determine provider (Alpha Vantage vs FMP)             │
│      - Call alphaVantageDAO.fetchBatchQuotes(symbols)        │
│    • Cache result at both levels                             │
│    • Transform to standard Quote format                      │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DAO (External API Client)                                 │
│    alphaVantageDAO.fetchBatchQuotes(symbols)                 │
│    • Build API URL                                           │
│    • Execute HTTP request                                    │
│    • Handle errors (network, timeout, auth)                  │
│    • Parse response                                          │
│    • Return typed Quote[] objects                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN PATH                                               │
│    DAO → Service → Controller → Client                       │
│    • Service caches data                                     │
│    • Controller returns HTTP 200 with quotes                 │
│    • Client calculates portfolio P&L                         │
│    • Client renders updated UI                               │
└─────────────────────────────────────────────────────────────┘
```

### Example 3: AI Chat Query

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION (Client)                                     │
│    User types: "Should I sell NVDA?"                         │
│    StonksAI component submits query                          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. CONTROLLER (Route)                                        │
│    POST /api/ai/generate                                     │
│    Body: { query, portfolio: ['NVDA', 'AAPL'], userId }     │
│    • Validate request body                                   │
│    • Check usage quota (tier limits)                         │
│    • Call aiService.generateResponse(query, context)         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE (Business Logic + Orchestration)                  │
│    aiService.generateResponse(query, context)                │
│    • Check L1 cache (Redis query cache) → 12-24h TTL         │
│    • If cache miss:                                          │
│      - Gather context data:                                  │
│        · Call portfolioDAO.getHoldings(userId)               │
│        · Call quoteDAO.getCurrentPrices(symbols)             │
│        · Call newsDAO.getRecentNews('NVDA')                  │
│      - Build system prompt with context                      │
│      - Call geminiDAO.generate(prompt)                       │
│    • Track token usage for billing                           │
│    • Cache response (12-24h TTL)                             │
│    • Update usage tracking                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. DAO (Multiple External Clients)                           │
│    • geminiDAO.generate(prompt) → Google Gemini API          │
│    • portfolioDAO.getHoldings(userId) → Supabase             │
│    • quoteDAO.getCurrentPrices(symbols) → Alpha Vantage      │
│    • newsDAO.getRecentNews('NVDA') → NewsAPI                 │
│    Each DAO handles:                                         │
│    • API/database connection                                 │
│    • Error handling                                          │
│    • Response parsing                                        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. RETURN PATH                                               │
│    DAOs → Service → Controller → Client                      │
│    • Service aggregates multi-source data                    │
│    • Controller returns AI response                          │
│    • Client displays in StonksAI sidebar                     │
└─────────────────────────────────────────────────────────────┘
```

### Key Flow Principles

1. **Separation of Concerns**:
   - Controllers handle HTTP (validation, auth, errors)
   - Services handle business logic (caching, orchestration)
   - DAOs handle data access (API calls, DB queries)

2. **Caching Strategy**:
   - Check cache at Service layer (not DAO)
   - Multi-level caching (L1: localStorage/Redis, L2: Database)
   - Cache-first approach to minimize API costs

3. **Error Handling**:
   - DAOs throw raw errors (network, timeout, auth)
   - Services transform errors (add context, fallback data)
   - Controllers map errors to HTTP status codes

4. **Data Transformation**:
   - DAOs return raw external formats
   - Services transform to internal domain models
   - Controllers return API-formatted responses

5. **Orchestration**:
   - Services coordinate multiple DAO calls
   - DAOs are single-purpose (one API or table)
   - Controllers delegate to single Service method

---

## External Integrations

### Stock Market Data

| Provider | Use Case | Rate Limit | Cost |
|----------|----------|------------|------|
| **Alpha Vantage** | Stock quotes (primary) | 25 req/day | Free |
| **FMP** | Stock quotes (fallback) | 250 req/day | Free tier |
| **Polygon** | Commodity prices | 5 req/min | Free tier |
| **Yahoo Finance** | Fundamentals | Unlimited | Free (scraping) |

### News & Filings

| Provider | Use Case | Rate Limit | Cost |
|----------|----------|------------|------|
| **NewsAPI** | Top headlines | 100 req/day | Free |
| **Brave Search** | Web search | 2000 req/mo | Free tier |
| **Finnhub** | Financial news | 60 req/min | Free tier |
| **SEC EDGAR** | 10-K, 10-Q, 8-K filings | 10 req/sec | Free |

### AI Models

| Provider | Model | Use Case | Cost |
|----------|-------|----------|------|
| **OpenRouter** | Llama-3.1-70B | Primary AI (MVP) | $0.59/$0.79 per 1M tokens |
| **OpenRouter** | DeepSeek-R1-Qwen-7B | Cheap fallback | $0.14/$0.28 per 1M tokens |
| **OpenRouter** | Claude-3.5-Sonnet | Complex reasoning | $3/$15 per 1M tokens |
| **Google** | Gemini 2.5 Flash | Current (MVP) | $0.075/$0.30 per 1M tokens |

---

## Key Design Patterns

### 1. MVC Architecture (Routes → Service → DAO)

**Pattern**: Model-View-Controller with clear layer separation

**Structure**:
```
View (Presentation)
  ↓ API calls
Controller (Routes)
  ↓ Delegates to
Service (Business Logic)
  ↓ Calls
DAO (Data Access)
  ↓ Returns to
Model (Domain Objects)
```

**Benefits**:
- **Testability**: Each layer can be tested independently
- **Maintainability**: Changes to one layer don't affect others
- **Reusability**: Services can be called from multiple routes
- **Scalability**: Easy to add caching, logging, monitoring at Service layer

**Layer Responsibilities**:

| Layer | Responsibility | Example |
|-------|---------------|---------|
| **Controller** | HTTP handling, validation, auth | `app/api/quote/route.ts` |
| **Service** | Business logic, caching, orchestration | `lib/services/quoteService.ts` |
| **DAO** | Data access (APIs, DB) | `lib/dao/external/alphaVantageDAO.ts` |

**Anti-Patterns to Avoid**:
- ❌ Calling DAOs directly from Controllers (bypass Service layer)
- ❌ Business logic in DAOs (should be pure data access)
- ❌ Caching in DAOs (should be in Service layer)
- ❌ HTTP concerns in Services (status codes, headers)

### 2. Client-First Architecture

**Decision**: All pages use `'use client'` directive

**Rationale**:
- Real-time interactivity required
- Complex state management (sorting, filtering)
- Browser APIs (localStorage, IndexedDB)
- No SEO requirements (authenticated app)
- Offline support needed

**Trade-off**: Larger bundle size, but better UX for this use case

### 3. Aggressive Caching

**Layers**:
- **L1**: localStorage (client, 5-15min)
- **L2**: Redis (server, 12-24h)
- **L3**: Supabase (persistent, event-driven)
- **L4**: Vercel Edge (CDN, stale-while-revalidate)

**Goal**: 80%+ cache hit rate → minimize API costs

### 4. SSR vs Admin Client Pattern

**SSR Client** (`lib/supabase/server.ts`):
- Uses anon key
- Respects RLS
- User-scoped queries
- **Use for**: Dashboard, user data

**Admin Client** (`lib/supabase/admin.ts`):
- Uses service role key
- Bypasses RLS
- System-level operations
- **Use for**: Usage tracking, background jobs

### 5. Rate Limit Handling

**Strategy**:
1. Check in-memory tracker (`lib/rateLimitTracker.ts`)
2. If limited → return cached data (if available)
3. If no cache → return 429 with reset time
4. Frontend displays user-friendly message

### 6. Lazy Loading (AI Features)

**Pattern**: Generate on-demand, cache forever

**Example**: SEC Filing Summaries
1. User requests filing for AAPL 10-K Q3 2024
2. Check L3 cache (Supabase `filing_summaries`)
3. If miss:
   - Fetch raw filing from EDGAR (8-10 seconds)
   - Summarize with LLM (Llama-3.1-70B)
   - Cache for 30 days
4. All future requests: instant (<300ms)

**Cost**: 100x cheaper than pre-computing all filings

---

## Detailed Documentation

For deep dives into specific subsystems, see:

### System Architecture
- **`ARCHITECTURE.md`** - Tier system, quota enforcement, RLS, SSR vs Admin clients
- **`CLAUDE.md`** - Complete development guide, code conventions, Next.js patterns

### Feature Planning
- **`SPRINT_STORIES_TASKS_TRACKING.md`** - Current sprint tasks (daily reference)
- **`FEATURE_ROADMAP.md`** - Long-term roadmap (Phases 0-4, Weeks 1-20)

### AI Implementation
- **`AI_SYSTEM_DESIGN_MVP.md`** - ✅ Use this for MVP AI development
- **`AI_SYSTEM_DESIGN_FULL_FEATURE_COMPLETE.md`** - Phase 2 reference (RAG, vector DB)

### Project Info
- **`README.md`** - Public-facing overview, deployment guide

---

## Quick Start for New Developers

1. **Read this document** - Understand the big picture
2. **Read `CLAUDE.md`** - Development guidelines, conventions
3. **Check `SPRINT_STORIES_TASKS_TRACKING.md`** - See current work
4. **Review `ARCHITECTURE.md`** - Understand tier/quota system
5. **Setup local environment**:
   ```bash
   npm install
   cp .env.local.example .env.local  # Add API keys
   npx prisma generate
   npm run dev
   ```

---

## Architecture Decisions

### Why Next.js 16 (App Router)?
- Modern React patterns (Server Components available if needed)
- Turbopack for fast builds
- Built-in API routes
- Vercel deployment optimization

### Why Supabase over Vercel Postgres?
- Auth + Database in one platform ($25/mo vs $24/mo + auth)
- 50K MAU free tier (vs smaller limits)
- Real-time subscriptions (future use)
- Row-Level Security built-in
- Open source, self-hostable

### Why Client-First over Server Components?
- This is an **interactive dashboard**, not a content site
- Real-time updates, complex state, offline support
- No SEO requirements (authenticated app)
- **Intentional design choice** (see `CLAUDE.md`)

### Why OpenRouter over Direct APIs?
- Single API key for all models
- Auto-fallback on rate limits/errors
- Cost optimization (cheaper models)
- No infrastructure management

---

**Last Updated**: 2025-11-25
**Maintainer**: Development Team
**Review Frequency**: After major architectural changes
