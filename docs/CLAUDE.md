# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Portfolio Tracker for Energy & Copper portfolios with live market data, risk metrics, AI-powered analysis, and investment thesis tracking. Built with Next.js 14, TypeScript, Prisma, PostgreSQL, and deployed on Vercel.

**⚠️ ARCHITECTURE NOTE: This project uses CLIENT-FIRST architecture intentionally. DO NOT refactor to Server Components without explicit user request. See "Next.js 14 Architecture Patterns" section for details.**

Key features:
- 70/30 cash-margin portfolio tracking
- Live commodity prices (WTI, NG, Copper via Polygon)
- Stop-Loss (-30%) and Take-Profit (+50%) alerts
- DRIP (Dividend Reinvestment)
- Investment thesis management with health scoring
- Daily checklist system with streak tracking
- Risk metrics (Sharpe, Sortino, Alpha, Beta, Calmar)
- AI-powered insights via Google Gemini
- SEC EDGAR filings integration
- News scraping (NewsAPI, Brave Search, Finnhub)

## Common Commands

### Development
```bash
npm run dev          # Start Next.js dev server with hot reload
npm run build        # Production build (generates .next folder)
npm start            # Start production server
npm test             # Run all tests with Jest
```

**Optional commands (not yet configured in package.json):**
```bash
npm run dev:turbo    # Start with Turbopack (faster, experimental) - Add to package.json: "dev:turbo": "next dev --turbo"
npm run lint         # Run ESLint - Add to package.json: "lint": "next lint"
npm run type-check   # TypeScript validation - Add to package.json: "type-check": "tsc --noEmit"
```

### Code Generation
```bash
npx create-next-app@latest          # Create new Next.js app (for reference)
npx @next/codemod@latest            # Run codemods for Next.js upgrades
npx shadcn-ui@latest init           # Initialize shadcn/ui (if using component library)
```

### Testing
```bash
npm test                                        # Run all tests
npx jest tests/path/to/test.spec.ts --runInBand # Run single test file
npx jest --watch                                # Run tests in watch mode
npx jest --coverage                             # Generate coverage report
```

### Database (Prisma)
```bash
npx prisma generate              # Generate Prisma client
npx prisma db push               # Push schema changes to DB
npx prisma studio                # Open Prisma Studio GUI
npx tsx scripts/seed-db.ts       # Seed database
npx tsx scripts/check-db.ts      # Check database state
```

### Scripts
```bash
npx tsx scripts/populate-positions.ts   # Populate stock positions
npx tsx scripts/populate-theses.ts      # Populate investment theses
npx tsx scripts/test-e2e.ts             # End-to-end integration test
npx tsx scripts/test-models.ts          # Test database models
```

## Project Structure

```
portfolio-tracker/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes (server-side)
│   │   ├── quote/route.ts        # Stock quotes (Alpha Vantage/FMP)
│   │   ├── portfolio/route.ts    # Portfolio CRUD
│   │   ├── stocks/route.ts       # Stock positions CRUD
│   │   ├── thesis/route.ts       # Investment thesis CRUD
│   │   ├── checklist/route.ts    # Daily checklist CRUD
│   │   ├── tasks/route.ts        # Checklist tasks CRUD
│   │   ├── fundamentals/route.ts # Stock fundamentals (Yahoo Finance)
│   │   ├── risk-metrics/route.ts # Portfolio risk calculations
│   │   ├── news/                 # News endpoints
│   │   │   ├── energy/route.ts   # Energy sector news
│   │   │   └── copper/route.ts   # Copper sector news
│   │   ├── scrape-news/route.ts  # Generic news scraping
│   │   ├── sec-edgar/route.ts    # SEC filings lookup
│   │   ├── commodities/          # Commodity prices
│   │   │   ├── energy/route.ts   # WTI, NG prices
│   │   │   └── copper/route.ts   # Copper prices
│   │   ├── ai/generate/route.ts  # Gemini AI generation
│   │   └── telemetry/stats/route.ts # Telemetry metrics
│   ├── page.tsx                  # Main portfolio page ('use client')
│   ├── layout.tsx                # Root layout
│   ├── global.css                # Global styles
│   ├── stocks/                   # Stock-related pages
│   ├── checklist/                # Checklist pages
│   ├── thesis/                   # Investment thesis pages
│   └── test-*/                   # Test pages
│
├── components/                   # React Components
│   ├── AssetCard.tsx             # Stock position display
│   ├── PortfolioHeader.tsx       # Portfolio summary
│   ├── RiskMetricsPanel.tsx      # Risk metrics visualization
│   ├── StrategyAccordion.tsx     # Strategy details
│   ├── AlertBanner.tsx           # Stop-loss/take-profit alerts
│   ├── CommodityCard.tsx         # Commodity price display
│   ├── DailyChecklistView.tsx    # Task management UI
│   ├── ThesisCard.tsx            # Investment thesis display
│   ├── FundamentalMetricCard.tsx # Fundamental data display
│   ├── FinancialStatementTable.tsx # Financial statements
│   ├── Navigation.tsx            # Navigation component
│   ├── ChecklistTaskCard.tsx     # Task card
│   ├── shared/                   # Reusable UI components
│   └── StonksAI/                 # AI chat interface
│       └── StonksAI.tsx
│
├── lib/                          # Utility Libraries & Business Logic
│   ├── api/                      # API Client Libraries
│   │   ├── alphavantage.ts       # Alpha Vantage client
│   │   ├── fmp.ts                # Financial Modeling Prep client
│   │   ├── yahooFinance.ts       # Yahoo Finance client
│   │   ├── finnhub.ts            # Finnhub news client
│   │   ├── braveSearch.ts        # Brave Search client
│   │   ├── secEdgar.ts           # SEC EDGAR client
│   │   ├── commodities/          # Commodity data clients
│   │   ├── news/                 # News fetching utilities
│   │   ├── snapshot/             # Market snapshot generators
│   │   └── index.ts              # API exports
│   ├── ai/                       # AI Integration
│   │   ├── gemini.ts             # Google Gemini client
│   │   ├── systemInstructions.ts # AI system prompts
│   │   └── context.ts            # Context management
│   ├── hooks/                    # React Hooks
│   │   └── useDatabase.ts        # Database data fetching hooks
│   ├── models/                   # Data Models
│   │   ├── portfolio.ts          # Portfolio model
│   │   ├── checklist.ts          # Checklist model
│   │   ├── thesis.ts             # Thesis model
│   │   └── index.ts
│   ├── calculator.ts             # Portfolio calculations & risk metrics
│   ├── metrics.ts                # Portfolio metrics calculations
│   ├── cache.ts                  # Client-side caching (localStorage)
│   ├── aiCache.ts                # AI prompt caching (Gemini)
│   ├── storage.ts                # IndexedDB utilities
│   ├── rateLimitTracker.ts       # Rate limit tracking
│   ├── alerts.ts                 # Alert logic (stop-loss/take-profit)
│   ├── drip.ts                   # Dividend reinvestment
│   ├── config.ts                 # Portfolio configurations
│   ├── prisma.ts                 # Prisma client instance
│   ├── db.ts                     # Database utilities
│   └── mockData.ts               # Mock data for testing
│
├── prisma/                       # Prisma ORM
│   └── schema.prisma             # Database schema
│
├── scripts/                      # Utility Scripts
│   ├── seed-db.ts                # Seed database
│   ├── check-db.ts               # Check database state
│   ├── populate-positions.ts     # Populate stock positions
│   ├── populate-theses.ts        # Populate investment theses
│   ├── test-e2e.ts               # E2E integration test
│   ├── test-models.ts            # Database model tests
│   ├── fix-stock-values.ts       # Fix stock values
│   ├── check-cost-basis.ts       # Check cost basis
│   ├── verify-integration.ts     # Verify integration
│   └── manual-testing-guide.md   # Manual testing guide
│
├── tests/                        # Test Files
│   └── *.test.ts                 # Jest tests
│
├── types/                        # TypeScript Type Definitions
│   └── *.ts                      # Global types
│
├── public/                       # Static Assets
│   └── ...                       # Images, icons, etc.
│
├── .env.local                    # Environment variables (local)
├── .env.local.example            # Example env vars
├── .gitignore                    # Git ignore rules
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
├── jest.config.cjs               # Jest configuration
├── prisma.config.ts              # Prisma config
├── package.json                  # NPM dependencies & scripts
├── package-lock.json             # Locked dependencies
├── README.md                     # Project README
└── CLAUDE.md                     # This file (guidance for Claude Code)
```

**Key Directories:**

- **`app/`** - Next.js App Router (pages + API routes)
- **`components/`** - React components (all client-side)
- **`lib/`** - Business logic, utilities, calculations
- **`lib/api/`** - External API clients (Alpha Vantage, FMP, news, etc.)
- **`lib/ai/`** - Google Gemini AI integration
- **`prisma/`** - Database schema and migrations
- **`scripts/`** - Database seeding, testing, maintenance
- **`tests/`** - Jest unit/integration tests

**Important Files:**

- **`lib/config.ts`** - Portfolio configurations (Energy, Copper)
- **`lib/calculator.ts`** - All risk metrics and calculations
- **`lib/cache.ts`** - Client-side caching layer
- **`app/api/quote/route.ts`** - Stock quote API (rate limiting logic)
- **`prisma/schema.prisma`** - Database models and relationships

## Architecture

### API Provider System

The app uses **Alpha Vantage by default** for stock quotes (`app/api/quote/route.ts:6`) because:
- FMP free tier doesn't support OTC stocks (TRMLF, AETUF)
- Need USD prices, not CAD from .TO symbols

**Available providers:**
- Alpha Vantage: `lib/api/alphavantage.ts` (25 requests/day, batch supported)
- FMP: `lib/api/fmp.ts` (250 requests/day, uses /stable endpoints)
- Yahoo Finance: `lib/api/yahooFinance.ts` (fundamentals only)
- Finnhub: `lib/api/finnhub.ts` (news)
- Brave Search: `lib/api/braveSearch.ts` (news)
- SEC EDGAR: `lib/api/secEdgar.ts` (filings)

**Switching providers:** Edit `app/api/quote/route.ts:6` to use `process.env.STOCK_API_PROVIDER` instead of hardcoded 'alphavantage'.

### Core Calculation Logic

All portfolio calculations are centralized in `lib/calculator.ts`:

