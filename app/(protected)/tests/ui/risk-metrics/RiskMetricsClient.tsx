'use client';

import { useState, useTransition } from 'react';
import RiskMetricsPanel from '@/components/RiskMetricsPanel';
import { calculateRiskMetrics } from './actions';
import { getPortfolioTheme } from '@lib/utils/portfolioTheme';
import type { RiskMetrics } from '@lib/calculator';
import type { Stock } from '@lib/client/types';

interface RiskMetricsClientProps {
  initialStocks: Stock[];
  portfolioType: 'energy' | 'copper';
}

export default function RiskMetricsClient({
  initialStocks,
  portfolioType,
}: RiskMetricsClientProps) {
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const theme = getPortfolioTheme('test-portfolio-id', ['test-portfolio-id']);

  /**
   * Generate portfolio returns from stock data
   * In production, this should use historical price data
   */
  function getPortfolioReturns(stocks: Stock[]): number[] {
    if (!stocks || stocks.length === 0) return [];

    const currentValue = stocks.reduce(
      (sum, s) => sum + (s.currentPrice || s.avgPrice) * s.shares,
      0
    );
    const previousValue = stocks.reduce(
      (sum, s) => sum + (s.previousPrice || s.avgPrice) * s.shares,
      0
    );

    if (previousValue > 0) {
      return [(currentValue - previousValue) / previousValue];
    }

    return [];
  }

  /**
   * Generate market returns
   * In production, this should use actual market index data
   */
  function getMarketReturns(): number[] {
    // Placeholder - should fetch real market data
    return [0.01]; // 1% single-period return
  }

  const handleCalculate = async () => {
    setError(null);

    startTransition(async () => {
      try {
        const portfolioReturns = getPortfolioReturns(initialStocks);
        const marketReturns = getMarketReturns();

        if (portfolioReturns.length === 0 || marketReturns.length === 0) {
          throw new Error('Insufficient data to calculate returns');
        }

        const riskFreeRate = 0.045;

        const result = await calculateRiskMetrics({
          portfolioReturns,
          marketReturns,
          riskFreeRate,
        });

        setMetrics(result);
      } catch (err: any) {
        setError(err.message || 'Failed to calculate metrics');
        setMetrics(null);
      }
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          🧪 Risk Metrics Test Page
        </h1>

        <button
          onClick={handleCalculate}
          disabled={isPending}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold mb-6"
        >
          {isPending ? 'Calculating...' : 'Run Risk Metrics Test'}
        </button>

        <RiskMetricsPanel metrics={metrics} loading={isPending} error={error} theme={theme} />

        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <div>Portfolio Type: {portfolioType}</div>
          <div>Portfolio Returns: {JSON.stringify(getPortfolioReturns(initialStocks))}</div>
          <div>Market Returns: {JSON.stringify(getMarketReturns())}</div>
        </div>

        {isPending && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Calculating metrics...
          </div>
        )}
      </div>
    </div>
  );
}
