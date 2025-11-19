# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Personalized Portfolio & Investment Research Platform

**Version:** 1.0  
**Date:** November 14, 2025  
**Owner:** Alex (Product & Engineering)  
**Status:** In Development

---

## 1. EXECUTIVE SUMMARY

### 1.1 Product Vision
A personalized AI-powered investment research companion that transforms portfolio monitoring from reactive dashboards into proactive, principle-driven decision-making—accessible to thoughtful value investors who follow Buffett/Munger/Burry principles.

### 1.2 Problem Statement
Existing portfolio trackers (Bloomberg Terminal, Snowball Analytics, Kubera) either:
- Cost $300+/month (Bloomberg) - out of reach for individual investors
- Lack deep fundamental analysis (most trackers)
- Don't provide proactive, personalized guidance
- Fail to align with value investing principles
- Don't validate investment decisions against thesis

### 1.3 Solution
A Next.js-based platform that combines:
- Deep fundamental metrics (Michael Burry-style analysis)
- AI-powered intelligent decision support (multi-model routing)
- Proactive checklist system aligned with investment principles
- Beautiful, minimalist design (Vercel/Linear aesthetic)
- Budget-friendly ($0 for users, $20/month AI costs, $0 data via Alpha Vantage + smart caching)

### 1.4 Success Metrics
- **Month 1:** AI costs <$20, 5 models integrated, 20+ fundamental metrics
- **Month 2:** 80%+ daily checklist completion, thesis tracker active
- **Month 3:** 90% query success rate, <3s AI response time
- **Long-term:** Platform sustains personal investing workflow, potential for 10-100 users

---

## 2. TARGET USERS

### 2.1 Primary User (Phase 1)
**Profile:** Alex - Value-oriented retail investor
- Follows Munger/Buffett/Liu principles, open to Simons/Dalio/Soros strategies
- Uses 30-40% margin with strict stop-loss criteria
- Focuses on well-researched equity investments (stocks, ETFs)
- Tracks thematic portfolios (energy transition, copper demand)
- Needs daily/weekly/monthly monitoring discipline

**Jobs to be Done:**
1. Monitor portfolio health against investment thesis
2. Get proactive alerts when thesis invalidates
3. Conduct deep fundamental research (Burry-style)
4. Stay disciplined with checklists and risk management
5. Make informed decisions with AI copilot assistance

### 2.2 Secondary Users (Phase 2+)
- Small retail investors seeking personalized guidance
- Independent financial advisors managing <50 clients
- Value investing enthusiasts learning the discipline

---

## 3. PRODUCT SCOPE

### 3.1 In Scope (3-Month Roadmap)

#### Month 1: Foundation & Intelligence
- ✅ UX redesign (dark theme, Vercel/Linear aesthetic)
- ✅ Smart AI router (DeepSeek, Qwen, Mistral, Llama, Claude)
- ✅ Cost management (<$20/month)
- ✅ Smart caching (SEC filings 30-day, news 3x daily)
- ✅ 30+ fundamental metrics (Burry-style)
- ✅ Portfolio vs market timeseries charts
- ✅ Risk metrics (Sharpe, Sortino, Alpha, Beta, drawdown)

#### Month 2: Decision Support
- ✅ Intelligent proactive checklist system
- ✅ Investment thesis tracking & validation
- ✅ Automated monitoring & alerts
- ✅ Stop-loss trigger system
- ✅ Margin usage tracking

#### Month 3: Personalization & Polish
- ✅ Context-aware AI copilot 2.0
- ✅ Advanced stock screener (value-oriented filters)
- ✅ Watchlist intelligence
- ✅ Industry deep-dive dashboards
- ✅ Performance optimization

### 3.2 Out of Scope (Future Phases)
- ❌ Mobile app (Month 4+)
- ❌ Multi-user / team features
- ❌ Real-time market data (15-min delay acceptable)
- ❌ Automated trading / order execution
- ❌ Social features / community
- ❌ Backtesting engine (basic only)

---

## 4. FEATURES & REQUIREMENTS

### 4.1 FEATURE: Overview Dashboard

**Priority:** P0 (Must Have)  
**Timeline:** Month 1, Week 1-2

#### User Story
*As an investor, I want to see my portfolio's health at a glance so I can quickly assess performance and identify issues.*

#### Requirements

**Functional:**
- Display total portfolio value, day P&L, total return
- Show margin usage with alert thresholds (>40% = warning)
- List all holdings with key metrics (weight, return, thesis health)
- Compare portfolio performance vs S&P 500 benchmark
- Show today's actionable focus items (proactive checklist)
- Visualize allocation by sector, industry, asset class

**Non-Functional:**
- Page load time <1.5s
- Data refresh every 15 minutes during market hours
- Mobile-responsive (desktop-first design)

**Acceptance Criteria:**
- [ ] Dashboard loads in <1.5s on 4G connection
- [ ] All metrics update within 15 min of market data
- [ ] Margin alert triggers at 35%, 40%, 45% thresholds
- [ ] Charts render smoothly with 1000+ data points
- [ ] Command palette (⌘K) accessible from dashboard

#### Design Specifications

**Layout:**
```
┌─────────────────────────────────────────────┐
│  ⌘ [Search anything...]           👤 Alex  │
├─────────────────────────────────────────────┤
│  Portfolio Overview                🔴 LIVE  │
│  [Value Card] [P&L Card] [Margin Card]      │
│                                              │
│  📋 Today's Focus (3 items)                 │
│  📈 Holdings Grid (sortable)                │
│  📊 Allocation Breakdown                    │
│  💬 AI Copilot Quick Access                 │
└─────────────────────────────────────────────┘
```

**Color System:**
- Background: #0A0A0A
- Cards: #111111 with subtle border (#1A1A1A)
- Gains: #10B981, Losses: #EF4444
- Accent: #3B82F6
- Fluorescent highlights: #00E5FF, #7C3AED

**Typography:**
- Headers: Inter/Geist (700-800)
- Body: Inter (400-500)
- Numbers: JetBrains Mono

---

### 4.2 FEATURE: Fundamentals Tab

**Priority:** P0 (Must Have)  
**Timeline:** Month 1, Week 3-4

#### User Story
*As a value investor, I want to see comprehensive fundamental metrics so I can evaluate whether a stock is undervalued based on Buffett/Munger/Burry principles.*

#### Requirements

**Functional:**

**A. Valuation Metrics**
- Display 9 core ratios: P/E, Forward P/E, PEG, P/B, P/S, P/FCF, EV/EBITDA, EV/Sales, CAPE
- Show 5-year average, sector average, S&P 500 comparison
- Calculate intrinsic value (Graham Number, DCF estimate)
- Display margin of safety percentage
- Visual indicators (✅ undervalued, ⚠️ fair, 🔴 overvalued)