- **Risk metrics** (Sharpe, Sortino, Alpha, Beta, Calmar, Max Drawdown)
- **Position sizing** with cash/margin split
- **Value calculations** considering borrowed amounts
- **Returns computation** for risk analysis

Risk metrics exposed via `/api/risk-metrics` route and displayed in `RiskMetricsPanel` component.

### Database Architecture (Prisma + PostgreSQL)

**Schema:** `prisma/schema.prisma`

**Models:**
- `Portfolio`: Top-level container (type: 'energy' | 'copper')
- `Stock`: Individual positions (symbol, shares, avgPrice, currentPrice)
- `InvestmentThesis`: Thesis tracking with health scores and validation
- `DailyChecklist`: Daily task management with streak tracking
- `ChecklistTask`: Individual tasks linked to checklists

**Relationships:** Portfolio → [Stock, InvestmentThesis, DailyChecklist] → [ChecklistTask]

**Database hooks:** `lib/hooks/useDatabase.ts` provides React hooks for client-side data fetching.

### Caching Strategy

**Multi-layer caching:**

1. **LocalStorage** (`lib/cache.ts`): Client-side API response caching with timestamps
2. **IndexedDB** (`lib/storage.ts`): Persistent browser storage for offline support
3. **AI Cache** (`lib/aiCache.ts`): Google Gemini prompt caching (15min TTL)
4. **Rate limit tracking** (`lib/rateLimitTracker.ts`): In-memory API quota management

**Error handling:** `classifyApiError()` in `lib/cache.ts` categorizes API failures (rate limit, network, auth, etc.)

### State Management

**Client-side state** (`app/page.tsx`):
- Portfolio data fetched via `usePortfolio()`, `useStocks()`, `usePortfolioMetrics()` hooks
- Local React state for UI (sorting, loading, errors)
- Market data fetched on-demand and cached

**Server components:** None (fully client-side rendered with 'use client')

### AI Integration

**Google Gemini** (`lib/ai/gemini.ts`):
- Models: gemini-2.0-flash-exp, gemini-exp-1206
- System instructions in `lib/ai/systemInstructions.ts`
- Context management in `lib/ai/context.ts`
- Caching via `lib/aiCache.ts`

**AI Component:** `components/StonksAI/StonksAI.tsx` - Sidebar chat interface

### API Routes Structure

All routes in `app/api/`:

- `/quote` - Stock quotes (batch or single)
- `/commodities/energy` - WTI + NG prices
- `/commodities/copper` - Copper prices
- `/portfolio` - CRUD for portfolios
- `/stocks` - CRUD for stock positions
- `/thesis` - Investment thesis CRUD
- `/checklist` - Daily checklist CRUD
- `/tasks` - Checklist task CRUD
- `/fundamentals` - Stock fundamentals (Yahoo Finance)
- `/risk-metrics` - Portfolio risk calculations
- `/news/{energy,copper}` - Sector-specific news
- `/scrape-news` - Generic news scraping
- `/sec-edgar` - SEC filings lookup
- `/ai/generate` - Gemini text generation
- `/telemetry/stats` - Telemetry metrics

**Dynamic routes:** All routes marked `export const dynamic = 'force-dynamic'`

### Component Organization

**Key components:**
- `AssetCard.tsx`: Individual stock position display
- `PortfolioHeader.tsx`: Portfolio summary metrics
- `RiskMetricsPanel.tsx`: Risk metrics visualization
- `StrategyAccordion.tsx`: Expandable strategy details
- `AlertBanner.tsx`: Stop-loss/take-profit alerts
- `CommodityCard.tsx`: Commodity price display
- `DailyChecklistView.tsx`: Task management UI
- `ThesisCard.tsx`: Investment thesis display
- `FundamentalMetricCard.tsx`: Fundamental data display
- `FinancialStatementTable.tsx`: Income/balance/cash flow tables

**Shared components:** `components/shared/` (reusable UI primitives)

### Configuration

**Portfolio configs:** `lib/config.ts` defines Energy and Copper portfolios with:
- Initial cash/margin split
- Stock allocations
- Stop-loss/take-profit thresholds
- Commodity tracking symbols

**Path aliases:** `@/*` maps to root directory via `tsconfig.json:baseUrl`

## Environment Variables

Required keys (see `.env.local.example`):

```bash
ALPHAVANTAGE_API_KEY=     # Stock quotes
FMP_API_KEY=              # Alternative stock provider
NEWS_API_KEY=             # News feeds
DATABASE_URL=             # PostgreSQL connection
GEMINI_API_KEY=           # AI features
```

## Testing

**Jest config:** `jest.config.cjs`
- Test environment: Node
- Test directory: `tests/`
- Transform: ts-jest with ESM support
- Module aliases: `@/*` → `<rootDir>/$1`

**Run tests:** `npm test` (uses `--runInBand` for sequential execution)

## Type System

**Type modules:** `types/` directory
- Global types and interfaces
- Extend as needed for new features

**Strict mode:** Enabled in `tsconfig.json`

## Git Workflow

**Husky:** Pre-commit hooks configured in `.husky/`

**Current branch:** main (deploy branch for Vercel)

---

# Next.js 14 Architecture Patterns

## ⚠️ CRITICAL: Current Implementation Note

**⚠️ DO NOT REFACTOR EXISTING CODE TO SERVER COMPONENTS WITHOUT EXPLICIT USER REQUEST ⚠️**

**This project uses CLIENT-FIRST architecture BY DESIGN.**

This is **NOT a mistake** and is **NOT an anti-pattern** for this use case.

### Current Architecture (INTENTIONAL)

**Pattern:**
- ✅ All pages and components use `'use client'` directive
- ✅ Data fetching via React hooks (`useEffect`, `useState`)
- ✅ Client-side state management
- ✅ API routes for all external data access
- ✅ localStorage and IndexedDB for caching

**Why Client-First Was Chosen:**
1. **Real-time interactivity** - Portfolio values update live, calculations happen client-side
2. **Offline support** - IndexedDB caching allows app to work offline
3. **Complex state** - Sorting, filtering, expanding/collapsing, all managed client-side
4. **Mobile-first** - Rich user interactions, touch gestures, responsive UI
5. **No SEO requirements** - Private portfolio tracker, not public content
6. **Browser APIs** - localStorage, IndexedDB, client-side caching
7. **Rate limit management** - Client-side cache prevents excessive API calls

### ❌ DO NOT Do These Without User Permission:

1. ❌ Remove `'use client'` directives from existing components
2. ❌ Refactor client hooks (`useState`, `useEffect`) to Server Components
3. ❌ Move API route logic directly into page components
4. ❌ Replace localStorage/IndexedDB with server-side caching
5. ❌ Convert existing pages to Server Components "for best practices"
6. ❌ Suggest Server Component refactors unless explicitly asked

### ✅ WHEN to Use Server Components (New Features Only)

**Only consider Server Components for:**
- Adding new static pages (documentation, about, blog)
- New reports that don't require interactivity
- Admin pages with simple CRUD operations
- Landing pages where SEO matters

**Always ask the user first before introducing Server Components.**

### Current Architecture is Valid Because:

```typescript
// This pattern is CORRECT for this project:
'use client';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState([]);
  const [sortKey, setSortKey] = useState('symbol');

  // Client-side sorting, caching, real-time updates
  // This is the RIGHT approach for this app
}
```

## Next.js 14 Best Practices (Ideal Patterns)

When adding new features or refactoring, follow these Next.js 14 principles:

### 1. Server Components First

**Default to Server Components** - Only use Client Components when you need interactivity:

```typescript
// ✅ GOOD: Server Component (default)
// app/reports/page.tsx
async function ReportsPage() {
  // Direct database access - no API route needed
  const reports = await prisma.portfolio.findMany({
    include: { stocks: true }
  });

  return <ReportsList reports={reports} />;
}

// ✅ GOOD: Client Component only when needed
// components/InteractiveChart.tsx
'use client';

import { useState } from 'react';

export function InteractiveChart({ data }: Props) {
  const [filter, setFilter] = useState('all');
  // Interactive logic here
}
```

**Current project pattern:**

```typescript
// ⚠️ CURRENT: Everything is client-side
// app/page.tsx
'use client';

export default function Home() {
  const [portfolio, setPortfolio] = useState([]);

  useEffect(() => {
    fetch('/api/portfolio').then(/* ... */);
  }, []);
  // ...
}
```

### 2. File Conventions

Always use these file names in the `app/` directory:

| File | Purpose | Client/Server |
|------|---------|---------------|
| `page.tsx` | Route page component | Server (default) |
| `layout.tsx` | Shared layout wrapper | Server (default) |
| `loading.tsx` | Loading UI (Suspense fallback) | Server |
| `error.tsx` | Error boundary | **Must be Client** |
| `not-found.tsx` | 404 page | Server |
| `route.ts` | API route handler | Server |
| `template.tsx` | Re-rendered layout | Server |
| `default.tsx` | Parallel route fallback | Server |

**Current project structure:**
```
app/
├── page.tsx              # Main portfolio page ('use client')
├── layout.tsx            # Root layout
├── api/                  # API routes (Server)
│   ├── quote/route.ts
│   ├── portfolio/route.ts
│   └── ...
├── stocks/               # Static pages
└── test-*/               # Test pages
```

### 3. Data Fetching Patterns

**Ideal pattern (Server Components):**

```typescript
// ✅ BEST: Fetch in Server Component
// app/portfolios/[id]/page.tsx
async function PortfolioPage({ params }: { params: { id: string } }) {
  // Direct database access - runs on server
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: params.id },
    include: { stocks: true, theses: true }
  });

  if (!portfolio) notFound();

  return <PortfolioDisplay portfolio={portfolio} />;
}

// ✅ GOOD: Interactive parts as Client Components
// components/PortfolioDisplay.tsx
'use client';

export function PortfolioDisplay({ portfolio }: { portfolio: Portfolio }) {
  const [sortKey, setSortKey] = useState('symbol');
  // Client-side sorting, filtering, etc.
}
```

**Current pattern (Client Components):**

