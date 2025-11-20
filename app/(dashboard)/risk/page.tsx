'use client';

import { useState, useEffect } from 'react';
import { usePortfolio, useStocks } from '@/lib/hooks/useDatabase';
import RiskMetricsPanel from '@/components/RiskMetricsPanel';
import type { RiskMetrics } from '@/lib/calculator';

export default function RiskPage() {
  const [portfolioType, setPortfolioType] = useState<'energy' | 'copper'>('energy');
  const { portfolio, loading: portfolioLoading } = usePortfolio(portfolioType);
  const { stocks, loading: stocksLoading } = useStocks(portfolio?.id);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const loading = portfolioLoading || stocksLoading;

  useEffect(() => {
    const fetchRiskMetrics = async () => {
      if (!stocks || stocks.length === 0 || !portfolio) {
        setRiskMetrics(null);
        return;
      }

      setMetricsLoading(true);
      setMetricsError(null);

      try {
        const historyResponse = await fetch(`/api/portfolio-history?portfolioId=${portfolio.id}`);

        if (!historyResponse.ok) {
          setMetricsError('Risk metrics require historical portfolio data. Please check back after your portfolio has been active for at least 30 days.');
          setRiskMetrics(null);
          setMetricsLoading(false);
          return;
        }

        const historyData = await historyResponse.json();

        if (!historyData.portfolioReturns || historyData.portfolioReturns.length < 30) {
          setMetricsError('Risk metrics require at least 30 days of portfolio history. Please check back later.');
          setRiskMetrics(null);
          setMetricsLoading(false);
          return;
        }

        const response = await fetch('/api/risk-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            portfolioReturns: historyData.portfolioReturns,
            marketReturns: historyData.marketReturns,
            riskFreeRate: 0.045,
            portfolioReturn: historyData.portfolioReturn,
            marketReturn: historyData.marketReturn,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to calculate risk metrics');
        }

        const data = await response.json();
        setRiskMetrics(data);
      } catch (error) {
        console.error('Error fetching risk metrics:', error);
        if (!metricsError) {
          setMetricsError(error instanceof Error ? error.message : 'Unknown error');
        }
      } finally {
        setMetricsLoading(false);
      }
    };

    fetchRiskMetrics();
  }, [stocks, portfolio]);

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setPortfolioType('energy')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            portfolioType === 'energy'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          Energy Portfolio
        </button>
        <button
          onClick={() => setPortfolioType('copper')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            portfolioType === 'copper'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
          }`}
        >
          Copper Portfolio
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading risk metrics...</p>
        </div>
      )}

      {/* Risk Metrics */}
      {!loading && stocks && stocks.length > 0 && (
        <div>
          <RiskMetricsPanel
            metrics={riskMetrics}
            loading={metricsLoading}
            error={metricsError}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && (!stocks || stocks.length === 0) && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">No stocks available for risk analysis</p>
        </div>
      )}
    </div>
  );
}