**B. Quality Metrics**
- ROE, ROIC, ROA with 5Y trends
- Gross/Operating/Net margins with sparkline charts
- Debt/Equity, Interest Coverage, Current Ratio, Quick Ratio
- FCF yield and growth rate
- Capital efficiency (CapEx/Sales, CapEx/Depreciation)

**C. Michael Burry-Style Deep Dive**
- 10-year historical financials (income statement, balance sheet, cash flow)
- Operating cash flow quality analysis
- Debt structure and maturity schedule
- Management efficiency metrics
- Off-balance-sheet risk indicators

**D. Comparison Mode**
- Side-by-side comparison of 2-5 stocks
- Relative valuation spider charts
- Peer group analysis
- Historical metric comparison charts

**Non-Functional:**
- Data freshness: Daily update (after market close)
- Historical data: 10 years minimum
- Calculation accuracy: Match Bloomberg/FactSet standards
- API fallback: 3-tier system (primary, secondary, scraping)

**Acceptance Criteria:**
- [ ] All 30+ metrics display correctly
- [ ] Historical charts render 10 years of data
- [ ] Comparison mode supports up to 5 stocks
- [ ] Data updates daily by 7 PM ET
- [ ] API fallback works when primary source fails
- [ ] Mobile-responsive tables with horizontal scroll

#### Data Sources
```
Primary:   Alpha Vantage (25 calls/day, FREE tier)
Fallback:  Yahoo Finance (unlimited scraping, rate-limited)
SEC Data:  Edgar API (10 req/sec, unlimited)
Caching:   Redis (24-hour fundamentals, 30-day SEC filings)

Smart Caching Strategy:
- Fundamentals: Cache 24 hours, refresh after market close
- Price data: Cache 15 min during market hours, 1 hour after close
- SEC filings: Cache 30 days (filings don't change)
- News: Cache 8 hours, refresh 3x daily (6 AM, 12 PM, 6 PM)
```

#### Design Specifications

**Metric Card Pattern:**
```
┌────────────────────────────────────┐
│ P/E Ratio          [ℹ️]            │
│ 12.5               ✅ Undervalued   │
│ ━━━━━━━━━━ 68%                     │
│ 5Y: 15.2 | Sector: 18.3 | SPY: 22.1│
└────────────────────────────────────┘
```

---

### 4.3 FEATURE: Smart AI Router

**Priority:** P0 (Must Have)  
**Timeline:** Month 1, Week 1-2

#### User Story
*As the platform owner, I want an intelligent AI routing system so I can optimize for cost (<$20/month) while maintaining high-quality responses.*

#### Requirements

**Functional:**

**A. Multi-Model Integration**
- Tier 1 (Fast/Cheap): DeepSeek, Qwen Plus, Llama 3.1-70B
- Tier 2 (Quality): Claude Sonnet 4, Qwen Max, Kimi K2
- Tier 3 (Reasoning): Claude Sonnet 4, DeepSeek Reasoner
- Fallback chain: Mistral Large, Llama 3.1-405B

**B. Intelligent Routing Logic**
```typescript
if (query.type === "quick_summary" || query.length < 200) {
  route_to: Tier1
} else if (query.includes("SEC filing") || tokens > 10000) {
  route_to: Tier3
} else if (query.requires("deep_analysis")) {
  route_to: Tier2
} else {
  route_to: Tier1
}
```

**C. Cost Management**
- Track spend per model per day
- Alert when approaching 80% of $20 budget
- Auto-throttle to cheaper models when budget constrained
- Real-time cost dashboard

**D. Smart Caching**
- Cache SEC filings for 30 days (Redis/Upstash)
- Cache news digests for 8 hours (refresh 3x daily: 6 AM, 12 PM, 6 PM)
- Cache fundamental metrics for 24 hours (refresh after market close)
- Cache financial statements for 90 days (quarterly updates only)
- Cache price quotes for 15 min during market hours, 1 hour after close
- Cache AI responses for identical queries (24-hour TTL)
- Cache Alpha Vantage API responses to stay under 25 calls/day limit
- Target cache hit rate: >85% for data APIs, >70% for AI queries

**E. Rate Limit Handling**
- Detect 429 errors from APIs
- Automatic failover to next model in chain
- Exponential backoff (1s, 2s, 4s, 8s)
- User notification when all fallbacks exhausted

**Non-Functional:**
- Response time target: <3s for 90th percentile
- Uptime target: 99% (excluding upstream API issues)
- Cost target: <$20/month average
- Cache hit rate: >70% for repeated queries

**Acceptance Criteria:**
- [ ] Router successfully integrates 5+ models
- [ ] Cost tracking dashboard shows real-time spend
- [ ] Automatic failover works within 2s of rate limit
- [ ] Cache hit rate measured and >70%
- [ ] Monthly cost stays under $22 (10% buffer)
- [ ] Response time P90 < 3s

#### Technical Implementation

**Architecture:**
```typescript
// OpenRouter integration for multi-model access
interface AIRouterConfig {
  tier1: ModelConfig[];  // Fast & cheap
  tier2: ModelConfig[];  // Quality
  tier3: ModelConfig[];  // Reasoning
  fallback: ModelConfig[];
}

// Smart routing function
async function routeQuery(
  query: string, 
  context: Context
): Promise<AIResponse> {
  const tier = determineQueryTier(query, context);
  const models = config[tier];
  
  for (const model of models) {
    try {
      const response = await callModel(model, query);
      logCost(model, response.tokens);
      return response;
    } catch (error) {
      if (isRateLimitError(error)) {
        continue; // Try next model
      }
      throw error;
    }
  }
  
  throw new Error("All models exhausted");
}
```

**Caching Strategy:**
```typescript
// Redis cache key structure with TTLs optimized for Alpha Vantage
AV:QUOTE:{ticker}                         // TTL: 15 min (market hours), 1 hour (after close)
AV:FUNDAMENTALS:{ticker}                  // TTL: 24 hours
AV:INCOME:{ticker}                        // TTL: 90 days (quarterly reports)
AV:BALANCE:{ticker}                       // TTL: 90 days
AV:CASHFLOW:{ticker}                      // TTL: 90 days
SEC_FILING:{ticker}:{filing_type}:{date}  // TTL: 30 days
NEWS_DIGEST:{ticker}:{date}:{time_slot}   // TTL: 8 hours
AI_RESPONSE:{hash(query)}                 // TTL: 24 hours
AI_SEC_SUMMARY:{ticker}:{filing}          // TTL: 30 days (filing summaries never change)

// Smart cache warming: Pre-fetch all portfolio stocks at market close
// This ensures next-day data is ready and minimizes API calls
```

---

### 4.4 FEATURE: Intelligent Checklist System

**Priority:** P0 (Must Have)  
**Timeline:** Month 2, Week 5-6

