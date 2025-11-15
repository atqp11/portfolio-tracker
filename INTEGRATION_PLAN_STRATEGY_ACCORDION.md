# 🔄 StrategyAccordion Integration Plan

**Date:** November 14, 2025  
**Component:** `components/StrategyAccordion.tsx`  
**Target Integration:** Thesis Tracker & Checklist System

---

## 📊 Current Implementation Analysis

### ✅ What You Already Have

Your `StrategyAccordion` component already implements **80%** of the checklist system functionality described in the PRD!

#### 1. **Decision Framework** (Maps to Thesis Tracker)
```typescript
interface DecisionRow {
  title: string;
  description: string;
  rationale: string;           // ← Investment thesis reasoning
  urgency: 'green' | 'yellow' | 'red';
  action?: string;             // ← Actionable items
  triggerCondition?: string;   // ← Thesis invalidation triggers
}
```

**Current Decisions:**
- ✅ Margin Decision (risk parameters)
- ✅ Delever Decision (exit criteria)
- ✅ Profit Taking Decision (target prices)
- ✅ DRIP Decision (strategy)

**PRD Alignment:**
- ✅ Bull case → `description` + `rationale`
- ✅ Stop-loss rules → `triggerCondition`
- ✅ Exit criteria → `action` buttons
- ✅ Urgency scoring → `urgency` (green/yellow/red)

#### 2. **Monitoring Checklist** (Already Implements PRD Feature!)
```typescript
interface MonitoringTask {
  frequency: 'Daily' | 'Weekly' | 'Monthly';  // ← PRD requirement
  task: string;
  urgency: 'green' | 'yellow' | 'red';        // ← Priority scoring
  condition?: string;                         // ← Dynamic conditions
}
```

**Current Tasks:**
- ✅ Daily: Price checks, alert verification
- ✅ Weekly: Equity checks, DRIP confirmation, trend review
- ✅ Monthly: Profit assessment, fundamentals review, rebalancing

**PRD Alignment:**
- ✅ Daily/weekly/monthly frequency ← **Exact PRD match**
- ✅ Completion tracking with checkboxes
- ✅ Urgency-based prioritization
- ✅ Conditional triggers (margin calls, stop-loss)
- ✅ Persistence via IndexedDB

#### 3. **Smart Features Already Built**
- ✅ **Reviewed State Tracking** → IndexedDB persistence
- ✅ **Dynamic Urgency Calculation** → Based on portfolio value, equity %
- ✅ **Actionable Buttons** → Execute Delever, Take Profit
- ✅ **Portfolio-Specific Logic** → Energy vs Copper strategies
- ✅ **Real-time Condition Monitoring** → Margin call, stop-loss triggers
- ✅ **Visual Feedback** → Color-coded urgency (green/yellow/red)

---

## 🎯 Integration Strategy

### Phase 1: Extract & Modularize (Week 5)

#### Step 1.1: Create Shared Data Models
**New File:** `lib/models/thesis.ts`

```typescript
// Extend existing DecisionRow to be thesis-compatible
export interface InvestmentThesis {
  id: string;
  holdingId: string;
  ticker: string;
  
  // Bull Case (from DecisionRow)
  title: string;
  description: string;
  rationale: string;
  
  // Bear Case (NEW)
  bearCase: string;
  risks: string[];
  
  // Key Metrics (from triggerCondition)
  keyMetrics: ThesisMetric[];
  
  // Stop-Loss & Exit Rules (from action + triggerCondition)
  stopLossRules: StopLossRule[];
  exitCriteria: ExitCriteria;
  
  // Health & Status
  thesisHealthScore: number;  // 0-100
  urgency: 'green' | 'yellow' | 'red';
  
  // Metadata
  entryDate: Date;
  lastValidated: Date;
  validationHistory: ValidationRecord[];
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ThesisMetric {
  name: string;              // e.g., "Equity %", "WTI Price"
  targetValue: number | string;
  currentValue: number | string;
  condition: string;         // e.g., "Must stay above 45%"
  urgency: 'green' | 'yellow' | 'red';
}

export interface StopLossRule {
  type: 'hard_stop' | 'thesis_invalidation' | 'time_based';
  trigger: string;           // e.g., "Value < $14,000"
  action: string;            // e.g., "SELL ALL"
  currentDistance: string;   // e.g., "$2,000 buffer remaining"
}

export interface ExitCriteria {
  targetPrice?: number;
  targetValue: number;      // From targetDeleverValue
  profitTarget: number;     // From targetProfitValue
  timeHorizon?: string;
  conditions: string[];
}

export interface ValidationRecord {
  date: Date;
  aiSummary: string;
  metricsSnapshot: Record<string, any>;
  healthScore: number;
  recommendation: string;
}
```

