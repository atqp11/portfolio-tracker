'use client';

import { useState, useEffect } from 'react';
import { Portfolio } from '@lib/hooks/useDatabase';

interface PortfolioModalProps {
  isOpen: boolean;
  portfolio: Portfolio | null; // null for create, populated for edit
  onClose: () => void;
  onCreate?: (portfolio: Partial<Portfolio>) => Promise<void>;
  onUpdate?: (id: string, updates: Partial<Portfolio>) => Promise<void>;
}

export default function PortfolioModal({
  isOpen,
  portfolio,
  onClose,
  onCreate,
  onUpdate,
}: PortfolioModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [borrowedAmount, setBorrowedAmount] = useState('');
  const [marginCallLevel, setMarginCallLevel] = useState('0.3');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!portfolio;

  // Populate form when portfolio changes
  useEffect(() => {
    if (portfolio) {
      setName(portfolio.name);
      setType(portfolio.type);
      setInitialValue(portfolio.initialValue.toString());
      setTargetValue(portfolio.targetValue.toString());
      setBorrowedAmount(portfolio.borrowedAmount.toString());
      setMarginCallLevel(portfolio.marginCallLevel.toString());
      setError(null);
    } else {
      // Reset for create mode
      setName('');
      setType('');
      setInitialValue('');
      setTargetValue('');
      setBorrowedAmount('0');
      setMarginCallLevel('0.3');
      setError(null);
    }
  }, [portfolio, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim() || !type.trim()) {
      setError('Name and type are required');
      return;
    }

    const initialValueNum = parseFloat(initialValue);
    const targetValueNum = parseFloat(targetValue);
    const borrowedAmountNum = parseFloat(borrowedAmount);
    const marginCallLevelNum = parseFloat(marginCallLevel);

    if (isNaN(initialValueNum) || initialValueNum <= 0) {
      setError('Initial value must be a positive number');
      return;
    }

    if (isNaN(targetValueNum) || targetValueNum <= 0) {
      setError('Target value must be a positive number');
      return;
    }

    if (isNaN(borrowedAmountNum) || borrowedAmountNum < 0) {
      setError('Borrowed amount must be a non-negative number');
      return;
    }

    if (isNaN(marginCallLevelNum) || marginCallLevelNum < 0 || marginCallLevelNum > 1) {
      setError('Margin call level must be between 0 and 1');
      return;
    }

    try {
      setIsSubmitting(true);

      const portfolioData = {
        name: name.trim(),
        type: type.trim(),
        initialValue: initialValueNum,
        targetValue: targetValueNum,
        borrowedAmount: borrowedAmountNum,
        marginCallLevel: marginCallLevelNum,
      };

      if (isEditMode && onUpdate && portfolio) {
        await onUpdate(portfolio.id, portfolioData);
      } else if (!isEditMode && onCreate) {
        await onCreate(portfolioData);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save portfolio');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="portfolio-modal-overlay"
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        data-testid="portfolio-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isEditMode ? 'Edit Portfolio' : 'Create New Portfolio'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Portfolio Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Energy Portfolio"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description *
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., Energy, Tech, Dividend"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Initial Value *
              </label>
              <input
                type="number"
                value={initialValue}
                onChange={(e) => setInitialValue(e.target.value)}
                placeholder="10000"
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Value *
              </label>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="15000"
                min="0.01"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Borrowed Amount
              </label>
              <input
                type="number"
                value={borrowedAmount}
                onChange={(e) => setBorrowedAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Margin Call Level
              </label>
              <input
                type="number"
                value={marginCallLevel}
                onChange={(e) => setMarginCallLevel(e.target.value)}
                placeholder="0.3"
                min="0"
                max="1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Value between 0 and 1 (e.g., 0.3 = 30%)</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