#### User Story
*As an investor, I want a dynamic checklist that tells me what to review each day/week/month so I stay disciplined and don't miss important portfolio events.*

#### Requirements

**Functional:**

**A. Dynamic Daily Checklist**
- Generate daily tasks based on portfolio events
- Morning routine (pre-market): news review, earnings calendar, margin check
- Market hours: monitor alerts, sentiment shifts
- Evening review: P&L attribution, thesis updates, next-day alerts
- Show completion percentage and streaks

**B. Event-Driven Tasks**
- Auto-add: "Review [TICKER] - SEC 10-Q filed today"
- Auto-add: "Investigate [TICKER] - sentiment dropped 15%"
- Auto-add: "Check stop-loss - [TICKER] down 12% from entry"
- Auto-add: "Rebalance check - [TICKER] 8% above target weight"

**C. Weekly Checklist**
- AI suggests weakest thesis stock for deep dive
- Rebalance check (>5% deviation from targets)
- New SEC filings review (summarized by AI)
- Competitor analysis (AI-suggested)
- Correlation matrix update

**D. Monthly Checklist**
- Full portfolio review vs investment principles
- Thesis validation (Buffett/Munger criteria)
- Position sizing optimization
- Tax loss harvesting opportunities
- Performance attribution analysis

**E. One-Click Actions**
- "Investigate" button → Opens AI copilot with context
- "Mark complete" with optional notes
- "Snooze" to defer task
- "Recurring" to create template

**Non-Functional:**
- Checklist generates by 6 AM ET daily
- Task priority scoring (high/medium/low)
- Historical checklist archive (3 months)
- Export to PDF/email option

**Acceptance Criteria:**
- [ ] Daily checklist generated by 6 AM ET
- [ ] Event-driven tasks appear within 15 min of trigger
- [ ] Completion rate tracked and displayed
- [ ] One-click "investigate" opens copilot with context
- [ ] Weekly/monthly checklists auto-generate on schedule
- [ ] User can customize checklist templates

#### Design Specifications

**Checklist UI:**
```
┌─────────────────────────────────────────┐
│ 📋 Today's Checklist (Nov 14, 2025)    │
│ ━━━━━━━━━━ 60% complete                │
│                                         │
│ Morning Routine (before 9:30 AM)       │
│ ☑️ Review overnight news                │
│ ☑️ Check pre-market movers              │
│ □ Scan earnings calendar                │
│ □ Review margin usage (current: 32%)   │
│                                         │
│ 🔥 Priority Items                       │
│ □ Review FCX - sentiment ↓15%          │
│   [Investigate] [Snooze]                │
│                                         │
│ Market Hours                            │
│ □ Monitor 2 active alerts               │
│ □ Check sector rotation signals         │
│                                         │
│ 🏆 7-day completion streak!             │
└─────────────────────────────────────────┘
```

---

### 4.5 FEATURE: Investment Thesis Tracker

**Priority:** P0 (Must Have)  
**Timeline:** Month 2, Week 7-8

#### User Story
*As a value investor, I want to document and track my investment thesis for each position so I can validate decisions over time and know when to exit.*

#### Requirements

**Functional:**

**A. Thesis Creation**
- Template-based editor (Buffett/Munger framework)
- Core sections:
  - Bull case (3-5 key points with metrics)
  - Bear case (risks, invalidation triggers)
  - Key metrics to monitor (with target values)
  - Stop-loss rules (hard stop, thesis invalidation)
  - Exit criteria (target price, time horizon)
- Rich text editor with markdown support
- Attach files (SEC filings, research reports)

**B. Progress Tracking**
- Quarterly AI-generated progress reports
- Metric comparison: Entry vs Current
- Thesis health score (0-100, AI-calculated)
- Visual timeline of major events
- Alerts when metrics diverge from thesis

**C. AI Integration**
- "Validate thesis against latest 10-Q"
- "Has thesis been invalidated?" (yes/no + reasoning)
- "Compare current metrics vs entry thesis"
- "Generate bear case challenges"
- Auto-update progress log quarterly

**D. Multi-Position View**
- Dashboard showing all thesis health scores
- Filter: At risk, Healthy, Invalidated
- Sortable by conviction, time held, performance
- Export individual thesis to PDF

**Non-Functional:**
- Thesis data stored in PostgreSQL
- Version history for thesis edits
- Mobile-friendly editor
- Offline draft capability (local storage)

**Acceptance Criteria:**
- [ ] User can create thesis from template in <5 min
- [ ] AI validation completes in <10s
- [ ] Thesis health score updates daily
- [ ] Alerts trigger when metrics diverge >20%
- [ ] Progress reports generate automatically each quarter
- [ ] Thesis export to PDF works correctly

#### Design Specifications

**Thesis Editor:**
```
┌─────────────────────────────────────────┐
│ Investment Thesis: COPX                 │
│ Entry: $38.50 | Date: Jan 15, 2025     │
│ Strategy: ■ Value  □ Growth  □ Momentum│
│                                         │
│ ━━ Buffett/Munger Framework ━━          │
│ ✅ Understandable business              │
│ ✅ Sustainable competitive advantage    │
│ ✅ Capable management                   │
│ ✅ Attractive valuation                 │
│                                         │
│ ━━ Bull Case ━━                         │
│ 1. [Rich text editor...]                │
│                                         │
│ ━━ Key Metrics to Monitor ━━            │
│ • Copper inventory: Target <200K tons   │
│   Current: 185K ✅ (within range)       │
│ • P/E Ratio: Target <15                 │
│   Current: 12.5 ✅ (undervalued)        │
│                                         │
│ ━━ Stop Loss & Exit Rules ━━            │
│ • Hard stop: -15% from entry            │
│ • Thesis invalidation: Inventory >300K │
│ • Target price: $52 (+35% upside)      │
│                                         │
│ ━━ Progress Log ━━                      │
│ Q1 2025: Thesis intact, metrics on track│
│ [AI-generated summary]                  │
│                                         │
│ [Save Draft] [Validate Thesis] [Export]│
└─────────────────────────────────────────┘
```

**Thesis Dashboard:**
```
┌─────────────────────────────────────────┐
│ All Investment Theses                   │
│ Filters: [All] [Healthy] [At Risk]     │
│                                         │
│ Ticker | Entry Date | Health | P&L      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ COPX   | Jan 15     | 92% ✅ | +25.3%  │
│ XLE    | Feb 1      | 88% ✅ | +18.2%  │
│ FCX    | Mar 10     | 78% ⚠️ | +8.5%   │
│ [Review thesis]                         │
└─────────────────────────────────────────┘
```

---

### 4.6 FEATURE: Risk Analytics Tab

**Priority:** P0 (Must Have)  
**Timeline:** Month 1, Week 3-4

#### User Story
*As a risk-conscious investor, I want to see portfolio risk metrics so I can understand volatility, drawdown exposure, and risk-adjusted returns.*

