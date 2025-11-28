'use client';

import { useState, useEffect } from 'react';
import { usePortfolios, usePortfolioById, useStocks, Portfolio } from '@/lib/hooks/useDatabase';
import PortfolioSelector from '@/components/PortfolioSelector';
import PortfolioModal from '@/components/PortfolioModal';
import RiskMetricsPanel from '@/components/RiskMetricsPanel';
import type { RiskMetrics } from '@/lib/calculator';
import { getPortfolioTheme } from '@/lib/utils/portfolioTheme';

export default function RiskPage() {
  // Portfolio state
  const { data: portfolios, isLoading: portfoliosLoading, refetch: refetchPortfolios} = usePortfolios();

//  const { portfolios, loading: portfoliosLoading, refetch: refetchPortfolios } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const { data: portfolio, refetch: refetchPortfolio } = usePortfolioById(selectedPortfolioId);
  const { data: stocks, isLoading: stocksLoading } = useStocks(selectedPortfolioId || '');

  // Risk metrics state
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Portfolio modal state
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  const loading = portfoliosLoading || stocksLoading;

  // Auto-select first portfolio
  useEffect(() => {
    if (!portfoliosLoading && portfolios.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, portfoliosLoading, selectedPortfolioId]);

  // Fetch risk metrics when stocks or portfolio changes
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

  // Get portfolio theme
  const allPortfolioIds = (portfolios || []).map((p: Portfolio) => p.id);
  const portfolioTheme = selectedPortfolioId
    ? getPortfolioTheme(selectedPortfolioId, allPortfolioIds)
    : getPortfolioTheme('', []);

  // Portfolio CRUD handlers
  const handleCreatePortfolio = async (portfolioData: Partial<Portfolio>) => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.error || 'Failed to create portfolio');
      }

      const result = await response.json();
      const newPortfolio = result.success ? result.data : result;
      await refetchPortfolios();
      setSelectedPortfolioId(newPortfolio.id);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert(error instanceof Error ? error.message : 'Failed to create portfolio');
    }
  };

  const handleUpdatePortfolio = async (id: string, updates: Partial<Portfolio>) => {
    try {
      const response = await fetch(`/api/portfolio?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.error || 'Failed to update portfolio');
      }

      await refetchPortfolios();
      await refetchPortfolio();
    } catch (error) {
      console.error('Error updating portfolio:', error);
      alert(error instanceof Error ? error.message : 'Failed to update portfolio');
    }
  };

  const handleDeletePortfolio = async (portfolio: Portfolio) => {
    try {
      const response = await fetch(`/api/portfolio?id=${portfolio.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete portfolio');
      }

      await refetchPortfolios();

      if (selectedPortfolioId === portfolio.id) {
        const remaining = portfolios.filter((p: Portfolio) => p.id !== portfolio.id);
        setSelectedPortfolioId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete portfolio');
    }
  };

  if (portfoliosLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading portfolios...</div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            No Portfolios Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create a portfolio to view risk analytics.
          </p>
          <button
            onClick={() => {
              setEditingPortfolio(null);
              setIsPortfolioModalOpen(true);
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Create Portfolio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      <PortfolioSelector
        portfolios={portfolios}
        selectedPortfolioId={selectedPortfolioId}
        onSelect={setSelectedPortfolioId}
        onCreateNew={() => {
          setEditingPortfolio(null);
          setIsPortfolioModalOpen(true);
        }}
        onEdit={(portfolio) => {
          setEditingPortfolio(portfolio);
          setIsPortfolioModalOpen(true);
        }}
        onDelete={handleDeletePortfolio}
      />

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
            theme={portfolioTheme}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && (!stocks || stocks.length === 0) && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">No stocks available for risk analysis</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Add stocks to your portfolio to view risk metrics</p>
        </div>
      )}

      {/* Portfolio Modal */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        portfolio={editingPortfolio}
        onClose={() => {
          setIsPortfolioModalOpen(false);
          setEditingPortfolio(null);
        }}
        onCreate={handleCreatePortfolio}
        onUpdate={handleUpdatePortfolio}
      />
    </div>
  );
}