```typescript
// ⚠️ CURRENT: Client-side fetching
// app/page.tsx
'use client';

function Home() {
  const { portfolio, loading } = usePortfolio('energy');

  if (loading) return <LoadingSpinner />;
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**When to use each pattern:**

| Pattern | Use When |
|---------|----------|
| **Server Component** | Static data, no interactivity, SEO important |
| **Client Component** | User interactions, browser APIs, real-time updates |
| **API Route** | External API calls, webhooks, non-GET operations |

### 4. Caching Strategy

Next.js 14 provides multiple caching layers:

#### Fetch Caching (HTTP Requests)

```typescript
// ✅ GOOD: Use fetch() with Next.js extensions
async function getStockQuote(symbol: string) {
  const res = await fetch(`https://api.example.com/quote/${symbol}`, {
    next: {
      revalidate: 3600, // Revalidate every hour
      tags: ['quotes', `quote-${symbol}`] // For targeted revalidation
    }
  });

  return res.json();
}

// Revalidate on-demand
import { revalidateTag } from 'next/cache';

async function updateQuote() {
  // ... update logic
  revalidateTag('quotes'); // Invalidate all quote caches
}
```

**Current project uses custom caching:**

```typescript
// ⚠️ CURRENT: Custom localStorage caching
// lib/cache.ts
export function saveToCache(key: string, data: any): void {
  const cacheData = { data, timestamp: Date.now() };
  localStorage.setItem(key, JSON.stringify(cacheData));
}

export function loadFromCache<T>(key: string): T | null {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  return JSON.parse(cached).data;
}
```

#### Data Caching (Expensive Computations)

```typescript
// ✅ GOOD: Cache expensive operations
import { unstable_cache } from 'next/cache';

const getCachedRiskMetrics = unstable_cache(
  async (portfolioId: string) => {
    // Expensive risk calculations
    return calculateRiskMetrics(portfolioId);
  },
  ['risk-metrics'], // Cache key
  { revalidate: 3600, tags: ['metrics'] }
);
```

#### React Cache (Request Deduplication)

```typescript
// ✅ GOOD: Deduplicate requests within same render
import { cache } from 'react';

const getPortfolio = cache(async (id: string) => {
  return prisma.portfolio.findUnique({ where: { id } });
});

// Multiple calls in same render = only 1 DB query
async function ParentComponent() {
  const portfolio = await getPortfolio('abc');
  return <ChildComponent portfolioId="abc" />;
}

async function ChildComponent({ portfolioId }: Props) {
  const portfolio = await getPortfolio(portfolioId); // Uses cached result
  return <div>...</div>;
}
```

### 5. Streaming and Suspense

```typescript
// ✅ GOOD: Stream data with Suspense
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<StocksSkeleton />}>
        <StocksData />
      </Suspense>

      <Suspense fallback={<NewsSkeleton />}>
        <NewsData />
      </Suspense>
    </div>
  );
}

// These load independently
async function StocksData() {
  const stocks = await fetchStocks(); // Slow API call
  return <StocksList stocks={stocks} />;
}

async function NewsData() {
  const news = await fetchNews(); // Another slow call
  return <NewsFeed news={news} />;
}
```

### 6. Server Actions (Form Handling)

```typescript
// ✅ GOOD: Server Actions for mutations
// app/portfolio/actions.ts
'use server';

import { revalidatePath } from 'next/cache';

export async function updateStockShares(stockId: string, shares: number) {
  await prisma.stock.update({
    where: { id: stockId },
    data: { shares, lastUpdated: new Date() }
  });

  revalidatePath('/portfolio');
  return { success: true };
}

// Client component
'use client';

export function StockForm({ stockId }: Props) {
  return (
    <form action={async (formData) => {
      const shares = Number(formData.get('shares'));
      await updateStockShares(stockId, shares);
    }}>
      <input name="shares" type="number" />
      <button type="submit">Update</button>
    </form>
  );
}
```

### 7. Route Groups and Parallel Routes

```typescript
// ✅ GOOD: Organize routes with groups
app/
├── (dashboard)/           # Route group (not in URL)
│   ├── layout.tsx        # Shared layout for dashboard
│   ├── portfolio/
│   │   └── page.tsx      # URL: /portfolio
│   └── stocks/
│       └── page.tsx      # URL: /stocks
├── (marketing)/           # Different layout
│   ├── layout.tsx
│   └── about/
│       └── page.tsx      # URL: /about
```

### 8. Metadata and SEO

```typescript
// ✅ GOOD: Export metadata for SEO
// app/portfolio/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portfolio Tracker - Energy & Copper',
  description: 'Live portfolio tracking with risk metrics',
  openGraph: {
    title: 'Portfolio Tracker',
    description: 'Track your investments in real-time',
  }
};

// Or dynamic metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const portfolio = await getPortfolio(params.id);

  return {
    title: `${portfolio.name} - Portfolio Tracker`,
    description: `View ${portfolio.name} performance and holdings`
  };
}
```

## Migration Path (Optional)

If you decide to adopt Server Components:

### Phase 1: Add Server-Rendered Pages
- Create new routes using Server Components (e.g., `/reports`, `/settings`)
- Keep existing client-heavy pages as-is

### Phase 2: Hybrid Pages
- Move data fetching to Server Components
- Keep interactive parts as Client Components
- Example: Server Component fetches portfolio, passes to Client Component for sorting

### Phase 3: Optimize Bundle
- Identify components that don't need 'use client'
- Move business logic to server utilities
- Use Server Actions for mutations

### Example Hybrid Pattern

```typescript
// ✅ GOOD: Hybrid approach
// app/portfolio/page.tsx (Server Component)
import { PortfolioClient } from './PortfolioClient';

async function PortfolioPage() {
  // Server-side data fetching
  const portfolio = await prisma.portfolio.findFirst({
    where: { type: 'energy' },
    include: { stocks: true }
  });

  const quotes = await fetchBatchQuotes(portfolio.stocks.map(s => s.symbol));

  // Pass to Client Component
  return <PortfolioClient initialPortfolio={portfolio} initialQuotes={quotes} />;
}

// components/PortfolioClient.tsx (Client Component)
'use client';

export function PortfolioClient({ initialPortfolio, initialQuotes }: Props) {
  const [sortKey, setSortKey] = useState('symbol');

  // Client-side sorting, filtering, real-time updates
  // ...
}
```

## Key Takeaways

1. **⚠️ DO NOT refactor existing code to Server Components** - This is client-first BY DESIGN
2. **The current architecture is NOT wrong** - It's the correct pattern for this use case
3. **Always ask before suggesting Server Components** - Don't assume they're always "better"
4. **Use Server Components ONLY for new static pages** - Blog, docs, reports (if requested)
5. **Keep client components for interactive features** - Charts, sorting, real-time updates (current pattern)
6. **API routes are still needed** - External APIs, webhooks, rate limiting
7. **Respect the architecture decisions** - They were made intentionally, not by accident

---

# Common Next.js Patterns

This section covers frequently-used patterns in Next.js 14 applications.

## Forms & Mutations

### Pattern: Validate → Mutate → Revalidate

**The standard flow for form submissions:**

```typescript
// app/actions/stocks.ts
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@lib/prisma';

// 1. VALIDATE - Define schema
const UpdateStockSchema = z.object({
  stockId: z.string().cuid(),
  shares: z.number().int().positive().max(1000000),
  avgPrice: z.number().positive().max(100000)
});

// 2. MUTATE - Update database
export async function updateStock(formData: FormData) {
  // Validate input
  const rawData = {
    stockId: formData.get('stockId') as string,
    shares: Number(formData.get('shares')),
    avgPrice: Number(formData.get('avgPrice'))
  };

  const validated = UpdateStockSchema.parse(rawData); // Throws on invalid

  // Mutate database
  const updated = await prisma.stock.update({
    where: { id: validated.stockId },
    data: {
      shares: validated.shares,
      avgPrice: validated.avgPrice,
      lastUpdated: new Date()
    }
  });

  // 3. REVALIDATE - Refresh cached data
  revalidatePath('/portfolio');
  revalidatePath(`/stocks/${validated.stockId}`);

  return { success: true, stock: updated };
}
```

**Client Component using the Server Action:**

```typescript
// components/UpdateStockForm.tsx
'use client';

import { updateStock } from '@app/actions/stocks';
import { useState } from 'react';

export function UpdateStockForm({ stock }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    try {
      const result = await updateStock(formData);
      // Success - Next.js will automatically update UI via revalidatePath
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="hidden" name="stockId" value={stock.id} />

      <input
        type="number"
        name="shares"
        defaultValue={stock.shares}
        disabled={pending}
      />

      <input
        type="number"
        name="avgPrice"
        defaultValue={stock.avgPrice}
        disabled={pending}
        step="0.01"
      />

      <button type="submit" disabled={pending}>
        {pending ? 'Updating...' : 'Update Stock'}
      </button>

      {error && <p className="error">{error}</p>}
    </form>
  );
}
```

**Progressive Enhancement (works without JavaScript):**

```typescript
// Form works even if JS is disabled
export function ProgressiveForm({ stock }: Props) {
  return (
    <form action={updateStock}>  {/* Direct Server Action */}
      <input type="hidden" name="stockId" value={stock.id} />
      <input type="number" name="shares" defaultValue={stock.shares} />
      <button type="submit">Update</button>
    </form>
  );
}
```

## Optimistic Updates

### Pattern: Update UI Immediately, Rollback on Error

**For instant perceived performance:**

```typescript
// components/StockList.tsx
'use client';

import { useOptimistic } from 'react';
import { updateStock } from '@app/actions/stocks';

