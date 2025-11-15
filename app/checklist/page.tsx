'use client';

/**
 * Checklist Route - Display daily monitoring tasks with completion tracking
 * Phase 3.2: Safe Integration alongside existing dashboard
 */

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { ChecklistTask, DailyChecklist } from '@/lib/models';
import DailyChecklistView from '@/components/DailyChecklistView';
import { get, set } from '@/lib/storage';
import Navigation from '@/components/Navigation';
import { usePortfolio, useStocks, usePortfolioMetrics } from '@/lib/hooks/useDatabase';

export default function ChecklistPage() {
  const [active, setActive] = useState<'energy' | 'copper'>('energy');
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = configs.find(c => c.id === active)!;
  
  // Database hooks
  const { portfolio: dbPortfolio, loading: portfolioLoading } = usePortfolio(active);
  const { stocks: dbStocks, loading: stocksLoading } = useStocks(dbPortfolio?.id);
  const metrics = usePortfolioMetrics(dbStocks, dbPortfolio?.borrowedAmount || 0);
  
  const currentValue = metrics.currentValue || config.initialValue;

  // Load portfolio data from database and generate checklist
  useEffect(() => {
    const loadChecklistData = async () => {
      setError(null); // Reset error on portfolio switch
      setHasError(false);
      
      try {
        // Wait for database data to load
        if (portfolioLoading || stocksLoading) {
          setIsLoading(true);
          return;
        }
        
        setIsLoading(true);
        
        // Use database portfolio value or fallback to config
        const portfolioValue = currentValue > 0 ? currentValue : config.initialValue;
        const usingFallback = currentValue === 0;

        // Validate we have a valid value before generating checklist
        if (!portfolioValue || portfolioValue <= 0) {
          console.error('Invalid portfolio value:', portfolioValue);
          setError('Waiting for portfolio data to load...');
          setIsLoading(false);
          return;
        }

        // Generate checklist
        const newChecklist = generateDailyChecklist(active, portfolioValue);
        
        // Load saved completion states from IndexedDB
        try {
          const storageKey = `checklist_${active}_${getTodayString()}`;
          const saved = await get<Record<string, boolean>>(storageKey);
          
          if (saved) {
            // Apply saved completion states
            const updateTaskCompletion = (tasks: ChecklistTask[]) =>
              tasks.map(task => ({
                ...task,
                completed: saved[task.id] || false,
                completedAt: saved[task.id] ? new Date() : undefined,
              }));

            newChecklist.morningRoutine = updateTaskCompletion(newChecklist.morningRoutine);
            newChecklist.marketHours = updateTaskCompletion(newChecklist.marketHours);
            newChecklist.eveningReview = updateTaskCompletion(newChecklist.eveningReview);
            newChecklist.eventDriven = updateTaskCompletion(newChecklist.eventDriven);

            // Recalculate completion stats
            const allTasks = [
              ...newChecklist.morningRoutine,
              ...newChecklist.marketHours,
              ...newChecklist.eveningReview,
              ...newChecklist.eventDriven,
            ];
            const completed = allTasks.filter(t => t.completed).length;
            newChecklist.completedTasks = completed;
            newChecklist.completionPercentage = (completed / allTasks.length) * 100;
          }
        } catch (e) {
          console.error('Error loading saved checklist state:', e);
          // Continue with unchecked checklist
        }

        setChecklist(newChecklist);
        
        // Set warning if using fallback data
        if (usingFallback) {
          setError('Using initial portfolio value. Visit dashboard to refresh live data.');
        }
        
      } catch (error) {
        console.error('Critical error loading checklist:', error);
        setError('Failed to generate checklist. Please check console for details.');
        setChecklist(null);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadChecklistData();
  }, [active, config, portfolioLoading, stocksLoading, currentValue]);

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  };

  const generateDailyChecklist = (portfolioType: 'energy' | 'copper', value: number): DailyChecklist => {
    const marginUsed = portfolioType === 'energy' ? 6000 : 3000;
    const marginCallValue = marginUsed / 0.70;
    const equityPercent = value > 0 ? ((value - marginUsed) / value) * 100 : 0;
    const stopLossValue = portfolioType === 'energy' ? 14000 : 7000;
    const targetDeleverValue = portfolioType === 'energy' ? 30000 : 15000;

    const today = new Date();
    const checklistId = `checklist_${portfolioType}_${getTodayString()}`;

    // Morning Routine Tasks
    const morningRoutine: ChecklistTask[] = [
      {
        id: `${checklistId}_morning_1`,
        portfolioId: portfolioType,
        frequency: 'Daily',
        task: `Open dashboard at 9:30 AM ET, check ${portfolioType === 'energy' ? 'WTI/NG prices' : 'copper price (LME/COMEX)'} and portfolio value`,
        urgency: value < stopLossValue ? 'red' : value < stopLossValue * 1.15 ? 'yellow' : 'green',
        condition: `Value: $${value.toFixed(0)} ${value < stopLossValue ? '⚠️ Below stop-loss' : '✓'}`,
        category: 'morning_routine',
        completed: false,
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      },
    ];

    // Market Hours Tasks
    const marketHours: ChecklistTask[] = [
      {
        id: `${checklistId}_market_1`,
        portfolioId: portfolioType,
        frequency: 'Daily',
        task: `Verify no red alerts (stop-loss $${stopLossValue.toFixed(0)}, margin call $${marginCallValue.toFixed(0)})`,
        urgency: value < marginCallValue ? 'red' : value < stopLossValue * 1.05 ? 'yellow' : 'green',
        condition: `Equity: ${equityPercent.toFixed(1)}% ${equityPercent < 30 ? '⚠️ MARGIN CALL' : '✓'}`,
        category: 'market_hours',
        completed: false,
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      },
    ];

    // Add event-driven task if equity is low
    const eventDriven: ChecklistTask[] = [];
    if (equityPercent < 35) {
      eventDriven.push({
        id: `${checklistId}_event_1`,
        portfolioId: portfolioType,
        frequency: 'Ad-hoc',
        task: 'URGENT: Equity percentage dangerously low - review positions immediately',
        urgency: 'red',
        condition: `Equity at ${equityPercent.toFixed(1)}% - approaching margin call threshold (30%)`,
        category: 'event_driven',
        completed: false,
        trigger: {
          type: 'margin_warning',
          description: `Equity percentage at ${equityPercent.toFixed(1)}% - dangerously close to 30% margin call threshold`,
          threshold: 35,
        },
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      });
    }

    // Evening Review Tasks
    const eveningReview: ChecklistTask[] = [
      {
        id: `${checklistId}_evening_1`,
        portfolioId: portfolioType,
        frequency: 'Daily',
        task: 'Review day performance, note any significant moves (>5%)',
        urgency: 'green',
        category: 'evening_review',
        completed: false,
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      },
    ];

    // Add weekly tasks (show on specific days)
    const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
    if (dayOfWeek === 5) { // Friday
      marketHours.push({
        id: `${checklistId}_weekly_1`,
        portfolioId: portfolioType,
        frequency: 'Weekly',
        task: 'Review 7-day trend, verify equity stays above 45% (margin call at 30%)',
        urgency: equityPercent < 35 ? 'red' : equityPercent < 45 ? 'yellow' : 'green',
        condition: `Equity: ${equityPercent.toFixed(1)}% (Safe zone: >45%)`,
        category: 'market_hours',
        completed: false,
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      });

      if (portfolioType === 'energy') {
        eveningReview.push({
          id: `${checklistId}_weekly_2`,
          portfolioId: portfolioType,
          frequency: 'Weekly',
          task: 'Confirm DRIP executed after ex-dividend dates',
          urgency: 'green',
          category: 'evening_review',
          completed: false,
          actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
          createdAt: today,
          dueDate: today,
        });
      } else {
        eveningReview.push({
          id: `${checklistId}_weekly_2`,
          portfolioId: portfolioType,
          frequency: 'Weekly',
          task: 'Track EV sales data (China, US) and solar installation trends',
          urgency: 'green',
          category: 'evening_review',
          completed: false,
          actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
          createdAt: today,
          dueDate: today,
        });
      }
    }

    // Add monthly tasks (show on 1st of month)
    if (today.getDate() === 1) {
      eveningReview.push({
        id: `${checklistId}_monthly_1`,
        portfolioId: portfolioType,
        frequency: 'Monthly',
        task: 'Assess: Should I take profit? Should I delever? Rebalance needed?',
        urgency: value >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
        category: 'evening_review',
        completed: false,
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      });

      eveningReview.push({
        id: `${checklistId}_monthly_2`,
        portfolioId: portfolioType,
        frequency: 'Monthly',
        task: portfolioType === 'energy' 
          ? 'Review commodity fundamentals: LNG export capacity, oil demand forecasts'
          : 'Review supply disruptions (Chile, Peru), Chinese economic indicators',
        urgency: 'green',
        category: 'evening_review',
        completed: false,
        actions: [{ label: 'Mark Complete', type: 'complete', handler: 'toggleComplete' }],
        createdAt: today,
        dueDate: today,
      });
    }

    const allTasks = [...morningRoutine, ...marketHours, ...eveningReview, ...eventDriven];

    return {
      id: checklistId,
      portfolioId: portfolioType,
      date: today,
      morningRoutine,
      marketHours,
      eveningReview,
      eventDriven,
      totalTasks: allTasks.length,
      completedTasks: 0,
      completionPercentage: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  };

  const handleToggleTask = async (taskId: string) => {
    if (!checklist) return;

    const updateTaskInCategory = (tasks: ChecklistTask[]) =>
      tasks.map(task =>
        task.id === taskId
          ? { ...task, completed: !task.completed, completedAt: !task.completed ? new Date() : undefined }
          : task
      );

    const newChecklist = {
      ...checklist,
      morningRoutine: updateTaskInCategory(checklist.morningRoutine),
      marketHours: updateTaskInCategory(checklist.marketHours),
      eveningReview: updateTaskInCategory(checklist.eveningReview),
      eventDriven: updateTaskInCategory(checklist.eventDriven),
    };

    // Recalculate completion stats
    const allTasks = [
      ...newChecklist.morningRoutine,
      ...newChecklist.marketHours,
      ...newChecklist.eveningReview,
      ...newChecklist.eventDriven,
    ];
    const completed = allTasks.filter(t => t.completed).length;

    newChecklist.completedTasks = completed;
    newChecklist.completionPercentage = (completed / allTasks.length) * 100;

    setChecklist(newChecklist);

    // Save to IndexedDB
    const storageKey = `checklist_${active}_${getTodayString()}`;
    const completionState: Record<string, boolean> = {};
    allTasks.forEach(task => {
      completionState[task.id] = task.completed;
    });
    await set(storageKey, completionState);
  };

  const handleSnooze = (taskId: string) => {
    alert(`⏰ Snoozed task: ${taskId}\n\nWill remind you in 1 hour (Phase 4 feature).`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0E11] p-4 sm:p-6 flex items-center justify-center">
        <div className="text-[#9CA3AF]">Loading checklist...</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen bg-[#0B0E11] p-4 sm:p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold text-red-400">Error 500</h1>
          <p className="text-[#9CA3AF]">{error || 'Failed to load checklist. Please check the console for details.'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
            <a
              href="/"
              className="inline-block px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-[#0B0E11] p-4 sm:p-6">
        <div className="max-w-5xl mx-auto space-y-6">
        {/* Warning Banner */}
        {error && (
          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-yellow-400 font-semibold">Data Warning</p>
                <p className="text-sm text-[#9CA3AF] mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB] mb-2">
              ✅ Daily Checklist
            </h1>
            <p className="text-[#9CA3AF]">
              Monitoring tasks for {active === 'energy' ? 'Energy' : 'Copper'} portfolio
            </p>
          </div>

          {/* Portfolio Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setActive('energy')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                active === 'energy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800 text-[#9CA3AF] hover:bg-neutral-700'
              }`}
            >
              ⚡ Energy
            </button>
            <button
              onClick={() => setActive('copper')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                active === 'copper'
                  ? 'bg-orange-600 text-white'
                  : 'bg-neutral-800 text-[#9CA3AF] hover:bg-neutral-700'
              }`}
            >
              🔶 Copper
            </button>
          </div>
        </div>

        {/* Checklist */}
        {checklist && (
          <DailyChecklistView
            checklist={checklist}
            onToggleComplete={handleToggleTask}
            onSnooze={handleSnooze}
            showEmptySections={false}
          />
        )}

        {/* Navigation */}
        <div className="text-center pt-4">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
    </>
  );
}
