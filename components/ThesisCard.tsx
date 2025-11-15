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
    <div className="bg-[#0E1114] border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-[#E5E7EB]">{thesis.title}</h3>
            <UrgencyBadge urgency={thesis.urgency} size="sm" />
          </div>
          <p className="text-sm text-[#9CA3AF]">{thesis.ticker}</p>
        </div>
        
        {/* Health Score */}
        <div className="text-right">
          <div className="text-2xl font-bold text-[#E5E7EB]">
            {thesis.thesisHealthScore}%
          </div>
          <div className="text-xs text-[#9CA3AF]">Health</div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="w-full bg-neutral-800 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${getHealthBarColor(thesis.thesisHealthScore)}`}
          style={{ width: `${thesis.thesisHealthScore}%` }}
        />
      </div>

      {/* Description */}
      <p className="text-sm text-[#E5E7EB] mb-3">{thesis.description}</p>

      {!isCompact && (
        <>
          {/* Expandable Rationale */}
          <ExpandableDetails
            summary={<span className="text-xs underline">Why this matters</span>}
            summaryClassName="text-[#9CA3AF]"
            contentClassName="text-xs text-[#9CA3AF] italic"
          >
            {thesis.rationale}
          </ExpandableDetails>

          {/* Bear Case */}
          {thesis.bearCase && (
            <ExpandableDetails
              summary={<span className="text-xs underline">Bear case</span>}
              summaryClassName="text-[#9CA3AF] mt-2"
              contentClassName="text-xs text-[#9CA3AF] italic"
            >
              {thesis.bearCase}
            </ExpandableDetails>
          )}

          {/* Key Metrics */}
          {thesis.keyMetrics.length > 0 && (
            <div className="mt-3 border-t border-neutral-800 pt-3">
              <h4 className="text-xs font-semibold text-[#9CA3AF] mb-2">Key Metrics</h4>
              <div className="space-y-2">
                {thesis.keyMetrics.map((metric, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">{metric.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#E5E7EB] font-mono">{metric.currentValue}</span>
                      <UrgencyBadge urgency={metric.urgency} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stop Loss Rules */}
          {thesis.stopLossRules.length > 0 && (
            <div className="mt-3 border-t border-neutral-800 pt-3">
              <h4 className="text-xs font-semibold text-[#9CA3AF] mb-2">Stop Loss Rules</h4>
              <div className="space-y-2">
                {thesis.stopLossRules.map((rule, idx) => (
                  <div key={idx} className="bg-neutral-900/50 p-2 rounded text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                        {rule.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[#9CA3AF] mb-1">
                      <strong>Trigger:</strong> {rule.trigger}
                    </p>
                    <p className="text-[#9CA3AF]">
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
          <div className="mt-3 border-t border-neutral-800 pt-3">
            <h4 className="text-xs font-semibold text-[#9CA3AF] mb-2">Exit Criteria</h4>
            <div className="text-xs space-y-1">
              {thesis.exitCriteria.targetPrice && (
                <p className="text-[#9CA3AF]">
                  Target Price: <span className="text-[#E5E7EB] font-mono">${thesis.exitCriteria.targetPrice}</span>
                </p>
              )}
              <p className="text-[#9CA3AF]">
                Target Value: <span className="text-[#E5E7EB] font-mono">${thesis.exitCriteria.targetValue.toLocaleString()}</span>
              </p>
              <p className="text-[#9CA3AF]">
                Profit Target: <span className="text-green-400 font-mono">+{thesis.exitCriteria.profitTarget}%</span>
              </p>
            </div>
          </div>

          {/* Validation History */}
          {thesis.lastValidated && (
            <div className="mt-3 text-xs text-[#9CA3AF]">
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
