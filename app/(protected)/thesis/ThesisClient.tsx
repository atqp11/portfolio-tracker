'use client';

import { useState, useTransition } from 'react';
import ThesisCard from '@/components/ThesisCard';
import { validateThesis, updateThesis } from './actions';
import type { InvestmentThesis } from '@lib/types';

interface ThesisClientProps {
  initialPortfolio: 'energy' | 'copper';
  energyTheses: InvestmentThesis[];
  copperTheses: InvestmentThesis[];
  energyPortfolioData: any;
  copperPortfolioData: any;
}

export default function ThesisClient({
  initialPortfolio,
  energyTheses,
  copperTheses,
  energyPortfolioData,
  copperPortfolioData,
}: ThesisClientProps) {
  const [active, setActive] = useState<'energy' | 'copper'>(initialPortfolio);
  const [isPending, startTransition] = useTransition();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editThesis, setEditThesis] = useState<any | null>(null);

  const theses = active === 'energy' ? energyTheses : copperTheses;
  const portfolioData = active === 'energy' ? energyPortfolioData : copperPortfolioData;

  // Calculate display values
  const currentValue = portfolioData?.initialValue || 0;
  const marginUsed = portfolioData?.borrowedAmount || 0;
  const targetValue = portfolioData?.targetValue || (active === 'energy' ? 30000 : 15000);

  // Calculate equity percent (simplified - should ideally come from metrics)
  const equityPercent = currentValue > 0 ? ((currentValue - marginUsed) / currentValue) * 100 : 0;

  const handleValidate = async (id: string) => {
    startTransition(async () => {
      try {
        const result = await validateThesis(id);

        if (!result.valid) {
          alert('Validation failed:\n' + result.errors.join('\n'));
        } else {
          alert('Thesis is valid!');
        }
      } catch (error) {
        console.error('Validation error:', error);
        alert(error instanceof Error ? error.message : 'Validation failed');
      }
    });
  };

  const handleEdit = (id: string) => {
    const thesis = theses.find((t) => t.id === id);
    if (thesis) {
      setEditThesis({ ...thesis });
      setEditModalOpen(true);
    }
  };

  const handleEditField = (field: string, value: any) => {
    setEditThesis((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editThesis) return;

    startTransition(async () => {
      try {
        await updateThesis(editThesis.id, editThesis);
        setEditModalOpen(false);
      } catch (error) {
        console.error('Save error:', error);
        alert(error instanceof Error ? error.message : 'Failed to save changes');
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

      {/* Portfolio Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${currentValue.toFixed(0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Equity %</p>
            <p
              className={`text-xl font-bold ${
                equityPercent < 30
                  ? 'text-red-600 dark:text-red-400'
                  : equityPercent < 45
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {equityPercent.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Delever Target</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${targetValue.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Margin Used</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${marginUsed.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && editThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Edit Thesis</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Title</span>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={editThesis.title}
                  onChange={(e) => handleEditField('title', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Description</span>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={editThesis.description}
                  onChange={(e) => handleEditField('description', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">Rationale</span>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={editThesis.rationale}
                  onChange={(e) => handleEditField('rationale', e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Exit Criteria (target value)
                </span>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={editThesis.exitCriteria.targetValue}
                  onChange={(e) =>
                    handleEditField('exitCriteria', {
                      ...editThesis.exitCriteria,
                      targetValue: Number(e.target.value),
                    })
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded"
                onClick={() => setEditModalOpen(false)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={handleSave}
                disabled={isPending}
              >
                {isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thesis Cards */}
      {theses.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {theses.map((thesis) => (
            <ThesisCard
              key={thesis.id}
              thesis={thesis}
              onValidate={handleValidate}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No theses found for {active} portfolio.
          </p>
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Processing...
        </div>
      )}
    </div>
  );
}
