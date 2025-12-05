'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePortfolios, usePortfolioById, useStocks, Portfolio, Stock } from '@lib/hooks/useDatabase';
import PortfolioSelector from '@/components/PortfolioSelector';
import PortfolioModal from '@/components/PortfolioModal';
import { getPortfolioTheme } from '@lib/utils/portfolioTheme';

interface StockFundamentals {
  symbol: string;
  name: string;
  price: number;
  pe?: number;
  eps?: number;
  marketCap?: number;
  dividend?: number;
  beta?: number;
  week52High?: number;
  week52Low?: number;
}

export default function FundamentalsPage() {
  const router = useRouter();

  // Portfolio state
    const { data: portfolios, isLoading: portfoliosLoading, refetch: refetchPortfolios } = usePortfolios();
  //const { portfolios, loading: portfoliosLoading, refetch: refetchPortfolios } = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const { data: selectedPortfolio, refetch: refetchPortfolio } = usePortfolioById(selectedPortfolioId);

  //const { portfolio, refetch: refetchPortfolio } = usePortfolioById(selectedPortfolioId);
  //const { stocks, loading: stocksLoading } = useStocks(selectedPortfolioId || undefined);
  const { data: stocks, isLoading: stocksLoading } = useStocks(selectedPortfolioId || undefined);

  // Fundamentals state
  const [fundamentals, setFundamentals] = useState<Record<string, StockFundamentals>>({});
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);

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

  // Fetch fundamentals when stocks change
  useEffect(() => {
    const fetchFundamentals = async () => {
      if (!stocks || stocks.length === 0) {
        setFundamentals({});
        return;
      }

      setLoadingFundamentals(true);

      const fundamentalsData: Record<string, StockFundamentals> = {};

      for (const stock of stocks) {
        try {
          const response = await fetch(`/api/fundamentals?ticker=${stock.symbol}`);

          if (response.ok) {
            const data = await response.json();
            const fundamentals = data.fundamentals || {};

            // Check if this is an ETF/Fund with no fundamental data
            const isETF = fundamentals.source === 'none' || 
                         fundamentals.description?.includes('not available') ||
                         fundamentals.description?.includes('ETF') ||
                         fundamentals.description?.includes('fund');

            // Helper to parse string or number values
            const parseValue = (val: any): number | undefined => {
              if (val === null || val === undefined) return undefined;
              const num = typeof val === 'string' ? parseFloat(val) : val;
              return isNaN(num) ? undefined : num;
            };

            fundamentalsData[stock.symbol] = {
              symbol: stock.symbol,
              name: stock.name || stock.symbol,
              price: stock.currentPrice || data.price || 0,
              pe: isETF ? undefined : parseValue(fundamentals.pe || fundamentals.peRatio || fundamentals.trailingPE),
              eps: isETF ? undefined : parseValue(fundamentals.eps || fundamentals.epsTrailing),
              marketCap: isETF ? undefined : parseValue(fundamentals.marketCap),
              dividend: parseValue(fundamentals.dividendYield || fundamentals.dividend),
              beta: parseValue(fundamentals.beta),
              week52High: parseValue(fundamentals.week52High || fundamentals.fiftyTwoWeekHigh),
              week52Low: parseValue(fundamentals.week52Low || fundamentals.fiftyTwoWeekLow),
            };
          } else {
            fundamentalsData[stock.symbol] = {
              symbol: stock.symbol,
              name: stock.name || stock.symbol,
              price: stock.currentPrice || 0,
            };
          }
        } catch (error) {
          console.error(`Error fetching fundamentals for ${stock.symbol}:`, error);
          fundamentalsData[stock.symbol] = {
            symbol: stock.symbol,
            name: stock.name || stock.symbol,
            price: stock.currentPrice || 0,
          };
        }
      }

      setFundamentals(fundamentalsData);
      setLoadingFundamentals(false);
    };

    fetchFundamentals();
  }, [stocks]);

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
            Create a portfolio to view fundamentals.
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
      {(loading || loadingFundamentals) && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading fundamentals...</p>
        </div>
      )}

      {/* Fundamentals Grid */}
      {!loading && !loadingFundamentals && stocks && stocks.length > 0 && (
        <div className="space-y-4">
          {stocks.map((stock: Stock) => {
            const data = fundamentals[stock.symbol];
            if (!data) return null;

            return (
              <div
                key={stock.id}
                onClick={() => router.push(`/stocks/${stock.symbol}`)}
                className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer transition-all hover:shadow-lg ${portfolioTheme.cardHover}`}
              >
                {/* Stock Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-xl font-bold text-gray-900 dark:text-gray-100 ${portfolioTheme.groupHoverText}`}>{data.symbol}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{data.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${data.price.toFixed(2)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{stock.shares} shares</p>
                    </div>
                  </div>
                </div>

                {/* Fundamentals Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">P/E Ratio</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {typeof data.pe === 'number' ? data.pe.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">EPS</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {typeof data.eps === 'number' ? `$${data.eps.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.marketCap !== undefined
                        ? `$${(data.marketCap / 1e9).toFixed(2)}B`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dividend Yield</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.dividend !== undefined ? `${(data.dividend * 100).toFixed(2)}%` : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Beta</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {typeof data.beta === 'number' ? data.beta.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">52W High</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.week52High !== undefined ? `$${data.week52High.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">52W Low</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.week52Low !== undefined ? `$${data.week52Low.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className={`bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${portfolioTheme.metricCardHover}`}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Position Value</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      ${(data.price * stock.shares).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !loadingFundamentals && (stocks || []).length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">No stocks available in this portfolio</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Add stocks to your portfolio to view fundamentals</p>
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