#### Requirements

**Functional:**

**A. Portfolio Risk Metrics**
- Sharpe Ratio (risk-adjusted return)
- Sortino Ratio (downside deviation focus)
- Calmar Ratio (return / max drawdown)
- Alpha (excess return vs market)
- Beta (market correlation)
- Standard deviation (volatility)
- R-squared (market correlation strength)

**B. Drawdown Analysis**
- Current drawdown from peak
- Maximum drawdown (all-time, 1Y, 3Y)
- Comparison vs S&P 500 drawdown
- Recovery time analysis
- Underwater chart (visual)

**C. Position-Level Risk**
- Individual stock beta, volatility
- Maximum drawdown per position
- Stop-loss distance
- Position sizing recommendations (Kelly Criterion)
- Risk contribution to portfolio

**D. Correlation Analysis**
- Correlation matrix (heatmap)
- Concentration risk alerts (>0.7 correlation)
- Diversification score
- Sector exposure breakdown

**E. Stress Testing**
- Historical crisis scenarios:
  - 2008 Financial Crisis
  - 2020 COVID Crash
  - 2022 Bear Market
- Custom scenario builder
- Portfolio impact vs S&P 500

**F. Margin Monitoring**
- Current margin usage percentage
- Remaining capacity
- Alert thresholds (35%, 40%, 45%)
- Historical margin usage chart

**Non-Functional:**
- Metrics recalculated daily after market close
- Historical data: 5 years minimum
- Calculations match industry standards (CFA Institute)
- Mobile-responsive charts

**Acceptance Criteria:**
- [ ] All 7 core risk metrics display correctly
- [ ] Drawdown chart shows 5 years of data
- [ ] Correlation matrix updates daily
- [ ] Stress test results match expected outcomes (±2%)
- [ ] Margin alerts trigger at correct thresholds
- [ ] Risk metrics exportable to CSV/PDF

#### Formulas & Calculations

**Sharpe Ratio:**
```
Sharpe = (Portfolio Return - Risk-Free Rate) / Portfolio StdDev

Where:
- Portfolio Return = Annualized return
- Risk-Free Rate = 10-year Treasury yield (currently ~4.5%)
- StdDev = Annualized standard deviation of returns

Example:
If portfolio return = 18%, StdDev = 14%, RF = 4.5%
Sharpe = (18% - 4.5%) / 14% = 0.96

Interpretation:
- >1.0 = Good (you're compensated well for risk)
- >2.0 = Very good
- >3.0 = Excellent
```

**Sortino Ratio:**
```
Sortino = (Portfolio Return - Risk-Free Rate) / Downside Deviation

Where:
- Downside Deviation = StdDev of NEGATIVE returns only
- More realistic than Sharpe (ignores upside volatility)

Example:
If return = 18%, Downside Dev = 9%, RF = 4.5%
Sortino = (18% - 4.5%) / 9% = 1.5

Interpretation:
- Higher is better (same as Sharpe)
- Typically 30-50% higher than Sharpe for good portfolios
```

**Alpha:**
```
Alpha = Portfolio Return - [Risk-Free Rate + Beta * (Market Return - Risk-Free Rate)]

Example:
Portfolio return = 18%, Beta = 0.85, Market return = 12%, RF = 4.5%
Expected return = 4.5% + 0.85 * (12% - 4.5%) = 10.875%
Alpha = 18% - 10.875% = +7.125%

Interpretation:
- Positive alpha = Outperforming expectations (skill)
- Negative alpha = Underperforming (consider index fund)
```

**Beta:**
```
Beta = Covariance(Portfolio, Market) / Variance(Market)

Example:
If Beta = 0.85:
- When market goes up 10%, portfolio expected to go up 8.5%
- When market goes down 10%, portfolio expected to go down 8.5%

Interpretation:
- Beta < 1 = Defensive (less volatile than market)
- Beta = 1 = Moves with market
- Beta > 1 = Aggressive (more volatile than market)
```

**Maximum Drawdown:**
```
Max Drawdown = (Trough Value - Peak Value) / Peak Value

Example:
Peak portfolio value = $150,000
Lowest value after peak = $120,000
Max DD = ($120K - $150K) / $150K = -20%

Interpretation:
- Shows worst-case loss from peak
- Key metric for risk tolerance
- Compare to S&P 500 max DD
```

#### Design Specifications

**Risk Dashboard:**
```
┌─────────────────────────────────────────┐
│ Risk Analytics                          │
│                                         │
│ Risk-Adjusted Returns                   │
│ ┌───────────┬─────────┬─────────────┐  │
│ │ Sharpe    │ 1.45    │ vs SPY: 1.12│  │
│ │ Sortino   │ 2.10    │ vs SPY: 1.55│  │
│ │ Calmar    │ 0.95    │ vs SPY: 0.70│  │
│ └───────────┴─────────┴─────────────┘  │
│                                         │
│ Volatility Analysis                     │
│ ┌─────────────────────────────────────┐ │
│ │ Standard Deviation: 14.2%           │ │
│ │ Beta: 0.85 (defensive)              │ │
│ │ Alpha: +4.2% (skill-based)          │ │
│ │ R-Squared: 0.72 (72% market corr)   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Maximum Drawdown                        │
│ ┌─────────────────────────────────────┐ │
│ │ Your Portfolio: -18.5%              │ │
│ │ S&P 500: -24.2%                     │ │
│ │ Outperformance: +5.7pp ✅           │ │
│ │ Recovery Time: 45 days              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Underwater Chart - 5Y view]            │
│                                         │
│ Margin Usage                            │
│ ━━━━━━━━━━━━━ 32%                       │
│ Safe Zone ←→ Warning (40%) →→ Danger   │
└─────────────────────────────────────────┘
```

---

### 4.7 FEATURE: AI Copilot 2.0

**Priority:** P0 (Must Have)  
**Timeline:** Month 3, Week 9-10

#### User Story
*As an investor, I want an AI assistant that understands my portfolio context and investment principles so I can get personalized research and decision support.*

#### Requirements

**Functional:**

**A. Chat Modes**
- Quick Query (DeepSeek): Fast Q&A, <2s response
- Deep Research (Claude): Multi-source analysis, citations
- Thesis Builder (Qwen Max): Structured investment case
- Risk Analysis (Claude): Stress testing, scenario analysis
- Comparison Mode (Llama): Stock A vs B side-by-side

**B. Context Awareness**
- Knows user's investment principles (Munger/Buffett/Burry)
- Remembers portfolio positions and weights
- Understands risk tolerance (30-40% margin limit)
- Recalls past thesis decisions and rationales
- Tracks user preferences over time

**C. Multi-Turn Conversations**
- Maintains context across messages
- References previous answers in thread
- Asks clarifying questions when needed
- Suggests related follow-up queries

