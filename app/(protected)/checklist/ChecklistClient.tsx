'use client';

import { useState, useTransition } from 'react';
import DailyChecklistView from '@/components/DailyChecklistView';
import { toggleChecklistTask } from './actions';
import type { DailyChecklist } from '@lib/types';

interface ChecklistClientProps {
  initialPortfolio: 'energy' | 'copper';
  energyChecklist: DailyChecklist | null;
  copperChecklist: DailyChecklist | null;
}

export default function ChecklistClient({
  initialPortfolio,
  energyChecklist,
  copperChecklist,
}: ChecklistClientProps) {
  const [active, setActive] = useState<'energy' | 'copper'>(initialPortfolio);
  const [isPending, startTransition] = useTransition();

  // Local state for generated checklists (not persisted to DB)
  const [localEnergyChecklist, setLocalEnergyChecklist] = useState(energyChecklist);
  const [localCopperChecklist, setLocalCopperChecklist] = useState(copperChecklist);

  // Use local state for display
  const checklist = active === 'energy' ? localEnergyChecklist : localCopperChecklist;

  const handleToggleTask = async (taskId: string) => {
    if (!checklist) return;

    // Check if this is a generated checklist (not saved to DB)
    const isGeneratedChecklist = checklist.id.startsWith('checklist_');

    if (isGeneratedChecklist) {
      // For generated checklists, update local state only
      const updateTaskInCategory = (tasks: any[]) =>
        tasks.map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );

      const updatedChecklist = {
        ...checklist,
        morningRoutine: updateTaskInCategory(checklist.morningRoutine || []),
        marketHours: updateTaskInCategory(checklist.marketHours || []),
        eveningReview: updateTaskInCategory(checklist.eveningReview || []),
        eventDriven: updateTaskInCategory(checklist.eventDriven || []),
      };

      // Update completion stats
      const allTasks = [
        ...updatedChecklist.morningRoutine,
        ...updatedChecklist.marketHours,
        ...updatedChecklist.eveningReview,
        ...updatedChecklist.eventDriven,
      ];
      const completedCount = allTasks.filter(t => t.completed).length;
      updatedChecklist.completedTasks = completedCount;
      updatedChecklist.completionPercentage = (completedCount / allTasks.length) * 100;

      // Update local state
      if (active === 'energy') {
        setLocalEnergyChecklist(updatedChecklist);
      } else {
        setLocalCopperChecklist(updatedChecklist);
      }
      return;
    }

    // For DB-persisted checklists, save to server
    startTransition(async () => {
      try {
        const task = [
          ...checklist.morningRoutine,
          ...checklist.marketHours,
          ...checklist.eveningReview,
          ...(checklist.eventDriven || []),
        ].find(t => t.id === taskId);

        if (!task) return;

        await toggleChecklistTask({
          checklistId: checklist.id,
          taskId,
          completed: !task.completed,
        });
      } catch (error) {
        console.error('Failed to toggle task:', error);
        // Error will be caught by error.tsx boundary
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setActive('energy')}
          disabled={isPending}
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
          disabled={isPending}
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

      {!checklist && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No checklist found for {active} portfolio.
          </p>
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Updating...
        </div>
      )}
    </div>
  );
}
