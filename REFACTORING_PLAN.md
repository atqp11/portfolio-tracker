# 🔄 Portfolio Tracker Refactoring Plan
#
> **Note:** This refactoring plan is designed to align with both the PRD and the Stock Research Agent Integration spec (see `prd/stock-research-agent-design.md`). All major architectural features—multi-model AI routing, tiered stock system, three-layer caching, batch jobs, cost management, quality assurance, security, and monitoring—are planned for integration. Any features from the agent spec not yet implemented are scheduled for future phases, ensuring full strategic alignment.

**Date:** November 14, 2025  
**Status:** Planning Phase  
**Objective:** Transform from prototype to structured, productized platform per PRD v1.0

---

## 📋 Executive Summary

This document outlines what to **KEEP**, **REFACTOR**, and **ADD** to align the current implementation with the PRD while preserving all critical functionality.

### Current State Assessment ✅
**Working Features:**
- ✅ Portfolio tracking (Energy & Copper)
- ✅ Live price data (Alpha Vantage/FMP)
- ✅ Commodity prices (WTI, NG, Copper)
- ✅ Stop-loss & take-profit alerts
- ✅ DRIP (dividend reinvestment)
- ✅ Margin tracking
- ✅ AI Co-Pilot (StonksAI with Google Gemini)
- ✅ Smart caching system
- ✅ Basic risk calculations
- ✅ News feed integration

---

## 🔒 CRITICAL: What NOT to Lose

### 1. Core Portfolio Logic
**Files to Preserve:**
- `lib/config.ts` - Portfolio configuration structure
- `lib/calculator.ts` - Position sizing calculations
- `lib/alerts.ts` - Stop-loss, take-profit, margin call logic
- `lib/drip.ts` - Dividend reinvestment
- `lib/storage.ts` - IndexedDB client-side storage

**Rationale:** These form the financial calculation foundation. Tested and working.

### 2. AI Infrastructure
**Files to Preserve:**
- `components/StonksAI/StonksAI.tsx` - AI chat interface
- `app/api/ai/generate/route.ts` - AI API endpoint
- `lib/aiCache.ts` - AI response caching
- `types/google-genai.d.ts` - Type definitions

**Rationale:** Already implements smart caching and multi-turn conversations. PRD wants multi-model routing which can be added to this.

### 3. Data Fetching Infrastructure
**Files to Preserve:**
- `lib/api/alphavantage.ts` - Stock quotes
- `lib/api/fmp.ts` - Fundamentals data
- `lib/cache.ts` - General caching utilities
- `lib/rateLimitTracker.ts` - API rate limiting
- `app/api/quote/route.ts` - Price API endpoint
- `app/api/commodities/*` - Commodity data
- `app/api/news/*` - News endpoints

**Rationale:** Multi-tier fallback system already implemented. Just needs expansion.

### 4. Visual Design Elements
**Files to Preserve:**
- Current dark theme color system
- Responsive layout approach
- StonksAI sidebar design

**Rationale:** PRD emphasizes "Vercel/Linear aesthetic" - current design is close.

---

## 🔧 REFACTOR: What Needs Restructuring

### Phase 1: Architecture & Structure (Week 1-2)

#### 1.1 Portfolio Data Model
**Current:** Hardcoded configs in `lib/config.ts`  
**Target:** Database-backed portfolio management

**Changes:**
```typescript
// NEW: lib/models/portfolio.ts
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  description: string;
  initialCash: number;
  initialMargin: number;
  cashRatio: number;
  marginRatio: number;
  holdings: Holding[];
  createdAt: Date;
}

interface Holding {
  id: string;
  portfolioId: string;
  ticker: string;
  name: string;
  shares: number;
  entryPrice: number;
  entryDate: Date;
  cashAllocation: number;
  useMargin: boolean;
  // NEW: Thesis tracking
  thesisId?: string;
}
```

**Migration Strategy:**
1. Add database schema (Postgres via Vercel)
2. Create migration script from `lib/config.ts` to DB
3. Update all components to use DB queries
4. Keep `lib/config.ts` as seed data