**D. Data Integration**
- Cites sources (SEC filings, news articles, metrics)
- Shows relevant charts/tables inline
- Links to full documents
- Exports conversation to PDF

**E. Actionable Outputs**
- Generate investment thesis draft
- Create checklist items from conversation
- Set portfolio alerts
- Add stocks to watchlist
- Schedule follow-up reminders

**Non-Functional:**
- Response time <3s for 90% of queries
- Conversation history stored 90 days
- Mobile-responsive chat interface
- Keyboard shortcuts (⌘K to open, ⌘Enter to send)

**Acceptance Criteria:**
- [ ] Copilot responds in <3s for P90
- [ ] Context maintained across 10+ message threads
- [ ] Citations link to correct sources
- [ ] Actionable outputs create actual items (alerts, checklists)
- [ ] Conversation export works correctly
- [ ] Mobile chat interface fully functional

#### Sample Interactions

**Example 1: Position Sizing Decision**
```
You: "Should I add to my copper position?"

Copilot:
📊 Current Exposure Analysis
- Copper direct: 18% (COPX)
- Energy (copper-adjacent): 15% (XLE)
- Total thematic: 33%

🎯 Your Thesis Status (COPX)
- Entry: $38.50 (Jan 15, 2025)
- Current: $48.25 (+25.3%)
- Thesis health: 92% ✅

Recent Signals (Last 7 Days):
✅ Copper inventory ↓8% (bullish)
⚠️ China manufacturing PMI: 49.2 (weak demand)
✅ LME forward curve in backwardation (tight supply)
✅ Your stop-loss: No triggers

Munger Framework Check:
✅ Margin of safety: 18% (entry was undervalued)
✅ Competitive position: Producers have pricing power
✅ Management: Rated A (capital allocation excellent)

💡 Recommendation:
Wait for China PMI data (Friday, Nov 16). If >50, 
consider adding 5% position. This keeps total 
thematic exposure at 38%, within your 40% limit.

Alternative: Add FCX (pure-play miner) for diversification 
vs COPX (ETF). Current P/E: 10.8 vs sector 14.2.

[Add to Watchlist] [Set Alert: China PMI] [Create Checklist Item]
```

**Example 2: Thesis Validation**
```
You: "Validate my FCX thesis against Q3 earnings"

Copilot:
📄 Analyzing FCX Q3 2025 10-Q (filed Nov 5)
Sources: SEC Edgar, earnings call transcript

Your Original Thesis (Entry: Mar 10, 2025):
"FCX benefits from copper supply constraints and 
strong demand from energy transition. Management 
executing well on cost reduction."

✅ Thesis Points Still Valid:
1. Copper production: 950K tons (↑8% YoY) ✅
   - Your target: >900K tons
   
2. Cost reduction: $2.85/lb AISC (↓12% YoY) ✅
   - Your target: <$3.00/lb
   
3. FCF generation: $1.2B (↑45% YoY) ✅
   - Your target: >$800M quarterly

⚠️ New Risk Factors:
1. Indonesia: Grasberg copper grade declining
   - Management guide: -5% production in 2026
   - Impact: Could pressure margins

2. CapEx increase: $1.5B planned for 2026
   - +25% vs 2025
   - Reason: Mill expansion at Morenci

📊 Updated Metrics vs Entry:
Metric        | Entry | Current | Target | Status
P/E           | 12.5  | 10.8    | <15    | ✅
FCF Yield     | 8.5%  | 9.8%    | >8%    | ✅
Debt/Equity   | 0.42  | 0.38    | <0.50  | ✅
ROIC          | 15.2% | 16.8%   | >12%   | ✅

🎯 Thesis Health: 78% → 82% (improved ✅)

💡 Action Items:
1. Monitor Indonesia production closely (Q4 update)
2. Validate CapEx ROI in next earnings call
3. Consider trimming if production guide drops <850K

Thesis remains INTACT. Position: HOLD.

[Update Thesis] [Add Monitoring Alert] [Export Analysis]
```

**Example 3: Quick Market Check**
```
You: "Why is copper down today?"

Copilot (DeepSeek, <2s):
🔍 Copper futures ↓2.1% today

Primary drivers:
1. China stimulus disappointment (Reuters, 8 AM ET)
   - Expected ¥2T, announced ¥500B
   
2. USD strength (DXY +0.8%)
   - Typical inverse correlation
   
3. LME inventory +4% week-over-week
   - Short-term oversupply signal

Your portfolio impact:
- COPX: -1.8% (tracking spot copper)
- FCX: -2.5% (higher beta to spot)

📊 Context: This is noise, not a thesis change.
Your investment case is 3-5 year energy transition,
not daily trading. China will add more stimulus.

[View Full Analysis] [No Action Needed]
```

---

## 5. TECHNICAL ARCHITECTURE

### 5.1 Tech Stack

```yaml
Frontend:
  Framework: Next.js 14 (App Router)
  Language: TypeScript
  Styling: TailwindCSS + shadcn/ui
  Animation: Framer Motion
  Charts: Recharts, TradingView Lightweight Charts
  State: Tanstack Query (React Query)
  Forms: React Hook Form + Zod

Backend:
  API Routes: Next.js Edge Functions
  Caching: Upstash Redis
  Database: Vercel Postgres (Neon)
  Auth: Clerk (future multi-user)
  
AI Infrastructure:
  Routing: OpenRouter (multi-model access)
  Primary Models:
    - DeepSeek (v3): Fast, cheap
    - Qwen (Max/Plus): Quality analysis
    - Claude Sonnet 4: Deep reasoning
    - Llama 3.1 (70B/405B): Fallback
    - Mistral Large: Backup
  Streaming: Vercel AI SDK
  
Data Sources:
  Primary: Alpha Vantage (FREE tier, 25 calls/day)
  Fallback: Yahoo Finance (scraping, self-rate-limited)
  SEC: Edgar API (10 req/sec)
  News: NewsAPI (cached 8 hours)
  Cache Layer: Upstash Redis (persistent, 24hr-30day TTL)

Deployment:
  Platform: Vercel
  Domain: portfolio-tracker-tawny.vercel.app
  CDN: Vercel Edge Network
  Analytics: Vercel Analytics

Development Tools:
  IDE: Cursor (AI-powered)
  Copilot: GitHub Copilot
  Version Control: Git + GitHub
  CI/CD: Vercel (automatic)
```

### 5.2 Data Flow Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓ (HTTPS)
┌─────────────────┐
│  Next.js App    │ ← Edge Runtime
│  (Vercel)       │
└────┬────────┬───┘
     │        │
     ↓        ↓
┌─────────┐ ┌──────────────┐
│  Redis  │ │  PostgreSQL  │
│ (Cache) │ │  (User Data) │
│ 15min-  │ │              │
│ 90day   │ │              │
│  TTL    │ │              │
└────┬────┘ └──────────────┘
     │
     ↓ (Cache Miss - Smart Fallback Chain)