#### Step 1.2: Create Shared Checklist Models
**New File:** `lib/models/checklist.ts`

```typescript
// Extends existing MonitoringTask
export interface ChecklistTask {
  id: string;
  userId: string;
  portfolioId?: string;
  
  // From MonitoringTask
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Ad-hoc';
  task: string;
  urgency: 'green' | 'yellow' | 'red';
  condition?: string;
  
  // Enhanced fields
  category: 'morning_routine' | 'market_hours' | 'evening_review' | 'event_driven';
  
  // Event-driven task metadata
  trigger?: {
    type: 'sec_filing' | 'sentiment_shift' | 'stop_loss_proximity' | 'rebalance_needed';
    ticker?: string;
    threshold?: number;
    description: string;
  };
  
  // Completion tracking
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  
  // Actions
  actions: TaskAction[];
  
  createdAt: Date;
  dueDate: Date;
}

export interface TaskAction {
  label: string;            // e.g., "Investigate", "Mark Complete", "Snooze"
  type: 'investigate' | 'complete' | 'snooze' | 'recurring';
  handler: string;          // Function name or route
  params?: Record<string, any>;
}

export interface DailyChecklist {
  id: string;
  userId: string;
  date: Date;
  portfolioId?: string;
  
  // From StrategyAccordion
  morningRoutine: ChecklistTask[];
  marketHours: ChecklistTask[];
  eveningReview: ChecklistTask[];
  eventDriven: ChecklistTask[];
  
  // Tracking
  totalTasks: number;
  completedTasks: number;
  completionPercentage: number;
  
  // Streak
  currentStreak: number;
  longestStreak: number;
}
```

---

### Phase 2: Refactor StrategyAccordion (Week 5)

#### Step 2.1: Split into Specialized Components

**New Component Structure:**
```
components/
  thesis/
    ThesisDecisionCard.tsx     ← Extract from DecisionRow rendering
    ThesisHealthBadge.tsx      ← Extract urgency badge logic
    ThesisActionButtons.tsx    ← Extract action button logic
    
  checklist/
    ChecklistDashboard.tsx     ← Main checklist view
    ChecklistTaskItem.tsx      ← Extract from MonitoringTask rendering
    ChecklistFrequencyGroup.tsx ← Daily/Weekly/Monthly groups
    ChecklistActions.tsx       ← One-click actions (investigate, etc.)
    
  strategy/
    StrategyAccordion.tsx      ← Simplified wrapper (orchestrator)
```

#### Step 2.2: Create ThesisDecisionCard
**New File:** `components/thesis/ThesisDecisionCard.tsx`

