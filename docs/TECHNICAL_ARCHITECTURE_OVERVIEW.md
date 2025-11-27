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
3. [Database Management & Client Usage](#database-management--client-usage)
4. [Architecture Layers](#architecture-layers)
5. [Client-Side & Server-Side Storage & Caching Strategy](#client-side--server-side-storage--caching-strategy)
6. [Core Subsystems](#core-subsystems)
7. [Data Flow](#data-flow)
8. [External Integrations](#external-integrations)
9. [Key Design Patterns](#key-design-patterns)
10. [Detailed Documentation](#detailed-documentation)

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

## Database Management & Client Usage

### 🎯 Source of Truth: Supabase PostgreSQL

**⚠️ CRITICAL: Supabase PostgreSQL is the single source of truth for the database schema.**

This project uses a **hybrid database approach** combining Prisma and Supabase clients pointing to the **same Supabase PostgreSQL database**.

```
┌─────────────────────────────────────────────────────────────┐
│                    Your Application                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Supabase Client (lib/supabase/server.ts)                   │
│  • RLS Enforced ✅                                           │
│  • User-facing operations                                    │
│  • Automatic data isolation                                  │
│                                                              │
│  Prisma Client (lib/prisma.ts)                              │
│  • RLS Bypassed ⚠️                                           │
│  • Admin/backend operations                                  │
│  • Full type safety & autocomplete                           │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│         Supabase PostgreSQL (Single Database)                │
└─────────────────────────────────────────────────────────────┘
```

### Database Change Workflow

**All database schema changes follow this process:**

```
1. Make Changes in Supabase
   ↓
   • Create/modify tables in Supabase Dashboard or SQL Editor
   • Add/update RLS policies
   • Create indexes, constraints
   • Apply migrations via Supabase CLI

2. Pull Schema to Prisma
   ↓
   npx prisma db pull
   • Syncs prisma/schema.prisma with Supabase database
   • Updates automatically based on current DB state

3. Regenerate Prisma Client
   ↓
   npx prisma generate
   • Updates TypeScript types
   • Enables autocomplete in IDE
   • Generates type-safe query API

4. Commit Schema Changes
   ↓
   git add prisma/schema.prisma
   git commit -m "chore: sync Prisma schema with Supabase"
```

**What NOT to Do:**

- ❌ `npx prisma migrate dev` - Don't use Prisma migrations
- ❌ `npx prisma db push` - Don't push Prisma schema to database
- ❌ Manually edit `prisma/schema.prisma` (except Prisma config like `previewFeatures`)
- ❌ Create files in `prisma/migrations/` - Migrations managed by Supabase

### Decision Matrix: Which Client to Use?

| Scenario | Client to Use | Reason |
|----------|---------------|--------|
| User viewing their portfolios | **Supabase** | RLS ensures they only see their own data |
| User creating/updating stocks | **Supabase** | RLS automatically sets `user_id` correctly |
| User updating their profile | **Supabase** | RLS prevents updating other users' data |
| Admin viewing all users | **Prisma** | Need to bypass RLS to see all data |
| Admin changing user tier | **Prisma** | Direct database access required |
| Background job updating prices | **Prisma** | No auth context, batch operations |
| Cron job analytics | **Prisma** | Cross-user aggregations needed |
| Complex queries with joins | **Prisma** | Better type safety, autocomplete, relation loading |

### When to Use Supabase Client

**Use Cases:**
- User-facing API routes
- Operations requiring authentication
- Row-Level Security (RLS) enforcement
- User can only access their own data
- Real-time subscriptions (future feature)

**Example:**

```typescript
// app/api/portfolios/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // RLS automatically filters to current user's portfolios
  const { data: portfolios, error } = await supabase
    .from('portfolios')
    .select('*, stocks(*), investment_theses(*)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(portfolios);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // RLS ensures user_id is validated
  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.id, // Required for RLS
      name: body.name,
      type: body.type,
      initial_value: body.initialValue,
      target_value: body.targetValue,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

**Why Supabase Client:**
- ✅ RLS ensures automatic data isolation between users
- ✅ Built-in authentication context
- ✅ Can't accidentally query other users' data
- ✅ Real-time capabilities available (if needed)
- ✅ Respects security policies defined in database

### When to Use Prisma Client

**Use Cases:**
- Admin panel routes
- Background jobs (cron tasks, batch operations)
- Cross-user analytics queries
- No user authentication context
- Complex TypeScript types and autocomplete needed
- Efficient relation loading required

**Example:**

```typescript
// app/api/admin/users/route.ts
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin (using Supabase for auth check)
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  // Use Prisma to get ALL users (bypasses RLS)
  const users = await prisma.user.findMany({
    include: {
      portfolios: {
        include: {
          stocks: true,
        },
      },
      usage: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return NextResponse.json(users);
}
```

**Why Prisma Client:**
- ✅ Type-safe queries with full autocomplete
- ✅ Auto-generated TypeScript types
- ✅ Better developer experience (DX)
- ✅ Efficient relation loading with `.include()`
- ✅ Complex aggregations and grouping
- ✅ Can query across all users (admin operations)

### Security Checklist

#### ✅ When Using Supabase Client

- **Always get user from session**: `const { data: { user } } = await supabase.auth.getUser()`
- **Let RLS do the work**: Don't manually filter by `user_id` (RLS does it automatically)
- **Trust RLS policies**: Supabase ensures data isolation at database level
- **Never use service role for user operations**: Only for admin operations
- **Always check authentication**: Return 401 if no user

#### ⚠️ When Using Prisma Client

- **RLS is BYPASSED**: You have direct database access
- **Always check auth manually**: Verify `userId` matches authenticated user
- **Use for admin operations only**: When you explicitly need to bypass RLS
- **Use for background jobs**: When there's no user authentication context
- **Never expose to client**: Prisma client stays server-side only

**Critical Security Example:**

```typescript
// ❌ SECURITY VULNERABILITY - No auth check with Prisma
const portfolio = await prisma.portfolio.findUnique({
  where: { id: portfolioId },
});
// ↑ Returns ANY user's portfolio!

// ✅ CORRECT - Manual auth check required
const portfolio = await prisma.portfolio.findUnique({
  where: {
    id: portfolioId,
    userId: currentUser.id, // ← REQUIRED when using Prisma for user data
  },
});
```

### Common Gotchas

#### 1. Prisma Decimal vs JavaScript Number

```typescript
// ❌ WRONG - Decimal arithmetic doesn't work like numbers
const total = portfolio.initialValue + portfolio.targetValue; // String concatenation!

// ✅ CORRECT - Convert to number first
const total = Number(portfolio.initialValue) + Number(portfolio.targetValue);

// ✅ ALSO CORRECT - Use Decimal.js
import { Decimal } from '@prisma/client/runtime/library';
const total = new Decimal(portfolio.initialValue)
  .plus(portfolio.targetValue)
  .toNumber();
```

#### 2. Manual User ID Check with Prisma

```typescript
// ❌ SECURITY ISSUE - No ownership verification
const portfolio = await prisma.portfolio.findUnique({
  where: { id: portfolioId },
});

// ✅ CORRECT - Always verify ownership
const portfolio = await prisma.portfolio.findUnique({
  where: {
    id: portfolioId,
    userId: user.id, // ← Required for user data access
  },
});
```

#### 3. Supabase Service Role Bypass

```typescript
// ❌ SECURITY ISSUE - Service role bypasses RLS
import { createAdminClient } from '@/lib/supabase/admin';
const supabase = createAdminClient();
const { data } = await supabase.from('portfolios').select('*');
// ↑ Returns ALL portfolios from ALL users!

// ✅ CORRECT - Use regular client for user operations
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
const { data } = await supabase.from('portfolios').select('*');
// ↑ RLS filters to current user
```

### Type Safety Comparison

**Prisma (Excellent):**

```typescript
import { prisma } from '@/lib/prisma';

// ✅ Full autocomplete and type inference
const portfolio = await prisma.portfolio.findUnique({
  where: { id: portfolioId },
  include: {
    stocks: true,      // ← IDE suggests 'stocks'
    theses: true,      // ← IDE suggests 'theses'
    user: {
      select: {
        email: true,   // ← Nested autocomplete works
        tier: true,
      },
    },
  },
});

// ✅ TypeScript knows the exact shape
portfolio?.initialValue; // Decimal
portfolio?.stocks;       // Stock[]
portfolio?.user?.email;  // string | undefined
```

**Supabase (Manual Types):**

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Portfolio } from '@/lib/supabase/db';

const supabase = await createClient();

// ⚠️ Need to cast or use manual type annotations
const { data } = await supabase
  .from('portfolios')
  .select('*, stocks(*)')
  .single();

// Use TypeScript interfaces from lib/supabase/db.ts
const portfolio = data as Portfolio & { stocks: Stock[] };
```

### Schema Synchronization

**On Local Development:**

```bash
# After pulling latest code with schema changes:
npm install              # Install dependencies
npx prisma generate      # Regenerate Prisma client with new types

# When you make database changes in Supabase:
# 1. Make changes in Supabase Dashboard or SQL Editor
# 2. Pull schema to Prisma
npx prisma db pull       # Sync schema from Supabase
npx prisma generate      # Update TypeScript types
git add prisma/schema.prisma
git commit -m "chore: sync Prisma schema with Supabase"
```

**On Deployment (Vercel/Cloud):**

Automated via `package.json` scripts (configured below).

**Verifying Schema Sync:**

```bash
# Check if Prisma schema matches Supabase database
npx prisma db pull

# Check for changes
git status prisma/schema.prisma

# If no changes → schemas are in sync ✅
# If changes detected → commit updated schema
```

### Team Workflow

1. **Developer A** makes DB change in Supabase Dashboard
2. **Developer A** runs `npx prisma db pull && npx prisma generate`
3. **Developer A** commits `prisma/schema.prisma` changes to git
4. **Developer B** pulls code from git
5. **Developer B** runs `npx prisma generate` to update local types

### Benefits of Hybrid Approach

| Feature | Prisma | Supabase |
|---------|--------|----------|
| **Type Safety** | ✅ Excellent (auto-generated) | ⚠️ Manual (need type definitions) |
| **RLS Security** | ❌ Bypassed (manual checks required) | ✅ Enforced automatically |
| **Autocomplete** | ✅ Full IDE support | ⚠️ Limited |
| **Relations** | ✅ `.include()`, `.select()` | ⚠️ Manual joins with `*` syntax |
| **Migrations** | ❌ Not used (Supabase manages) | ✅ Via Supabase Dashboard/CLI |
| **Performance** | ✅ Fast | ✅ Fast |
| **Use For** | Admin, Backend, Analytics | User operations, Frontend |

**Combined Benefits:**
- ✅ Type safety (Prisma) + Security (Supabase RLS)
- ✅ Developer experience (Prisma) + Platform features (Supabase Auth)
- ✅ One database, two interfaces for different use cases
- ✅ Best of both worlds without compromise

### Migration Files

**Note**: This project does NOT use Prisma migrations.

- **Prisma migrations**: Not used (can delete `prisma/migrations/` if it exists)
- **Supabase migrations**: Managed via Supabase Dashboard or Supabase CLI
- **RLS policies**: Defined in Supabase (separate from schema)
- **Schema source**: Supabase PostgreSQL is the source of truth

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
├── mappers/                    # Data transformation layer
│   ├── stockMapper.ts          # Entity ↔ Domain Model ↔ DTO
│   ├── portfolioMapper.ts      # Entity ↔ Domain Model ↔ DTO
│   ├── quoteMapper.ts          # External DTO → Domain Model
│   └── aiMapper.ts             # Request/Response DTO transformations
├── calculator.ts               # Portfolio calculations & risk metrics
├── metrics.ts                  # Performance metrics
├── cache.ts                    # Client-side caching (localStorage)
├── aiCache.ts                  # AI prompt caching (Gemini)
└── rateLimitTracker.ts         # Rate limit tracking

types/
├── dto/                        # Data Transfer Objects
│   ├── request/                # API Request DTOs
│   ├── response/               # API Response DTOs
│   └── external/               # External API DTOs
├── models/                     # Domain Models (business objects)
│   ├── Stock.ts
│   ├── Quote.ts
│   └── Portfolio.ts
└── entities/                   # Database Entities (Prisma re-exports)
    └── index.ts
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
import { Quote } from '@/types/models/Quote';
import { alphaVantageDAO } from '@/lib/dao/external/alphaVantageDAO';
import { cacheDAO } from '@/lib/dao/cache/cacheDAO';

export async function getBatchQuotes(symbols: string[]): Promise<Quote[]> {
  // 1. Check cache (returns Domain Models)
  const cached = await cacheDAO.get<Quote[]>('quotes', symbols);
  if (cached && !cacheDAO.isStale(cached)) return cached;

  // 2. Check rate limits
  if (rateLimitTracker.isLimited()) {
    return cached || [];
  }

  // 3. Fetch from DAO (DAO returns Domain Models)
  const quotes: Quote[] = await alphaVantageDAO.fetchBatchQuotes(symbols);

  // 4. Cache Domain Models
  await cacheDAO.set('quotes', symbols, quotes, { ttl: 300000 });

  // 5. Return Domain Models to Controller
  return quotes;
}
```

**With Mappers**:
```typescript
// lib/mappers/quoteMapper.ts
import { Quote } from '@/types/models/Quote';
import { QuoteResponse } from '@/types/dto/response/QuoteResponse';
import { AlphaVantageQuoteDTO } from '@/types/dto/external/AlphaVantageDTO';

export function fromAlphaVantageDTO(dto: AlphaVantageQuoteDTO): Quote {
  return {
    symbol: dto['01. symbol'],
    price: parseFloat(dto['05. price']),
    change: parseFloat(dto['09. change']),
    changePercent: parseFloat(dto['10. change percent'].replace('%', '')),
    timestamp: new Date()
  };
}

export function toQuoteResponse(model: Quote): QuoteResponse {
  return {
    symbol: model.symbol,
    price: model.price,
    change: model.change,
    changePercent: model.changePercent,
    timestamp: model.timestamp.toISOString()
  };
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
import { Quote } from '@/types/models/Quote';
import { AlphaVantageQuoteDTO } from '@/types/dto/external/AlphaVantageDTO';
import { fromAlphaVantageDTO } from '@/lib/mappers/quoteMapper';

export async function fetchBatchQuotes(symbols: string[]): Promise<Quote[]> {
  // 1. Build API URL
  const url = `https://www.alphavantage.co/query?function=BATCH_STOCK_QUOTES&symbols=${symbols.join(',')}&apikey=${apiKey}`;

  // 2. Execute HTTP request
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  // 3. Parse External DTO
  const data: AlphaVantageQuoteDTO[] = await response.json();

  // 4. Transform External DTO → Domain Model using mapper
  const quotes: Quote[] = data.map(fromAlphaVantageDTO);

  // 5. Return Domain Models (not raw DTOs)
  return quotes;
}
```

**Key Principle**: DAOs return Domain Models, not raw external DTOs. The transformation happens in the DAO using mappers.

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

## Client-Side & Server-Side Storage & Caching Strategy

### 4.1 LocalStorage vs IndexedDB

| Feature                     | LocalStorage                                   | IndexedDB                                              |
|-----------------------------|------------------------------------------------|--------------------------------------------------------|
| API type                    | Synchronous key-value                          | Asynchronous NoSQL object store                        |
| Data types                  | Strings only (JSON.stringify/parse)            | Native objects, Blob, File, ArrayBuffer                |
| Typical limit               | 5–10 MB per origin                             | 50–60 % of disk space (hundreds of MB–GB)              |
| Performance                 | Fast for tiny data, blocks UI thread           | Non-blocking, excellent for large/complex data        |
| Query & indexing            | Key lookup only                                | Indexes, range queries, cursors, multi-entry indexes   |
| Persistence                 | Until explicitly cleared                      | Until explicitly cleared                               |
| Location on disk            | Browser profile → Storage/LocalStorage         | Browser profile → IndexedDB                            |
| Recommended wrapper         | Native API sufficient                          | **idb** or **Dexie.js** (strongly recommended)         |

### 4.2 Decision Matrix – Client-Side Storage

| Use Case                                    | Recommended Storage       | Rationale                                                                 |
|---------------------------------------------|---------------------------|---------------------------------------------------------------------------|
| Auth/refresh tokens                         | HttpOnly + Secure cookies (fallback: LocalStorage) | Prevents XSS theft                                                       |
| User preferences, theme, UI flags           | LocalStorage              | Small, simple, frequent access                                            |
| Feature flags, A/B tests                    | LocalStorage              | Tiny payload                                                              |
| Offline data (tasks, notes, drafts)         | IndexedDB                 | Structured, large volume                                                  |
| Large API response caching                  | IndexedDB                 | Full object support, no practical size limit                              |
| Images, PDFs, file blobs                    | IndexedDB                 | Native Blob/File support                                                  |
| PWA offline shell & assets                  | IndexedDB + Cache API     | Required for true offline-first experience                                |

### 4.3 Best Practices

**LocalStorage**
- Never store raw secrets/tokens when HttpOnly cookies are possible
- Wrap all operations in `try/catch` (QuotaExceededError crashes otherwise)
- Prefix keys: `appname:module:key`
- Keep total usage < 4 MB

**IndexedDB**
- Always use `idb` or `Dexie.js` promise wrapper
- Create indexes on frequently filtered/sorted fields
- Implement versioned schema migrations
- Prune stale data periodically
- Batch writes in transactions

### 4.4 Caching Layers Overview

| Layer                | Technology                          | Scope              | Typical TTL          | Primary Use Cases                                      |
|----------------------|-------------------------------------|--------------------|----------------------|--------------------------------------------------------|
| Browser (per user)   | LocalStorage / IndexedDB            | User-specific      | Session → years      | Offline data, preferences, personal caches             |
| Browser assets       | Cache API (Service Worker)          | All users          | Months → immutable   | JS/CSS bundles, images, PWA shell                      |
| Edge/CDN             | Cloudflare / Fastly / Akamai        | Global             | Minutes → forever    | Static assets, public API responses                    |
| Application instance | In-process memory (Node.js/Map)     | Single instance    | Seconds → minutes    | Per-instance query results                             |
| Distributed cache    | **Redis** (Redis Cloud, Dragonfly)  | All instances      | 10 s → hours         | Shared data, sessions, rate limiting, leaderboards    |

### 4.5 When to Use Redis (Distributed Cache)

| Scenario                                      | Why Redis Wins                                                       |
|-----------------------------------------------|----------------------------------------------------------------------|
| Session storage (multi-instance backend)      | Fast key lookup + automatic expiry                                   |
| Shared API response caching                   | Expensive DB results used by many users (e.g., catalogs, configs)    |
| Rate limiting & abuse prevention              | Atomic `INCR` + `EXPIRE`                                             |
| Real-time features (chat, live updates)       | Built-in Pub/Sub                                                     |
| Background job queues                         | Reliable lists / Redis Streams (BullMQ, Sidekiq, etc.)               |
| Leaderboards & rankings                       | Native sorted sets (`ZADD`, `ZRANGE`)                                |

### 4.6 Recommended Architecture (2025)

```text
┌──────────────────────┐      ┌──────────────────────┐
│   CDN (Cloudflare)   │      │   Cache API (SW)     │   ← Static assets, immutable bundles
└──────────────────────┘      └──────────────────────┘
           │                            │
           ▼                            ▼
   Shared, frequent data        User-specific large data
           │                            │
           ▼                            ▼
       Redis (TTL 30s–15min)    ←  IndexedDB (idb/Dexie)
                                        ▲
                                        │
                                 Small prefs & flags
                                        │
                                        ▼
                                 LocalStorage (or HttpOnly cookies)
```

### 4.7 Summary Recommendation

- **Use LocalStorage only** for tiny, non-sensitive, user-specific settings
- **Default to IndexedDB** for any offline capability or datasets > 50 KB
- **Use Redis** whenever data is shared across users/servers and needs sub-millisecond access
- **Prefer HttpOnly + Secure cookies** for authentication tokens when possible

This layered strategy delivers maximum performance, offline resilience, horizontal scalability, and security while keeping implementation complexity manageable.

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

**See**: `docs/features/AI_SYSTEM_DESIGN_MVP.md` for implementation guide

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

### Example 4: Complete Data Flow with All Data Types

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT                                                       │
│ Sends: { symbol: "AAPL", shares: 100 }                      │
└─────────────────┬───────────────────────────────────────────┘
                  │ Request DTO
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ CONTROLLER (app/api/stocks/route.ts)                        │
│ 1. Validate Request DTO                                      │
│    const req: CreateStockRequest = await request.json()     │
│ 2. Transform to Domain Model                                 │
│    const stock: Stock = toStockModel(req)                   │
│ 3. Call Service                                              │
│    const saved = await stockService.create(stock)           │
│ 4. Transform to Response DTO                                 │
│    const res: StockResponse = toStockResponse(saved)        │
│ 5. Return Response                                           │
└─────────────────┬───────────────────────────────────────────┘
                  │ Domain Model (Stock)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ SERVICE (lib/services/stockService.ts)                      │
│ 1. Business logic validation                                 │
│    validateBusinessRules(stock)                              │
│ 2. Check if stock already exists                             │
│    const existing = await stockDAO.findBySymbol(...)        │
│ 3. Calculate initial metrics                                 │
│    stock.totalCost = stock.shares * stock.avgPrice          │
│ 4. Save via DAO                                              │
│    const entity = await stockDAO.create(stock)              │
│ 5. Transform Entity → Domain Model                           │
│    const model = toStockModel(entity)                       │
│ 6. Return Domain Model                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │ Domain Model (Stock)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ DAO (lib/dao/database/stockDAO.ts)                          │
│ 1. Transform Domain Model → Prisma Input                     │
│    const data = toPrismaInput(stock)                        │
│ 2. Execute database query                                    │
│    const entity = await prisma.stock.create({ data })       │
│ 3. Return Entity/Record (Prisma model)                       │
│    return entity as StockEntity                              │
└─────────────────┬───────────────────────────────────────────┘
                  │ Entity (Prisma Stock)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ DATABASE (Supabase PostgreSQL)                               │
│ stocks table:                                                │
│ {                                                            │
│   id: "abc123",                                              │
│   symbol: "AAPL",                                            │
│   shares: 100,                                               │
│   avgPrice: Decimal(150.00),                                 │
│   portfolioId: "xyz789"                                      │
│ }                                                            │
└─────────────────────────────────────────────────────────────┘

Return Path (bottom to top):
Entity → Service (transforms to Model) → Controller (transforms to Response DTO) → Client
```

**Data Types at Each Stage:**

| Stage | Data Type | Example |
|-------|-----------|---------|
| Client → Controller | `CreateStockRequest` (Request DTO) | `{ symbol: "AAPL", shares: 100 }` |
| Controller → Service | `Stock` (Domain Model) | `{ symbol: "AAPL", shares: 100, avgPrice: 150 }` |
| Service → DAO | `Stock` (Domain Model) | Same as above |
| DAO → Database | `Prisma.StockCreateInput` | Prisma-formatted object |
| Database → DAO | `StockEntity` (Prisma model) | `{ id: "abc", avgPrice: Decimal(...) }` |
| DAO → Service | `Stock` (Domain Model) | `{ id: "abc", avgPrice: 150.00 }` |
| Service → Controller | `Stock` (Domain Model) | Same as above |
| Controller → Client | `StockResponse` (Response DTO) | `{ id: "abc", totalValue: 15000 }` |

### Key Flow Principles

1. **Separation of Concerns**:
   - Controllers handle HTTP (validation, auth, errors)
   - Services handle business logic (caching, orchestration)
   - DAOs handle data access (API calls, DB queries)
   - Mappers handle transformations (DTOs ↔ Models ↔ Entities)

2. **Data Type Boundaries**:
   - **Request/Response DTOs**: Only in Controllers
   - **Domain Models**: Passed between Controller ↔ Service ↔ DAO
   - **Entities/Records**: Only in DAOs (transformed to Models before returning)
   - **External DTOs**: Only in external DAOs (transformed to Models)

3. **Caching Strategy**:
   - Check cache at Service layer (not DAO)
   - Cache Domain Models (not DTOs or Entities)
   - Multi-level caching (L1: localStorage/Redis, L2: Database)
   - Cache-first approach to minimize API costs

4. **Error Handling**:
   - DAOs throw raw errors (network, timeout, auth)
   - Services transform errors (add context, fallback data)
   - Controllers map errors to HTTP status codes

5. **Data Transformation**:
   - DAOs use mappers to transform External DTOs → Domain Models
   - DAOs use mappers to transform Entities → Domain Models
   - Services work exclusively with Domain Models
   - Controllers use mappers to transform Domain Models → Response DTOs

6. **Orchestration**:
   - Services coordinate multiple DAO calls
   - DAOs are single-purpose (one API or table)
   - Controllers delegate to single Service method
   - All transformations use dedicated mapper functions

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
  ↓ API calls (Request DTO)
Controller (Routes)
  ↓ Validates & transforms to Domain Model
Service (Business Logic)
  ↓ Processes Domain Models
DAO (Data Access)
  ↓ Returns Entities/Records or External DTOs
Service
  ↓ Transforms to Domain Models
Controller
  ↓ Transforms to Response DTO
View (Presentation)
```

**📦 Data Types in Each Layer:**

| Type | Layer | Purpose | Example |
|------|-------|---------|---------|
| **Request DTO** | Controller (input) | Client → API validation | `CreateStockRequest` |
| **Response DTO** | Controller (output) | API → Client formatting | `StockQuoteResponse` |
| **Domain Model** | Service | Business logic objects | `Quote`, `Portfolio` |
| **Entity/Record** | DAO (database) | Prisma database models | `Stock` (from Prisma) |
| **External DTO** | DAO (external API) | Third-party API responses | `AlphaVantageQuoteDTO` |

**Complete Data Flow Example:**

```typescript
// 1. Client sends Request DTO
POST /api/stocks
Body: { symbol: "AAPL", shares: 100, avgPrice: 150.00 }

// 2. Controller receives & validates Request DTO
const requestDTO: CreateStockRequest = await request.json();
validate(requestDTO); // Zod schema validation

// 3. Controller transforms to Domain Model
const stock: Stock = {
  symbol: requestDTO.symbol,
  shares: requestDTO.shares,
  avgPrice: requestDTO.avgPrice,
  portfolioId: requestDTO.portfolioId
};

// 4. Service processes Domain Model
const savedStock = await stockService.createStock(stock);

// 5. DAO returns Entity/Record (Prisma model)
const entity: PrismaStock = await prisma.stock.create({
  data: {
    symbol: stock.symbol,
    shares: stock.shares,
    avgPrice: stock.avgPrice,
    portfolioId: stock.portfolioId
  }
});

// 6. Service transforms Entity → Domain Model
const domainModel: Stock = {
  id: entity.id,
  symbol: entity.symbol,
  shares: entity.shares,
  avgPrice: entity.avgPrice.toNumber(), // Prisma Decimal → number
  currentPrice: entity.currentPrice?.toNumber() ?? null,
  portfolioId: entity.portfolioId
};

// 7. Controller transforms Domain Model → Response DTO
const responseDTO: StockResponse = {
  id: domainModel.id,
  symbol: domainModel.symbol,
  shares: domainModel.shares,
  avgPrice: domainModel.avgPrice,
  currentPrice: domainModel.currentPrice,
  totalValue: domainModel.currentPrice * domainModel.shares,
  unrealizedGain: (domainModel.currentPrice - domainModel.avgPrice) * domainModel.shares
};

// 8. Controller returns Response DTO
return NextResponse.json(responseDTO);
```

**Why This Pattern Matters:**

- ✅ **API Contract Independence**: Change database schema without breaking API
- ✅ **External API Isolation**: Alpha Vantage changes don't affect business logic
- ✅ **Type Safety**: Each layer has strongly typed interfaces
- ✅ **Testability**: Mock DTOs/Entities without affecting domain logic
- ✅ **Reusability**: Domain models can be used across multiple endpoints

**File Organization:**

```
types/
├── dto/
│   ├── request/              # API Request DTOs
│   │   ├── CreateStockRequest.ts
│   │   └── UpdateStockRequest.ts
│   ├── response/             # API Response DTOs
│   │   ├── StockResponse.ts
│   │   └── QuoteResponse.ts
│   └── external/             # External API DTOs
│       ├── AlphaVantageDTO.ts
│       └── GeminiDTO.ts
├── models/                   # Domain Models
│   ├── Stock.ts
│   ├── Quote.ts
│   └── Portfolio.ts
└── entities/                 # Database Entities (re-export Prisma)
    └── index.ts

lib/
└── mappers/                  # Transformation functions
    ├── stockMapper.ts        # Entity ↔ Model ↔ DTO
    ├── quoteMapper.ts
    └── portfolioMapper.ts
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
- **`features/AI_SYSTEM_DESIGN_MVP.md`** - ✅ Use this for MVP AI development
- **`features/AI_SYSTEM_DESIGN_FULL_FEATURE_COMPLETE.md`** - Phase 2 reference (RAG, vector DB)

### Feature Deep Dives
- **`features/OAUTH_FLOW_DIAGRAM.md`** - Google OAuth flow implementation details
- **`features/ADMIN_PANEL_GUIDE.md`** - Admin panel usage guide

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

---

## Attribution

Architecture decisions, trade-offs, and recommendations designed by **Atik Patel**.

Drafting and markdown formatting accelerated with **Grok 4** (xAI) and **Claude Code** (Anthropic), November 2025.
