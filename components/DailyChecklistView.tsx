/**
 * DailyChecklistView - Display grouped checklist tasks with completion tracking
 * Uses DailyChecklist data model and ChecklistTaskCard component
 */

import { DailyChecklist } from '@lib/types';
import ChecklistTaskCard from './ChecklistTaskCard';

interface DailyChecklistViewProps {
  checklist: DailyChecklist;
  onToggleComplete?: (taskId: string) => void;
  onAddNote?: (taskId: string, note: string) => void;
  onSnooze?: (taskId: string) => void;
  showEmptySections?: boolean;
}

export default function DailyChecklistView({
  checklist,
  onToggleComplete,
  onAddNote,
  onSnooze,
  showEmptySections = false,
}: DailyChecklistViewProps) {
  const getCompletionColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStreakMessage = () => {
    if (checklist.currentStreak === 0) {
      return '🔥 Start your streak!';
    }
    if (checklist.currentStreak === 1) {
      return '🔥 1 day streak';
    }
    return `🔥 ${checklist.currentStreak} day streak`;
  };

  const renderTaskSection = (
    title: string,
    icon: string,
    tasks: typeof checklist.morningRoutine,
    defaultOpen = false
  ) => {
    if (!showEmptySections && tasks.length === 0) return null;

    const completedCount = tasks.filter(t => t.completed).length;
    const sectionPercentage = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

    return (
      <details open={defaultOpen} className="group mb-4">
        <summary className="cursor-pointer list-none">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {completedCount} of {tasks.length} completed
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {Math.round(sectionPercentage)}%
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-400 group-open:rotate-90 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            {/* Section Progress Bar */}
            {tasks.length > 0 && (
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-3">
                <div
                  className={`h-1.5 rounded-full transition-all ${getCompletionColor(sectionPercentage)}`}
                  style={{ width: `${sectionPercentage}%` }}
                />
              </div>
            )}
          </div>
        </summary>

        <div className="mt-2 space-y-2 pl-4">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">No tasks in this section</p>
          ) : (
            tasks.map((task) => (
              <ChecklistTaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onAddNote={onAddNote}
                onSnooze={onSnooze}
              />
            ))
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with Overall Progress */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Daily Checklist
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(checklist.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
              {Math.round(checklist.completionPercentage)}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {checklist.completedTasks} / {checklist.totalTasks} tasks
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all ${getCompletionColor(checklist.completionPercentage)}`}
            style={{ width: `${checklist.completionPercentage}%` }}
          />
        </div>

        {/* Streak Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            {getStreakMessage()}
            {checklist.longestStreak > checklist.currentStreak && (
              <span className="ml-2 text-xs">
                (Best: {checklist.longestStreak} days)
              </span>
            )}
          </div>
          {checklist.completionPercentage === 100 && (
            <div className="text-green-400 font-semibold">
              ✨ Perfect day!
            </div>
          )}
        </div>
      </div>

      {/* Task Sections */}
      {renderTaskSection('Morning Routine', '🌅', checklist.morningRoutine, true)}
      {renderTaskSection('Market Hours', '📈', checklist.marketHours)}
      {renderTaskSection('Evening Review', '🌙', checklist.eveningReview)}
      {renderTaskSection('Event-Driven', '⚡', checklist.eventDriven, checklist.eventDriven.length > 0)}
    </div>
  );
}
