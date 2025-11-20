/**
 * ThesisCard - Display investment thesis with health metrics
 * Uses new InvestmentThesis data model and shared UI components
 */

import { InvestmentThesis } from '@/lib/models';
import { UrgencyBadge, ExpandableDetails, ActionButton } from '@/components/shared';

interface ThesisCardProps {
  thesis: InvestmentThesis;
  onValidate?: (thesisId: string) => void;
  onEdit?: (thesisId: string) => void;
  onArchive?: (thesisId: string) => void;
  isCompact?: boolean;
}

export default function ThesisCard({
  thesis,
  onValidate,
  onEdit,
  onArchive,
  isCompact = false,
}: ThesisCardProps) {
  const getHealthBarColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{thesis.title}</h3>
            <UrgencyBadge urgency={thesis.urgency} size="sm" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{thesis.ticker}</p>
        </div>

        {/* Health Score */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {thesis.thesisHealthScore}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Health</div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${getHealthBarColor(thesis.thesisHealthScore)}`}
          style={{ width: `${thesis.thesisHealthScore}%` }}
        />
      </div>

      {/* Description */}
      <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">{thesis.description}</p>

      {!isCompact && (
        <>
          {/* Expandable Rationale */}
          <ExpandableDetails
            summary={<span className="text-xs underline">Why this matters</span>}
            summaryClassName="text-gray-600 dark:text-gray-400"
            contentClassName="text-xs text-gray-600 dark:text-gray-400 italic"
          >
            {thesis.rationale}
          </ExpandableDetails>

          {/* Bear Case */}
          {thesis.bearCase && (
            <ExpandableDetails
              summary={<span className="text-xs underline">Bear case</span>}
              summaryClassName="text-gray-600 dark:text-gray-400 mt-2"
              contentClassName="text-xs text-gray-600 dark:text-gray-400 italic"
            >
              {thesis.bearCase}
            </ExpandableDetails>
          )}

          {/* Key Metrics */}
          {thesis.keyMetrics.length > 0 && (
            <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Key Metrics</h4>
              <div className="space-y-2">
                {thesis.keyMetrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{metric.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 dark:text-gray-100 font-mono">{metric.currentValue}</span>
                      <UrgencyBadge urgency={metric.urgency} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stop Loss Rules */}
          {thesis.stopLossRules.length > 0 && (
            <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
              <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Stop Loss Rules</h4>
              <div className="space-y-2">
                {thesis.stopLossRules.map((rule, idx) => (
                  <div key={idx} className="bg-gray-100 dark:bg-gray-800/50 p-2 rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                        {rule.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">
                      <strong>Trigger:</strong> {rule.trigger}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <strong>Action:</strong> {rule.action}
                    </p>
                    {rule.currentDistance && (
                      <p className="text-yellow-400 mt-1">
                        Distance: {rule.currentDistance}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exit Criteria */}
          <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Exit Criteria</h4>
            <div className="text-xs space-y-1">
              {thesis.exitCriteria.targetPrice && (
                <p className="text-gray-600 dark:text-gray-400">
                  Target Price: <span className="text-gray-900 dark:text-gray-100 font-mono">${thesis.exitCriteria.targetPrice}</span>
                </p>
              )}
              <p className="text-gray-600 dark:text-gray-400">
                Target Value: <span className="text-gray-900 dark:text-gray-100 font-mono">${thesis.exitCriteria.targetValue.toLocaleString()}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Profit Target: <span className="text-green-400 font-mono">+{thesis.exitCriteria.profitTarget}%</span>
              </p>
            </div>
          </div>

          {/* Validation History */}
          {thesis.lastValidated && (
            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              Last validated: {new Date(thesis.lastValidated).toLocaleDateString()}
            </div>
          )}
        </>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {onValidate && (
          <ActionButton
            onClick={() => onValidate(thesis.id)}
            urgency={thesis.urgency === 'red' ? 'red' : 'neutral'}
            size="sm"
            animated={thesis.urgency === 'red'}
          >
            {thesis.urgency === 'red' ? '🚨' : '🔍'} Validate Thesis
          </ActionButton>
        )}
        {onEdit && (
          <ActionButton onClick={() => onEdit(thesis.id)} urgency="neutral" size="sm">
            ✏️ Edit
          </ActionButton>
        )}
        {onArchive && (
          <ActionButton onClick={() => onArchive(thesis.id)} urgency="neutral" size="sm">
            📦 Archive
          </ActionButton>
        )}
      </div>
    </div>
  );
}
