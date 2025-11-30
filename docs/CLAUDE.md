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


## Git Workflow

**Husky:** Pre-commit hooks configured in `.husky/`

**Current branch:** main (deploy branch for Vercel)



# Documentation
## Documentation Files
- `DEVELOPMENT_GUIDELINES.md` - This document outlines critical guidelines and anti-patterns to ensure code quality, maintainability, and adherence to the project's architectural decisions.
- `README.md` - Project overview and deployment guide
- `AI_SYSTEM_DESIGN_FULL_FEATURE_COMPLETE.md` - AI CopPilot system design
- `AI_SYSTEM_DESIGN_MVP.md` - AI Copilot system design for MVP
- `ADMIN_PANEL_GUIDE.md` - Panel used by admin for managing users, other admin functions.

---

Critical guidelines and anti-patterns to ensure code quality, maintainability, and adherence to the project's architectural decisions are documented in DEVELOPMENT_GUIDELINES.md.