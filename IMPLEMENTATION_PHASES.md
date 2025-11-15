# 🚀 Phased Implementation Plan - Portfolio Tracker Refactoring

**Date:** November 14, 2025  
**Objective:** Incremental refactoring with working checkpoints at each phase  
**Safety:** Git commits + testing after each phase

---

## 🎯 Implementation Philosophy

1. **Always Working App** - Never break existing functionality
2. **Incremental Changes** - Small, testable improvements
3. **Git Checkpoints** - Commit after each successful phase
4. **Rollback Ready** - Can revert to any previous working state
5. **Test Before Proceed** - Verify app works fully before next phase

---

## 📋 Pre-Flight Checklist

### ✅ Before Starting
- [ ] Create backup branch: `git checkout -b backup-before-refactor`
- [ ] Push backup: `git push origin backup-before-refactor`
- [ ] Export current config: Document current portfolio settings
- [ ] Test current app: Verify everything works
- [ ] Screenshot current UI: Visual reference
- [ ] Create rollback plan: Document how to revert each change

---

## Phase 0: Preparation (Day 1)

### Checkpoint 0.1: Safety Net
**Goal:** Create backups and safety mechanisms  
**Time:** 30 minutes  
**Risk:** None

**Tasks:**
```bash
# 1. Create backup branch
git checkout -b backup-before-refactor
git push origin backup-before-refactor

# 2. Create feature branch
git checkout -b feature/refactor-phase-0
```

**Verification:**
- [ ] Both branches exist on remote
- [ ] Current app runs: `npm run dev`
- [ ] All features work: Portfolio loads, AI works, alerts trigger

**Checkpoint:** ✅ Ready to start

---

## Phase 1: Foundation - Data Models (Day 1)

### Checkpoint 1.1: Create Type Definitions
**Goal:** Add TypeScript interfaces without changing any existing code  
**Time:** 1 hour  
**Risk:** Zero (no runtime changes)

**Create Files:**

**1. `lib/models/portfolio.ts`**
```typescript
// Portfolio data models - compatible with existing config.ts
export interface Portfolio {
  id: string;
  name: string;
  type: 'energy' | 'copper';
  
  // Financial config (from existing config)
  initialCash: number;
  initialMargin: number;
  initialValue: number;
  cashRatio: number;
  marginRatio: number;
  stopLossValue: number;
  takeProfitValue: number;
  enableDRIP: boolean;
  
  // Holdings
  holdings: Holding[];
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Holding {
  id?: string;
  portfolioId?: string;
  
  // Stock info (from existing config)
  symbol: string;
  name: string;
  cashAllocation: number;
  useMargin: boolean;
  
  // Position data (calculated)
  shares?: number;
  entryPrice?: number;
  currentPrice?: number;
  entryDate?: Date;
  
  // Links to other entities
  thesisId?: string;
}

// Helper to convert existing config to Portfolio type
export function configToPortfolio(config: any): Portfolio {
  return {
    id: config.id,
    name: config.name,
    type: config.id as 'energy' | 'copper',
    initialCash: config.initialCash,
    initialMargin: config.initialMargin,
    initialValue: config.initialValue,
    cashRatio: config.cashRatio,
    marginRatio: config.marginRatio,
    stopLossValue: config.stopLossValue,
    takeProfitValue: config.takeProfitValue,
    enableDRIP: config.enableDRIP,
    holdings: config.stocks.map((stock: any) => ({
      symbol: stock.symbol,
      name: stock.name,
      cashAllocation: stock.cashAllocation,
      useMargin: stock.useMargin,
    })),
  };
}
```