export function StockList({ stocks }: { stocks: Stock[] }) {
  const [optimisticStocks, addOptimisticUpdate] = useOptimistic(
    stocks,
    (state, newStock: Stock) => {
      return state.map(s => s.id === newStock.id ? newStock : s);
    }
  );

  async function handleUpdate(stockId: string, shares: number) {
    // Optimistically update UI immediately
    const optimisticStock = {
      ...stocks.find(s => s.id === stockId)!,
      shares
    };
    addOptimisticUpdate(optimisticStock);

    try {
      // Perform actual mutation
      await updateStock({ stockId, shares });
      // Success - revalidatePath will update with real data
    } catch (error) {
      // Error - UI automatically rolls back to original state
      console.error('Update failed:', error);
    }
  }

  return (
    <div>
      {optimisticStocks.map(stock => (
        <StockCard
          key={stock.id}
          stock={stock}
          onUpdate={(shares) => handleUpdate(stock.id, shares)}
        />
      ))}
    </div>
  );
}
```

**Manual optimistic updates (without useOptimistic):**

```typescript
export function StockCard({ stock }: Props) {
  const [localShares, setLocalShares] = useState(stock.shares);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(newShares: number) {
    // Optimistic update
    const previousShares = localShares;
    setLocalShares(newShares);
    setIsSaving(true);

    try {
      await updateStock({ stockId: stock.id, shares: newShares });
      // Success
    } catch (error) {
      // Rollback on error
      setLocalShares(previousShares);
      alert('Update failed');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div>
      <span>{localShares} shares</span>
      <button onClick={() => handleSave(localShares + 10)}>
        +10 {isSaving && '(saving...)'}
      </button>
    </div>
  );
}
```

## Loading States

### Pattern: Suspense Boundaries + loading.tsx

**Automatic loading UI:**

```typescript
// app/portfolio/loading.tsx
export default function Loading() {
  return <PortfolioSkeleton />;
}

// app/portfolio/page.tsx
export default async function PortfolioPage() {
  const portfolio = await fetchPortfolio(); // Suspends while loading
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**Granular Suspense boundaries:**

```typescript
// app/dashboard/page.tsx
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Stocks load independently */}
      <Suspense fallback={<StocksSkeleton />}>
        <StocksData />
      </Suspense>

      {/* News loads independently */}
      <Suspense fallback={<NewsSkeleton />}>
        <NewsData />
      </Suspense>

      {/* Chart loads independently */}
      <Suspense fallback={<ChartSkeleton />}>
        <ChartData />
      </Suspense>
    </div>
  );
}

async function StocksData() {
  const stocks = await fetchStocks(); // Can be slow
  return <StocksList stocks={stocks} />;
}

async function NewsData() {
  const news = await fetchNews(); // Can be slow
  return <NewsFeed news={news} />;
}
```

**Streaming with loading states:**

```typescript
// Components render as data arrives (streaming)
// User sees content progressively instead of waiting for everything
```

## Error Handling

### Pattern: Error Boundaries at Multiple Levels

**Root error boundary:**

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Route-specific error boundary:**

```typescript
// app/portfolio/error.tsx
'use client';

export default function PortfolioError({ error, reset }: Props) {
  return (
    <div className="portfolio-error">
      <h2>Failed to load portfolio</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Retry</button>
      <a href="/">Go to home</a>
    </div>
  );
}
```

**Not Found handling:**

```typescript
// app/stocks/[id]/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h2>Stock Not Found</h2>
      <p>The stock you're looking for doesn't exist.</p>
      <a href="/portfolio">Back to Portfolio</a>
    </div>
  );
}

// app/stocks/[id]/page.tsx
import { notFound } from 'next/navigation';

export default async function StockPage({ params }: Props) {
  const stock = await prisma.stock.findUnique({
    where: { id: params.id }
  });

  if (!stock) {
    notFound(); // Triggers not-found.tsx
  }

  return <StockDisplay stock={stock} />;
}
```

**Try-catch in Server Components:**

```typescript
async function DataComponent() {
  try {
    const data = await fetchData();
    return <Display data={data} />;
  } catch (error) {
    // Handle gracefully
    return <ErrorMessage error={error} />;
  }
}
```

## Data Fetching Patterns

### Pattern: Parallel Data Fetching

**Fetch multiple resources simultaneously:**

```typescript
// ✅ GOOD - Parallel fetching
async function DashboardPage() {
  // All requests start at the same time
  const [portfolio, stocks, news] = await Promise.all([
    fetchPortfolio(),
    fetchStocks(),
    fetchNews()
  ]);

  return <Dashboard portfolio={portfolio} stocks={stocks} news={news} />;
}

// ❌ BAD - Sequential fetching (waterfall)
async function SlowDashboard() {
  const portfolio = await fetchPortfolio();  // Wait
  const stocks = await fetchStocks();        // Wait
  const news = await fetchNews();            // Wait
  // Total time = sum of all requests
}
```

### Pattern: Preload with Separate Components

```typescript
// app/portfolio/page.tsx
import { Suspense } from 'react';

export default function PortfolioPage() {
  // Kick off requests early
  const portfolioPromise = fetchPortfolio();
  const stocksPromise = fetchStocks();

  return (
    <div>
      <Suspense fallback={<PortfolioSkeleton />}>
        <PortfolioData promise={portfolioPromise} />
      </Suspense>

      <Suspense fallback={<StocksSkeleton />}>
        <StocksData promise={stocksPromise} />
      </Suspense>
    </div>
  );
}

async function PortfolioData({ promise }: { promise: Promise<Portfolio> }) {
  const portfolio = await promise;
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

## Client/Server Composition

### Pattern: Server Fetches, Client Interacts

**Pass server-fetched data to client components:**

```typescript
// app/portfolio/page.tsx (Server Component)
export default async function PortfolioPage() {
  // Fetch on server
  const portfolio = await prisma.portfolio.findFirst({
    where: { type: 'energy' },
    include: { stocks: true }
  });

  const quotes = await fetchBatchQuotes(portfolio.stocks.map(s => s.symbol));

  // Pass to Client Component
  return (
    <PortfolioClient
      initialPortfolio={portfolio}
      initialQuotes={quotes}
    />
  );
}

// components/PortfolioClient.tsx (Client Component)
'use client';

export function PortfolioClient({ initialPortfolio, initialQuotes }: Props) {
  const [sortKey, setSortKey] = useState('symbol');
  const [filter, setFilter] = useState('all');

  // Client-side interactivity
  const sortedStocks = useMemo(() => {
    return [...initialPortfolio.stocks].sort((a, b) => {
      return a[sortKey] > b[sortKey] ? 1 : -1;
    });
  }, [initialPortfolio.stocks, sortKey]);

  return (
    <div>
      <SortControls sortKey={sortKey} onChange={setSortKey} />
      <StocksList stocks={sortedStocks} />
    </div>
  );
}
```

### Pattern: Nested Client in Server

**Server Components can render Client Components:**

```typescript
// app/portfolio/page.tsx (Server)
export default async function PortfolioPage() {
  const portfolio = await fetchPortfolio();

  return (
    <div>
      {/* Server Component content */}
      <h1>{portfolio.name}</h1>
      <p>Total Value: ${portfolio.totalValue}</p>

      {/* Client Component for interactivity */}
      <InteractiveChart data={portfolio.history} />

      {/* More Server Component content */}
      <StocksList stocks={portfolio.stocks} />
    </div>
  );
}
```

## Route Handlers (API Routes)

### Pattern: RESTful API Endpoints

**Standard CRUD operations:**

```typescript
// app/api/stocks/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET /api/stocks
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const portfolioId = searchParams.get('portfolioId');

  const stocks = await prisma.stock.findMany({
    where: portfolioId ? { portfolioId } : undefined
  });

  return NextResponse.json(stocks);
}

// POST /api/stocks
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Validate
  const validated = StockSchema.parse(body);

  // Create
  const stock = await prisma.stock.create({
    data: validated
  });

  return NextResponse.json(stock, { status: 201 });
}

// app/api/stocks/[id]/route.ts
// PUT /api/stocks/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  const stock = await prisma.stock.update({
    where: { id: params.id },
    data: body
  });

  return NextResponse.json(stock);
}

// DELETE /api/stocks/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.stock.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ success: true });
}
```

**Standard response patterns:**

```typescript
// Success
return NextResponse.json({ data, success: true });

// Error
return NextResponse.json(
  { error: 'Message', code: 'ERROR_CODE' },
  { status: 400 }
);

// With headers
return NextResponse.json(data, {
  status: 200,
  headers: {
    'Cache-Control': 'public, s-maxage=3600',
    'X-Custom-Header': 'value'
  }
});
```

## Layouts & Templates

### Pattern: Nested Layouts

**Share UI across routes:**

```typescript
// app/layout.tsx (Root layout)
export default function RootLayout({ children }: Props) {
  return (
    <html>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}

// app/(dashboard)/layout.tsx (Nested layout)
export default function DashboardLayout({ children }: Props) {
  return (
    <div className="dashboard">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}

// app/(dashboard)/portfolio/page.tsx
// This page has both Root + Dashboard layouts
export default function PortfolioPage() {
  return <PortfolioContent />;
}
```

### Pattern: Route Groups

**Organize routes without affecting URLs:**

```typescript
// Directory structure
app/
├── (marketing)/           # Route group (not in URL)
│   ├── layout.tsx        # Marketing layout
│   ├── page.tsx          # / (homepage)
│   ├── about/
│   │   └── page.tsx      # /about
│   └── pricing/
│       └── page.tsx      # /pricing
│
├── (dashboard)/           # Different route group
│   ├── layout.tsx        # Dashboard layout
│   ├── portfolio/
│   │   └── page.tsx      # /portfolio
│   └── stocks/
│       └── page.tsx      # /stocks
```

## Current Project Pattern Notes

**This project uses client-first patterns:**

- ✅ All data fetching via hooks (`usePortfolio`, `useStocks`)
- ✅ Forms use client-side `onSubmit` handlers
- ✅ No Server Actions (using API routes instead)
- ✅ Optimistic updates with local state
- ✅ Client-side caching (localStorage)

**If adopting these patterns, start with:**
1. Server Actions for form mutations
2. Optimistic updates with `useOptimistic`
3. Parallel data fetching in Server Components

---

# Development Guidelines

## Code Conventions

### Import Patterns

**Always use path aliases for cross-directory imports:**

```typescript
// ✅ GOOD
import { calculatePosition } from '@lib/calculator';
import { Portfolio } from '@/types/portfolio';

// ❌ BAD
import { calculatePosition } from '../../../lib/calculator';
```

**Import order convention:**
1. Next.js imports
2. Third-party packages
3. @/ aliased imports (grouped by lib/, components/, types/)
4. Relative imports (same directory only)

### TypeScript Best Practices

**1. Always type function returns explicitly:**

```typescript
// ✅ GOOD
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  // ...
}

// ❌ BAD
export async function fetchQuotes(symbols: string[]) {
  // ...
}
```

**2. Use strict null checks - never assume values exist:**

```typescript
// ✅ GOOD
const price = stock.currentPrice ?? stock.avgPrice;
if (portfolio?.id) { /* ... */ }

// ❌ BAD
const price = stock.currentPrice || stock.avgPrice; // 0 is falsy!
portfolio.id // Could be null/undefined
```

**3. Avoid `any` type - use `unknown` for truly unknown types:**

```typescript
// ✅ GOOD
function parseApiResponse(data: unknown): ParsedData {
  if (isValidData(data)) return data;
  throw new Error('Invalid data');
}

// ❌ BAD
function parseApiResponse(data: any): ParsedData {
  return data;
}
```

**4. Define types for all external API responses:**

```typescript
// ✅ GOOD - in types/api.ts
export interface AlphaVantageQuote {
  '01. symbol': string;
  '05. price': string;
  '10. change percent': string;
}

// ❌ BAD - parsing without types
const symbol = data['01. symbol'];
```

### Component Patterns

**1. Always use 'use client' directive for client components:**

```typescript
// ✅ GOOD
'use client';

import { useState } from 'react';

export default function MyComponent() {
  // ...
}
```

**2. Separate data fetching from UI rendering:**

```typescript
// ✅ GOOD
function PortfolioView() {
  const { portfolio, loading, error } = usePortfolio('energy');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <PortfolioDisplay portfolio={portfolio} />;
}

// ❌ BAD - mixing concerns
function PortfolioView() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/portfolio').then(/* ... */);
  }, []);

  return <div>{/* complex rendering logic */}</div>;
}
```

**3. Keep components focused - single responsibility:**

```typescript
// ✅ GOOD - AssetCard only displays, parent handles actions
<AssetCard
  stock={stock}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
