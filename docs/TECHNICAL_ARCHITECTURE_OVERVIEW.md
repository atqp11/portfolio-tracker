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

### 1. Presentation Layer (Client-Side)

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

### 2. API Layer (Server-Side)

**Pattern**: RESTful API routes with dynamic rendering

```
app/api/
├── quote/route.ts              # Stock quotes (batch/single)
├── portfolio/route.ts          # Portfolio CRUD
├── stocks/route.ts             # Stock positions CRUD
├── thesis/route.ts             # Investment theses CRUD
├── checklist/route.ts          # Daily checklist CRUD
├── fundamentals/route.ts       # Stock fundamentals (Yahoo Finance)
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

**All routes**: `export const dynamic = 'force-dynamic'`

### 3. Business Logic Layer

```
lib/
├── calculator.ts               # Portfolio calculations & risk metrics
├── metrics.ts                  # Performance metrics
├── api/                        # External API clients
│   ├── alphavantage.ts
│   ├── fmp.ts
│   ├── yahooFinance.ts
│   ├── secEdgar.ts
│   └── commodities/
├── ai/                         # AI integration
│   ├── gemini.ts
│   ├── systemInstructions.ts
│   └── context.ts
├── auth/
│   └── session.ts              # Authentication helpers
├── supabase/
│   ├── server.ts               # SSR client (RLS)
│   ├── admin.ts                # Admin client (bypass RLS)
│   └── db.ts                   # Database utilities
├── tiers/                      # Subscription & quota system
│   ├── config.ts
│   └── usage-tracker.ts
└── hooks/                      # React hooks
    └── useDatabase.ts
```

### 4. Data Layer (Supabase PostgreSQL)

**Schema**:

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

### User Portfolio View

```
1. User visits dashboard (app/page.tsx)
   ↓
2. usePortfolio() hook fetches data
   ↓
3. API route: GET /api/portfolio?type=energy
   ↓
4. Supabase query (SSR client, RLS-protected)
   ↓
5. Return portfolio + stocks
   ↓
6. Client: Fetch live quotes for stocks
   ↓
7. API route: GET /api/quote?symbols=CNQ,SU,TRMLF
   ↓
8. Check localStorage cache → if miss:
   ↓
9. Fetch from Alpha Vantage (batch API)
   ↓
10. Cache response (5min TTL)
    ↓
11. Client: Calculate portfolio value, P&L, risk metrics
    ↓
12. Render UI with live data
```

### AI Chat Query

```
1. User types: "Should I sell NVDA?"
   ↓
2. Frontend: POST /api/ai/generate
   Body: { query, portfolio: ['NVDA', 'AAPL'], userId }
   ↓
3. Backend: Check L1 cache (Redis)
   ↓
4. If miss: Generate prompt with context
   - Portfolio holdings
   - Recent prices
   - News summary
   ↓
5. Call AI model (Llama-3.1-70B via OpenRouter)
   ↓
6. Track token usage for cost monitoring
   ↓
7. Cache response (12-24h TTL)
   ↓
8. Return answer to frontend
   ↓
9. Display in StonksAI sidebar
```

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

### 1. Client-First Architecture

**Decision**: All pages use `'use client'` directive

**Rationale**:
- Real-time interactivity required
- Complex state management (sorting, filtering)
- Browser APIs (localStorage, IndexedDB)
- No SEO requirements (authenticated app)
- Offline support needed

**Trade-off**: Larger bundle size, but better UX for this use case

### 2. Aggressive Caching

**Layers**:
- **L1**: localStorage (client, 5-15min)
- **L2**: Redis (server, 12-24h)
- **L3**: Supabase (persistent, event-driven)
- **L4**: Vercel Edge (CDN, stale-while-revalidate)

**Goal**: 80%+ cache hit rate → minimize API costs

### 3. SSR vs Admin Client Pattern

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

### 4. Rate Limit Handling

**Strategy**:
1. Check in-memory tracker (`lib/rateLimitTracker.ts`)
2. If limited → return cached data (if available)
3. If no cache → return 429 with reset time
4. Frontend displays user-friendly message

### 5. Lazy Loading (AI Features)

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