**2. `lib/models/thesis.ts`**
```typescript
// Investment thesis data models
export interface InvestmentThesis {
  id: string;
  portfolioId: string;
  holdingId?: string;
  ticker: string;
  
  // Core thesis (from StrategyAccordion DecisionRow)
  title: string;
  description: string;
  rationale: string;
  
  // Bear case
  bearCase?: string;
  risks?: string[];
  
  // Metrics & rules
  keyMetrics: ThesisMetric[];
  stopLossRules: StopLossRule[];
  exitCriteria: ExitCriteria;
  
  // Health tracking
  thesisHealthScore: number; // 0-100
  urgency: 'green' | 'yellow' | 'red';
  lastValidated?: Date;
  validationHistory?: ValidationRecord[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ThesisMetric {
  name: string;
  targetValue: string | number;
  currentValue: string | number;
  condition: string;
  urgency: 'green' | 'yellow' | 'red';
}

export interface StopLossRule {
  type: 'hard_stop' | 'thesis_invalidation' | 'time_based';
  trigger: string;
  action: string;
  currentDistance?: string;
}

export interface ExitCriteria {
  targetPrice?: number;
  targetValue: number;
  profitTarget: number;
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

// Helper to convert StrategyAccordion decision to Thesis
export function decisionToThesis(
  decision: any,
  portfolioId: string,
  portfolioType: 'energy' | 'copper'
): InvestmentThesis {
  return {
    id: `thesis_${portfolioType}_${decision.title.replace(/\s+/g, '_').toLowerCase()}`,
    portfolioId,
    ticker: `PORTFOLIO_${portfolioType.toUpperCase()}`,
    title: decision.title,
    description: decision.description,
    rationale: decision.rationale,
    keyMetrics: decision.triggerCondition ? [{
      name: 'Trigger Condition',
      targetValue: 'See description',
      currentValue: 'Monitoring',
      condition: decision.triggerCondition,
      urgency: decision.urgency,
    }] : [],
    stopLossRules: [],
    exitCriteria: {
      targetValue: 0,
      profitTarget: 0,
      conditions: [],
    },
    thesisHealthScore: decision.urgency === 'green' ? 90 : decision.urgency === 'yellow' ? 60 : 30,
    urgency: decision.urgency,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

**3. `lib/models/checklist.ts`**
```typescript
// Checklist data models
export interface ChecklistTask {
  id: string;
  portfolioId: string;
  
  // From StrategyAccordion MonitoringTask
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Ad-hoc';
  task: string;
  urgency: 'green' | 'yellow' | 'red';
  condition?: string;
  
  // Enhanced fields
  category: 'morning_routine' | 'market_hours' | 'evening_review' | 'event_driven';
  
  // Event-driven metadata
  trigger?: TaskTrigger;
  
  // Completion tracking
  completed: boolean;
  completedAt?: Date;
  notes?: string;
  
  // Actions
  actions: TaskAction[];
  
  // Metadata
  createdAt: Date;
  dueDate: Date;
}

export interface TaskTrigger {
  type: 'sec_filing' | 'sentiment_shift' | 'stop_loss_proximity' | 'rebalance_needed';
  ticker?: string;
  threshold?: number;
  description: string;
}

export interface TaskAction {
  label: string;
  type: 'investigate' | 'complete' | 'snooze' | 'recurring';
  handler: string;
  params?: Record<string, any>;
}

export interface DailyChecklist {
  id: string;
  portfolioId: string;
  date: Date;
  
