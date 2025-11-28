'use client';

import { useState } from 'react';
import { configs } from '@/lib/config';
import ThesisCard from '@/components/ThesisCard';
import { usePortfolio, useStocks, useTheses, usePortfolioMetrics } from '@/lib/hooks/useDatabase';

export default function ThesisPage() {
  const [active, setActive] = useState<'energy' | 'copper'>('energy');

  const config = configs.find(c => c.id === active)!;
  const { portfolio: dbPortfolio } = usePortfolio(active);
  const { stocks: dbStocks } = useStocks(dbPortfolio?.id);
  const { theses: dbTheses } = useTheses(dbPortfolio?.id);
  const metrics = usePortfolioMetrics(dbStocks, dbPortfolio?.borrowedAmount || 0);

  const currentValue = metrics.currentValue || config.initialValue;
  const marginUsed = dbPortfolio?.borrowedAmount || (active === 'energy' ? 6000 : 3000);
  const equityPercent = metrics.equityPercent || 0;
  const targetDeleverValue = active === 'energy' ? 30000 : 15000;

  // Use database theses or generate default ones
  const theses = dbTheses && dbTheses.length > 0
    ? dbTheses.map(t => ({
        ...t,
        bearCase: t.bearCase || undefined,
        lastValidated: t.lastValidated ? new Date(t.lastValidated) : undefined,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        keyMetrics: t.keyMetrics.map(m => ({
          ...m,
          urgency: m.urgency as 'green' | 'yellow' | 'red',
        })),
        stopLossRules: t.stopLossRules.map(r => ({
          ...r,
          type: r.type as 'hard_stop' | 'thesis_invalidation' | 'time_based' | 'margin_call',
        })),
        urgency: t.urgency as 'green' | 'yellow' | 'red',
      }))
    : [
        {
          id: `thesis_${active}_margin`,
          portfolioId: active,
          ticker: `${active.toUpperCase()}_PORTFOLIO`,
          title: 'Margin Decision',
          description: `30% margin ($${marginUsed.toLocaleString()} borrowed). Leverages market opportunities with managed risk.`,
          rationale: `All positions have strong fundamentals. Margin call triggers if equity drops below 30%.`,
          bearCase: `Market crash, margin call if equity < 30%`,
          risks: ['Market volatility', 'Margin call risk'],
          keyMetrics: [
            {
              name: 'Equity Percentage',
              targetValue: '>45%',
              currentValue: `${equityPercent.toFixed(1)}%`,
              condition: 'Must stay above 45%, margin call at 30%',
              urgency: (equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
            },
          ],
          stopLossRules: [
            {
              type: 'margin_call' as 'hard_stop' | 'thesis_invalidation' | 'time_based' | 'margin_call',
              trigger: `Equity drops below 30%`,
              action: 'Immediately sell positions to meet margin requirements',
              currentDistance: equityPercent > 30 ? `${(equityPercent - 30).toFixed(1)}% buffer` : 'TRIGGERED',
            },
          ],
          exitCriteria: {
            targetValue: targetDeleverValue,
            profitTarget: 150,
            conditions: [`Portfolio reaches $${targetDeleverValue.toLocaleString()}`],
          },
          thesisHealthScore: equityPercent < 30 ? 25 : equityPercent < 40 ? 60 : 90,
          urgency: (equityPercent < 30 ? 'red' : equityPercent < 40 ? 'yellow' : 'green') as 'green' | 'yellow' | 'red',
          lastValidated: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: `thesis_${active}_delever`,
          portfolioId: active,
          ticker: `${active.toUpperCase()}_PORTFOLIO`,
          title: 'Delever Decision',
          description: `Trigger at $${targetDeleverValue.toLocaleString()} (+50%). Sell $${marginUsed.toLocaleString()} to repay margin.`,
          rationale: 'Lock in gains and eliminate leverage risk.',
          keyMetrics: [
            {
              name: 'Distance to Target',
              targetValue: `$${targetDeleverValue.toLocaleString()}`,
              currentValue: `$${currentValue.toFixed(0)}`,
              condition: `${((currentValue / targetDeleverValue) * 100).toFixed(1)}% of target`,
              urgency: (currentValue >= targetDeleverValue * 0.9 ? 'red' : 'green') as 'green' | 'yellow' | 'red',
            },
          ],
          stopLossRules: [],
          exitCriteria: {
            targetValue: targetDeleverValue,
            profitTarget: 150,
            conditions: [`Value reaches $${targetDeleverValue.toLocaleString()}`],
          },
          thesisHealthScore: currentValue >= targetDeleverValue * 0.9 ? 30 : 90,
          urgency: (currentValue >= targetDeleverValue * 0.9 ? 'red' : 'green') as 'green' | 'yellow' | 'red',
          lastValidated: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

  // Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editThesis, setEditThesis] = useState<any | null>(null);

  // Handler to open modal with thesis data
  const handleEdit = (id: string) => {
    const thesis = theses.find(t => t.id === id);
    if (thesis) {
      setEditThesis({ ...thesis });
      setEditModalOpen(true);
    }
  };

  // Handler to update thesis fields in modal
  const handleEditField = (field: string, value: any) => {
    setEditThesis((prev: any) => ({ ...prev, [field]: value }));
  };

  // Handler to save changes (UI only)
  const handleSave = () => {
    // Here you would call an API to persist changes
    setEditModalOpen(false);
  };

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

      {/* Portfolio Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">${currentValue.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Equity %</p>
            <p className={`text-xl font-bold ${
              equityPercent < 30 ? 'text-red-600 dark:text-red-400' :
              equityPercent < 45 ? 'text-yellow-600 dark:text-yellow-400' :
              'text-green-600 dark:text-green-400'
            }`}>
              {equityPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delever Target</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">${targetDeleverValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Margin Used</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">${marginUsed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Edit Thesis</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm">Title</span>
                <input
                  type="text"
                  className="w-full p-2 border rounded bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  value={editThesis.title}
                  onChange={e => handleEditField('title', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm">Description</span>
                <textarea
                  className="w-full p-2 border rounded bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  value={editThesis.description}
                  onChange={e => handleEditField('description', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm">Rationale</span>
                <textarea
                  className="w-full p-2 border rounded bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  value={editThesis.rationale}
                  onChange={e => handleEditField('rationale', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm">Exit Criteria (target value)</span>
                <input
                  type="number"
                  className="w-full p-2 border rounded bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                  value={editThesis.exitCriteria.targetValue}
                  onChange={e => handleEditField('exitCriteria', { ...editThesis.exitCriteria, targetValue: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button className="px-4 py-2 bg-gray-300 dark:bg-gray-700 dark:text-gray-100 rounded" onClick={() => setEditModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Thesis Cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {theses.map((thesis) => (
          <ThesisCard
            key={thesis.id}
            thesis={thesis}
            onValidate={(id) => {
              const t = theses.find(th => th.id === id);
              if (!t) return alert('Thesis not found');
              // Validation checks
              const errors = [];
              if (!t.title || !t.description || !t.rationale) errors.push('Missing required fields');
              if (!t.exitCriteria || !t.exitCriteria.targetValue) errors.push('Exit criteria missing');
              // Example metric check: equity percent above 30%
              const eqMetric = t.keyMetrics.find(m => m.name.toLowerCase().includes('equity'));
              if (eqMetric) {
                const percent = parseFloat(String(eqMetric.currentValue).replace('%',''));
                if (!isNaN(percent) && percent < 30) errors.push('Equity percent below margin call threshold');
              }
              if (errors.length > 0) {
                alert('Validation failed:\n' + errors.join('\n'));
              } else {
                alert('Thesis is valid!');
              }
            }}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </div>
  );
}