/>

// ❌ BAD - AssetCard handles API calls, routing, state
<AssetCard stock={stock} /> // internally does fetch/mutations
```

### API Route Patterns

**1. Always mark routes as dynamic and set runtime:**

```typescript
// ✅ GOOD
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // ...
}
```

**2. Consistent error response structure:**

```typescript
// ✅ GOOD
return NextResponse.json(
  { error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
  { status: 429 }
);

// ❌ BAD - inconsistent error formats
return NextResponse.json('Error', { status: 500 });
return new Response('Bad request');
```

**3. Validate inputs at the API boundary:**

```typescript
// ✅ GOOD
const symbols = searchParams.get('symbols');
if (!symbols) {
  return NextResponse.json(
    { error: 'Missing required parameter: symbols' },
    { status: 400 }
  );
}

// ❌ BAD - assuming parameters exist
const symbols = searchParams.get('symbols');
const list = symbols.split(','); // Could crash!
```

**4. Log important operations for debugging:**

```typescript
// ✅ GOOD
console.log(`Fetching quotes for ${symbols.length} symbols`);
console.log(`Rate limit active. Resets in ${hoursRemaining} hours`);

// But avoid logging sensitive data
console.log(`API key: ${apiKey}`); // ❌ NEVER
```

### Database Patterns (Prisma)

**1. Always use Prisma client from centralized module:**

```typescript
// ✅ GOOD
import { prisma } from '@lib/prisma';

// ❌ BAD - creating new instances
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
```

**2. Use transactions for related mutations:**

```typescript
// ✅ GOOD
await prisma.$transaction([
  prisma.stock.update({ where: { id }, data: { shares: newShares } }),
  prisma.portfolio.update({ where: { id: portfolioId }, data: { updatedAt: new Date() } })
]);

// ❌ BAD - race conditions possible
await prisma.stock.update({ where: { id }, data: { shares: newShares } });
await prisma.portfolio.update({ where: { id: portfolioId }, data: { updatedAt: new Date() } });
```

**3. Handle null values from database explicitly:**

```typescript
// ✅ GOOD
const stock = await prisma.stock.findUnique({ where: { id } });
if (!stock) {
  throw new Error('Stock not found');
}

// ❌ BAD
const stock = await prisma.stock.findUnique({ where: { id } });
const price = stock.currentPrice; // Could be null!
```

**4. Use appropriate query methods:**

```typescript
// ✅ GOOD
const stock = await prisma.stock.findUnique({ where: { id } }); // Single record
const stocks = await prisma.stock.findMany({ where: { portfolioId } }); // Multiple

// ❌ BAD
const [stock] = await prisma.stock.findMany({ where: { id } }); // Inefficient
```

### Caching Best Practices

**1. Always check cache before external API calls:**

```typescript
// ✅ GOOD
const cached = loadFromCache<Quote[]>('quotes-energy');
if (cached && getCacheAge('quotes-energy') < 5 * 60 * 1000) {
  return cached;
}

const fresh = await fetchFromAPI();
saveToCache('quotes-energy', fresh);
return fresh;

// ❌ BAD
const data = await fetchFromAPI(); // No caching
```

**2. Use descriptive cache keys with namespace pattern:**

```typescript
// ✅ GOOD
const key = `quotes-${portfolioType}-${Date.now()}`;
const key = 'commodities-energy-prices';

// ❌ BAD
const key = 'data';
const key = 'cache1';
```

**3. Track and respect rate limits:**

```typescript
// ✅ GOOD
if (isRateLimited()) {
  const cached = loadFromCache('quotes');
  if (cached) return cached;

  return NextResponse.json(
    { error: 'Rate limited, using cached data', cached: true },
    { status: 429 }
  );
}

// ❌ BAD
await fetchAPI(); // Blind calls, hit rate limits
```

### State Management

**1. Use custom hooks for reusable state logic:**

```typescript
// ✅ GOOD - lib/hooks/useDatabase.ts pattern
export function usePortfolio(type: string) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // fetch logic
  }, [type]);

  return { portfolio, loading, error };
}

// ❌ BAD - duplicating logic in components
function Component1() {
  const [portfolio, setPortfolio] = useState(null);
  useEffect(() => { /* fetch */ }, []);
}
function Component2() {
  const [portfolio, setPortfolio] = useState(null);
  useEffect(() => { /* same fetch */ }, []);
}
```

**2. Lift state only when necessary:**

```typescript
// ✅ GOOD - local state when possible
function StockCard({ stock }: Props) {
  const [expanded, setExpanded] = useState(false);
  // expanded state only used here
}

// ❌ BAD - unnecessary lifting
function Parent() {
  const [expanded, setExpanded] = useState({}); // unused elsewhere
  return <StockCard expanded={expanded[stock.id]} />;
}
```

**3. Avoid stale closures in effects:**

```typescript
// ✅ GOOD
useEffect(() => {
  async function fetchData() {
    const data = await fetch(`/api/stocks?type=${portfolioType}`);
    // ...
  }
  fetchData();
}, [portfolioType]); // dependency tracked

// ❌ BAD
useEffect(() => {
  fetch(`/api/stocks?type=${portfolioType}`); // portfolioType could be stale
}, []); // missing dependency
```

## Anti-Patterns to Avoid

### 0. ❌ CRITICAL: Refactoring to Server Components Without Reason

**This is the #1 anti-pattern for this project.**

```typescript
// ❌ BAD - Don't do this!
// Removing 'use client' and refactoring to Server Components
async function PortfolioPage() {
  const portfolio = await prisma.portfolio.findFirst();
  return <div>{portfolio.name}</div>;
}
```

**Why this is wrong for this project:**
- ❌ Breaks real-time interactivity
- ❌ Loses client-side caching (localStorage, IndexedDB)
- ❌ Can't use browser APIs
- ❌ No offline support
- ❌ Removes complex state management
- ❌ Ignores architectural decisions

```typescript
// ✅ GOOD - Keep the current pattern
'use client';

export default function PortfolioPage() {
  const { portfolio, loading } = usePortfolio('energy');
  const [sortKey, setSortKey] = useState('symbol');

  // This client-side pattern is CORRECT for this app
  return <PortfolioDisplay portfolio={portfolio} />;
}
```

**Remember:** Server Components are a tool, not always "better". This project is client-first BY DESIGN.

### 1. ❌ Hardcoding Configuration Values

```typescript
// ❌ BAD
const stopLoss = currentValue * 0.7;
const takeProfit = currentValue * 1.5;

// ✅ GOOD - use config
const config = configs.find(c => c.id === portfolioType);
const stopLoss = config.stopLossValue;
const takeProfit = config.takeProfitValue;
```

### 2. ❌ Mixing Business Logic in Components

```typescript
// ❌ BAD
function PortfolioCard({ stocks }: Props) {
  const totalValue = stocks.reduce((sum, s) => {
    const price = s.currentPrice ?? s.avgPrice;
    const gain = (price - s.avgPrice) / s.avgPrice;
    return sum + (price * s.shares);
  }, 0);
  // Complex calculations in component
}

// ✅ GOOD
function PortfolioCard({ stocks }: Props) {
  const metrics = usePortfolioMetrics(stocks); // Logic in hook/lib
  return <div>{metrics.totalValue}</div>;
}
```

### 3. ❌ Ignoring Error States

```typescript
// ❌ BAD
async function fetchData() {
  const res = await fetch('/api/stocks');
  const data = await res.json();
  setState(data); // What if network failed?
}

// ✅ GOOD
async function fetchData() {
  try {
    const res = await fetch('/api/stocks');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    setState(data);
    setError(null);
  } catch (err) {
    setError(classifyApiError(err));
    // Use cached data as fallback
    const cached = loadFromCache('stocks');
    if (cached) setState(cached);
  }
}
```

### 4. ❌ Not Handling Loading States

```typescript
// ❌ BAD
function StockList() {
  const { stocks } = useStocks();
  return <div>{stocks.map(s => <Stock {...s} />)}</div>;
  // Crashes if stocks is null during loading
}

