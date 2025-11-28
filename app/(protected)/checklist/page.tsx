'use client';

import { useState, useEffect } from 'react';
import { configs } from '@/lib/config';
import { ChecklistTask, DailyChecklist } from '@/lib/types';
import DailyChecklistView from '@/components/DailyChecklistView';
import { get, set } from '@/lib/storage';
import { usePortfolio, useStocks, usePortfolioMetrics } from '@/lib/hooks/useDatabase';

export default function ChecklistPage() {
  const [active, setActive] = useState<'energy' | 'copper'>('energy');
  const [checklist, setChecklist] = useState<DailyChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const config = configs.find(c => c.id === active)!;
  const { portfolio: dbPortfolio } = usePortfolio(active);
  const { stocks: dbStocks } = useStocks(dbPortfolio?.id);
  const metrics = usePortfolioMetrics(dbStocks, dbPortfolio?.borrowedAmount || 0);

  const currentValue = metrics.currentValue || config.initialValue;

  useEffect(() => {
    const generateChecklist = async () => {
      setIsLoading(true);

      const portfolioValue = currentValue > 0 ? currentValue : config.initialValue;
      const marginUsed = active === 'energy' ? 6000 : 3000;
      const equityPercent = portfolioValue > 0 ? ((portfolioValue - marginUsed) / portfolioValue) * 100 : 0;
      const stopLossValue = active === 'energy' ? 14000 : 7000;
      const marginCallValue = marginUsed / 0.70;

      const today = new Date();
      const checklistId = `checklist_${active}_${today.toISOString().split('T')[0]}`;

      const morningRoutine: ChecklistTask[] = [
        {
          id: `${checklistId}_morning_1`,
          portfolioId: active,
          frequency: 'Daily',
          task: `Open dashboard, check ${active === 'energy' ? 'WTI/NG prices' : 'copper price'} and portfolio value`,
          urgency: portfolioValue < stopLossValue ? 'red' : 'green',
          condition: `Value: $${portfolioValue.toFixed(0)}`,
          category: 'morning_routine',
          completed: false,
          actions: [],
          createdAt: today,
          dueDate: today,
        },
      ];

      const marketHours: ChecklistTask[] = [
        {
          id: `${checklistId}_market_1`,
          portfolioId: active,
          frequency: 'Daily',
          task: `Verify no red alerts (stop-loss $${stopLossValue}, margin call $${marginCallValue.toFixed(0)})`,
          urgency: portfolioValue < marginCallValue ? 'red' : 'green',
          condition: `Equity: ${equityPercent.toFixed(1)}%`,
          category: 'market_hours',
          completed: false,
          actions: [],
          createdAt: today,
          dueDate: today,
        },
      ];

      const eveningReview: ChecklistTask[] = [
        {
          id: `${checklistId}_evening_1`,
          portfolioId: active,
          frequency: 'Daily',
          task: 'Review day performance, note significant moves (>5%)',
          urgency: 'green',
          category: 'evening_review',
          completed: false,
          actions: [],
          createdAt: today,
          dueDate: today,
        },
      ];

      const allTasks = [...morningRoutine, ...marketHours, ...eveningReview];

      const newChecklist: DailyChecklist = {
        id: checklistId,
        portfolioId: active,
        date: today,
        morningRoutine,
        marketHours,
        eveningReview,
        eventDriven: [],
        totalTasks: allTasks.length,
        completedTasks: 0,
        completionPercentage: 0,
        currentStreak: 0,
        longestStreak: 0,
      };

      // Load saved states
      const storageKey = `checklist_${active}_${today.toISOString().split('T')[0]}`;
      const saved = await get<Record<string, boolean>>(storageKey);

      if (saved) {
        const updateTasks = (tasks: ChecklistTask[]) =>
          tasks.map(task => ({
            ...task,
            completed: saved[task.id] || false,
          }));

        newChecklist.morningRoutine = updateTasks(morningRoutine);
        newChecklist.marketHours = updateTasks(marketHours);
        newChecklist.eveningReview = updateTasks(eveningReview);

        const completed = allTasks.filter(t => saved[t.id]).length;
        newChecklist.completedTasks = completed;
        newChecklist.completionPercentage = (completed / allTasks.length) * 100;
      }

      setChecklist(newChecklist);
      setIsLoading(false);
    };

    generateChecklist();
  }, [active, currentValue, config.initialValue]);

  const handleToggleTask = async (taskId: string) => {
    if (!checklist) return;

    const updateTaskInCategory = (tasks: ChecklistTask[]) =>
      tasks.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );

    const newChecklist = {
      ...checklist,
      morningRoutine: updateTaskInCategory(checklist.morningRoutine),
      marketHours: updateTaskInCategory(checklist.marketHours),
      eveningReview: updateTaskInCategory(checklist.eveningReview),
    };

    const allTasks = [
      ...newChecklist.morningRoutine,
      ...newChecklist.marketHours,
      ...newChecklist.eveningReview,
    ];
    const completed = allTasks.filter(t => t.completed).length;

    newChecklist.completedTasks = completed;
    newChecklist.completionPercentage = (completed / allTasks.length) * 100;

    setChecklist(newChecklist);

    // Save to storage
    const today = new Date();
    const storageKey = `checklist_${active}_${today.toISOString().split('T')[0]}`;
    const completionState: Record<string, boolean> = {};
    allTasks.forEach(task => {
      completionState[task.id] = task.completed;
    });
    await set(storageKey, completionState);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading checklist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setActive('energy')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            active === 'energy'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          ⚡ Energy
        </button>
        <button
          onClick={() => setActive('copper')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            active === 'copper'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          🔶 Copper
        </button>
      </div>

      {/* Checklist */}
      {checklist && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <DailyChecklistView
            checklist={checklist}
            onToggleComplete={handleToggleTask}
            onSnooze={(id) => console.log('Snooze:', id)}
            showEmptySections={false}
          />
        </div>
      )}
    </div>
  );
}