**Files Affected:**
- `app/page.tsx` - Replace hardcoded portfolio with DB fetch
- `lib/config.ts` - Keep as template/seed only
- **NEW:** `lib/models/portfolio.ts`
- **NEW:** `lib/db/portfolios.ts` (CRUD operations)

#### 1.2 Component Structure
**Current:** Single massive `app/page.tsx` (710 lines)  
**Target:** Modular component architecture

**New Structure:**
```
app/
  (dashboard)/              # Route group for authenticated dashboard
    layout.tsx              # Dashboard layout wrapper
    page.tsx                # Overview dashboard (NEW)
    holdings/
      page.tsx              # Holdings list/grid
    fundamentals/
      [ticker]/
        page.tsx            # Fundamentals tab
    risk/
      page.tsx              # Risk analytics
    thesis/
      page.tsx              # Thesis tracker dashboard
    
components/
    AllocationChart.tsx     # Pie/donut chart
    PerformanceChart.tsx    # Portfolio vs S&P 500
    MetricsGrid.tsx         # 30+ metrics display
    HistoricalChart.tsx     # 10Y financials
    ComparisonView.tsx      # Side-by-side stocks
  risk/                     # NEW
    RiskMetricsCards.tsx    # Sharpe, Sortino, etc.
    DrawdownChart.tsx       # Underwater chart
    CorrelationMatrix.tsx   # Heatmap
  thesis/                   # NEW
    ThesisEditor.tsx        # Rich text editor
    ThesisHealthScore.tsx   # Progress tracking
    ValidationReport.tsx    # AI-generated
  checklist/                # NEW
    ChecklistDashboard.tsx  # Today's tasks
    TaskItem.tsx            # Individual task
  ai/
    StonksAI.tsx            # KEEP - rename to AICopilot.tsx
  shared/                   # Existing components
    AlertBanner.tsx         # KEEP
    AssetCard.tsx           # KEEP
    CommodityCard.tsx       # KEEP
    PortfolioHeader.tsx     # REFACTOR
```

**Migration Steps:**
1. Create new component files
2. Extract logic from `app/page.tsx` incrementally
3. Test each component in isolation
4. Replace in main dashboard

#### 1.3 AI Router Enhancement
**Current:** Single Google Gemini model  
**Target:** Multi-model intelligent routing per PRD

**Changes:**
```typescript
// NEW: lib/ai/router.ts
type ModelTier = 'tier1' | 'tier2' | 'tier3' | 'fallback';

interface AIRouterConfig {
  tier1: ModelConfig[];  // Fast & cheap: DeepSeek, Qwen Plus, Llama 3.1-70B
  tier2: ModelConfig[];  // Quality: Claude Sonnet 4, Qwen Max
  tier3: ModelConfig[];  // Reasoning: Claude Sonnet 4, DeepSeek Reasoner
  fallback: ModelConfig[];
}

async function routeQuery(
  query: string,
  context: Context,
  preferredTier?: ModelTier
): Promise<AIResponse> {
  const tier = preferredTier || determineQueryTier(query, context);
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

**Integration Points:**
- Keep existing `app/api/ai/generate/route.ts`
- Add OpenRouter integration
- Update StonksAI to use new router
- Add cost tracking dashboard

**Files:**
- **NEW:** `lib/ai/router.ts`
- **NEW:** `lib/ai/models.ts` (model configs)
- **NEW:** `lib/ai/cost-tracker.ts`
- **UPDATE:** `app/api/ai/generate/route.ts`

---

### Phase 2: Feature Additions (Week 3-4)

#### 2.1 Fundamentals Tab
**Priority:** P0  
**Status:** NEW

**Components to Build:**
```typescript
// components/fundamentals/MetricsGrid.tsx
- 30+ metrics (P/E, PEG, P/B, P/S, P/FCF, etc.)
- 5-year averages
- Sector comparisons
- Visual indicators (undervalued/fair/overvalued)