// ✅ GOOD
function StockList() {
  const { stocks, loading, error } = useStocks();

  if (loading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;
  if (!stocks?.length) return <EmptyState />;

  return <div>{stocks.map(s => <Stock key={s.id} {...s} />)}</div>;
}
```

### 5. ❌ String Concatenation for URLs/Paths

```typescript
// ❌ BAD
const url = '/api/stocks?type=' + portfolioType + '&limit=' + limit;

// ✅ GOOD
const params = new URLSearchParams({ type: portfolioType, limit: String(limit) });
const url = `/api/stocks?${params.toString()}`;
```

### 6. ❌ Silent Failures

```typescript
// ❌ BAD
try {
  await updateStock(id, data);
} catch (err) {
  // Swallowing errors
}

// ✅ GOOD
try {
  await updateStock(id, data);
} catch (err) {
  console.error('Failed to update stock:', err);
  setError(err instanceof Error ? err.message : 'Update failed');
  // Notify user, log telemetry, etc.
}
```

### 7. ❌ Mutation of Props/State

```typescript
// ❌ BAD
function updatePortfolio(portfolio: Portfolio) {
  portfolio.stocks.push(newStock); // Mutating prop!
  return portfolio;
}

// ✅ GOOD
function updatePortfolio(portfolio: Portfolio) {
  return {
    ...portfolio,
    stocks: [...portfolio.stocks, newStock]
  };
}
```

### 8. ❌ Using Index as React Key

```typescript
// ❌ BAD
{stocks.map((stock, index) => (
  <StockCard key={index} stock={stock} />
))}

// ✅ GOOD
{stocks.map((stock) => (
  <StockCard key={stock.id} stock={stock} />
))}
```

### 9. ❌ Overfetching Data

```typescript
// ❌ BAD
const portfolio = await prisma.portfolio.findUnique({
  where: { id },
  include: {
    stocks: true,
    theses: true,
    checklists: { include: { tasks: true } }
  }
}); // Fetching everything when only stocks needed

// ✅ GOOD
const portfolio = await prisma.portfolio.findUnique({
  where: { id },
  include: { stocks: true }
}); // Only fetch what's needed
```

### 10. ❌ Blocking Operations in Loops

```typescript
// ❌ BAD
for (const symbol of symbols) {
  const quote = await fetchQuote(symbol); // Sequential, slow
  quotes.push(quote);
}

// ✅ GOOD
const quotePromises = symbols.map(symbol => fetchQuote(symbol));
const quotes = await Promise.all(quotePromises); // Parallel
```

## Code Review Checklist

Before submitting code, verify:

**Architecture (CRITICAL):**
- [ ] ⚠️ Did NOT remove `'use client'` directives without user approval
- [ ] ⚠️ Did NOT refactor existing components to Server Components without user request
- [ ] ⚠️ Did NOT replace client-side hooks with server-side data fetching unnecessarily

**Code Quality:**
- [ ] All imports use `@/` path aliases (no `../../../`)
- [ ] TypeScript strict mode passes with no `any` types
- [ ] Error states are handled (try/catch, error boundaries)
- [ ] Loading states are displayed to users
- [ ] API routes have `dynamic = 'force-dynamic'` export
- [ ] Database queries check for null/undefined results
- [ ] External API calls respect rate limits and use caching
- [ ] React components have proper key props (not index)
- [ ] Environment variables are not hardcoded
- [ ] Sensitive data (API keys) never logged
- [ ] Prisma client used from `@lib/prisma` (not re-instantiated)
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Console has no errors in browser dev tools

## Performance Guidelines

### 1. Minimize Re-renders

```typescript
// ✅ GOOD - Memoize expensive calculations
const metrics = useMemo(() =>
  calculatePortfolioMetrics(stocks, borrowedAmount),
  [stocks, borrowedAmount]
);

// ❌ BAD
const metrics = calculatePortfolioMetrics(stocks, borrowedAmount); // Recalculated every render
```

### 2. Batch API Calls

```typescript
// ✅ GOOD
const quotes = await fetchBatchQuotes(['CNQ', 'SU', 'TRMLF']);

// ❌ BAD
const cnq = await fetchQuote('CNQ');
const su = await fetchQuote('SU');
const trmlf = await fetchQuote('TRMLF');
```

### 3. Debounce User Input

```typescript
// ✅ GOOD
const debouncedSearch = useMemo(
  () => debounce((query: string) => performSearch(query), 300),
  []
);

// ❌ BAD
<input onChange={(e) => performSearch(e.target.value)} /> // Search on every keystroke
```

## Security Best Practices

### 1. Environment Variables

**Understand the difference between client and server variables:**

```typescript
// ✅ GOOD - Server-side only (API routes, Server Components)
// app/api/quote/route.ts
const apiKey = process.env.ALPHAVANTAGE_API_KEY; // Never exposed to client

// ✅ GOOD - Client-side accessible (intentional)
// app/page.tsx
const publicKey = process.env.NEXT_PUBLIC_STRIPE_KEY; // Exposed in bundle (OK for public keys)

// ❌ BAD - Exposing secrets
const apiKey = process.env.NEXT_PUBLIC_API_KEY; // DON'T prefix secrets with NEXT_PUBLIC_
```

**Environment variable rules:**
- `NEXT_PUBLIC_*` → Embedded in client bundle (use only for public data)
- Others → Server-side only (API keys, database URLs, secrets)
- Never commit `.env` files to git
- Use `.env.local` for local development
- Configure environment variables in Vercel dashboard for production

**Current project uses:**
```bash
# Server-only (correct)
ALPHAVANTAGE_API_KEY=...
FMP_API_KEY=...
NEWS_API_KEY=...
DATABASE_URL=...
GEMINI_API_KEY=...

# No NEXT_PUBLIC_ variables (correct - all keys are server-only)
```

### 2. Input Validation

**Always validate and sanitize user input:**

```typescript
// ✅ GOOD - Manual validation
const shares = parseInt(searchParams.get('shares') || '0', 10);
if (isNaN(shares) || shares <= 0 || shares > 1000000) {
  return NextResponse.json(
    { error: 'Invalid shares: must be 1-1000000' },
    { status: 400 }
  );
}

// ✅ BETTER - Use Zod for complex validation
import { z } from 'zod';

const UpdateStockSchema = z.object({
  shares: z.number().int().positive().max(1000000),
  symbol: z.string().min(1).max(10).regex(/^[A-Z]+$/),
  avgPrice: z.number().positive().max(1000000)
});

// In Server Action or API route
export async function updateStock(input: unknown) {
  const validated = UpdateStockSchema.parse(input); // Throws if invalid
  await prisma.stock.update({ where: { id }, data: validated });
}

// ❌ BAD - No validation
const shares = searchParams.get('shares');
await prisma.stock.update({ data: { shares } }); // SQL injection risk
```

### 3. Authentication and Authorization

**For Server Actions and API routes:**

```typescript
// ✅ GOOD - Check auth in Server Actions
'use server';

import { auth } from '@lib/auth';
import { revalidatePath } from 'next/cache';

export async function updatePortfolio(portfolioId: string, data: any) {
  const session = await auth();

  // Authentication check
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // Authorization check
  const portfolio = await prisma.portfolio.findUnique({
    where: { id: portfolioId }
  });

  if (portfolio.userId !== session.user.id) {
    throw new Error('Forbidden - not your portfolio');
  }

  // Proceed with update
  await prisma.portfolio.update({ where: { id: portfolioId }, data });
  revalidatePath('/portfolio');
}

// ✅ GOOD - Proxy for route protection
// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('session');

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolio/:path*']
};
```

**Current project note:** This is a personal portfolio tracker without authentication. If adding multi-user support, implement the patterns above.

### 4. Sanitize External Data

**Always sanitize before rendering HTML:**

```typescript
// ✅ GOOD - Sanitize external content
import DOMPurify from 'dompurify';

function NewsArticle({ article }: Props) {
  const cleanContent = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href']
  });

  return <div dangerouslySetInnerHTML={{ __html: cleanContent }} />;
}

// ❌ BAD - Raw HTML injection (XSS vulnerability)
function BadNewsArticle({ article }: Props) {
  return <div dangerouslySetInnerHTML={{ __html: article.content }} />;
}

// ✅ BEST - Use React's built-in escaping
function SafeNewsArticle({ article }: Props) {
  return <div>{article.content}</div>; // Automatically escaped
}
```

### 5. Rate Limiting

**Implement rate limiting for public endpoints:**

```typescript
// ✅ GOOD - API route with rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, remaining } = await ratelimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    );
  }

  // Process request
}
```

**Current project uses in-memory rate limiting:**

See `lib/rateLimitTracker.ts` and `app/api/quote/route.ts:14-42` for Alpha Vantage rate limit tracking.

### 6. Content Security Policy (CSP)

**Configure CSP headers in `next.config.js`:**

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.alphavantage.co https://api.polygon.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 7. SQL Injection Prevention

**Prisma protects against SQL injection automatically:**

```typescript
// ✅ GOOD - Prisma parameterizes queries
const stock = await prisma.stock.findUnique({
  where: { symbol: userInput } // Safe - parameterized
});

// ❌ BAD - Raw SQL with string concatenation (DON'T DO THIS)
await prisma.$executeRaw`SELECT * FROM stocks WHERE symbol = ${userInput}`; // Vulnerable!

// ✅ GOOD - Use Prisma.sql for raw queries
import { Prisma } from '@prisma/client';
await prisma.$executeRaw(
  Prisma.sql`SELECT * FROM stocks WHERE symbol = ${userInput}` // Safe - parameterized
);
```

### 8. Secure Session Management

**If adding authentication:**

```typescript
// ✅ GOOD - Secure cookie configuration
import { cookies } from 'next/headers';

export async function setSession(userId: string) {
  cookies().set('session', token, {
    httpOnly: true,     // Not accessible via JavaScript
    secure: true,       // HTTPS only
    sameSite: 'lax',    // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  });
}

// ❌ BAD - Insecure cookie
cookies().set('session', token, {
  httpOnly: false,  // JavaScript can access
  secure: false     // Works over HTTP (insecure)
});
```

## Performance Optimization

### 1. Reduce Client Bundle Size

**Use Server Components to minimize JavaScript:**

```typescript
// ✅ GOOD - Server Component (no JS sent to client)
// app/reports/page.tsx
async function ReportsPage() {
  const data = await fetchReportData();
  return <StaticReport data={data} />; // Pure HTML
}

// ⚠️ CURRENT PROJECT: Client-first by design
// This is OK for this project due to interactivity requirements
'use client';
export default function PortfolioPage() {
  // Interactive features require client-side JS
}
```

**Analyze bundle size:**

```bash
npm run build
# Check output for bundle sizes
# Large bundles (>200KB) should be investigated
```

### 2. Streaming with Suspense

**Load components progressively:**

```typescript
// ✅ GOOD - Stream slow components
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <PortfolioHeader />

      <Suspense fallback={<StocksSkeleton />}>
        <SlowStocksData />
      </Suspense>

      <Suspense fallback={<NewsSkeleton />}>
        <SlowNewsData />
      </Suspense>
    </div>
  );
}

