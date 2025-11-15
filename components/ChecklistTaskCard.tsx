/**
 * ChecklistTaskCard - Display individual checklist task with completion tracking
 * Uses ChecklistTask data model and shared UI components
 */

import { ChecklistTask } from '@/lib/models';
import { UrgencyBadge, ExpandableDetails, ActionButton } from '@/components/shared';

interface ChecklistTaskCardProps {
  task: ChecklistTask;
  onToggleComplete?: (taskId: string) => void;
  onAddNote?: (taskId: string, note: string) => void;
  onSnooze?: (taskId: string) => void;
  isCompact?: boolean;
}

export default function ChecklistTaskCard({
  task,
  onToggleComplete,
  onAddNote,
  onSnooze,
  isCompact = false,
}: ChecklistTaskCardProps) {
  const getCategoryIcon = (category: ChecklistTask['category']) => {
    switch (category) {
      case 'morning_routine':
        return '🌅';
      case 'market_hours':
        return '📈';
      case 'evening_review':
        return '🌙';
      case 'event_driven':
        return '⚡';
    }
  };

  const getCategoryLabel = (category: ChecklistTask['category']) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFrequencyColor = (frequency: ChecklistTask['frequency']) => {
    switch (frequency) {
      case 'Daily':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'Weekly':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'Monthly':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'Ad-hoc':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  return (
    <div
      className={`
        bg-[#0E1114] border rounded-lg p-3 transition-all
        ${task.completed ? 'border-green-800/50 opacity-75' : 'border-neutral-800 hover:border-neutral-700'}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-2">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete?.(task.id)}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all mt-0.5
            ${task.completed 
              ? 'bg-green-600 border-green-500' 
              : 'border-neutral-600 hover:border-neutral-500'
            }
          `}
        >
          {task.completed && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg">{getCategoryIcon(task.category)}</span>
            <span className="text-xs font-medium text-[#9CA3AF]">{getCategoryLabel(task.category)}</span>
            <UrgencyBadge urgency={task.urgency} size="sm" />
            <span className={`text-xs px-2 py-0.5 rounded border font-medium ${getFrequencyColor(task.frequency)}`}>
              {task.frequency}
            </span>
          </div>
          
          <p className={`text-sm ${task.completed ? 'line-through text-[#6B7280]' : 'text-[#E5E7EB]'}`}>
            {task.task}
          </p>
        </div>
      </div>

      {!isCompact && (
        <>
          {/* Condition */}
          {task.condition && (
            <div className="ml-8 mb-2">
              <p className="text-xs text-[#9CA3AF]">
                <strong>Condition:</strong> {task.condition}
              </p>
            </div>
          )}

          {/* Event Trigger */}
          {task.trigger && (
            <div className="ml-8 mb-2 bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-yellow-400">⚡ Event Triggered</span>
              </div>
              <p className="text-xs text-[#9CA3AF]">{task.trigger.description}</p>
              {task.trigger.ticker && (
                <p className="text-xs text-yellow-400 mt-1">Ticker: {task.trigger.ticker}</p>
              )}
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="ml-8 mb-2">
              <ExpandableDetails
                summary={<span className="text-xs underline">View notes</span>}
                summaryClassName="text-[#9CA3AF]"
                contentClassName="text-xs text-[#9CA3AF] italic"
              >
                {task.notes}
              </ExpandableDetails>
            </div>
          )}

          {/* Completion Info */}
          {task.completed && task.completedAt && (
            <div className="ml-8 text-xs text-green-400">
              ✓ Completed at {new Date(task.completedAt).toLocaleTimeString()}
            </div>
          )}

          {/* Actions */}
          {!task.completed && (
            <div className="ml-8 mt-3 flex flex-wrap gap-2">
              {task.actions.map((action, idx) => (
                <ActionButton
                  key={idx}
                  onClick={() => {
                    if (action.type === 'complete' && onToggleComplete) {
                      onToggleComplete(task.id);
                    }
                  }}
                  urgency={task.urgency === 'red' ? 'red' : 'neutral'}
                  size="sm"
                >
                  {action.label}
                </ActionButton>
              ))}
              {onSnooze && (
                <ActionButton onClick={() => onSnooze(task.id)} urgency="neutral" size="sm">
                  ⏰ Snooze 1h
                </ActionButton>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