┌──────────────────────────┐
│   External APIs          │
├──────────────────────────┤
│ 1. Alpha Vantage (25/day)│ ← Primary
│ 2. Yahoo Finance (scrape)│ ← Fallback
│ 3. SEC Edgar (10/sec)    │ ← Filings
│ 4. NewsAPI (100/day)     │ ← News
└──────┬───────────────────┘
       │
       ↓ (Analysis)
┌──────────────────────────┐
│   AI Router + Cache      │
├──────────────────────────┤
│ → DeepSeek (Tier 1)      │
│ → Qwen (Tier 2)          │
│ → Claude (Tier 3)        │
│ → Fallback chain         │
│ Cache: 24hr AI responses │
└──────────────────────────┘
```

### 5.3 Database Schema

```sql
-- Users (future multi-user)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Portfolios
CREATE TABLE portfolios (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Holdings
CREATE TABLE holdings (
  id UUID PRIMARY KEY,
  portfolio_id UUID REFERENCES portfolios(id),
  ticker VARCHAR(10),
  shares DECIMAL(18, 6),
  entry_price DECIMAL(18, 2),
  entry_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Investment Theses
CREATE TABLE theses (
  id UUID PRIMARY KEY,
  holding_id UUID REFERENCES holdings(id),
  bull_case TEXT,
  bear_case TEXT,
  key_metrics JSONB,
  stop_loss_rules JSONB,
  thesis_health_score INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Checklists
CREATE TABLE checklists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  date DATE,
  frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly'
  tasks JSONB,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  messages JSONB,
  context JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  holding_id UUID REFERENCES holdings(id),
  alert_type VARCHAR(50),
  condition JSONB,
  triggered_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Historical Prices (cached)
CREATE TABLE price_history (
  id UUID PRIMARY KEY,
  ticker VARCHAR(10),
  date DATE,
  open DECIMAL(18, 2),
  high DECIMAL(18, 2),
  low DECIMAL(18, 2),
  close DECIMAL(18, 2),
  volume BIGINT,
  UNIQUE(ticker, date)
);

-- Fundamental Data (cached)
CREATE TABLE fundamentals (
  id UUID PRIMARY KEY,
  ticker VARCHAR(10),
  fiscal_period VARCHAR(10), -- 'Q1 2025', 'FY 2024'
  metrics JSONB,
  fetched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker, fiscal_period)
);
```

### 5.4 API Rate Limits & Costs

```yaml
Alpha Vantage (FREE - Primary):
  Limit: 25 calls/day
  Cost: $0
  Endpoints Used:
    - OVERVIEW (fundamentals): 1 call per stock
    - INCOME_STATEMENT: 1 call per stock
    - BALANCE_SHEET: 1 call per stock
    - CASH_FLOW: 1 call per stock
    - GLOBAL_QUOTE (price): 1 call per stock
  
  Usage Strategy (10 stocks portfolio):
    - Daily price updates: 10 calls (all stocks)
    - Fundamentals rotation: 3 stocks/day (12 calls over 4 days)
    - SEC filing triggers: On-demand (1-2 calls/day)
    - Total: ~15 calls/day (well under 25 limit)
  
  Smart Caching:
    - Price data: 15 min TTL during market hours
    - Fundamentals: 24 hour TTL (refresh after market close)
    - Income/Balance/Cash Flow: 90 day TTL (quarterly updates)
    - Cache hit rate target: >85%

Yahoo Finance (FREE - Fallback):
  Limit: None (scraping, self-rate-limited to 1 req/sec)
  Cost: $0
  Usage Strategy:
    - Fallback when Alpha Vantage limit hit
    - Real-time price quotes (15-min delay acceptable)
    - Historical price data (10 years)
    - Basic fundamentals as backup
    - Self-imposed rate limit: 60 calls/hour
  
  Cache Strategy:
    - Same as Alpha Vantage (15 min prices, 24hr fundamentals)
    - Prioritize cache hits to minimize scraping

SEC Edgar (FREE):
  Limit: 10 requests/second
  Cost: $0
  Usage Strategy:
    - Fetch 10-Q, 10-K as published (event-driven)
    - Cache for 30 days (filings never change)
    - ~1-2 calls/day (only when new filings detected)
    - User-Agent required: "portfolio-tracker/1.0 (contact@example.com)"

NewsAPI (FREE):
  Limit: 100 calls/day
  Cost: $0
  Usage Strategy:
    - Fetch 3x daily: 6 AM, 12 PM, 6 PM ET
    - 10 stocks × 3 fetches = 30 calls/day
    - Cache for 8 hours between refreshes
    - Keyword-based queries (ticker symbols + "earnings OR SEC OR analyst")

OpenRouter (AI):
  Budget: $20/month = ~$0.67/day
  Models & Costs:
    - DeepSeek v3: $0.27/M input, $1.10/M output
    - Qwen Max: $0.50/M input, $1.50/M output
    - Claude Sonnet 4: $3.00/M input, $15/M output
    - Llama 3.1-70B: $0.35/M input, $0.40/M output
    
  Usage Strategy:
    - 70% DeepSeek (quick queries): ~$0.47/day
    - 25% Qwen/Llama (analysis): ~$0.17/day
    - 5% Claude (critical decisions): ~$0.03/day
    - Total: ~$0.67/day = $20/month ✅
  
  AI Response Caching:
    - Identical queries: 24 hour TTL
    - SEC filing summaries: 30 day TTL
    - Stock analysis: 12 hour TTL
    - Cache hit rate target: >70%

Upstash Redis (FREE):
  Limit: 10K commands/day
  Cost: $0
  Usage: Primary caching layer
  
  Cache Structure:
    AV:QUOTE:{ticker}           TTL: 15 min
    AV:FUNDAMENTALS:{ticker}    TTL: 24 hours
    AV:INCOME:{ticker}          TTL: 90 days
    AV:BALANCE:{ticker}         TTL: 90 days
    AV:CASHFLOW:{ticker}        TTL: 90 days
    SEC:{ticker}:{filing}       TTL: 30 days
    NEWS:{ticker}:{date}        TTL: 8 hours
    AI:RESPONSE:{hash}          TTL: 24 hours
  
  Cache Efficiency:
    - Estimated daily cache reads: ~500 (well under 10K)
    - Estimated daily cache writes: ~50
    - Cache hit rate monitoring: Dashboard metric
```

---

## 6. USER EXPERIENCE (UX) REQUIREMENTS

### 6.1 Performance Targets

```
Page Load Times:
- Initial load (cold): <2.5s
- Subsequent loads (cached): <1.0s
- Dashboard refresh: <0.5s
- Chart rendering: <0.3s

API Response Times:
- Price data: <500ms
- Fundamental metrics: <1s
- AI copilot response: <3s (P90)
- SEC filing summary: <5s

Mobile Performance:
- First Contentful Paint: <1.5s
- Time to Interactive: <3.5s
- Lighthouse Score: >90
```

### 6.2 Accessibility (A11y)

```yaml
Standards: WCAG 2.1 Level AA

Requirements:
  - Keyboard navigation: All features accessible via keyboard
  - Screen reader: ARIA labels on all interactive elements
  - Color contrast: Minimum 4.5:1 for text
  - Focus indicators: Visible 2px outline on all focusable elements
  - Alt text: All charts have descriptive text alternatives
  - Font sizing: User can increase to 200% without breaking layout

Testing:
  - axe DevTools: 0 violations
  - Manual keyboard test: Full navigation possible
  - Screen reader test: NVDA/JAWS compatible
```

### 6.3 Responsive Design Breakpoints

```css
/* Mobile First Approach */

/* Mobile (default): 320px - 640px */
- Single column layout
- Collapsible sidebar
- Stacked cards
- Simplified charts

/* Tablet: 641px - 1024px */
- Two column layout
- Side-by-side cards
- Full-featured charts
- Expandable sidebar

/* Desktop: 1025px - 1440px */
- Multi-column dashboard
- Persistent sidebar
- Advanced data visualizations
- Command palette (⌘K)

/* Large Desktop: 1441px+ */
- Ultra-wide optimizations
- Side-by-side comparisons
- Multi-chart views
```

### 6.4 Dark Theme Color System

```css
/* Base Colors */
--bg-primary: #0A0A0A;      /* True black background */
--bg-secondary: #111111;    /* Elevated surfaces */
--bg-tertiary: #1A1A1A;     /* Cards, modals */

/* Text Colors */
--text-primary: #FAFAFA;    /* High contrast text */
--text-secondary: #A1A1AA;  /* Muted text */
--text-tertiary: #71717A;   /* Disabled text */

/* Accent Colors */
--accent-blue: #3B82F6;     /* Primary actions */
--accent-cyan: #00E5FF;     /* Fluorescent highlights */
--accent-purple: #7C3AED;   /* Secondary highlights */

/* Semantic Colors */
--success: #10B981;         /* Gains, positive */
--warning: #F59E0B;         /* Alerts, caution */
--error: #EF4444;           /* Losses, negative */
--info: #3B82F6;            /* Information */

/* Chart Colors */
--chart-line-1: #3B82F6;    /* Portfolio */
--chart-line-2: #71717A;    /* S&P 500 */
--chart-line-3: #7C3AED;    /* Benchmark */
--chart-up: #10B981;        /* Positive bars */
--chart-down: #EF4444;      /* Negative bars */

/* Borders & Dividers */
--border-subtle: #1A1A1A;
--border-default: #27272A;
--border-strong: #3F3F46;
```

---

## 7. DEVELOPMENT WORKFLOW

### 7.1 Sprint Structure (2-Week Sprints)

```
Sprint 1 (Nov 15-28): Foundation
- UX redesign implementation
- AI router infrastructure
- Smart caching setup
- Database schema migration

Sprint 2 (Nov 29 - Dec 12): Fundamentals
- 30+ metrics integration
- Financials tab (10Y data)
- Risk analytics tab
- Portfolio vs market charts

Sprint 3 (Dec 13-26): Intelligence
- Proactive checklist system
- Event-driven task generation
- Daily/weekly/monthly templates

Sprint 4 (Dec 27 - Jan 9): Thesis Tracking
- Thesis editor UI
- AI validation integration
- Progress tracking
- Thesis health scoring

Sprint 5 (Jan 10-23): AI Copilot 2.0
- Context-aware chat
- Multi-turn conversations
- Actionable outputs
- Citation system

Sprint 6 (Jan 24 - Feb 6): Polish & Launch
- Performance optimization
- Bug fixes
- Documentation
- User testing
```

### 7.2 AI Development Tools Usage

```yaml
Claude (via Cursor):
  Use Cases:
    - Architecture decisions
    - Complex algorithm implementation
    - Code reviews
    - Debugging assistance
    - Documentation writing
  
  Workflow:
    1. Write detailed prompt in Cursor
    2. Review generated code
    3. Test thoroughly
    4. Refine with follow-ups

GitHub Copilot:
  Use Cases:
    - Boilerplate code generation
    - Test case writing
    - Repetitive patterns
    - Type definitions
  
  Workflow:
    1. Write function signature/comment
    2. Accept suggestion (Tab)
    3. Validate & adjust
    4. Move to next

DeepSeek (via API):
  Use Cases:
    - Quick code snippets
    - Simple bug fixes
    - Code explanation
  
  Workflow:
    1. Call API with code context
    2. Get instant suggestions
    3. Apply if appropriate

Quality Control:
  - Always review AI-generated code
  - Write tests for critical paths
  - Manual testing for UX flows
  - Code review before merge
```

### 7.3 Testing Strategy

```yaml
Unit Tests:
  Framework: Jest + Testing Library
  Coverage Target: >80%
  Focus:
    - Utility functions
    - Data transformations
    - Calculation accuracy
    - API response parsing

Integration Tests:
  Framework: Playwright
  Coverage:
    - API routes
    - Database operations
    - External API integrations
    - AI router logic

End-to-End Tests:
  Framework: Playwright
  Critical Paths:
    - Login → Dashboard → View holdings
    - Create thesis → Validate → Export
    - Add checklist item → Complete → Archive
    - Chat with copilot → Get actionable output

Manual Testing:
  Weekly:
    - Full user flow walkthrough
    - Mobile responsiveness check
    - Browser compatibility (Chrome, Safari, Firefox)
    - Accessibility audit

AI Quality Testing:
  Ongoing:
    - Response accuracy validation
    - Cost per query tracking
    - Fallback chain verification
    - Citation correctness
```

---

## 8. SUCCESS CRITERIA & METRICS

### 8.1 Month 1 Goals

```yaml
Technical:
  ✓ AI router operational with 5+ models
  ✓ Smart caching (>70% hit rate)
  ✓ Cost tracking dashboard live
  ✓ Monthly AI spend <$20
  
Features:
  ✓ 30+ fundamental metrics implemented
  ✓ Risk analytics tab complete
  ✓ Portfolio vs market chart working
  ✓ Dark theme redesign complete
  
Performance:
  ✓ Page load <1.5s
  ✓ API response <1s (P90)
  ✓ Zero blocking bugs

User Satisfaction:
  ✓ Self-rating: 8/10 on usability
  ✓ All critical workflows functional
```

### 8.2 Month 2 Goals

```yaml
Features:
  ✓ Intelligent checklist system live
  ✓ Daily/weekly/monthly checklists generating
  ✓ Event-driven tasks working
  ✓ Thesis tracker complete (all positions)
  ✓ Thesis health scoring accurate
  
Usage:
  ✓ Daily checklist completion rate >80%
  ✓ Thesis validated weekly per position
  ✓ Zero missed critical alerts
  
Technical:
  ✓ Database migrations stable
  ✓ Thesis versioning working
  ✓ Alert system reliable
```

### 8.3 Month 3 Goals

```yaml
Features:
  ✓ AI Copilot 2.0 fully functional
  ✓ Context-aware conversations
  ✓ Stock screener operational
  ✓ Watchlist intelligence active
  
AI Performance:
  ✓ Response time <3s (P90)
  ✓ Query success rate >90%
  ✓ Cost still <$20/month
  ✓ Fallback chain 100% reliable
  
User Experience:
  ✓ Self-rating: 9/10 on overall experience
  ✓ Would recommend to other investors
  ✓ Platform meets all workflow needs
```

### 8.4 Long-Term Success Metrics (6-12 months)

```yaml
Platform Health:
  - Uptime: >99.5%
  - Daily active usage: >90% of weekdays
  - Feature adoption: >70% of features used weekly
  
Investment Performance:
  - Portfolio Sharpe Ratio: >1.5
  - Thesis validation accuracy: >80%
  - Avoided losses via stop-loss alerts: Measurable
  
User Growth (if expanding):
  - MAU (Monthly Active Users): 10-100
  - Retention rate: >80%
  - NPS (Net Promoter Score): >50
```

---

## 9. RISKS & MITIGATIONS

### 9.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API rate limits hit frequently | Medium | High | Multi-tier fallback, aggressive caching, rate limit monitoring |
| AI costs exceed budget | Medium | High | Real-time cost tracking, auto-throttling, model tier enforcement |
| Data source reliability issues | Medium | Medium | 3-tier fallback (FMP → Alpha Vantage → Yahoo), health checks |
| Database performance degradation | Low | Medium | Proper indexing, query optimization, connection pooling |
| Security breach / data exposure | Low | Critical | Vercel security, environment variables, no sensitive data storage |

### 9.2 Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Feature complexity overwhelming | Medium | Medium | Iterative rollout, progressive disclosure, tooltips/onboarding |
| AI responses inaccurate/hallucinating | Medium | High | Model selection, prompt engineering, citation requirements, user validation |
| Checklist fatigue / low adoption | Medium | Medium | Smart prioritization, gamification (streaks), optional depth levels |
| Thesis tracking too time-consuming | Low | Medium | Templates, AI assistance, one-click updates |
| Mobile experience subpar | Low | Low | Desktop-first is intentional, basic mobile support acceptable |

### 9.3 Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Can't scale to multi-user economically | High | Medium | Start with single-user, validate model before expansion |
| Competitive pressure from Bloomberg/Snowball | Low | Low | Focus on personalization differentiator, value investing niche |
| Regulatory compliance issues | Low | Critical | Disclaimer: not investment advice, no broker/dealer functions |
| Intellectual property concerns | Low | Medium | Open source consideration, proper licensing, no proprietary data |

---

## 10. FUTURE ROADMAP (Post 3-Month MVP)

### Phase 2: Multi-User & Monetization (Month 4-6)
- User authentication & onboarding
- Freemium pricing: $0 (basic) / $10/month (pro)
- Shared portfolios (advisors + clients)
- White-label option for advisors
- Team collaboration features

### Phase 3: Advanced Features (Month 7-9)
- Mobile app (React Native)
- Email/SMS alerts
- Automated weekly reports
- Backtesting engine (historical "what-if")
- Options/derivatives tracking
- International markets support

### Phase 4: AI Evolution (Month 10-12)
- Fully autonomous portfolio monitoring
- Predictive alerts (before problems occur)
- Natural language portfolio queries
- Voice interface (Siri/Alexa integration)
- Custom AI models fine-tuned on user data

### Phase 5: Platform Play (Year 2+)
- API for third-party integrations
- Marketplace for custom indicators/strategies
- Community features (value investing network)
- Educational content (courses, webinars)
- Acquisition target evaluation 🎯

---

## 11. APPENDIX

### 11.1 Competitor Analysis

| Feature | Our Platform | Bloomberg Terminal | Snowball Analytics | Kubera |
|---------|-------------|-------------------|-------------------|--------|
| Price | $0 | $25K/year | $15/month | $10/month |
| Fundamental Metrics | 30+ (Burry-style) | 100+ | 15 | 10 |
| AI Copilot | ✅ Multi-model | ❌ | ❌ | ❌ |
| Thesis Tracking | ✅ Deep | ❌ | ❌ | ❌ |
| Proactive Checklists | ✅ | ❌ | ❌ | ❌ |
| Value Investing Focus | ✅ | ❌ | ✅ Dividend | ❌ |
| Mobile App | ❌ (future) | ✅ | ✅ | ✅ |
| Multi-Asset | Equities only | Everything | Equities + Dividend | Everything |
| Target User | DIY Value Investors | Institutions | Dividend Investors | Wealth Trackers |

**Key Differentiators:**
1. AI-powered personalized guidance (nobody else has this)
2. Thesis validation & tracking (unique)
3. Proactive decision support (vs reactive dashboards)
4. Value investing principles embedded (vs generic tracking)
5. Cost-effective for individuals ($0 vs $180+/year)

### 11.2 Key Terms Glossary

**Alpha:** Excess return above market expectations, measuring skill vs luck

**Beta:** Correlation to market movements (1.0 = moves with market)

**CAPE (Shiller P/E):** Cyclically-adjusted price-to-earnings over 10 years

**DCF (Discounted Cash Flow):** Valuation method based on future cash flows

**EV/EBITDA:** Enterprise value to earnings before interest, taxes, depreciation, amortization

**Graham Number:** Intrinsic value formula: √(22.5 × EPS × Book Value per Share)

**Kelly Criterion:** Position sizing formula maximizing long-term growth

**Margin of Safety:** Difference between intrinsic value and market price

**ROIC (Return on Invested Capital):** Profitability metric showing capital efficiency

**Sharpe Ratio:** Risk-adjusted return metric (return / volatility)

**Sortino Ratio:** Sharpe ratio considering only downside volatility

**Thesis:** Documented investment rationale for a position

---

## 12. DOCUMENT REVISION HISTORY

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | Nov 14, 2025 | Alex | Initial draft - roadmap structure |
| 1.0 | Nov 14, 2025 | Alex | Complete PRD with all sections |

---

**Document Status:** ✅ APPROVED FOR DEVELOPMENT

**Next Steps:**
1. ✅ Review and approve PRD
2. Begin Week 1 sprint planning
3. Set up development environment
4. Start UX redesign implementation

---

*This is a living document. Updates will be made as requirements evolve.*