async function SlowStocksData() {
  const stocks = await fetchStocksWithDelay(); // Slow operation
  return <StocksList stocks={stocks} />;
}
```

### 3. Image Optimization

**Always use `next/image` component:**

```typescript
// ✅ GOOD - Optimized images
import Image from 'next/image';

function CompanyLogo({ symbol }: Props) {
  return (
    <Image
      src={`/logos/${symbol}.png`}
      alt={`${symbol} logo`}
      width={50}
      height={50}
      loading="lazy"
      quality={85}
    />
  );
}

// ❌ BAD - Regular img tag (no optimization)
function BadLogo({ symbol }: Props) {
  return <img src={`/logos/${symbol}.png`} alt={symbol} />;
}
```

### 4. Code Splitting with Dynamic Imports

**Lazy load heavy components:**

```typescript
// ✅ GOOD - Lazy load charting library
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false // Don't render on server (if chart needs browser APIs)
});

export default function AnalyticsPage() {
  return (
    <div>
      <Header />
      <HeavyChart data={data} /> {/* Only loaded when needed */}
    </div>
  );
}

// ❌ BAD - Import everything upfront
import HeavyChart from '@/components/HeavyChart'; // Loaded immediately
```

### 5. Caching Strategies

**Implement proper caching at multiple layers:**

```typescript
// ✅ GOOD - Multi-layer caching
// 1. HTTP Cache (fetch API)
const res = await fetch(url, {
  next: { revalidate: 3600 } // Cache for 1 hour
});

// 2. React Cache (request deduplication)
import { cache } from 'react';
const getPortfolio = cache(async (id: string) => {
  return await prisma.portfolio.findUnique({ where: { id } });
});

// 3. Client-side cache (current project)
const cached = loadFromCache('quotes');
if (cached && getCacheAge('quotes') < 300000) return cached;
```

### 6. Database Query Optimization

**Optimize Prisma queries:**

```typescript
// ✅ GOOD - Only fetch needed fields
const stocks = await prisma.stock.findMany({
  where: { portfolioId },
  select: {
    id: true,
    symbol: true,
    shares: true,
    currentPrice: true
    // Don't fetch unnecessary fields
  }
});

// ❌ BAD - Fetching everything
const stocks = await prisma.stock.findMany({
  where: { portfolioId },
  include: {
    portfolio: {
      include: {
        theses: true,
        checklists: {
          include: { tasks: true }
        }
      }
    }
  }
}); // Massive overfetching

// ✅ GOOD - Use indexes for frequent queries
// In schema.prisma
model Stock {
  portfolioId String
  symbol      String

  @@index([portfolioId])  // Index for WHERE portfolioId
  @@index([symbol])       // Index for WHERE symbol
}
```

### 7. Monitoring Core Web Vitals

**Track performance metrics:**

```typescript
// app/layout.tsx or _app.tsx
export function reportWebVitals(metric: any) {
  console.log(metric);

  // Send to analytics
  if (metric.label === 'web-vital') {
    // Track LCP, FID, CLS, etc.
    analytics.track('Web Vital', {
      name: metric.name,
      value: metric.value,
      id: metric.id
    });
  }
}
```

**Target metrics:**
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **TTFB** (Time to First Byte): < 800ms

## Testing Approach

### 1. Unit Tests (Jest)

**Test business logic and utilities:**

```typescript
// tests/calculator.test.ts
import { calculateSharpeRatio, calculateSortinoRatio } from '@lib/calculator';

describe('Risk Metrics', () => {
  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio correctly', () => {
      const returns = [0.05, 0.03, -0.02, 0.07, 0.04];
      const riskFreeRate = 0.02;

      const sharpe = calculateSharpeRatio(returns, riskFreeRate);

      expect(sharpe).toBeCloseTo(0.735, 2);
    });

    it('should return null for insufficient data', () => {
      expect(calculateSharpeRatio([], 0.02)).toBeNull();
    });

    it('should return null when stdDev is zero', () => {
      const returns = [0.02, 0.02, 0.02];
      expect(calculateSharpeRatio(returns, 0.02)).toBeNull();
    });
  });
});
```

**Run tests:**

```bash
npm test                           # All tests
npx jest calculator.test.ts        # Single file
npx jest --watch                   # Watch mode
npx jest --coverage                # Coverage report
```

### 2. Component Tests (React Testing Library)

**Test React components:**

```typescript
// tests/components/PortfolioHeader.test.tsx
import { render, screen } from '@testing-library/react';
import PortfolioHeader from '@/components/PortfolioHeader';

describe('PortfolioHeader', () => {
  const mockPortfolio = {
    totalValue: 25000,
    totalGain: 5000,
    totalGainPercent: 25
  };

  it('renders portfolio value', () => {
    render(
      <PortfolioHeader
        portfolio={mockPortfolio}
        config={mockConfig}
        alerts={null}
      />
    );

    expect(screen.getByText('$25,000.00')).toBeInTheDocument();
    expect(screen.getByText('+25.00%')).toBeInTheDocument();
  });

  it('shows alert banner when stop-loss triggered', () => {
    render(
      <PortfolioHeader
        portfolio={mockPortfolio}
        config={mockConfig}
        alerts={{ stopLoss: true }}
      />
    );

    expect(screen.getByText(/stop-loss/i)).toBeInTheDocument();
  });
});
```

### 3. E2E Tests (Playwright)

**Test user flows:**

```typescript
// tests/e2e/portfolio.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Portfolio Tracker', () => {
  test('should display energy portfolio', async ({ page }) => {
    await page.goto('/');

    // Check portfolio loaded
    await expect(page.locator('h1')).toContainText('Energy Portfolio');

    // Check stocks are visible
    await expect(page.locator('[data-testid="stock-CNQ"]')).toBeVisible();
    await expect(page.locator('[data-testid="stock-SU"]')).toBeVisible();

    // Check price updates
    const price = await page.locator('[data-testid="stock-CNQ-price"]').textContent();
    expect(price).toMatch(/\$\d+\.\d{2}/);
  });

  test('should switch between portfolios', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Copper');
    await expect(page.locator('h1')).toContainText('Copper Portfolio');

    await expect(page.locator('[data-testid="stock-FCX"]')).toBeVisible();
  });

  test('should sort stocks by symbol', async ({ page }) => {
    await page.goto('/');

    await page.click('text=Symbol');

    const symbols = await page.locator('[data-testid^="stock-"]').allTextContents();
    const sorted = [...symbols].sort();
    expect(symbols).toEqual(sorted);
  });
});
```

**Run E2E tests:**

```bash
npx playwright test              # Run all E2E tests
npx playwright test --ui         # Interactive mode
npx playwright test --debug      # Debug mode
```

### 4. Testing Server Components

**Test data fetching logic separately:**

```typescript
// tests/pages/portfolio.test.ts
import { getPortfolioData } from '@app/portfolio/data';

describe('Portfolio Page Data', () => {
  it('should fetch portfolio with stocks', async () => {
    const data = await getPortfolioData('energy');

    expect(data.portfolio).toBeDefined();
    expect(data.portfolio.type).toBe('energy');
    expect(data.stocks.length).toBeGreaterThan(0);
  });

  it('should handle missing portfolio', async () => {
    await expect(
      getPortfolioData('nonexistent')
    ).rejects.toThrow('Portfolio not found');
  });
});
```

### 5. Testing Server Actions

**Mock and test validation:**

```typescript
// tests/actions/updateStock.test.ts
import { updateStock } from '@app/actions/stocks';
import { prisma } from '@lib/prisma';

jest.mock('@lib/prisma', () => ({
  prisma: {
    stock: {
      update: jest.fn()
    }
  }
}));

describe('updateStock Server Action', () => {
  it('should update stock with valid input', async () => {
    const input = {
      stockId: 'stock-123',
      shares: 100,
      avgPrice: 50.00
    };

    await updateStock(input);

    expect(prisma.stock.update).toHaveBeenCalledWith({
      where: { id: 'stock-123' },
      data: { shares: 100, avgPrice: 50.00 }
    });
  });

  it('should reject invalid input', async () => {
    const input = {
      stockId: 'stock-123',
      shares: -100, // Invalid
      avgPrice: 50.00
    };

    await expect(updateStock(input)).rejects.toThrow('Invalid shares');
  });
});
```

### Current Project Testing

**Existing tests:** Located in `tests/` directory

```bash
npm test                                    # Run all Jest tests
npx tsx scripts/test-e2e.ts                # Integration test
npx tsx scripts/test-models.ts             # Database model tests
```

## Deployment Checklist

Before deploying to production:

### Environment & Configuration
- [ ] All environment variables configured in Vercel dashboard
- [ ] `DATABASE_URL` points to production database
- [ ] API keys are valid and have appropriate rate limits
- [ ] `NEXT_PUBLIC_*` variables only contain non-sensitive data

### Database
- [ ] Database migrations run: `npx prisma db push`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database seeded if needed: `npx tsx scripts/seed-db.ts`
- [ ] Database indexes created for frequently queried fields
- [ ] Database connection pooling configured

### Build & Tests
- [ ] Local build succeeds: `npm run build`
- [ ] No TypeScript errors
- [ ] All tests pass: `npm test`
- [ ] No console errors in production build
- [ ] Bundle size is reasonable (check build output)

### Security
- [ ] Security headers configured (CSP, X-Frame-Options, etc.)
- [ ] Environment variables not exposed to client
- [ ] Input validation implemented for all user inputs
- [ ] Rate limiting configured for API routes
- [ ] Authentication/authorization implemented if needed
- [ ] HTTPS enforced

### Monitoring & Observability
- [ ] Error tracking setup (Sentry, LogRocket, etc.)
- [ ] Analytics configured (Google Analytics, Vercel Analytics, etc.)
- [ ] Performance monitoring active (Vercel Speed Insights, etc.)
- [ ] Logging configured for API routes
- [ ] Uptime monitoring setup (UptimeRobot, Pingdom, etc.)

### SEO & Metadata
- [ ] Page titles and descriptions set
- [ ] Open Graph tags configured
- [ ] Favicon and app icons added
- [ ] robots.txt configured
- [ ] sitemap.xml generated (if needed)

### Performance
- [ ] Images optimized with `next/image`
- [ ] Caching strategies implemented
- [ ] Core Web Vitals meet targets (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Lighthouse score > 90
- [ ] No unused dependencies

### Vercel Specific
- [ ] Project connected to GitHub repository
- [ ] Automatic deployments enabled
- [ ] Preview deployments configured for PRs
- [ ] Production domain configured
- [ ] Edge Functions enabled if needed
- [ ] Vercel Postgres connection configured

### Post-Deployment
- [ ] Smoke test production deployment
- [ ] Check API routes return expected data
- [ ] Verify database connections work
- [ ] Test authentication flows (if applicable)
- [ ] Monitor error rates for first 24 hours
- [ ] Set up alerts for critical errors

## Documentation Standards

### Function Documentation

```typescript
/**
 * Calculate Sharpe Ratio for portfolio performance
 *
 * @param portfolioReturns - Array of historical portfolio returns
 * @param riskFreeRate - Annual risk-free rate (e.g., 0.045 for 4.5%)
 * @returns Sharpe ratio or null if calculation not possible
 */
