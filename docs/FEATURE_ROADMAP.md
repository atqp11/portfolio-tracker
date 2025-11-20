# 🚀 Feature Roadmap - Portfolio Tracker Evolution

**Created:** November 19, 2025
**Status:** Planning Phase
**Target:** Transform into production-ready SaaS platform

---

## 📊 Overview

Transform the portfolio tracker from a personal tool into a professional SaaS platform with:
1. Multi-tier authentication system
2. Professional landing page and navigation
3. Advanced portfolio features (charts, technical analysis)
4. AI-powered stock research agent

---

## 🎯 Implementation Phases

### **PHASE 0: Foundation (Complete First)**
**Prerequisite for all features below**

**Tasks:**
- [ ] Complete Multi-Model AI Router (#1 in ACTIVE_TODOS)
- [ ] Complete Cost Tracking Dashboard (#2 in ACTIVE_TODOS)
- [ ] Complete Next.js Upgrade to 15.x (#3 in ACTIVE_TODOS)
- [ ] Complete Navigation Structure (#4 in ACTIVE_TODOS)

**Time:** ~15-20 hours
**Why Critical:** Sets up infrastructure for all new features

---

## 🔐 PHASE 1: Authentication & Tier System

### 1.1 Authentication Infrastructure with Supabase
**Time:** 6-8 hours (faster than NextAuth!)
**Dependencies:** Next.js 15.x upgrade

**Why Supabase:**
- ✅ 50K MAU free tier (vs Clerk's 10K)
- ✅ Database + Auth in one ($25/mo vs $24/mo Vercel Postgres + auth)
- ✅ All auth methods on free tier (Google, Apple, SMS, email)
- ✅ Real-time features for live portfolio updates
- ✅ Built-in file storage (1GB free)
- ✅ Open source, self-hostable, no vendor lock-in

**Tasks:**

**Setup Supabase Project:**
- [ ] Create account at https://supabase.com
- [ ] Create new project (choose region closest to users)
- [ ] Get API keys from project settings:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)
- [ ] Add to `.env.local`

**Install Supabase Client:**
- [ ] Install: `npm install @supabase/supabase-js @supabase/ssr`
- [ ] Create `lib/supabase/client.ts` - Browser client
  ```typescript
  import { createBrowserClient } from '@supabase/ssr'

  export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  ```
- [ ] Create `lib/supabase/server.ts` - Server client (for Server Components)
  ```typescript
  import { createServerClient } from '@supabase/ssr'
  import { cookies } from 'next/headers'

  export const createClient = () => {
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
          set(name, value, options) { cookieStore.set({ name, value, ...options }) },
          remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )
  }
  ```
- [ ] Create `lib/supabase/middleware.ts` - Middleware helper
- [ ] Create `middleware.ts` - Route protection

**Configure Auth Providers in Supabase Dashboard:**
- [ ] Enable Google OAuth:
  - Get credentials from Google Cloud Console
  - Add to Supabase dashboard → Authentication → Providers
  - Configure redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback`

- [ ] Enable Apple Sign In:
  - Get credentials from Apple Developer Portal
  - Add to Supabase dashboard → Authentication → Providers

- [ ] Enable Email Auth:
  - Configure email templates in dashboard
  - Set up custom SMTP (optional, uses Supabase default)

- [ ] Enable Phone (SMS) Auth:
  - Add Twilio credentials to Supabase dashboard
  - Or use Supabase's built-in SMS (limited free quota)

**Database Schema (Supabase handles auth tables automatically):**
- [ ] Extend Supabase's `auth.users` with custom profile:
  ```sql
  -- Run in Supabase SQL Editor
  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'free', -- free, basic, pro, enterprise
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Enable Row Level Security
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  -- Policy: Users can only read their own profile
  CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

  -- Policy: Users can update their own profile
  CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

  -- Trigger to create profile on user signup
  CREATE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  ```

**Auth Callback Route:**
- [ ] Create `app/auth/callback/route.ts` - Handle OAuth redirects
  ```typescript
  import { createClient } from '@/lib/supabase/server'
  import { NextResponse } from 'next/server'

  export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    return NextResponse.redirect(`${origin}/auth/error`)
  }
  ```

**Auth UI Components:**
- [ ] Create `components/auth/SignInWithGoogle.tsx`
- [ ] Create `components/auth/SignInWithApple.tsx`
- [ ] Create `components/auth/SignInWithEmail.tsx` (magic link)
- [ ] Create `components/auth/SignInWithPhone.tsx` (SMS)
- [ ] Create `components/auth/AuthModal.tsx` - Unified auth modal
- [ ] Create `app/auth/signin/page.tsx` - Sign in page
- [ ] Create `app/auth/signup/page.tsx` - Sign up page
- [ ] Create `app/auth/verify/page.tsx` - Email/SMS verification
- [ ] Create `app/auth/error/page.tsx` - Auth error page

**Session Management:**
- [ ] Create `lib/auth/session.ts` - Helper to get current user
  ```typescript
  import { createClient } from '@/lib/supabase/server'

  export async function getUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  export async function requireUser() {
    const user = await getUser()
    if (!user) throw new Error('Unauthorized')
    return user
  }
  ```

**Test Auth Flows:**
- [ ] Test Google OAuth login
- [ ] Test Apple Sign In
- [ ] Test email magic link
- [ ] Test SMS verification
- [ ] Test sign out
- [ ] Test session persistence

### 1.2 Tier System & Pricing
**Time:** 8-10 hours
**Dependencies:** Authentication setup

**Pricing Tiers:**

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/mo | 1 portfolio, 10 stocks, basic AI (50 queries/month), daily checklist |
| **Basic** | $9/mo | 3 portfolios, 50 stocks, advanced AI (500 queries/month), risk metrics, charts |
| **Pro** | $29/mo | Unlimited portfolios, unlimited stocks, unlimited AI, technical analysis, Monte Carlo, alerts |
| **Enterprise** | $99/mo | All Pro + priority support, custom models, API access, advanced scenarios |

**Tasks:**
- [ ] Create `lib/tiers/config.ts` - Tier definitions and limits
- [ ] Create `lib/tiers/permissions.ts` - Permission checking utilities
- [ ] Create `components/pricing/PricingTable.tsx`
- [ ] Create `app/pricing/page.tsx` - Pricing page
- [ ] Implement tier checks in API routes (quota enforcement)
- [ ] Create `components/dashboard/UpgradePrompt.tsx` - Paywall UI
- [ ] Add tier badge to user profile

**Payment Integration (Stripe):**
- [ ] Install: `npm install stripe @stripe/stripe-js`
- [ ] Create Stripe account and get API keys
- [ ] Create `lib/stripe/client.ts` - Stripe client
- [ ] Create `app/api/stripe/checkout/route.ts` - Create checkout session
- [ ] Create `app/api/stripe/webhook/route.ts` - Handle webhooks
- [ ] Create `app/api/stripe/portal/route.ts` - Customer portal
- [ ] Create `components/billing/SubscriptionManager.tsx`
- [ ] Add Stripe products and prices
- [ ] Test subscription flow (upgrade/downgrade/cancel)

### 1.3 Database Migration to Supabase
**Time:** 10-12 hours
**Dependencies:** Supabase auth setup

**Decision: Migrate from Vercel Postgres + Prisma → Supabase PostgreSQL**

**Why Migrate:**
- ✅ Consolidate database + auth in one platform
- ✅ Save $24/mo (Vercel Postgres cost)
- ✅ Get Row-Level Security (RLS) built-in
- ✅ Real-time subscriptions for live portfolio updates
- ✅ 500MB free tier (8GB on Pro)

**Tasks:**

**Export Existing Data:**
- [ ] Export current portfolio data from Vercel Postgres:
  ```bash
  # Connect to Vercel Postgres and export
  pg_dump $DATABASE_URL > portfolio_backup.sql
  ```
- [ ] Document current schema (`prisma/schema.prisma`)
- [ ] Create mapping of Prisma types → PostgreSQL types

**Recreate Schema in Supabase:**
- [ ] Run in Supabase SQL Editor to create tables:
  ```sql
  -- Portfolios table
  CREATE TABLE public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'energy' | 'copper'
    initial_cash DECIMAL(12, 2) NOT NULL,
    initial_margin DECIMAL(12, 2) NOT NULL,
    stop_loss_value DECIMAL(12, 2),
    take_profit_value DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Stocks table
  CREATE TABLE public.stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    shares INTEGER NOT NULL,
    avg_price DECIMAL(10, 4) NOT NULL,
    current_price DECIMAL(10, 4),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Investment Theses table
  CREATE TABLE public.investment_theses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    thesis TEXT NOT NULL,
    key_metrics JSONB,
    bull_case TEXT,
    bear_case TEXT,
    risks TEXT,
    health_score INTEGER,
    last_validated TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Daily Checklists table
  CREATE TABLE public.daily_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Checklist Tasks table
  CREATE TABLE public.checklist_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES public.daily_checklists(id) ON DELETE CASCADE,
    task TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create indexes for performance
  CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
  CREATE INDEX idx_stocks_portfolio_id ON public.stocks(portfolio_id);
  CREATE INDEX idx_stocks_symbol ON public.stocks(symbol);
  CREATE INDEX idx_theses_portfolio_id ON public.investment_theses(portfolio_id);
  CREATE INDEX idx_checklists_portfolio_id ON public.daily_checklists(portfolio_id);
  ```

**Enable Row-Level Security (RLS):**
- [ ] Create RLS policies for each table:
  ```sql
  -- Portfolios RLS
  ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view own portfolios"
    ON public.portfolios FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can create own portfolios"
    ON public.portfolios FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "Users can update own portfolios"
    ON public.portfolios FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can delete own portfolios"
    ON public.portfolios FOR DELETE
    USING (auth.uid() = user_id);

  -- Stocks RLS (via portfolio ownership)
  ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Users can view own stocks"
    ON public.stocks FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.portfolios
        WHERE portfolios.id = stocks.portfolio_id
        AND portfolios.user_id = auth.uid()
      )
    );

  CREATE POLICY "Users can manage own stocks"
    ON public.stocks FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.portfolios
        WHERE portfolios.id = stocks.portfolio_id
        AND portfolios.user_id = auth.uid()
      )
    );

  -- Similar policies for theses, checklists, tasks
  -- (See Supabase docs for complete RLS examples)
  ```

**Import Existing Data:**
- [ ] Transform Prisma data to match Supabase schema
- [ ] Assign all existing portfolios to your user ID (single-user → multi-user)
- [ ] Import via Supabase SQL Editor or CSV upload
- [ ] Verify data integrity

**Update Application Code:**
- [ ] Replace Prisma client with Supabase client in all API routes
  ```typescript
  // BEFORE (Prisma)
  import { prisma } from '@/lib/prisma'
  const portfolios = await prisma.portfolio.findMany()

  // AFTER (Supabase)
  import { createClient } from '@/lib/supabase/server'
  const supabase = createClient()
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*')
  ```

- [ ] Update all API routes (`app/api/*/route.ts`):
  - [ ] `app/api/portfolio/route.ts`
  - [ ] `app/api/stocks/route.ts`
  - [ ] `app/api/thesis/route.ts`
  - [ ] `app/api/checklist/route.ts`
  - [ ] `app/api/tasks/route.ts`

- [ ] Update React hooks (`lib/hooks/useDatabase.ts`):
  - Replace Prisma queries with Supabase queries
  - RLS automatically filters by user (no need for manual `userId` checks!)

- [ ] Remove Prisma dependencies:
  ```bash
  npm uninstall prisma @prisma/client
  rm -rf prisma/
  ```

**Add Real-Time Subscriptions (Bonus!):**
- [ ] Create `lib/supabase/subscriptions.ts`:
  ```typescript
  export function subscribeToPortfolio(portfolioId: string, callback: Function) {
    const supabase = createBrowserClient(...)

    return supabase
      .channel(`portfolio:${portfolioId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stocks',
          filter: `portfolio_id=eq.${portfolioId}`
        },
        (payload) => callback(payload)
      )
      .subscribe()
  }
  ```
- [ ] Use in components for live updates (no polling needed!)

**Test Data Isolation:**
- [ ] Create test user #1, add portfolio
- [ ] Create test user #2, add portfolio
- [ ] Verify user #1 cannot see user #2's data
- [ ] Test all CRUD operations
- [ ] Test RLS policies work correctly

**Update Environment Variables:**
- [ ] Remove `DATABASE_URL` (Vercel Postgres)
- [ ] Add Supabase URLs (already done in Phase 1.1)
- [ ] Update Vercel environment variables
- [ ] Test deployment

---

## 🎨 PHASE 2: Landing Page & Navigation Redesign

### 2.1 Public Landing Page
**Time:** 10-12 hours
**Dependencies:** None (can start in parallel)

**Tasks:**

**Route Structure:**
- [ ] Create route groups:
  ```
  app/
  ├── (marketing)/        # Public pages (no auth)
  │   ├── layout.tsx      # Marketing layout
  │   ├── page.tsx        # Landing page
  │   ├── pricing/
  │   ├── features/
  │   └── about/
  ├── (dashboard)/        # Protected pages (auth required)
  │   ├── layout.tsx      # Dashboard layout
  │   ├── portfolio/
  │   ├── analytics/
  │   └── settings/
  ```

**Landing Page Components:**
- [ ] Create `components/marketing/Hero.tsx`
  - Compelling headline: "AI-Powered Portfolio Intelligence for Retail Investors"
  - Subheading: "Make confident investment decisions with real-time analysis, risk metrics, and personalized AI guidance"
  - CTA buttons: "Start Free Trial" / "View Demo"
  - Hero image/animation (portfolio dashboard preview)

- [ ] Create `components/marketing/Features.tsx`
  - Feature grid with icons:
    - 📊 Real-time portfolio tracking
    - 🤖 AI stock research agent
    - 📈 Technical analysis (Burry-style)
    - ⚠️ Smart stop-loss alerts
    - 🎯 Monte Carlo scenarios
    - 💡 Personalized recommendations

- [ ] Create `components/marketing/HowItWorks.tsx`
  - 3-step process:
    1. Connect your portfolio
    2. Set your strategy & risk tolerance
    3. Get AI-powered insights

- [ ] Create `components/marketing/Testimonials.tsx`
  - Social proof section

- [ ] Create `components/marketing/Pricing.tsx`
  - Inline pricing table

- [ ] Create `components/marketing/FAQ.tsx`
  - Common questions

- [ ] Create `components/marketing/Footer.tsx`
  - Links, legal, social

**Navigation Bar:**
- [ ] Create `components/marketing/NavBar.tsx`
  - Logo
  - Links: Features, Pricing, About, Blog
  - Auth buttons: Sign In / Sign Up
  - Sticky on scroll
  - Mobile responsive (hamburger menu)

**Styling:**
- [ ] Choose design system (shadcn/ui recommended)
- [ ] Define color scheme (professional, trustworthy)
- [ ] Add animations (framer-motion)
- [ ] Responsive design (mobile-first)

### 2.2 Dashboard Redesign (Declutter Portfolio Page)
**Time:** 8-10 hours
**Dependencies:** Navigation Structure (#4 in ACTIVE_TODOS)

**Current Issue:** `app/page.tsx` is too cluttered (1000+ lines)

**New Structure:**

```
app/(dashboard)/
├── layout.tsx              # Dashboard layout with sidebar
├── page.tsx                # Overview dashboard (NEW)
├── portfolio/
│   ├── page.tsx            # Portfolio list
│   └── [id]/page.tsx       # Individual portfolio view
├── holdings/
│   └── page.tsx            # Stock holdings view
├── analytics/
│   ├── page.tsx            # Analytics overview
│   ├── risk/page.tsx       # Risk metrics
│   └── technical/page.tsx  # Technical analysis
├── research/
│   └── page.tsx            # AI research agent
├── thesis/
│   └── page.tsx            # Investment thesis tracker
├── checklist/
│   └── page.tsx            # Daily checklist
└── settings/
    ├── page.tsx            # General settings
    ├── profile/page.tsx    # User profile
    └── billing/page.tsx    # Subscription management
```

**Tasks:**
- [ ] Create `app/(dashboard)/layout.tsx` with sidebar navigation
- [ ] Create `app/(dashboard)/page.tsx` - New overview dashboard:
  - Portfolio summary cards
  - Quick stats (total value, P&L, risk score)
  - Recent activity feed
  - AI insights widget
  - Quick actions

- [ ] Extract portfolio view to `app/(dashboard)/portfolio/[id]/page.tsx`
- [ ] Create holdings view at `app/(dashboard)/holdings/page.tsx`
- [ ] Update all internal links to new routes
- [ ] Migrate components to new structure
- [ ] Test all navigation flows

**Sidebar Navigation:**
- [ ] Create `components/layout/Sidebar.tsx`
  - Dashboard
  - Portfolio
  - Holdings
  - Analytics (with submenu: Risk, Technical)
  - Research (AI Agent)
  - Thesis Tracker
  - Checklist
  - Settings
  - User profile dropdown
  - Collapse/expand toggle

---

## 📊 PHASE 3: Advanced Portfolio Features

### 3.1 Interactive Charts
**Time:** 12-15 hours
**Dependencies:** Dashboard redesign

**Charting Library:**
- [ ] Evaluate options:
  - Lightweight Charts (TradingView, recommended)
  - Recharts (simpler, React-native)
  - D3.js (most flexible, steeper learning curve)
- [ ] Install chosen library: `npm install lightweight-charts`

**Chart Components:**
- [ ] Create `components/charts/PriceChart.tsx`
  - Candlestick chart
  - Volume bars
  - Moving averages overlay (10W, 50D, 200D)
  - Zoom/pan controls
  - Timeframe selector (1D, 1W, 1M, 3M, 1Y, ALL)

- [ ] Create `components/charts/PortfolioPerformanceChart.tsx`
  - Line chart showing total value over time
  - Benchmark comparison (S&P 500, sector index)
  - Annotations for buy/sell events

- [ ] Create `components/charts/AllocationChart.tsx`
  - Pie chart: allocation by stock
  - Treemap: allocation by sector/theme

- [ ] Create `components/charts/RiskChart.tsx`
  - Risk/return scatter plot
  - Efficient frontier (if available)

- [ ] Create `components/charts/CorrelationMatrix.tsx`
  - Heatmap showing stock correlations

**Data Fetching:**
- [ ] Create `app/api/charts/historical/route.ts` - Fetch OHLCV data
- [ ] Integrate with Alpha Vantage or Polygon for historical data
- [ ] Cache historical data (1 day TTL)
- [ ] Create `lib/api/polygon.ts` or enhance existing provider

### 3.2 Technical Analysis (Michael Burry Style)
**Time:** 15-20 hours
**Dependencies:** Charts, risk metrics

**Core Indicators:**
- [ ] Create `lib/indicators/movingAverages.ts`
  - SMA (Simple Moving Average)
  - EMA (Exponential Moving Average)
  - 10-week MA (Burry's stop-loss indicator)

- [ ] Create `lib/indicators/momentum.ts`
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Stochastic Oscillator

- [ ] Create `lib/indicators/volatility.ts`
  - Bollinger Bands
  - ATR (Average True Range)

- [ ] Create `lib/indicators/volume.ts`
  - Volume Moving Average
  - On-Balance Volume (OBV)

**Burry-Style Analysis:**
- [ ] Create `lib/analysis/burryStrategy.ts`
  - Identify "high uncertainty, high reward" stocks:
    - Undervalued (low P/E, P/B)
    - High volatility (but with conviction thesis)
    - 10-week MA stop-loss
  - Calculate stop-loss levels
  - Track MA crossovers (buy/sell signals)

- [ ] Create `components/analysis/TechnicalAnalysis.tsx`
  - Display all indicators in dashboard
  - Signal strength meter (buy/neutral/sell)
  - Stop-loss alerts

- [ ] Create `components/analysis/BurryScore.tsx`
  - Proprietary score for "Burry-style" opportunities
  - Factors: valuation, volatility, thesis strength, technicals

**Automated Alerts:**
- [ ] Create `lib/alerts/technicalAlerts.ts`
  - 10-week MA breach detection
  - RSI overbought/oversold (>70, <30)
  - MACD crossover
  - Bollinger Band breakout

- [ ] Create notification system:
  - Email alerts (via SendGrid/Resend)
  - In-app notifications
  - Optional: SMS alerts (Twilio)

### 3.3 Advanced Risk Analytics
**Time:** 10-12 hours
**Dependencies:** Charts

**Monte Carlo Simulation:**
- [ ] Create `lib/simulation/monteCarlo.ts`
  - Run N simulations (1000-10000)
  - Model future price paths based on:
    - Historical returns distribution
    - Volatility (standard deviation)
    - Correlation matrix
  - Output: probability distribution of future portfolio values

- [ ] Create `components/analysis/MonteCarloChart.tsx`
  - Fan chart showing percentile ranges (5th, 25th, 50th, 75th, 95th)
  - Probability of reaching profit targets
  - Probability of hitting stop-loss

- [ ] Create `app/api/simulation/monte-carlo/route.ts`
  - Run simulation server-side (CPU intensive)
  - Cache results (invalidate on portfolio changes)

**Sensitivity Analysis:**
- [ ] Create `lib/analysis/sensitivity.ts`
  - Vary key assumptions:
    - Revenue growth rate (+/- 10%, 20%)
    - Profit margin (+/- 5%, 10%)
    - P/E multiple (+/- 20%, 50%)
  - Calculate impact on valuation

- [ ] Create `components/analysis/SensitivityTable.tsx`
  - Matrix showing outcomes across scenarios
  - Tornado chart (ranked by impact)

**Stress Testing:**
- [ ] Create `lib/simulation/stressTests.ts`
  - Market crash scenarios (-20%, -30%, -50%)
  - Sector-specific shocks (oil crash, tech bubble)
  - Interest rate changes

- [ ] Create `components/analysis/StressTestResults.tsx`
  - Display impact on portfolio
  - Which stocks hurt most
  - Diversification score

---

## 🤖 PHASE 4: AI Stock Research Agent Upgrade

### 4.1 Multi-Model AI Architecture
**Time:** 8-10 hours
**Dependencies:** Phase 0 (Multi-Model Router)

**Already planned in ACTIVE_TODOS #1, enhance with:**

- [ ] Create `lib/ai/agents/stockResearchAgent.ts`
  - Specialized agent for stock research
  - Use cheap models (DeepSeek, Qwen) for simple queries
  - Use advanced models (Claude Sonnet 4) for complex reasoning

- [ ] Create routing logic:
  ```typescript
  // Simple factual queries → Tier 1 (cheap)
  "What is TSLA's current P/E ratio?"

  // Analysis queries → Tier 2 (balanced)
  "Why is TSLA down today? Check news and analyst reports"

  // Complex reasoning → Tier 3 (expensive)
  "Should I hold or sell TSLA? Consider my long-term thesis,
   current valuation, technical signals, and market sentiment"
  ```

**Cost Optimization:**
- [ ] Implement query classification (simple vs complex)
- [ ] Cache common queries (Redis or Vercel KV)
- [ ] Compress prompts (remove unnecessary context)
- [ ] Track cost per query type

### 4.2 Conversational & Context-Aware AI
**Time:** 12-15 hours
**Dependencies:** Multi-model router

**Conversation Management:**
- [ ] Create `lib/ai/conversation.ts`
  - Maintain conversation history (last 10 messages)
  - Store in database (per user, per portfolio)
  - Context window management

- [ ] Update Prisma schema:
  ```prisma
  model Conversation {
    id        String   @id @default(cuid())
    userId    String
    messages  Message[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }

  model Message {
    id             String       @id @default(cuid())
    conversationId String
    role           String       // user | assistant
    content        String       @db.Text
    model          String?      // which AI model was used
    cost           Float?       // cost in USD
    createdAt      DateTime     @default(now())

    conversation Conversation @relation(fields: [conversationId], references: [id])
  }
  ```

**Context Integration:**
- [ ] Create `lib/ai/context/portfolioContext.ts`
  - Auto-include user's portfolio in context
  - Current holdings, P&L, risk metrics
  - Recent trades/changes

- [ ] Create `lib/ai/context/marketContext.ts`
  - Auto-fetch relevant market data
  - If user asks about TSLA, include:
    - Current price, % change
    - Recent news headlines
    - Analyst ratings
    - Technical indicators

- [ ] Create `lib/ai/context/thesisContext.ts`
  - Include user's investment thesis
  - Track if thesis is intact or broken

**Interactive Chat Interface:**
- [ ] Create `components/ai/ChatInterface.tsx`
  - Message list (scrollable)
  - Input box with autocomplete
  - Suggested questions
  - Loading states (streaming responses)
  - "Regenerate response" button

- [ ] Create `app/api/ai/chat/route.ts`
  - Handle chat messages
  - Stream responses (Server-Sent Events)
  - Log conversations to database

### 4.3 Personal & Emotional Support Features
**Time:** 10-12 hours
**Dependencies:** Conversational AI

**Emotional Intelligence:**
- [ ] Update system instructions (`lib/ai/systemInstructions.ts`):
  ```
  You are a supportive AI assistant for retail investors.

  Key behaviors:
  - Empathize with emotions (fear, greed, anxiety)
  - Provide perspective during volatility
  - Remind users of long-term thesis
  - Discourage panic selling
  - Encourage rational decision-making
  - Use gentle, non-judgmental language

  Example responses:
  - "I see your portfolio is down 15% this week. That's stressful.
     Let's review your thesis for TSLA - is it still intact?"
  - "Buying high and selling low is tempting, but let's look at the
     fundamentals. Has anything changed?"
  ```

**Behavioral Nudges:**
- [ ] Create `lib/ai/nudges.ts`
  - Detect emotional language in user queries
  - Detect impulsive behavior (e.g., "should I sell everything?")
  - Provide calming, rational guidance

- [ ] Create nudge triggers:
  - Portfolio down >10% → Remind of thesis
  - Stock down >20% → Check if stop-loss hit
  - User asks about selling → Review long-term vs short-term view
  - High volatility day → "This is normal, stay the course"

**Personalization:**
- [ ] Create `lib/ai/personality.ts`
  - Learn user's risk tolerance over time
  - Adapt tone (conservative vs aggressive)
  - Remember user preferences

- [ ] Store user profile:
  ```prisma
  model UserProfile {
    userId          String   @id
    riskTolerance   String   // conservative | moderate | aggressive
    investmentStyle String   // value | growth | dividend | momentum
    timeHorizon     String   // short (<1yr) | medium (1-5yr) | long (>5yr)
    goals           String?  @db.Text

    user User @relation(fields: [userId], references: [id])
  }
  ```

### 4.4 Portfolio Optimization & Risk Profiling
**Time:** 15-18 hours
**Dependencies:** Risk analytics, AI agent

**AI-Powered Optimization:**
- [ ] Create `lib/ai/optimize.ts`
  - Use AI to suggest portfolio rebalancing
  - Consider:
    - Diversification (reduce concentration risk)
    - Risk/return profile
    - Correlation matrix (avoid correlated holdings)
    - Tax implications (if applicable)

- [ ] Create `components/ai/OptimizationSuggestions.tsx`
  - Display AI recommendations
  - "Your portfolio is 60% energy stocks. Consider diversifying"
  - Suggested actions (buy/sell/rebalance)
  - Rationale for each suggestion

**Risk Profiling:**
- [ ] Create `lib/risk/profiler.ts`
  - Calculate portfolio risk score (1-10)
  - Factors:
    - Concentration (% in top holding)
    - Volatility (portfolio beta)
    - Leverage (margin usage)
    - Correlation (diversification quality)

- [ ] Create `components/risk/RiskProfile.tsx`
  - Visual risk gauge (low/medium/high)
  - Breakdown by factor
  - Compare to benchmarks

**AI Risk Advisor:**
- [ ] Integrate risk into AI conversations:
  - "Your risk score is 8/10 (high). Consider reducing leverage"
  - "Adding TSLA would increase concentration risk to 45%"
  - "Your portfolio is highly correlated with oil prices"

### 4.5 Interactive Scenarios & "What-If" Analysis
**Time:** 12-15 hours
**Dependencies:** Monte Carlo, sensitivity analysis, AI agent

**Scenario Builder:**
- [ ] Create `components/scenarios/ScenarioBuilder.tsx`
  - User-friendly UI to build custom scenarios
  - Adjustable parameters:
    - Stock price changes (TSLA +20%, SU -10%)
    - Macro factors (oil price, interest rates)
    - Time horizons (3 months, 1 year)

- [ ] Create `lib/scenarios/engine.ts`
  - Calculate portfolio impact
  - Run scenario through Monte Carlo
  - Display probability distribution

**AI-Powered "What-If" Chat:**
- [ ] Integrate scenarios into chat:
  ```
  User: "What if TSLA drops 30%?"
  AI: "Let me run that scenario...
       - Your portfolio value would drop from $25K to $21.5K (-14%)
       - TSLA would trigger your 10-week MA stop-loss
       - Your overall risk score would improve (less concentration)
       - Recommendation: Consider setting a trailing stop at -20%"
  ```

**Common Scenarios (Pre-built):**
- [ ] Create `lib/scenarios/templates.ts`
  - Market crash (-30% across the board)
  - Oil crash (energy stocks -50%)
  - Tech bubble burst (TSLA -60%)
  - Interest rate spike (+2% → value rotation)
  - Sector rotation (energy → tech)

- [ ] Create `components/scenarios/TemplateScenarios.tsx`
  - One-click scenario testing
  - Compare multiple scenarios

---

## 🗓️ Timeline & Sequencing

### **Week 1-2: Foundation (Phase 0)**
- Multi-Model AI Router
- Cost Tracking Dashboard
- Next.js Upgrade
- Navigation Structure

### **Week 3-4: Authentication & Database (Phase 1.1 + 1.3)**
- Supabase project setup
- Database migration from Vercel Postgres
- OAuth providers (Google, Apple)
- Email/SMS auth
- Auth UI components
- Row-Level Security (RLS)

### **Week 5: Tier System & Payments (Phase 1.2)**
- Pricing tiers configuration
- Stripe integration
- User profile management
- Tier enforcement

### **Week 6-7: Landing Page (Phase 2.1)**
- Marketing pages
- Hero, features, pricing
- Public navigation

### **Week 8: Dashboard Redesign (Phase 2.2)**
- Refactor app/page.tsx
- New route structure
- Sidebar navigation

### **Week 9-10: Charts (Phase 3.1)**
- Lightweight Charts integration
- Price charts
- Portfolio performance
- Allocation views

### **Week 11-12: Technical Analysis (Phase 3.2)**
- Indicators (MA, RSI, MACD)
- Burry-style analysis
- 10-week MA stop-loss
- Technical alerts

### **Week 13: Advanced Risk (Phase 3.3)**
- Monte Carlo simulation
- Sensitivity analysis
- Stress testing

### **Week 14-15: AI Agent v2 (Phase 4.1 + 4.2)**
- Multi-model routing (use Phase 0 work)
- Conversational AI
- Context awareness
- Chat interface

### **Week 16: AI Personalization (Phase 4.3)**
- Emotional support
- Behavioral nudges
- Risk profiling

### **Week 17-18: AI Scenarios (Phase 4.4 + 4.5)**
- Portfolio optimization
- Interactive scenarios
- What-if analysis
- Pre-built templates

### **Week 19-20: Polish & Launch**
- Bug fixes
- Performance optimization
- Documentation
- Beta testing
- Production deployment

**Total Time: ~20 weeks (~100-120 hours)**

---

## 💰 Cost Estimates

### Infrastructure (With Supabase)

**Free Tier (0-50K MAU):**
- **Vercel Hobby:** $0/month (good for development)
- **Supabase Free:** $0/month (database + auth, 50K MAU, 500MB storage)
- **AI (OpenRouter):** ~$20/month (with smart routing)
- **Stripe:** 2.9% + $0.30 per transaction (no monthly fee)
- **Email (Resend Free):** $0/month (up to 3K emails)
- **SMS (Twilio):** Pay-as-you-go (~$0.01/message)

**Total Monthly (Free Tier): ~$20/month** ✅ Cost-effective for starting out!

**Production Tier (50K+ MAU):**
- **Vercel Pro:** $20/month (needed for better performance)
- **Supabase Pro:** $25/month (database + auth, unlimited MAU, 8GB storage)
- **AI (OpenRouter):** $20-50/month (depending on usage)
- **Stripe:** 2.9% + $0.30 per transaction
- **Email (Resend):** $20/month (up to 100K emails)
- **SMS (Twilio):** Pay-as-you-go (~$0.01/message)

**Total Monthly (Production): ~$85-115/month** (before revenue)

### Cost Comparison: Supabase vs Previous Stack

| Service | Previous (Vercel Postgres + NextAuth) | New (Supabase) | Savings |
|---------|--------------------------------------|----------------|---------|
| **Database** | Vercel Postgres: $24/mo | Supabase: $25/mo | -$1/mo |
| **Auth** | NextAuth: $0 (DIY) | Included in Supabase | +$0 |
| **Free Tier MAU** | Unlimited (but small DB) | 50K MAU, 500MB DB | Better limits |
| **Real-time** | Need to build | Included | Time saved |
| **File Storage** | Vercel Blob: ~$5-10/mo | Included (1GB free) | +$5-10/mo |
| **Setup Time** | 12-16 hours | 6-8 hours | 50% faster |

**Net Result:** Similar cost (~$1/mo more), but **significantly** better features and developer experience.

### Break-even Analysis
- **At $9/month (Basic tier):** Need 10-13 paying users to break even
- **At $29/month (Pro tier):** Need 3-4 paying users to break even
- **Mixed (60% Basic, 40% Pro):** Need ~8-10 paying users to break even

**Target:** 50 paying users in first 3 months = ~$600-800/month revenue

---

## 🎯 Success Metrics

### Product Metrics
- **User Acquisition:** 100 sign-ups in first month
- **Conversion Rate:** 10% free → paid
- **Retention:** 80% month-over-month
- **AI Engagement:** 5+ queries per user per week

### Technical Metrics
- **Page Load:** <1.5s (LCP)
- **Uptime:** 99.9%
- **AI Response Time:** <3s average
- **AI Cost:** <$0.10 per query (average)

---

## 🚨 Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI costs exceed budget | Multi-tier routing, aggressive caching, query limits |
| Low user acquisition | SEO optimization, content marketing, free tier |
| Stripe payment issues | Test mode extensively, handle webhooks carefully |
| Data privacy concerns | Clear privacy policy, data encryption, GDPR compliance |
| Technical complexity | Incremental rollout, extensive testing, monitoring |
| Feature creep | Stick to roadmap, prioritize ruthlessly |

---

## 📝 Next Steps

1. **Review & Approve Roadmap** - Confirm priorities and timeline
2. **Complete Phase 0** - Finish foundation tasks from ACTIVE_TODOS
3. **Start Phase 1.1** - Begin authentication implementation
4. **Design Review** - Review landing page mockups
5. **Set Up Infrastructure** - Stripe account, email provider, etc.

---

## 🔗 Related Documents

- **ACTIVE_TODOS.md** - Current sprint tasks
- **CLAUDE.md** - Development guidelines
- **API_PROVIDERS.md** - API integrations
- **AI_CACHING.md** - AI cost optimization

---

**Questions or concerns? Review this plan and let's discuss priorities.**