```typescript
import { InvestmentThesis, ThesisMetric } from '@/lib/models/thesis';

interface ThesisDecisionCardProps {
  thesis: InvestmentThesis;
  onMarkReviewed: (thesisId: string) => void;
  onExecuteAction: (thesisId: string, action: string) => void;
  isReviewed: boolean;
}

export default function ThesisDecisionCard({
  thesis,
  onMarkReviewed,
  onExecuteAction,
  isReviewed,
}: ThesisDecisionCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${getUrgencyColor(thesis.urgency)}`}>
      {/* Header with title, urgency badge, health score */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <h5 className="font-semibold text-[#E5E7EB]">{thesis.title}</h5>
          <span className={`text-xs px-2 py-0.5 rounded border ${getUrgencyBadge(thesis.urgency)}`}>
            {thesis.urgency.toUpperCase()}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
            Health: {thesis.thesisHealthScore}%
          </span>
        </div>
        <button
          onClick={() => onMarkReviewed(thesis.id)}
          className={`text-xs px-3 py-1 rounded ${
            isReviewed ? 'bg-blue-500/20 text-blue-400' : 'bg-neutral-700 text-[#9CA3AF]'
          }`}
        >
          {isReviewed ? '✓ Reviewed' : 'Mark as Reviewed'}
        </button>
      </div>

      {/* Bull Case */}
      <div className="mb-3">
        <p className="text-sm text-[#E5E7EB] mb-2">{thesis.description}</p>
        <details className="group">
          <summary className="text-xs text-[#9CA3AF] cursor-pointer hover:text-[#E5E7EB]">
            <span className="underline">Why this matters</span>
          </summary>
          <p className="text-xs text-[#9CA3AF] mt-2 italic">{thesis.rationale}</p>
        </details>
      </div>

      {/* Key Metrics to Monitor */}
      {thesis.keyMetrics.length > 0 && (
        <div className="mb-3 space-y-1">
          <p className="text-xs font-semibold text-[#9CA3AF]">Key Metrics:</p>
          {thesis.keyMetrics.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-[#E5E7EB]">{metric.name}</span>
              <span className={`${getMetricColor(metric.urgency)}`}>
                {metric.currentValue} {metric.urgency === 'green' ? '✓' : '⚠️'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Stop-Loss & Exit Rules */}
      {thesis.stopLossRules.map((rule, idx) => (
        <div key={idx} className="text-xs text-[#9CA3AF] mb-2">
          <strong>{rule.type}:</strong> {rule.trigger} → {rule.action}
        </div>
      ))}

      {/* Action Buttons */}
      <ThesisActionButtons
        thesis={thesis}
        onExecuteAction={onExecuteAction}
      />
    </div>
  );
}
```

#### Step 2.3: Create ChecklistTaskItem
**New File:** `components/checklist/ChecklistTaskItem.tsx`

```typescript
import { ChecklistTask } from '@/lib/models/checklist';

interface ChecklistTaskItemProps {
  task: ChecklistTask;
  onToggleComplete: (taskId: string) => void;
  onInvestigate: (ticker?: string) => void;
  onSnooze: (taskId: string) => void;
}

export default function ChecklistTaskItem({
  task,
  onToggleComplete,
  onInvestigate,
  onSnooze,
}: ChecklistTaskItemProps) {
  return (
    <div className={`border rounded-lg p-3 ${getUrgencyColor(task.urgency)}`}>
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleComplete(task.id)}
          className="mt-1 w-4 h-4 rounded border-neutral-600"
        />

        {/* Task Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between mb-1">
            <p className="text-sm text-[#E5E7EB] flex-1">{task.task}</p>
            <span className={`text-xs px-2 py-0.5 rounded border ${getUrgencyBadge(task.urgency)}`}>
              {task.urgency.toUpperCase()}
            </span>
          </div>

          {/* Condition/Context */}
          {task.condition && (
            <p className="text-xs text-[#9CA3AF] mb-2">{task.condition}</p>
          )}

          {/* Event-Driven Context */}
          {task.trigger && (
            <div className="text-xs bg-yellow-900/20 border border-yellow-500/30 rounded p-2 mb-2">
              <span className="font-semibold text-yellow-400">
                {task.trigger.type === 'sec_filing' && '📄 SEC Filing'}
                {task.trigger.type === 'sentiment_shift' && '📉 Sentiment Shift'}
                {task.trigger.type === 'stop_loss_proximity' && '🚨 Stop-Loss Alert'}
                {task.trigger.type === 'rebalance_needed' && '⚖️ Rebalance Needed'}
              </span>
              {task.trigger.ticker && (
                <span className="ml-2 text-[#E5E7EB]">{task.trigger.ticker}</span>
              )}
              <p className="mt-1 text-[#9CA3AF]">{task.trigger.description}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-2">
            {task.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (action.type === 'investigate') onInvestigate(task.trigger?.ticker);
                  if (action.type === 'snooze') onSnooze(task.id);
                  if (action.type === 'complete') onToggleComplete(task.id);
                }}
                className="text-xs px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-[#9CA3AF] hover:text-[#E5E7EB] rounded"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Phase 3: Database Integration (Week 6)

#### Step 3.1: Migrate from IndexedDB to PostgreSQL

**Current (IndexedDB):**
```typescript
// Stored per portfolio in browser storage
const state = await get<{ decisions: Record<string, boolean>; tasks: Record<string, boolean> }>(storageKey);
```

**Target (PostgreSQL):**
```sql
-- Thesis tracking
CREATE TABLE theses (
  id UUID PRIMARY KEY,
  holding_id UUID REFERENCES holdings(id),
  ticker VARCHAR(10),
  
  -- Bull case (from DecisionRow)
  title VARCHAR(255),
  description TEXT,
  rationale TEXT,
  
  -- Bear case
  bear_case TEXT,
  risks JSONB,
  
  -- Metrics & rules (from triggerCondition)
  key_metrics JSONB,
  stop_loss_rules JSONB,
  exit_criteria JSONB,
  
  -- Health & tracking
  thesis_health_score INTEGER,
  urgency VARCHAR(10),
  last_validated TIMESTAMP,
  validation_history JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Checklist tracking
CREATE TABLE checklist_tasks (
  id UUID PRIMARY KEY,
  user_id UUID,
  portfolio_id UUID,
  date DATE,
  
  -- From MonitoringTask
  frequency VARCHAR(20),
  task TEXT,
  urgency VARCHAR(10),
  condition TEXT,
  category VARCHAR(50),
  
  -- Event-driven metadata
  trigger_type VARCHAR(50),
  trigger_ticker VARCHAR(10),
  trigger_description TEXT,
  
  -- Completion
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  due_date DATE
);

-- Daily checklist summary
CREATE TABLE daily_checklists (
  id UUID PRIMARY KEY,
  user_id UUID,
  portfolio_id UUID,
  date DATE,
  
  total_tasks INTEGER,
  completed_tasks INTEGER,
  completion_percentage DECIMAL,
  
  current_streak INTEGER,
  longest_streak INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, portfolio_id, date)
);
```

#### Step 3.2: Migration Script
**New File:** `scripts/migrate-strategy-to-db.ts`

```typescript
import { configs } from '@/lib/config';
import { db } from '@/lib/db';

async function migrateStrategyAccordion() {
  console.log('🔄 Migrating StrategyAccordion data to database...');
  
  for (const config of configs) {
    const portfolioType = config.id;
    
    // 1. Migrate Decisions → Theses
    const decisions = portfolioType === 'energy' 
      ? getEnergyDecisions() 
      : getCopperDecisions();
    
    for (const decision of decisions) {
      await db.thesis.create({
        portfolioId: config.id,
        ticker: portfolioType === 'energy' ? 'PORTFOLIO_ENERGY' : 'PORTFOLIO_COPPER',
        title: decision.title,
        description: decision.description,
        rationale: decision.rationale,
        stopLossRules: decision.triggerCondition ? [
          {
            type: 'thesis_invalidation',
            trigger: decision.triggerCondition,
            action: decision.action || 'Review',
            currentDistance: 'TBD',
          }
        ] : [],
        thesisHealthScore: decision.urgency === 'green' ? 90 : decision.urgency === 'yellow' ? 60 : 30,
        urgency: decision.urgency,
      });
    }
    
    // 2. Migrate Monitoring Tasks → Checklist
    const tasks = portfolioType === 'energy'
      ? getEnergyMonitoring()
      : getCopperMonitoring();
    
    for (const task of tasks) {
      await db.checklistTask.create({
        portfolioId: config.id,
        frequency: task.frequency,
        task: task.task,
        urgency: task.urgency,
        condition: task.condition,
        category: task.frequency === 'Daily' ? 'morning_routine' : 'ad-hoc',
        dueDate: new Date(),
      });
    }
  }
  
  console.log('✅ Migration complete!');
}
```

---

### Phase 4: AI Integration (Week 6)

#### Step 4.1: Thesis Validation
**New File:** `lib/ai/thesis-validator.ts`

```typescript
import { routeQuery } from '@/lib/ai/router';
import { InvestmentThesis } from '@/lib/models/thesis';

export async function validateThesisAgainstFiling(
  thesis: InvestmentThesis,
  filing: SECFiling
): Promise<ValidationReport> {
  const prompt = `
You are an expert investment analyst. Validate this investment thesis against the latest SEC filing.

INVESTMENT THESIS:
Title: ${thesis.title}
Bull Case: ${thesis.description}
Rationale: ${thesis.rationale}
Key Metrics: ${JSON.stringify(thesis.keyMetrics)}

SEC FILING:
Type: ${filing.formType}
Date: ${filing.filingDate}
Summary: ${filing.summary}

ANALYSIS REQUIRED:
1. Does the thesis remain valid based on this filing?
2. Have key metrics diverged from thesis expectations?
3. Are there new risks that invalidate the thesis?
4. Calculate thesis health score (0-100)
5. Provide specific recommendations

Format: JSON with fields: isValid, healthScore, divergences[], newRisks[], recommendation
`;

  const response = await routeQuery(prompt, { tier: 'tier2' }); // Use Claude for quality
  const validation = JSON.parse(response.text);
  
  return {
    date: new Date(),
    aiSummary: validation.recommendation,
    healthScore: validation.healthScore,
    metricsSnapshot: thesis.keyMetrics,
    recommendation: validation.recommendation,
  };
}

export async function generateProgressReport(
  thesis: InvestmentThesis
): Promise<string> {
  const prompt = `
Generate a quarterly progress report for this investment thesis.

THESIS:
${JSON.stringify(thesis, null, 2)}

REPORT STRUCTURE:
1. Executive Summary (2-3 sentences)
2. Metric Progress (Entry vs Current with % change)
3. Thesis Validation Status
4. Key Events Since Entry
5. Recommended Actions

Format: Markdown
`;

  const response = await routeQuery(prompt, { tier: 'tier2' });
  return response.text;
}
```

#### Step 4.2: Event-Driven Task Generation
**New File:** `lib/checklist/task-generator.ts`

```typescript
import { ChecklistTask } from '@/lib/models/checklist';
import { Portfolio } from '@/lib/models/portfolio';

export async function detectPortfolioEvents(
  portfolio: Portfolio
): Promise<ChecklistTask[]> {
  const tasks: ChecklistTask[] = [];
  
  // 1. SEC Filing Events
  const recentFilings = await getRecentFilings(portfolio.holdings.map(h => h.ticker));
  for (const filing of recentFilings) {
    tasks.push({
      id: generateId(),
      userId: portfolio.userId,
      portfolioId: portfolio.id,
      frequency: 'Ad-hoc',
      task: `Review ${filing.ticker} - SEC ${filing.formType} filed today`,
      urgency: filing.formType.includes('8-K') ? 'yellow' : 'green',
      category: 'event_driven',
      trigger: {
        type: 'sec_filing',
        ticker: filing.ticker,
        description: filing.summary,
      },
      actions: [
        { label: 'Investigate', type: 'investigate', handler: 'openAICopilot' },
        { label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' },
      ],
      completed: false,
      createdAt: new Date(),
      dueDate: new Date(),
    });
  }
  
  // 2. Sentiment Shifts
  const sentimentChanges = await detectSentimentShifts(portfolio);
  for (const change of sentimentChanges) {
    if (Math.abs(change.shiftPercent) >= 15) {
      tasks.push({
        id: generateId(),
        userId: portfolio.userId,
        portfolioId: portfolio.id,
        frequency: 'Ad-hoc',
        task: `Investigate ${change.ticker} - sentiment ${change.direction} ${change.shiftPercent}%`,
        urgency: 'yellow',
        category: 'event_driven',
        trigger: {
          type: 'sentiment_shift',
          ticker: change.ticker,
          threshold: change.shiftPercent,
          description: `Sentiment changed from ${change.previousSentiment} to ${change.currentSentiment}`,
        },
        actions: [
          { label: 'Investigate', type: 'investigate', handler: 'openAICopilot' },
          { label: 'Snooze', type: 'snooze', handler: 'snoozeTask' },
        ],
        completed: false,
        createdAt: new Date(),
        dueDate: new Date(),
      });
    }
  }
  
  // 3. Stop-Loss Proximity
  for (const holding of portfolio.holdings) {
    const currentValue = holding.shares * holding.currentPrice;
    const entryValue = holding.shares * holding.entryPrice;
    const lossPercent = ((currentValue - entryValue) / entryValue) * 100;
    
    if (lossPercent <= -12 && lossPercent > -15) {
      tasks.push({
        id: generateId(),
        userId: portfolio.userId,
        portfolioId: portfolio.id,
        frequency: 'Ad-hoc',
        task: `Check stop-loss - ${holding.ticker} down ${Math.abs(lossPercent).toFixed(1)}% from entry`,
        urgency: 'red',
        category: 'event_driven',
        trigger: {
          type: 'stop_loss_proximity',
          ticker: holding.ticker,
          threshold: lossPercent,
          description: `Position is ${Math.abs(lossPercent).toFixed(1)}% below entry. Stop-loss at -15%.`,
        },
        actions: [
          { label: 'Review Position', type: 'investigate', handler: 'openAICopilot' },
          { label: 'Update Stop-Loss', type: 'complete', handler: 'updateStopLoss' },
        ],
        completed: false,
        createdAt: new Date(),
        dueDate: new Date(),
      });
    }
  }
  
  // 4. Rebalance Needed
  const deviations = calculateAllocationDeviations(portfolio);
  for (const deviation of deviations) {
    if (Math.abs(deviation.percent) > 5) {
      tasks.push({
        id: generateId(),
        userId: portfolio.userId,
        portfolioId: portfolio.id,
        frequency: 'Ad-hoc',
        task: `Rebalance check - ${deviation.ticker} ${deviation.percent > 0 ? 'above' : 'below'} target by ${Math.abs(deviation.percent).toFixed(1)}%`,
        urgency: Math.abs(deviation.percent) > 8 ? 'yellow' : 'green',
        category: 'event_driven',
        trigger: {
          type: 'rebalance_needed',
          ticker: deviation.ticker,
          threshold: deviation.percent,
          description: `Target: ${deviation.target}%, Current: ${deviation.current}%`,
        },
        actions: [
          { label: 'Calculate Rebalance', type: 'investigate', handler: 'calculateRebalance' },
          { label: 'Defer', type: 'snooze', handler: 'snoozeTask' },
        ],
        completed: false,
        createdAt: new Date(),
        dueDate: new Date(),
      });
    }
  }
  
  return tasks;
}
```

---

### Phase 5: UI Integration (Week 7)

#### Step 5.1: Update Main Dashboard
**File:** `app/(dashboard)/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import PortfolioOverview from '@/components/dashboard/PortfolioOverview';
import TodaysFocus from '@/components/checklist/TodaysFocus';
import HoldingsGrid from '@/components/dashboard/HoldingsGrid';
import AllocationChart from '@/components/dashboard/AllocationChart';

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState(null);
  const [todaysChecklist, setTodaysChecklist] = useState(null);
  
  useEffect(() => {
    loadDashboardData();
  }, []);
  
  const loadDashboardData = async () => {
    const portfolioData = await fetch('/api/portfolio/current').then(r => r.json());
    const checklistData = await fetch('/api/checklist/today').then(r => r.json());
    
    setPortfolio(portfolioData);
    setTodaysChecklist(checklistData);
  };
  
  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <PortfolioOverview portfolio={portfolio} />
      
      {/* Today's Focus (from StrategyAccordion monitoring) */}
      <TodaysFocus checklist={todaysChecklist} />
      
      {/* Holdings Grid */}
      <HoldingsGrid holdings={portfolio?.holdings} />
      
      {/* Allocation Chart */}
      <AllocationChart holdings={portfolio?.holdings} />
    </div>
  );
}
```

#### Step 5.2: Create Thesis Tracker Page
**File:** `app/(dashboard)/thesis/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import ThesisDecisionCard from '@/components/thesis/ThesisDecisionCard';
import { InvestmentThesis } from '@/lib/models/thesis';

export default function ThesisTrackerPage() {
  const [theses, setTheses] = useState<InvestmentThesis[]>([]);
  const [filter, setFilter] = useState<'all' | 'healthy' | 'at-risk'>('all');
  
  useEffect(() => {
    loadTheses();
  }, []);
  
  const loadTheses = async () => {
    const data = await fetch('/api/thesis').then(r => r.json());
    setTheses(data);
  };
  
  const filteredTheses = theses.filter(t => {
    if (filter === 'healthy') return t.thesisHealthScore >= 70;
    if (filter === 'at-risk') return t.thesisHealthScore < 70;
    return true;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investment Theses</h1>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')}>All</button>
          <button onClick={() => setFilter('healthy')}>Healthy</button>
          <button onClick={() => setFilter('at-risk')}>At Risk</button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {filteredTheses.map(thesis => (
          <ThesisDecisionCard
            key={thesis.id}
            thesis={thesis}
            onMarkReviewed={(id) => {/* ... */}}
            onExecuteAction={(id, action) => {/* ... */}}
            isReviewed={false}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Migration Checklist

### Week 5: Extract & Modularize
- [ ] Create `lib/models/thesis.ts` with data models
- [ ] Create `lib/models/checklist.ts` with data models
- [ ] Extract `ThesisDecisionCard` component
- [ ] Extract `ChecklistTaskItem` component
- [ ] Create `TodaysFocus` component for dashboard
- [ ] Test components in isolation

### Week 6: Database & AI Integration
- [ ] Create database migrations
- [ ] Build migration script from IndexedDB → PostgreSQL
- [ ] Test data migration with backups
- [ ] Implement `thesis-validator.ts` AI functions
- [ ] Implement `task-generator.ts` event detection
- [ ] Create API routes for thesis CRUD
- [ ] Create API routes for checklist CRUD

### Week 7: UI Integration
- [ ] Update main dashboard with `TodaysFocus`
- [ ] Create `/thesis` page
- [ ] Create `/checklist` page
- [ ] Add navigation links
- [ ] Integrate AI copilot with "Investigate" actions
- [ ] Test end-to-end workflows
- [ ] Performance testing

---

## 🎯 Key Benefits

1. **Preserve Working Code**: StrategyAccordion logic is preserved and enhanced
2. **Minimal Rewrite**: Extract and modularize rather than rebuild
3. **Database-Backed**: Move from IndexedDB to PostgreSQL for multi-device sync
4. **AI-Enhanced**: Add thesis validation and event-driven task generation
5. **Scalable**: New architecture supports future multi-user expansion

---

## 🚨 Critical Preservation Notes

**DO NOT LOSE:**
- Urgency calculation logic (margin call, equity %, stop-loss proximity)
- Dynamic condition monitoring (real-time triggers)
- IndexedDB persistence pattern (until migration complete)
- Action button handlers (Execute Delever, Take Profit)
- Portfolio-specific strategy logic (Energy vs Copper)

**ENHANCE:**
- Add AI thesis validation
- Add event-driven task generation
- Add database persistence
- Add one-click "Investigate" → AI Copilot integration
- Add completion streak tracking

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Next Step:** Begin Week 5 - Extract & Modularize

*Your StrategyAccordion is already 80% of the PRD's checklist system! Just needs extraction and enhancement.*