export function calculateSharpeRatio(
  portfolioReturns: number[],
  riskFreeRate: number
): number | null {
  // Implementation
}
```

### Component Documentation

```typescript
/**
 * Displays portfolio header with total value, P&L, and alerts
 *
 * @param portfolio - Current portfolio data
 * @param config - Portfolio configuration from lib/config.ts
 * @param alerts - Alert state (stop-loss/take-profit)
 */
export default function PortfolioHeader({
  portfolio,
  config,
  alerts
}: Props) {
  // Implementation
}
```

## Common Gotchas

1. **Rate limits:** Alpha Vantage has 25 req/day limit. Check `rateLimitResetTime` in `/api/quote/route.ts:14-42`
2. **OTC stocks:** TRMLF and AETUF only work with Alpha Vantage, not FMP
3. **Prisma client:** Run `npx prisma generate` after schema changes
4. **Database URL:** Must be PostgreSQL (Vercel Postgres or local)
5. **AI caching:** 15min TTL, check cache hits in logs
6. **TypeScript paths:** Always use `@/` imports, never relative `../` for cross-directory imports
7. **Null vs undefined:** Prisma returns `null` for missing values, not `undefined`
8. **Module system:** Package type is "module" (ESM), not CommonJS
9. **Vercel limitations:** Cold starts can delay API routes (consider caching)
10. **Time zones:** Market data timestamps may be in different time zones (ET, UTC)

## Debugging Tips

### Next.js Debugging

#### 1. React Developer Tools - Identify Component Type

**Check if a component is Server or Client:**

```bash
# Install React DevTools browser extension
# Chrome: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi
# Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/
```

In DevTools:
- **Server Components**: Appear with special badges/indicators
- **Client Components**: Show 'use client' in component tree
- **Hover over components** to see Server/Client designation

**Current project note:** All components are Client Components ('use client') by design.

#### 2. Console Logging - Server vs Client

**Server Components (API routes, Server Components):**

```typescript
// app/api/quote/route.ts
export async function GET(request: NextRequest) {
  console.log('Server log - appears in TERMINAL'); // ← Terminal output
  console.log('Request params:', Object.fromEntries(searchParams.entries()));

  const data = await fetchData();
  console.log('Response data:', JSON.stringify(data, null, 2));

  return NextResponse.json(data);
}
```

**Client Components:**

```typescript
// components/PortfolioHeader.tsx
'use client';

export default function PortfolioHeader() {
  console.log('Client log - appears in BROWSER CONSOLE'); // ← Browser console

  useEffect(() => {
    console.log('Effect running:', portfolio);
  }, [portfolio]);

  return <div>...</div>;
}
```

**Key distinction:**
- **Server logs** → Terminal/command line (where `npm run dev` is running)
- **Client logs** → Browser DevTools Console (F12)

#### 3. Network Tab - RSC Payloads

**Inspect React Server Component payloads:**

1. Open Browser DevTools (F12) → **Network tab**
2. Filter by **Fetch/XHR**
3. Look for requests to your routes
4. Check **Response** tab for RSC payload format

**What to look for:**

```bash
# Server Component response format
# Look for special React Server Component markers:
# - Streaming chunks (if using Suspense)
# - Serialized component data
# - Server-rendered HTML

# Example RSC payload indicators:
# - Content-Type: text/x-component
# - Special React markers in response
```

**Current project:** All client-side fetching, so you'll see standard JSON API responses.

#### 4. Cache Headers - Verify Caching

**Check Next.js cache headers in Network tab:**

```bash
# In browser DevTools → Network → Select request → Headers tab
# Look for:

x-nextjs-cache: HIT          # Response from cache
x-nextjs-cache: MISS         # Fresh response, now cached
x-nextjs-cache: STALE        # Stale data, revalidating
x-nextjs-cache: BYPASS       # Cache bypassed
```

**Verify your caching strategy:**

```typescript
// Check if fetch caching is working
const res = await fetch(url, {
  next: { revalidate: 3600 }
});

// In Network tab, subsequent requests should show:
// x-nextjs-cache: HIT
```

**Current project uses custom localStorage caching:**

```typescript
// Check cache age in browser console
getCacheAge('quotes-energy'); // Returns milliseconds since cached
```

#### 5. Debug Caching Issues

**Temporarily disable caching to isolate issues:**

```typescript
// ✅ Disable fetch cache for debugging
const res = await fetch(url, {
  cache: 'no-store'  // Forces fresh request every time
});

// ✅ Disable Next.js cache
const res = await fetch(url, {
  next: { revalidate: 0 }  // No caching
});

// ✅ Disable custom localStorage cache (current project)
// In browser console:
localStorage.clear();  // Clear all cache
localStorage.removeItem('quotes-energy');  // Clear specific key
```

**Force revalidation:**

```typescript
// In Server Actions or API routes
import { revalidatePath, revalidateTag } from 'next/cache';

revalidatePath('/portfolio');        // Revalidate specific path
revalidateTag('quotes');              // Revalidate by tag
```

**Current project debugging:**

```typescript
// Bypass localStorage cache
// app/page.tsx
const fetchData = async () => {
  const cached = loadFromCache('quotes');

  // Force fresh data (comment out cache check)
  // if (cached && getCacheAge('quotes') < 300000) return cached;

  const fresh = await fetch('/api/quote?symbols=CNQ,SU');
  return fresh;
};
```

#### 6. Source Maps & Error Tracking

**Enable source maps for better error messages:**

```javascript
// next.config.js
module.exports = {
  productionBrowserSourceMaps: true,  // Enable in production (larger bundle)
};
```

**Check error boundaries:**

```typescript
// app/error.tsx (must be Client Component)
'use client';

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error('Error boundary caught:', error);

  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

#### 7. Hot Reload Issues

**If hot reload stops working:**

```bash
# Clear Next.js cache
rm -rf .next

# Restart dev server
npm run dev

# Or on Windows:
rmdir /s /q .next
npm run dev
```

**Check file watchers (Linux/macOS):**

```bash
# Increase file watcher limit
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Enable Debug Logging

```typescript
// Add to API routes for detailed logging
console.log('Request params:', Object.fromEntries(searchParams.entries()));
console.log('Response data:', JSON.stringify(data, null, 2));

// Enable Next.js debug mode
// Set in .env.local:
// NEXT_PUBLIC_DEBUG=true

// Check environment
console.log('Environment:', process.env.NODE_ENV);
console.log('API Provider:', process.env.STOCK_API_PROVIDER);
```

### Check Cache State

```typescript
// In browser console
Object.keys(localStorage).filter(k => k.includes('cache'));
localStorage.getItem('quotes-energy');

// Check cache age
const cacheAge = getCacheAge('quotes-energy');
console.log(`Cache age: ${cacheAge}ms (${(cacheAge / 1000 / 60).toFixed(1)} minutes)`);

// Check if cache is stale
const isStale = cacheAge > 5 * 60 * 1000; // > 5 minutes
console.log(`Cache is ${isStale ? 'STALE' : 'FRESH'}`);
```

### Inspect Database

```bash
npx prisma studio  # Open GUI
npx tsx scripts/check-db.ts  # Run diagnostic script

# Check database connection
npx prisma db pull  # Pull schema from database

# View raw SQL queries (add to prisma client)
# lib/prisma.ts
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],  // Enable query logging
});
```

### Monitor Rate Limits

Check API route logs for rate limit messages:
```
Rate limit active. Resets in 3.2 hours
Rate limit marked. Resets at 2025-11-20T00:00:00.000Z
```

**Track API usage:**

```typescript
// In API route
console.log(`API calls today: ${callCount}/25`);
console.log(`Time until reset: ${resetTime - Date.now()}ms`);
```

### Performance Profiling

**React Profiler:**

```typescript
// Wrap components to measure render performance
import { Profiler } from 'react';

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update',
  actualDuration: number
) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

export default function App() {
  return (
    <Profiler id="PortfolioPage" onRender={onRenderCallback}>
      <PortfolioPage />
    </Profiler>
  );
}
```

**Next.js Build Analysis:**

```bash
# Analyze bundle size
npm run build

# Look for large bundles (>200KB)
# Check output:
# ┌ ○ Static  automatically generated as static HTML + JSON
# ├ ● SSG     automatically generated as static HTML + JSON
# └ λ Server  server-side renders at runtime
```

### Browser DevTools Tips

**Performance tab:**
1. Click **Record**
2. Perform action (e.g., switch portfolios)
3. Stop recording
4. Analyze:
   - **Scripting** time (JavaScript execution)
   - **Rendering** time (layout, paint)
   - **Long tasks** (>50ms)

---

## Documentation Files

- `README.md` - Project overview and deployment guide
- `API_PROVIDERS.md` - API provider details
- `AI_CACHING.md` - AI caching strategy
- `AI_COPILOT_INTEGRATION.md` - Copilot integration notes
- `IMPLEMENTATION_PHASES.md` - Development phases
- `REFACTORING_PLAN.md` - Refactoring guidelines
- `TESTING_FUNDAMENTALS.md` - Testing strategy

---

## Alternative Organization

If this file becomes too large, consider splitting into:

- `CLAUDE.md` - Core architecture and commands (this file, condensed)
- `docs/CONVENTIONS.md` - Code conventions and patterns
- `docs/GUIDELINES.md` - Best practices and anti-patterns
- `docs/SECURITY.md` - Security guidelines
- `.github/CONTRIBUTING.md` - Contributor guidelines

For now, keeping everything in CLAUDE.md ensures Claude Code reads all guidelines in one place.
