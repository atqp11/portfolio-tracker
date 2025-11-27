'use client';

import { useState } from 'react';
import { Portfolio } from '@/lib/hooks/useDatabase';

interface PortfolioSelectorProps {
  portfolios: Portfolio[];
  selectedPortfolioId: string | null;
  onSelect: (portfolioId: string) => void;
  onCreateNew: () => void;
  onEdit: (portfolio: Portfolio) => void;
  onDelete: (portfolio: Portfolio) => void;
}

export default function PortfolioSelector({
  portfolios,
  selectedPortfolioId,
  onSelect,
  onCreateNew,
  onEdit,
  onDelete,
}: PortfolioSelectorProps) {
  const [showActions, setShowActions] = useState<string | null>(null);

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Portfolio Tabs */}
        <div className="flex flex-wrap gap-2 flex-1">
          {portfolios.map(portfolio => (
            <div key={portfolio.id} className="relative">
              <button
                onClick={() => onSelect(portfolio.id)}
                className={`min-w-[120px] px-4 py-2 rounded-lg font-medium text-sm transition ${
                  selectedPortfolioId === portfolio.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                }`}
              >
                {portfolio.name}
              </button>

              {/* Actions dropdown toggle */}
              {selectedPortfolioId === portfolio.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(showActions === portfolio.id ? null : portfolio.id);
                  }}
                  className="absolute -top-1 -right-1 bg-blue-700 hover:bg-blue-800 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  title="Portfolio actions"
                >
                  ⋮
                </button>
              )}

              {/* Actions dropdown */}
              {showActions === portfolio.id && (
                <div className="absolute top-full right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-[150px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(portfolio);
                      setShowActions(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-t-lg"
                  >
                    Edit Portfolio
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete portfolio "${portfolio.name}"? This will delete all stocks and data.`)) {
                        onDelete(portfolio);
                      }
                      setShowActions(null);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-b-lg"
                  >
                    Delete Portfolio
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Create New Portfolio Button */}
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center gap-2"
        >
          <span>+</span>
          <span>New Portfolio</span>
        </button>
      </div>

      {/* Portfolio Info */}
      {selectedPortfolio && (
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{selectedPortfolio.type}</span> •
          Initial: ${(selectedPortfolio.initialValue || 0).toLocaleString()} •
          Target: ${(selectedPortfolio.targetValue || 0).toLocaleString()}
          {selectedPortfolio.borrowedAmount > 0 && (
            <> • Borrowed: ${selectedPortfolio.borrowedAmount.toLocaleString()}</>
          )}
        </div>
      )}
    </div>
  );
}
