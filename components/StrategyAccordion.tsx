'use client';

import { useState, useEffect } from 'react';
import { get, set } from '@/lib/utils/idbStorage';
import { ActionButton } from '@/components/shared';

interface DecisionRow {
  title: string;
  description: string;
  rationale: string;
  urgency: 'green' | 'yellow' | 'red';
  action?: string;
  triggerCondition?: string;
}

interface MonitoringTask {
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  task: string;
  urgency: 'green' | 'yellow' | 'red';
  condition?: string;
}

interface StrategyAccordionProps {
  portfolioType: 'energy' | 'copper';
  currentValue: number;
  targetDeleverValue: number;
  targetProfitValue: number;
  wtiPrice?: number;
  ngPrice?: number;
  copperPrice?: number;
  marginPercent: number;
}

export default function StrategyAccordion({
  portfolioType,
  currentValue,
  targetDeleverValue,
  targetProfitValue,
  wtiPrice,
  ngPrice,
  copperPrice,
  marginPercent,
}: StrategyAccordionProps) {
  const [isDecisionsOpen, setIsDecisionsOpen] = useState(false);
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false);
  const [reviewedDecisions, setReviewedDecisions] = useState<Record<string, boolean>>({});
  const [reviewedTasks, setReviewedTasks] = useState<Record<string, boolean>>({});

  const storageKey = `strategy_${portfolioType}`;

  // Load reviewed states from IndexedDB
  useEffect(() => {
    const loadReviewedStates = async () => {
      const saved = await get<{ decisions: Record<string, boolean>; tasks: Record<string, boolean> }>(storageKey);
      if (saved) {
        setReviewedDecisions(saved.decisions || {});
        setReviewedTasks(saved.tasks || {});
      }
    };
    loadReviewedStates();
  }, [storageKey]);

  // Save to IndexedDB
  const saveReviewedStates = async (decisions: Record<string, boolean>, tasks: Record<string, boolean>) => {
    await set(storageKey, { decisions, tasks });
  };

  const handleMarkReviewed = (type: 'decision' | 'task', key: string) => {
    if (type === 'decision') {
      const updated = { ...reviewedDecisions, [key]: !reviewedDecisions[key] };
      setReviewedDecisions(updated);
      saveReviewedStates(updated, reviewedTasks);
    } else {
      const updated = { ...reviewedTasks, [key]: !reviewedTasks[key] };
      setReviewedTasks(updated);
      saveReviewedStates(reviewedDecisions, updated);
    }
  };

  const handleResetAll = () => {
    setReviewedDecisions({});
    setReviewedTasks({});
    saveReviewedStates({}, {});
  };

  const handleExecuteDelever = () => {
    alert('🚨 Execute Delever:\n\nSell $' + (portfolioType === 'energy' ? '6,000' : '3,000') + ' pro-rata from positions to repay margin.\n\nPrioritize highest beta stocks first.');
  };

  const handleTakeProfit = () => {
    alert('💰 Take Profit:\n\nTrim 50% of your top-performing position.\n\nReallocate proceeds per strategy guidelines.');
  };

  // Calculate margin call thresholds and equity percentages
  // Margin call triggers when equity % < 30% (maintenance margin)
  // Formula: Margin Call Value = Borrowed Amount / (1 - Maintenance Margin %)
  const energyMarginCallValue = 6000 / 0.70; // $8,571.43
  const copperMarginCallValue = 3000 / 0.70; // $4,285.71
  const energyEquityPercent = currentValue > 0 ? ((currentValue - 6000) / currentValue) * 100 : 0;
  const copperEquityPercent = currentValue > 0 ? ((currentValue - 3000) / currentValue) * 100 : 0;

  // Energy Portfolio Strategy
  const energyDecisions: DecisionRow[] = [
    {
      title: 'Margin Decision',
      description: '30% margin ($6,000 borrowed vs $14,000 cash). Proportional across CNQ, SU, TRMLF, AETUF, TRP. Each $1 cash controls $1.43 in positions.',
      rationale: `Leverages 2025 LNG export boom (+15% YoY) and stable WTI (~$70/bbl). All positions have Debt/EBITDA < 1.0x. Margin call triggers at $${energyMarginCallValue.toFixed(0)} (equity < 30%).`,
      urgency: portfolioType === 'energy' && energyEquityPercent < 30 ? 'red' : portfolioType === 'energy' && energyEquityPercent < 40 ? 'yellow' : 'green',
      triggerCondition: portfolioType === 'energy' ? `Current equity: ${energyEquityPercent.toFixed(1)}%. Margin call at $${energyMarginCallValue.toFixed(0)}` : 'Monitor if WTI falls below $60',
    },
    {
      title: 'Delever Decision',
      description: `Trigger at $30,000 (+50%). Sell $6,000 pro-rata to repay margin, highest beta first (TRMLF → AETUF). Early delever if NG < $2.50 or WTI < $60.`,
      rationale: 'Lock in gains and eliminate leverage risk. High-beta stocks (TRMLF, AETUF) are more volatile and suitable for profit-taking first.',
      urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' : currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
      action: 'delever',
      triggerCondition: `Current: $${currentValue.toFixed(0)} / Target: $${targetDeleverValue.toFixed(0)}`,
    },
    {
      title: 'Profit Taking Decision',
      description: 'At $30,000, trim 50% of top performer, reallocate 50% to cash, 50% to TRP (stable 5.5% dividend). Hold remaining positions.',
      rationale: 'TRP offers defensive positioning with regulated pipeline income and lower volatility, balancing portfolio risk while maintaining energy exposure.',
      urgency: currentValue >= targetProfitValue * 0.9 ? 'yellow' : 'green',
      action: 'profit',
    },
    {
      title: 'DRIP Decision',
      description: '100% DRIP, quarterly, commission-free. Cap $40K/issuer/year. Typical yields: CNQ/SU 4-5%, TRP 5.5%, TRMLF/AETUF 2-3%.',
      rationale: 'Maximizes compounding. Canadian energy stocks provide strong dividend growth. Cost basis auto-tracked. Tax-efficient in TFSA/RRSP.',
      urgency: 'green',
    },
  ];

  const energyMonitoring: MonitoringTask[] = [
    {
      frequency: 'Daily',
      task: 'Open dashboard at 9:30 AM ET, check WTI/NG prices and portfolio value',
      urgency: currentValue < 14000 ? 'red' : currentValue < 16000 ? 'yellow' : 'green',
      condition: `Value: $${currentValue.toFixed(0)} ${currentValue < 14000 ? '⚠️ Below stop-loss ($14,000)' : '✓'}`,
    },
    {
      frequency: 'Daily',
      task: `Verify no red alerts (stop-loss $14,000, margin call $${energyMarginCallValue.toFixed(0)})`,
      urgency: currentValue < energyMarginCallValue ? 'red' : currentValue < 14500 ? 'yellow' : 'green',
      condition: portfolioType === 'energy' ? `Equity: ${energyEquityPercent.toFixed(1)}% ${energyEquityPercent < 30 ? '⚠️ MARGIN CALL' : '✓'}` : undefined,
    },
    {
      frequency: 'Weekly',
      task: 'Review 7-day trend, verify equity stays above 45% (margin call at 30%)',
      urgency: portfolioType === 'energy' && energyEquityPercent < 35 ? 'red' : portfolioType === 'energy' && energyEquityPercent < 45 ? 'yellow' : 'green',
      condition: portfolioType === 'energy' ? `Equity: ${energyEquityPercent.toFixed(1)}% (Safe zone: >45%)` : `Margin: ${marginPercent.toFixed(1)}%`,
    },
    {
      frequency: 'Weekly',
      task: 'Confirm DRIP executed after ex-dividend dates',
      urgency: 'green',
    },
    {
      frequency: 'Monthly',
      task: 'Assess: Should I take profit? Should I delever? Rebalance needed?',
      urgency: currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
    },
    {
      frequency: 'Monthly',
      task: 'Review commodity fundamentals: LNG export capacity, oil demand forecasts',
      urgency: 'green',
    },
  ];

  // Copper Portfolio Strategy
  const copperDecisions: DecisionRow[] = [
    {
      title: 'Margin Decision',
      description: '30% margin ($3,000 borrowed vs $7,000 cash). Proportional: FCX 40%, COPX 30%, ERO 15%, HBM 15%. Each $1 cash controls $1.43 positions.',
      rationale: '2025 EV/solar demand surge (+33% YoY). FCX/COPX have low cash costs ($1.50/lb breakeven), safe at current $4+ copper price.',
      urgency: 'green',
      triggerCondition: 'Monitor if copper falls below $3.80/lb or margin exceeds 35%',
    },
    {
      title: 'Delever Decision',
      description: `Trigger at $15,000 (+50%). Sell $3,000 to repay margin, highest beta first (ERO → HBM). Early delever if copper < $3.80/lb.`,
      rationale: 'Junior miners (ERO, HBM) have 2-3x leverage to copper price. Trimming reduces downside risk while maintaining core FCX/COPX exposure.',
      urgency: currentValue >= targetDeleverValue * 0.9 ? 'red' : currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
      action: 'delever',
      triggerCondition: `Current: $${currentValue.toFixed(0)} / Target: $${targetDeleverValue.toFixed(0)}`,
    },
    {
      title: 'Profit Taking Decision',
      description: 'Trim 50% of top performer, reallocate 70% to COPX (diversified ETF), 30% cash.',
      rationale: 'COPX provides exposure to 30+ copper producers, reducing single-stock risk while capturing sector upside.',
      urgency: currentValue >= targetProfitValue * 0.9 ? 'yellow' : 'green',
      action: 'profit',
    },
    {
      title: 'DRIP Decision',
      description: '100% DRIP, cap $20K/issuer/year. FCX yields ~2%, miners 0-1%.',
      rationale: 'Limited dividend income, but DRIP ensures reinvestment discipline. Focus on capital appreciation from copper price growth.',
      urgency: 'green',
    },
  ];

  const copperMonitoring: MonitoringTask[] = [
    {
      frequency: 'Daily',
      task: 'Check copper price (LME/COMEX) and portfolio value at market open',
      urgency: currentValue < 7000 ? 'red' : currentValue < 8500 ? 'yellow' : 'green',
      condition: `Value: $${currentValue.toFixed(0)} ${currentValue < 7000 ? '⚠️ Below stop-loss ($7,000)' : '✓'}`,
    },
    {
      frequency: 'Daily',
      task: `Monitor for red alerts (stop-loss $7,000, margin call $${copperMarginCallValue.toFixed(0)})`,
      urgency: currentValue < copperMarginCallValue ? 'red' : currentValue < 7500 ? 'yellow' : 'green',
      condition: portfolioType === 'copper' ? `Equity: ${copperEquityPercent.toFixed(1)}% ${copperEquityPercent < 30 ? '⚠️ MARGIN CALL' : '✓'}` : undefined,
    },
    {
      frequency: 'Weekly',
      task: 'Verify equity stays above 45%, review junior miner news (ERO, HBM)',
      urgency: portfolioType === 'copper' && copperEquityPercent < 35 ? 'red' : portfolioType === 'copper' && copperEquityPercent < 45 ? 'yellow' : 'green',
      condition: portfolioType === 'copper' ? `Equity: ${copperEquityPercent.toFixed(1)}% (Safe zone: >45%)` : `Margin: ${marginPercent.toFixed(1)}%`,
    },
    {
      frequency: 'Weekly',
      task: 'Track EV sales data (China, US) and solar installation trends',
      urgency: 'green',
    },
    {
      frequency: 'Monthly',
      task: 'Evaluate: Time to take profit? Delever needed? Rebalance?',
      urgency: currentValue >= targetDeleverValue * 0.75 ? 'yellow' : 'green',
    },
    {
      frequency: 'Monthly',
      task: 'Review supply disruptions (Chile, Peru), Chinese economic indicators',
      urgency: 'green',
    },
  ];

  const decisions = portfolioType === 'energy' ? energyDecisions : copperDecisions;
  const monitoring = portfolioType === 'energy' ? energyMonitoring : copperMonitoring;

  const getUrgencyColor = (urgency: 'green' | 'yellow' | 'red') => {
    switch (urgency) {
      case 'green':
        return 'text-green-900/30 border-green-500/50 text-green-300';
      case 'yellow':
        return 'text-yellow-900/30 border-yellow-500/50 text-yellow-300';
      case 'red':
        return 'text-red-900/30 border-red-500/50 text-red-300';
    }
  };

  const getUrgencyBadge = (urgency: 'green' | 'yellow' | 'red') => {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📊</span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            Strategy & Monitoring Guide
          </h3>
        </div>

        <button
          onClick={handleResetAll}
          className="text-xs sm:text-sm px-3 py-1.5 bg-neutral-600/20 text-gray-900 dark:text-gray-100 hover:bg-neutral-600 transition-colors border border-neutral-500 hover:border-neutral-400 rounded whitespace-nowrap"
        >
          Reset All Reviews
        </button>
      </div>

      {/* Pro Tip Card - Always Visible */}
      <div className="text-blue-600 dark:text-blue-400/20 border border-blue-500/30 rounded-lg p-4">
        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
          <strong>💡 Pro Tip:</strong> Use this guide daily to stay disciplined. Leverage amplifies both
          gains <span className="text-green-400">↑</span> and losses{' '}
          <span className="text-red-400">↓</span>. Stick to your stops and take profits when targets
          hit.
        </p>
      </div>

      {/* Portfolio Decisions Accordion */}
      <div className="bg-white dark:bg-gray-900 border border-neutral-300 dark:border-neutral-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsDecisionsOpen(!isDecisionsOpen)}
          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-neutral-900/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
              Portfolio Decisions
            </h4>
          </div>
          <svg
            className={`w-6 h-6 text-gray-900 dark:text-gray-100 transition-transform ${isDecisionsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isDecisionsOpen && (
          <div className="px-4 sm:px-6 pb-6">
            <div className="grid grid-cols-1 gap-4">
              {decisions.map((decision, idx) => {
                const key = `decision_${idx}`;
                const isReviewed = reviewedDecisions[key];
                return (
                  <div
                    key={key}
                    className={`border rounded-lg p-4 ${getUrgencyColor(decision.urgency)}`}
                  >
                    {/* Decision Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                          {decision.title}
                        </h5>
                        <span
                          className={`text-xs px-2 py-0.5 rounded border ${getUrgencyBadge(decision.urgency)}`}
                        >
                          {decision.urgency.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleMarkReviewed('decision', key)}
                        className={`text-xs px-3 py-1 rounded transition-colors whitespace-nowrap ${
                          isReviewed
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                            : 'bg-neutral-600/20 text-gray-900 dark:text-gray-100 hover:bg-neutral-600 transition-colors border border-neutral-500 hover:border-neutral-400'
                        }`}
                      >
                        {isReviewed ? '✓ Reviewed' : 'Mark as Reviewed'}
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 mb-2">{decision.description}</p>

                    {/* Rationale (Tooltip/Expandable) */}
                    <details className="group mb-2">
                      <summary className="text-xs text-gray-900 dark:text-gray-100 cursor-pointer hover:text-gray-900 dark:text-gray-100 list-none flex items-center gap-1">
                        <svg
                          className="w-4 h-4 group-open:rotate-90 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        <span className="underline">Why this matters</span>
                      </summary>
                      <p className="text-xs text-gray-900 dark:text-gray-100 mt-2 ml-5 italic">{decision.rationale}</p>
                    </details>

                    {/* Trigger Condition */}
                    {decision.triggerCondition && (
                      <p className="text-xs text-gray-900 dark:text-gray-100 mb-2">
                        <strong>Trigger:</strong> {decision.triggerCondition}
                      </p>
                    )}

                    {/* Action Buttons */}
                    {decision.action && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {decision.action === 'delever' && (
                          <ActionButton
                            onClick={handleExecuteDelever}
                            urgency={decision.urgency === 'red' ? 'red' : decision.urgency === 'yellow' ? 'yellow' : 'neutral'}
                            animated={decision.urgency === 'red'}
                            size="md"
                          >
                            {decision.urgency === 'red' ? '🚨' : decision.urgency === 'yellow' ? '⚠️' : '📊'} Execute Delever
                          </ActionButton>
                        )}
                        {decision.action === 'profit' && (
                          <ActionButton
                            onClick={handleTakeProfit}
                            urgency={decision.urgency === 'yellow' ? 'green' : 'neutral'}
                            size="md"
                          >
                            {decision.urgency === 'yellow' ? '💰' : '📊'} Take Profit
                          </ActionButton>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Monitoring Checklist Accordion */}
      <div className="bg-white dark:bg-gray-900 border border-neutral-300 dark:border-neutral-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setIsMonitoringOpen(!isMonitoringOpen)}
          className="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-neutral-900/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📋</span>
            <h4 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">
              Monitoring Checklist
            </h4>
          </div>
          <svg
            className={`w-6 h-6 text-gray-900 dark:text-gray-100 transition-transform ${isMonitoringOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isMonitoringOpen && (
          <div className="px-4 sm:px-6 pb-6">
            <div className="space-y-3">
              {['Daily', 'Weekly', 'Monthly'].map((freq) => {
                const tasks = monitoring.filter((t) => t.frequency === freq);
                return (
                  <div key={freq} className="space-y-2">
                    <h5 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <span>
                        {freq === 'Daily' ? '🌅' : freq === 'Weekly' ? '📅' : '📆'}
                      </span>
                      {freq}
                    </h5>
                    {tasks.map((task, idx) => {
                      const key = `task_${freq}_${idx}`;
                      const isReviewed = reviewedTasks[key];
                      return (
                        <div
                          key={key}
                          className={`border rounded-lg p-3 ${getUrgencyColor(task.urgency)}`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-start gap-2 mb-1">
                                <input
                                  type="checkbox"
                                  checked={!!isReviewed}
                                  onChange={() => handleMarkReviewed('task', key)}
                                  className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 checked:bg-blue-600"
                                />
                                <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 flex-1">
                                  {task.task}
                                </p>
                                <span
                                  className={`text-xs px-2 py-0.5 rounded border whitespace-nowrap ${getUrgencyBadge(
                                    task.urgency
                                  )}`}
                                >
                                  {task.urgency.toUpperCase()}
                                </span>
                              </div>
                              {task.condition && (
                                <p className="text-xs text-gray-900 dark:text-gray-100 ml-6">{task.condition}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