  // Task groups
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

// Helper to convert StrategyAccordion task to ChecklistTask
export function monitoringTaskToChecklistTask(
  task: any,
  portfolioId: string
): ChecklistTask {
  return {
    id: `task_${portfolioId}_${task.frequency}_${Date.now()}`,
    portfolioId,
    frequency: task.frequency,
    task: task.task,
    urgency: task.urgency,
    condition: task.condition,
    category: task.frequency === 'Daily' ? 'morning_routine' : 
              task.frequency === 'Weekly' ? 'market_hours' : 'evening_review',
    completed: false,
    actions: [
      { label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' },
    ],
    createdAt: new Date(),
    dueDate: new Date(),
  };
}
```

**4. `lib/models/index.ts`**
```typescript
// Central export for all models
export * from './portfolio';
export * from './thesis';
export * from './checklist';
```

**Test:**
```bash
npm run dev
```

**Verification:**
- [ ] App compiles without errors
- [ ] TypeScript has no type errors
- [ ] App runs exactly as before
- [ ] No runtime changes

**Git Checkpoint:**
```bash
git add lib/models/
git commit -m "Phase 1.1: Add data model type definitions (no runtime changes)"
git push origin feature/refactor-phase-0
```

**Status:** ✅ **App still working, new types available**

---

### Checkpoint 1.2: Test Model Helpers
**Goal:** Verify conversion functions work  
**Time:** 30 minutes  
**Risk:** Low (only testing)

**Create Test File:**

**`scripts/test-models.ts`**
```typescript
import { configs } from '@/lib/config';
import { configToPortfolio, decisionToThesis, monitoringTaskToChecklistTask } from '@/lib/models';

// Test conversion of existing config to new Portfolio type
console.log('Testing model conversions...\n');

// Test 1: Config to Portfolio
const energyConfig = configs[0];
const energyPortfolio = configToPortfolio(energyConfig);
console.log('✅ Energy Portfolio:', energyPortfolio.name);
console.log('   Holdings:', energyPortfolio.holdings.length);

const copperConfig = configs[1];
const copperPortfolio = configToPortfolio(copperConfig);
console.log('✅ Copper Portfolio:', copperPortfolio.name);
console.log('   Holdings:', copperPortfolio.holdings.length);

// Test 2: Decision to Thesis (mock data)
const mockDecision = {
  title: 'Margin Decision',
  description: 'Test description',
  rationale: 'Test rationale',
  urgency: 'green' as const,
  triggerCondition: 'Test condition',
};
const thesis = decisionToThesis(mockDecision, 'energy', 'energy');
console.log('✅ Thesis created:', thesis.title);
console.log('   Health Score:', thesis.thesisHealthScore);

// Test 3: Task conversion
const mockTask = {
  frequency: 'Daily' as const,
  task: 'Test task',
  urgency: 'green' as const,
  condition: 'Test condition',
};
const checklistTask = monitoringTaskToChecklistTask(mockTask, 'energy');
console.log('✅ Checklist task created:', checklistTask.task);
console.log('   Category:', checklistTask.category);

console.log('\n✅ All model conversions working!');
```

**Test:**
```bash
npx tsx scripts/test-models.ts
```

**Verification:**
- [ ] Script runs without errors
- [ ] All conversions work correctly
- [ ] Output shows correct data

**Git Checkpoint:**
```bash
git add scripts/test-models.ts
git commit -m "Phase 1.2: Add model conversion tests"
git push origin feature/refactor-phase-0
```

**Status:** ✅ **Models validated, app still working**

---

## Phase 2: Component Extraction (Day 2)

### Checkpoint 2.1: Extract Shared UI Components
**Goal:** Create reusable UI components without changing existing code  
**Time:** 2 hours  
**Risk:** Low (new components, old ones untouched)

**Create Files:**

**1. `components/shared/UrgencyBadge.tsx`**
```typescript
interface UrgencyBadgeProps {
  urgency: 'green' | 'yellow' | 'red';
  label?: string;
}

export default function UrgencyBadge({ urgency, label }: UrgencyBadgeProps) {
  const getBadgeColor = () => {
    switch (urgency) {
      case 'green':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'yellow':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'red':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
    }
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${getBadgeColor()}`}>
      {label || urgency.toUpperCase()}
    </span>
  );
}
```

**2. `components/shared/ExpandableDetails.tsx`**
```typescript
import { ReactNode } from 'react';

interface ExpandableDetailsProps {
  summary: string;
  children: ReactNode;
}

export default function ExpandableDetails({ summary, children }: ExpandableDetailsProps) {
  return (
    <details className="group">
      <summary className="text-xs text-[#9CA3AF] cursor-pointer hover:text-[#E5E7EB] list-none flex items-center gap-1">
        <svg
          className="w-4 h-4 group-open:rotate-90 transition-transform"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="underline">{summary}</span>
      </summary>
      <div className="text-xs text-[#9CA3AF] mt-2 ml-5 italic">
        {children}
      </div>
    </details>
  );
}
```

**3. `components/shared/ActionButton.tsx`**
```typescript
import { ReactNode } from 'react';

interface ActionButtonProps {
  onClick: () => void;
  urgency?: 'green' | 'yellow' | 'red' | 'neutral';
  children: ReactNode;
  animate?: boolean;
}

export default function ActionButton({ 
  onClick, 
  urgency = 'neutral', 
  children, 
  animate = false 
}: ActionButtonProps) {
  const getButtonStyle = () => {
    switch (urgency) {
      case 'red':
        return 'bg-red-600 hover:bg-red-700 border-red-400 hover:shadow-red-500/50';
      case 'yellow':
        return 'bg-yellow-600 hover:bg-yellow-700 border-yellow-400 hover:shadow-yellow-500/50';
      case 'green':
        return 'bg-green-600 hover:bg-green-700 border-green-400 hover:shadow-green-500/50';
      default:
        return 'bg-neutral-600 hover:bg-neutral-700 border-neutral-500 hover:shadow-neutral-500/50';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`text-xs sm:text-sm px-4 py-2 text-white font-bold rounded-lg shadow-lg transition-all border-2 ${getButtonStyle()} ${animate ? 'animate-pulse hover:animate-none' : ''}`}
    >
      {children}
    </button>
  );
}
```

**Test:**
Create test page to verify components work:

**`app/test-components/page.tsx`**
```typescript
'use client';

import UrgencyBadge from '@/components/shared/UrgencyBadge';
import ExpandableDetails from '@/components/shared/ExpandableDetails';
import ActionButton from '@/components/shared/ActionButton';

export default function TestComponentsPage() {
  return (
    <div className="p-8 space-y-6 bg-[#0A0A0A] min-h-screen">
      <h1 className="text-2xl font-bold text-white">Component Tests</h1>
      
      <div className="space-y-4 bg-[#111111] p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white">Urgency Badges</h2>
        <div className="flex gap-3">
          <UrgencyBadge urgency="green" />
          <UrgencyBadge urgency="yellow" />
          <UrgencyBadge urgency="red" />
          <UrgencyBadge urgency="green" label="Custom Label" />
        </div>
      </div>

      <div className="space-y-4 bg-[#111111] p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white">Expandable Details</h2>
        <ExpandableDetails summary="Click to expand">
          <p>This is the expanded content!</p>
        </ExpandableDetails>
      </div>

      <div className="space-y-4 bg-[#111111] p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white">Action Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton onClick={() => alert('Green!')} urgency="green">
            ✅ Green Action
          </ActionButton>
          <ActionButton onClick={() => alert('Yellow!')} urgency="yellow">
            ⚠️ Yellow Action
          </ActionButton>
          <ActionButton onClick={() => alert('Red!')} urgency="red" animate>
            🚨 Red Action (Animated)
          </ActionButton>
          <ActionButton onClick={() => alert('Neutral!')}>
            📊 Neutral Action
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
```

**Verification:**
```bash
npm run dev
# Visit http://localhost:3000/test-components
```

- [ ] Test page loads without errors
- [ ] All badges display correctly
- [ ] Expandable details works
- [ ] All buttons work with correct colors
- [ ] Main app still works (`/` route)

**Git Checkpoint:**
```bash
git add components/shared/
git add app/test-components/
git commit -m "Phase 2.1: Add reusable UI components (tested, isolated)"
git push origin feature/refactor-phase-0
```

**Status:** ✅ **New components available, app still working**

---

### Checkpoint 2.2: Create Thesis Components (No Integration Yet)
**Goal:** Build thesis components in isolation  
**Time:** 2 hours  
**Risk:** Low (new components only)

**Create Files:**

**1. `components/thesis/ThesisCard.tsx`**
```typescript
'use client';

import { InvestmentThesis } from '@/lib/models/thesis';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import ExpandableDetails from '@/components/shared/ExpandableDetails';
import ActionButton from '@/components/shared/ActionButton';

interface ThesisCardProps {
  thesis: InvestmentThesis;
  onMarkReviewed?: (thesisId: string) => void;
  onExecuteAction?: (thesisId: string, action: string) => void;
  isReviewed?: boolean;
}

export default function ThesisCard({
  thesis,
  onMarkReviewed,
  onExecuteAction,
  isReviewed = false,
}: ThesisCardProps) {
  const getUrgencyColor = () => {
    switch (thesis.urgency) {
      case 'green':
        return 'bg-green-900/30 border-green-500/50 text-green-300';
      case 'yellow':
        return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-300';
      case 'red':
        return 'bg-red-900/30 border-red-500/50 text-red-300';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getUrgencyColor()}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <h5 className="font-semibold text-[#E5E7EB] text-sm sm:text-base">
            {thesis.title}
          </h5>
          <UrgencyBadge urgency={thesis.urgency} />
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/50">
            Health: {thesis.thesisHealthScore}%
          </span>
        </div>
        {onMarkReviewed && (
          <button
            onClick={() => onMarkReviewed(thesis.id)}
            className={`text-xs px-3 py-1 rounded transition-colors whitespace-nowrap ${
              isReviewed
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                : 'bg-neutral-700 text-[#9CA3AF] hover:bg-neutral-600'
            }`}
          >
            {isReviewed ? '✓ Reviewed' : 'Mark as Reviewed'}
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-[#E5E7EB] mb-2">{thesis.description}</p>

      {/* Rationale */}
      <ExpandableDetails summary="Why this matters">
        <p>{thesis.rationale}</p>
      </ExpandableDetails>

      {/* Key Metrics */}
      {thesis.keyMetrics.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-xs font-semibold text-[#9CA3AF]">Key Metrics:</p>
          {thesis.keyMetrics.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-[#E5E7EB]">{metric.name}</span>
              <span className={`flex items-center gap-1`}>
                <span>{metric.currentValue}</span>
                <UrgencyBadge urgency={metric.urgency} label="" />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons (if provided) */}
      {onExecuteAction && (
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton
            onClick={() => onExecuteAction(thesis.id, 'delever')}
            urgency={thesis.urgency}
            animate={thesis.urgency === 'red'}
          >
            {thesis.urgency === 'red' ? '🚨' : thesis.urgency === 'yellow' ? '⚠️' : '📊'} Execute Action
          </ActionButton>
        </div>
      )}
    </div>
  );
}
```

**2. Test thesis component:**

Update **`app/test-components/page.tsx`**
```typescript
'use client';

import { InvestmentThesis } from '@/lib/models/thesis';
import ThesisCard from '@/components/thesis/ThesisCard';
import UrgencyBadge from '@/components/shared/UrgencyBadge';
import ExpandableDetails from '@/components/shared/ExpandableDetails';
import ActionButton from '@/components/shared/ActionButton';

export default function TestComponentsPage() {
  const mockThesis: InvestmentThesis = {
    id: 'thesis_test_1',
    portfolioId: 'energy',
    ticker: 'PORTFOLIO_ENERGY',
    title: 'Margin Decision',
    description: '30% margin ($6,000 borrowed vs $14,000 cash). Proportional across holdings.',
    rationale: 'Leverages 2025 LNG export boom and stable WTI prices.',
    keyMetrics: [
      { name: 'Equity %', targetValue: '>45%', currentValue: '62%', condition: 'Above safe zone', urgency: 'green' },
      { name: 'Margin Call', targetValue: '$8,571', currentValue: '$20,000', condition: 'Well above threshold', urgency: 'green' },
    ],
    stopLossRules: [],
    exitCriteria: { targetValue: 30000, profitTarget: 30000, conditions: [] },
    thesisHealthScore: 92,
    urgency: 'green',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="p-8 space-y-6 bg-[#0A0A0A] min-h-screen">
      <h1 className="text-2xl font-bold text-white">Component Tests</h1>
      
      {/* Previous tests... */}
      
      <div className="space-y-4 bg-[#111111] p-6 rounded-lg">
        <h2 className="text-lg font-semibold text-white">Thesis Card</h2>
        <ThesisCard
          thesis={mockThesis}
          onMarkReviewed={(id) => alert(`Marked ${id} as reviewed`)}
          onExecuteAction={(id, action) => alert(`Execute ${action} on ${id}`)}
          isReviewed={false}
        />
      </div>
    </div>
  );
}
```

**Verification:**
- [ ] Test page loads with thesis card
- [ ] Thesis card displays correctly
- [ ] "Mark as Reviewed" button works
- [ ] "Execute Action" button works
- [ ] Expandable details works
- [ ] Main app still works

**Git Checkpoint:**
```bash
git add components/thesis/
git commit -m "Phase 2.2: Add ThesisCard component (tested, isolated)"
git push origin feature/refactor-phase-0
```

**Status:** ✅ **Thesis components ready, app still working**

---

## Phase 3: Safe Integration (Day 3)

### Checkpoint 3.1: Add Thesis View Alongside Existing
**Goal:** Create new thesis page without changing existing pages  
**Time:** 1 hour  
**Risk:** Low (additive only)

**Create New Route:**

**`app/thesis/page.tsx`**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { configToPortfolio, decisionToThesis } from '@/lib/models';
import ThesisCard from '@/components/thesis/ThesisCard';
import type { InvestmentThesis } from '@/lib/models/thesis';

export default function ThesisPage() {
  const [theses, setTheses] = useState<InvestmentThesis[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<'energy' | 'copper'>('energy');

  useEffect(() => {
    loadTheses();
  }, [activePortfolio]);

  const loadTheses = () => {
    const config = configs.find(c => c.id === activePortfolio);
    if (!config) return;

    // Convert StrategyAccordion decisions to theses
    const mockDecisions = [
      {
        title: 'Margin Decision',
        description: '30% margin strategy with proportional allocation',
        rationale: 'Leverages sector fundamentals with controlled risk',
        urgency: 'green' as const,
        triggerCondition: 'Monitor equity % and margin calls',
      },
      {
        title: 'Delever Decision',
        description: 'Trigger at +50% portfolio value',
        rationale: 'Lock in gains and eliminate leverage risk',
        urgency: 'yellow' as const,
        triggerCondition: 'Execute when target value reached',
      },
    ];

    const thesesData = mockDecisions.map(decision =>
      decisionToThesis(decision, config.id, activePortfolio)
    );

    setTheses(thesesData);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            📋 Investment Theses
          </h1>
          
          {/* Portfolio Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActivePortfolio('energy')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activePortfolio === 'energy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-[#9CA3AF] hover:bg-neutral-700'
              }`}
            >
              Energy
            </button>
            <button
              onClick={() => setActivePortfolio('copper')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activePortfolio === 'copper'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-[#9CA3AF] hover:bg-neutral-700'
              }`}
            >
              Copper
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-blue-300">
            <strong>📊 Portfolio Strategy Decisions</strong> - These represent your core investment decisions.
            Future enhancements will add AI-powered validation and deeper thesis tracking.
          </p>
        </div>

        {/* Thesis Cards */}
        <div className="space-y-4">
          {theses.map(thesis => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              onMarkReviewed={(id) => console.log('Mark reviewed:', id)}
              onExecuteAction={(id, action) => alert(`Execute ${action} on ${id}`)}
            />
          ))}
        </div>

        {/* Back Link */}
        <div className="pt-6">
          <a
            href="/"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
```

**Update Main Dashboard with Link:**

Add to `app/page.tsx` (after existing content):
```typescript
{/* NEW: Add link to thesis page */}
<div className="mt-6">
  <a
    href="/thesis"
    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
  >
    📋 View Investment Theses
  </a>
</div>
```

**Verification:**
- [ ] Main dashboard still works perfectly
- [ ] New "View Investment Theses" button appears
- [ ] Click button → navigates to `/thesis`
- [ ] Thesis page loads with 2 cards per portfolio
- [ ] Portfolio switcher works
- [ ] Back link works
- [ ] StrategyAccordion still works on main page

**Git Checkpoint:**
```bash
git add app/thesis/
git add app/page.tsx
git commit -m "Phase 3.1: Add thesis page alongside existing dashboard (non-breaking)"
git push origin feature/refactor-phase-0
```

**Status:** ✅ **New thesis page working, old functionality intact**

---

### Checkpoint 3.2: Connect Real StrategyAccordion Data
**Goal:** Use actual decisions from StrategyAccordion instead of mock data  
**Time:** 1 hour  
**Risk:** Low (reading only, not modifying)

**Update `app/thesis/page.tsx`:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { decisionToThesis } from '@/lib/models';
import ThesisCard from '@/components/thesis/ThesisCard';
import type { InvestmentThesis } from '@/lib/models/thesis';

// Import the actual decision logic from StrategyAccordion
function getPortfolioDecisions(portfolioType: 'energy' | 'copper', currentValue: number = 20000) {
  const targetDeleverValue = portfolioType === 'energy' ? 30000 : 15000;
  const targetProfitValue = portfolioType === 'energy' ? 30000 : 15000;
  
  const energyMarginCallValue = 6000 / 0.70;
  const energyEquityPercent = currentValue > 0 ? ((currentValue - 6000) / currentValue) * 100 : 0;

  if (portfolioType === 'energy') {
    return [
      {
        title: 'Margin Decision',
        description: '30% margin ($6,000 borrowed vs $14,000 cash). Proportional across CNQ, SU, TRMLF, AETUF, TRP. Each $1 cash controls $1.43 in positions.',
        rationale: `Leverages 2025 LNG export boom (+15% YoY) and stable WTI (~$70/bbl). All positions have Debt/EBITDA < 1.0x. Margin call triggers at $${energyMarginCallValue.toFixed(0)} (equity < 30%).`,
        urgency: energyEquityPercent < 30 ? 'red' as const : energyEquityPercent < 40 ? 'yellow' as const : 'green' as const,
        triggerCondition: `Current equity: ${energyEquityPercent.toFixed(1)}%. Margin call at $${energyMarginCallValue.toFixed(0)}`,
      },
      {
        title: 'Delever Decision',
        description: `Trigger at $30,000 (+50%). Sell $6,000 pro-rata to repay margin, highest beta first (TRMLF → AETUF). Early delever if NG < $2.50 or WTI < $60.`,
        rationale: 'Lock in gains and eliminate leverage risk. High-beta stocks (TRMLF, AETUF) are more volatile and suitable for profit-taking first.',
        urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' as const : currentValue >= targetDeleverValue * 0.75 ? 'yellow' as const : 'green' as const,
        triggerCondition: `Current: $${currentValue.toFixed(0)} / Target: $${targetDeleverValue.toFixed(0)}`,
        action: 'delever',
      },
      {
        title: 'Profit Taking Decision',
        description: 'At $30,000, trim 50% of top performer, reallocate 50% to cash, 50% to TRP (stable 5.5% dividend). Hold remaining positions.',
        rationale: 'TRP offers defensive positioning with regulated pipeline income and lower volatility, balancing portfolio risk while maintaining energy exposure.',
        urgency: currentValue >= targetProfitValue * 0.9 ? 'yellow' as const : 'green' as const,
        action: 'profit',
      },
      {
        title: 'DRIP Decision',
        description: '100% DRIP, quarterly, commission-free. Cap $40K/issuer/year. Typical yields: CNQ/SU 4-5%, TRP 5.5%, TRMLF/AETUF 2-3%.',
        rationale: 'Maximizes compounding. Canadian energy stocks provide strong dividend growth. Cost basis auto-tracked. Tax-efficient in TFSA/RRSP.',
        urgency: 'green' as const,
      },
    ];
  } else {
    // Copper decisions (similar structure)
    return [
      {
        title: 'Margin Decision',
        description: '30% margin ($3,000 borrowed vs $7,000 cash). Proportional: FCX 40%, COPX 30%, ERO 15%, HBM 15%.',
        rationale: '2025 EV/solar demand surge (+33% YoY). FCX/COPX have low cash costs ($1.50/lb breakeven).',
        urgency: 'green' as const,
        triggerCondition: 'Monitor if copper falls below $3.80/lb',
      },
      // ... other copper decisions
    ];
  }
}

export default function ThesisPage() {
  const [theses, setTheses] = useState<InvestmentThesis[]>([]);
  const [activePortfolio, setActivePortfolio] = useState<'energy' | 'copper'>('energy');

  useEffect(() => {
    loadTheses();
  }, [activePortfolio]);

  const loadTheses = () => {
    const config = configs.find(c => c.id === activePortfolio);
    if (!config) return;

    // Get real decisions from StrategyAccordion logic
    const decisions = getPortfolioDecisions(activePortfolio);

    const thesesData = decisions.map(decision =>
      decisionToThesis(decision, config.id, activePortfolio)
    );

    setTheses(thesesData);
  };

  // ... rest of component same as before
}
```

**Verification:**
- [ ] Thesis page shows all 4 decisions (Margin, Delever, Profit, DRIP)
- [ ] Urgency colors match portfolio state
- [ ] Trigger conditions show real values
- [ ] Portfolio switcher shows different decisions
- [ ] Main dashboard still works

**Git Checkpoint:**
```bash
git add app/thesis/page.tsx
git commit -m "Phase 3.2: Connect real StrategyAccordion data to thesis page"
git push origin feature/refactor-phase-0
```

**Status:** ✅ **Thesis page shows real data, full system working**

---

## 🎉 CHECKPOINT: Merge Phase 0-3 to Main

**You now have:**
1. ✅ Data models defined
2. ✅ Reusable components built
3. ✅ New thesis page working
4. ✅ Old functionality completely preserved

**Merge to main:**
```bash
git checkout main
git merge feature/refactor-phase-0
git push origin main
git tag checkpoint-phase-3 -m "Phase 3 complete: Thesis page working"
git push origin checkpoint-phase-3
```

**Status:** ✅ **MAJOR CHECKPOINT - Fully working app with new thesis feature**

---

## Phase 4: Checklist Implementation (Day 4)

### Checkpoint 4.1: Create Checklist Components
**Goal:** Build checklist components in isolation  
**Time:** 2 hours  
**Risk:** Low (new components)

(Similar pattern to Phase 2...)

### Checkpoint 4.2: Add Checklist Page
**Goal:** New `/checklist` route with real monitoring tasks  
**Time:** 2 hours  
**Risk:** Low (additive)

(Similar pattern to Phase 3...)

---

## Phase 5: Database Migration (Day 5+)

*(Only start after Phases 1-4 are complete and stable)*

### Checkpoint 5.1: Setup Database (No Code Changes)
### Checkpoint 5.2: Dual-Write Pattern (Write to both IndexedDB and DB)
### Checkpoint 5.3: Read from Database (Keep IndexedDB as fallback)
### Checkpoint 5.4: Remove IndexedDB (DB only)

---

## 🚨 Rollback Procedures

### If Something Breaks:
```bash
# 1. Check which checkpoint you're at
git log --oneline

# 2. Rollback to previous working checkpoint
git reset --hard <checkpoint-commit-hash>

# 3. Force push if needed (be careful!)
git push origin feature/refactor-phase-0 --force

# 4. Restart from that checkpoint
```

### Emergency Rollback:
```bash
# Go back to before any changes
git checkout backup-before-refactor
git checkout -b recovery-branch
```

---

## 📊 Progress Tracking

| Phase | Status | Checkpoint | Date | Notes |
|-------|--------|------------|------|-------|
| 0 | ⬜ | Safety Net | | |
| 1.1 | ⬜ | Type Definitions | | |
| 1.2 | ⬜ | Test Models | | |
| 2.1 | ⬜ | UI Components | | |
| 2.2 | ⬜ | Thesis Components | | |
| 3.1 | ⬜ | Thesis Page | | |
| 3.2 | ⬜ | Real Data | | |
| **Merge** | ⬜ | **Main Checkpoint** | | |

---

## 🎯 Next Actions

**START HERE:**
```bash
# 1. Create backup
git checkout -b backup-before-refactor
git push origin backup-before-refactor

# 2. Start Phase 1.1
git checkout -b feature/refactor-phase-0
```

**Then work through each checkpoint systematically!**

Ready to start? Say "Yes, let's begin Phase 0" and I'll guide you through each step!