// components/fundamentals/QualityMetrics.tsx
- ROE, ROIC, ROA
- Margin trends with sparklines
- Debt ratios
- FCF analysis

// components/fundamentals/BurryStyleDeepDive.tsx
- 10-year historical financials
- Cash flow quality
- Debt structure
- Off-balance-sheet risks
```

**Data Sources:**
- Primary: FMP API (already integrated)
- Secondary: Alpha Vantage
- Fallback: Yahoo Finance scraping
- SEC: Edgar API for filings

**API Endpoints:**
- **NEW:** `app/api/fundamentals/[ticker]/route.ts`
- **NEW:** `app/api/fundamentals/[ticker]/history/route.ts`
- **NEW:** `app/api/fundamentals/compare/route.ts`

#### 2.2 Investment Thesis Tracker
**Priority:** P0  
**Status:** NEW

**Database Schema:**
```sql
CREATE TABLE theses (
  id UUID PRIMARY KEY,
  holding_id UUID REFERENCES holdings(id),
  bull_case TEXT,
  bear_case TEXT,
  key_metrics JSONB,
  stop_loss_rules JSONB,
  exit_criteria JSONB,
  thesis_health_score INTEGER,
  validation_history JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Components:**
```typescript
// components/thesis/ThesisEditor.tsx
- Rich text editor (Tiptap or similar)
- Template-based (Buffett/Munger framework)
- File attachments
- Version history

// components/thesis/ThesisHealthScore.tsx
- AI-calculated score (0-100)
- Metric comparison (entry vs current)
- Visual timeline
- Divergence alerts

// components/thesis/ValidationReport.tsx
- Quarterly AI reports
- SEC filing analysis
- Thesis invalidation checks
```

**AI Integration:**
```typescript
// lib/ai/thesis-validator.ts
- validateThesisAgainstFiling()
- calculateThesisHealthScore()
- generateProgressReport()
- checkInvalidationTriggers()
```

#### 2.3 Intelligent Checklist System
**Priority:** P0  
**Status:** NEW

**Database Schema:**
```sql
CREATE TABLE checklists (
  id UUID PRIMARY KEY,
  user_id UUID,
  date DATE,
  frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly'
  tasks JSONB,
  completed_tasks JSONB,
  completion_percentage DECIMAL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  frequency VARCHAR(20),
  tasks JSONB,
  is_default BOOLEAN
);
```

**Components:**
```typescript
// components/checklist/ChecklistDashboard.tsx
- Daily/weekly/monthly view
- Completion percentage
- Streak tracking
- Event-driven tasks

// components/checklist/TaskItem.tsx
- Checkbox with notes
- "Investigate" button (opens AI copilot)
- Snooze/defer options
- Recurring task setup

// components/checklist/EventDrivenTasks.tsx
- Auto-generated from portfolio events
- SEC filing alerts
- Sentiment shift warnings
- Rebalance triggers
```

**Task Generation Logic:**
```typescript
// lib/checklist/task-generator.ts
- generateDailyChecklist()
- detectPortfolioEvents()
- createEventDrivenTasks()
- prioritizeTasks()
```

#### 2.4 Risk Analytics Tab
**Current:** Basic calculations in `app/page.tsx`  
**Target:** Comprehensive risk dashboard

**Enhancements:**
```typescript
// lib/risk/metrics.ts
- calculateSharpeRatio()
- calculateSortinoRatio()
- calculateCalmarRatio()
- calculateAlpha()
- calculateBeta()
- calculateMaxDrawdown()
- calculateVolatility()

// components/risk/RiskDashboard.tsx
- Risk-adjusted returns cards
- Drawdown analysis
- Correlation matrix
- Stress testing scenarios
- Margin monitoring

// components/risk/StressTest.tsx
- Historical crisis scenarios
- Custom scenario builder
```

---

### Phase 3: UX Polish & Optimization (Week 5-6)

#### 3.1 Navigation & Layout
**Add:**
- Top navigation bar
- Sidebar navigation (collapsible)
- Breadcrumbs
// components/layout/DashboardLayout.tsx
├── TopNav
│   └── User menu
├── Sidebar
│   ├── Holdings
│   ├── Fundamentals
│   ├── Risk Analytics
│   ├── Thesis Tracker
│   └── Checklist
└── Main content area

#### 3.2 Performance Optimization
**Targets (from PRD):**
- Page load <1.5s
- API response <1s (P90)
- AI copilot <3s (P90)

**Optimizations:**
1. Implement React Query for data fetching
2. Add skeleton loading states
3. Optimize chart rendering (lazy load)
4. Code splitting by route
5. Image optimization
6. Database query optimization

#### 3.3 Mobile Responsiveness
**Current:** Basic responsiveness  
**Target:** Fully optimized mobile experience

**Enhancements:**
- Mobile-first component designs
- Touch-friendly interactions
- Bottom navigation on mobile
- Simplified mobile views
- Offline capability

---

## ✨ NEW FEATURES: What to Add

### 1. Database Setup
**Priority:** P0  
**Timeline:** Week 1

**Setup:**
```bash
# Install Vercel Postgres
npm install @vercel/postgres

# Create migration files
mkdir -p lib/db/migrations
```

**Tables:**
1. `users` (future multi-user)
2. `portfolios`
3. `holdings`
4. `theses`
5. `checklists`
6. `checklist_templates`
7. `alerts`
8. `conversations` (AI chat history)
9. `price_history` (cached)
10. `fundamentals` (cached)

### 2. Multi-Model AI Router
**Priority:** P0  
**Timeline:** Week 1-2

**Models to Integrate:**
- Tier 1: DeepSeek v3, Qwen Plus, Llama 3.1-70B
- Tier 2: Qwen Max, Claude Sonnet 4
- Tier 3: Claude Sonnet 4 (reasoning), DeepSeek Reasoner
- Fallback: Mistral Large, Llama 3.1-405B

**Implementation:**
1. Sign up for OpenRouter
2. Integrate OpenRouter SDK
3. Implement routing logic
4. Add cost tracking
5. Setup budget alerts

### 3. Cost Management Dashboard
**Priority:** P0  
**Timeline:** Week 2

**Features:**
- Real-time cost per model
- Daily/weekly/monthly spend
- Budget alerts (80% threshold)
- Query statistics
- Model performance metrics

### 4. Stock Screener (Phase 3)
**Priority:** P1  
**Timeline:** Week 9-10

**Filters:**
- Value-oriented (P/E, P/B, PEG)
- Quality metrics (ROE, ROIC)
- Margin of safety
- Sector/industry
- Market cap
- Dividend yield

---

## 📦 Dependencies to Add

```json
{
  "dependencies": {
    // Database
    "@vercel/postgres": "^0.5.1",
    "drizzle-orm": "^0.29.0",
    
    // UI Components
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    
    // Data Fetching
    "@tanstack/react-query": "^5.0.0",
    
    // Rich Text Editor
    "@tiptap/react": "^2.1.0",
    "@tiptap/starter-kit": "^2.1.0",
    
    // Forms
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",
    
    // AI
    "openrouter": "^1.0.0",  // For multi-model routing
    
    // Charts (keep existing)
    "recharts": "^2.12.7",
    
    // Existing
    "@google/genai": "^1.29.1",
    "axios": "^1.7.2",
    "idb": "^8.0.0"
  }
}
```

---

## 🗺️ Implementation Roadmap

### Sprint 1: Foundation (Week 1-2)
- [ ] Setup Vercel Postgres
- [ ] Create database schema
- [ ] Migrate portfolio config to DB
- [ ] Implement AI router infrastructure
- [ ] Add OpenRouter integration
- [ ] Create cost tracking system

### Sprint 2: Core Features (Week 3-4)
- [ ] Build Fundamentals tab
- [ ] Integrate 30+ metrics
- [ ] Create 10Y historical charts
- [ ] Build comparison view
- [ ] Enhance Risk Analytics tab
- [ ] Add stress testing

### Sprint 3: Intelligence (Week 5-6)
- [ ] Build Checklist system
- [ ] Implement task generation logic
- [ ] Create event-driven tasks
- [ ] Add completion tracking
- [ ] Integrate with AI copilot

### Sprint 4: Thesis Tracking (Week 7-8)
- [ ] Build Thesis editor
- [ ] Implement validation logic
- [ ] Create health scoring
- [ ] Add progress tracking
- [ ] Build dashboard view

### Sprint 5: Polish & Optimization (Week 9-10)
- [ ] Implement navigation structure
- [ ] Add command palette
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Bug fixes

### Sprint 6: Testing & Launch (Week 11-12)
- [ ] End-to-end testing
- [ ] Load testing
- [ ] Security audit
- [ ] Documentation
- [ ] Production deployment

---

## ⚠️ Migration Risks & Mitigation

### Risk 1: Data Migration
**Risk:** Losing portfolio data during DB migration  
**Mitigation:**
- Export current config to JSON backup
- Create migration script with validation
- Test on copy first
- Keep old system running in parallel

### Risk 2: AI Cost Overruns
**Risk:** Exceeding $20/month budget during development  
**Mitigation:**
- Start with Tier 1 models only
- Implement hard budget caps
- Monitor costs daily
- Use cached responses aggressively

### Risk 3: Breaking Existing Functionality
**Risk:** Refactoring breaks working features  
**Mitigation:**
- Create comprehensive test suite first
- Incremental refactoring (not big bang)
- Feature flags for new components
- Rollback plan for each change

### Risk 4: Performance Degradation
**Risk:** Database queries slow down UI  
**Mitigation:**
- Implement React Query for caching
- Database indexing strategy
- Lazy loading for heavy components
- Performance monitoring

---

## 📊 Success Metrics

### Week 1-2 Goals
- ✅ Database operational
- ✅ Portfolio data migrated
- ✅ AI router with 3+ models
- ✅ Cost tracking functional
- ✅ No breaking changes

### Week 3-4 Goals
- ✅ Fundamentals tab complete
- ✅ 30+ metrics displaying
- ✅ Risk analytics enhanced
- ✅ Page load <2s

### Week 5-6 Goals
- ✅ Checklist system live
- ✅ Event-driven tasks working
- ✅ Thesis tracker operational
- ✅ AI integration complete

### Week 7-8 Goals
- ✅ Full navigation structure
- ✅ Command palette working
- ✅ Mobile responsive
- ✅ Performance targets met

---

## 🎯 Next Immediate Actions

### 1. Backup Current System
```bash
# Create backup branch
git checkout -b backup-pre-refactor
git push origin backup-pre-refactor

# Export portfolio config
node scripts/export-config.js > backup/portfolio-config.json
```

### 2. Setup Database
```bash
# Install dependencies
npm install @vercel/postgres drizzle-orm

# Create schema file
# Create migration scripts
```

### 3. Create New Architecture
```bash
# Create directory structure
mkdir -p lib/{models,db,ai}
mkdir -p app/(dashboard)/{holdings,fundamentals,risk,thesis,checklist}
mkdir -p components/{dashboard,fundamentals,risk,thesis,checklist}
```

### 4. Start Incremental Refactoring
- Begin with database setup
- Migrate one portfolio at a time
- Test thoroughly before proceeding
- Document all changes

---

## 📝 Notes

- **Philosophy:** Refactor incrementally, test continuously, preserve working features
- **Priority:** Don't lose any working functionality
- **Timeline:** 12 weeks to full PRD implementation
- **Budget:** Stay under $20/month AI costs
- **Quality:** Maintain or improve current user experience

---

**Document Status:** ✅ READY FOR REVIEW  
**Next Step:** Get approval, then start Sprint 1

*This is a living document. Update as refactoring progresses.*
