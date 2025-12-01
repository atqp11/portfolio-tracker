'use client';

import { useState, useEffect } from 'react';
import { usePortfolios, usePortfolioById, useStocks, usePortfolioMetrics, Stock, Portfolio, useCreatePortfolio, useUpdatePortfolio, useDeletePortfolio } from '@lib/hooks/useDatabase';
//import { useCreatePortfolio, useUpdatePortfolio, useDeletePortfolio } from '@/hooks/usePortfolios';
import PortfolioSelector from '@/components/PortfolioSelector';
import AddStockModal from '@/components/AddStockModal';
import EditStockModal from '@/components/EditStockModal';
import PortfolioModal from '@/components/PortfolioModal';
import PortfolioHeader from '@/components/PortfolioHeader';
import AssetCard from '@/components/AssetCard';
import RiskMetricsPanel from '@/components/RiskMetricsPanel';
import NewsCard from '@/components/NewsCard';
import StonksAI from '@/components/StonksAI/StonksAI';
import { fetchAndUpdateStockPrice } from '@lib/utils/priceUpdater';
import { getPortfolioTheme } from '@lib/utils/portfolioTheme';

export default function Home() {
  const { data: portfolios, isLoading: portfoliosLoading, refetch: refetchPortfolios} = usePortfolios();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const { data: selectedPortfolio, refetch: refetchPortfolio } = usePortfolioById(selectedPortfolioId);
  const { data: stocks, isLoading: stocksLoading } = useStocks(selectedPortfolioId || '');
  const metrics = usePortfolioMetrics(stocks, selectedPortfolio?.borrowedAmount || 0).data || {
    currentValue: 0,
    costBasis: 0,
    unrealizedPL: 0,
    unrealizedPLPercent: 0,
    equityValue: 0,
    equityPercent: 0,
    marginCallValue: 0,
  };

  // Modal state
  const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
  const [isEditStockModalOpen, setIsEditStockModalOpen] = useState(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<Stock | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

  // AI Sidebar state
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false);
  const [isAiInternalSidebarCollapsed, setIsAiInternalSidebarCollapsed] = useState(false);

  // Risk Metrics State
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskError, setRiskError] = useState<string | null>(null);

  // Price refresh state
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  // News state
  const [news, setNews] = useState<any[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  // Auto-select first portfolio on load
  useEffect(() => {
    if (!portfoliosLoading && portfolios.length > 0 && !selectedPortfolioId) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, portfoliosLoading, selectedPortfolioId]);

  // Fetch news when portfolio changes
  useEffect(() => {
    if (!selectedPortfolio) return;

    const fetchNews = async () => {
      setNewsLoading(true);
      setNewsError(null);

      try {
        // Use generic portfolio news endpoint for all portfolio types
        const endpoint = `/api/news/portfolio/${selectedPortfolioId}`;

        const response = await fetch(endpoint);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch news`);
        }

        const newsData = await response.json();

        // API may return either an array of articles or an object { success, data }
        // Normalize to an array to avoid runtime errors when rendering.
        let articles: any[] = [];
        if (Array.isArray(newsData)) {
          articles = newsData;
        } else if (newsData && Array.isArray(newsData.data)) {
          articles = newsData.data;
        } else if (newsData && Array.isArray(newsData.articles)) {
          // Some services return { articles: [...] }
          articles = newsData.articles;
        } else {
          console.warn('Unexpected news API response shape:', newsData);
        }

        setNews(articles);
      } catch (err: any) {
        console.error('Error fetching news:', err);
        setNewsError(err.message || 'Failed to load news');
      } finally {
        setNewsLoading(false);
      }
    };

    fetchNews();
  }, [selectedPortfolio]);

  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const deletePortfolio = useDeletePortfolio();

  // Portfolio CRUD handlers
  const handleCreatePortfolio = async (portfolioData: Partial<Portfolio>) => {
    try {
      await createPortfolio.mutateAsync(portfolioData);
      setSelectedPortfolioId(portfolios?.[0]?.id || null);
    } catch (error) {
      console.error('Error creating portfolio:', error);
      alert(error instanceof Error ? error.message : 'Failed to create portfolio');
    }
  };

  const handleUpdatePortfolio = async (id: string, updates: Partial<Portfolio>) => {
    try {
      await updatePortfolio.mutateAsync({ id, updates });
    } catch (error) {
      console.error('Error updating portfolio:', error);
      alert(error instanceof Error ? error.message : 'Failed to update portfolio');
    }
  };

  const handleDeletePortfolio = async (portfolio: Portfolio) => {
    try {
      await deletePortfolio.mutateAsync(portfolio.id);
      setSelectedPortfolioId(portfolios?.[0]?.id || null);
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete portfolio');
    }
  };

  // Stock CRUD handlers
  const handleAddStock = async (stockData: Partial<Stock>) => {
    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add stock');
      }

      const newStock = await response.json();

      // Fetch current price and update the stock
      if (newStock.id && stockData.symbol && stockData.shares) {
        console.log(`Fetching price for ${stockData.symbol}...`);
        const priceResult = await fetchAndUpdateStockPrice(
          newStock.id,
          stockData.symbol,
          stockData.shares,
          true // Set previousPrice = currentPrice for initial day tracking
        );

        if (!priceResult.success) {
          console.warn(`Could not fetch price for ${stockData.symbol}:`, priceResult.error);
        }
      }
      // Refresh portfolio data so UI shows the newly added holding
      try {
        if (typeof refetchPortfolio === 'function') {
          await refetchPortfolio();
        }
      } catch (err) {
        console.warn('Failed to refetch portfolio after adding stock:', err);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      throw error;
    }
  };

  const handleUpdateStock = async (id: string, updates: Partial<Stock>) => {
    try {
      const response = await fetch('/api/stocks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update stock');
      }

      const updatedStock = await response.json();

      // If shares changed, refetch the price to update actualValue
      if (updates.shares && updatedStock.symbol) {
        console.log(`Refreshing price for ${updatedStock.symbol}...`);
        const priceResult = await fetchAndUpdateStockPrice(
          id,
          updatedStock.symbol,
          updates.shares,
          false // Don't update previousPrice when editing
        );

        if (!priceResult.success) {
          console.warn(`Could not refresh price for ${updatedStock.symbol}:`, priceResult.error);
        }
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      throw error;
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      const response = await fetch(`/api/stocks?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete stock');
      }
    } catch (error) {
      console.error('Error deleting stock:', error);
      throw error;
    }
  };

  // Refresh all stock prices
  const handleRefreshPrices = async () => {
    if (!stocks.length) return;

    setIsRefreshingPrices(true);
    console.log(`Refreshing prices for ${stocks.length} stocks...`);

    try {
      const refreshPromises = (stocks || []).map((stock: Stock) =>
        fetchAndUpdateStockPrice(stock.id, stock.symbol, stock.shares, false)
      );

      const results = await Promise.allSettled(refreshPromises);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`Price refresh complete: ${successful} successful, ${failed} failed`);
    } catch (error) {
      console.error('Error refreshing prices:', error);
    } finally {
      setIsRefreshingPrices(false);
    }
  };

  // Calculate day change
  const totalValue = (stocks || []).reduce((a: number, b: Stock) => a + (b.actualValue || 0), 0);
  const totalPreviousValue = (stocks || []).reduce((sum: number, stock: Stock) => {
    const prevPrice = stock.previousPrice ?? stock.currentPrice ?? 0;
    if (!prevPrice || isNaN(prevPrice)) return sum;
    return sum + (stock.shares * prevPrice);
  }, 0);
  const dayChange = totalValue - totalPreviousValue;
  const dayChangePercent = totalPreviousValue > 0 ? (dayChange / totalPreviousValue) * 100 : 0;

  // Get current portfolio tickers for AI Co-Pilot
  const currentPortfolioTickers = (stocks || []).map((stock: Stock) => stock.symbol);

  // Get portfolio theme
  const allPortfolioIds = (portfolios || []).map((p: Portfolio) => p.id);
  const portfolioTheme = selectedPortfolioId
    ? getPortfolioTheme(selectedPortfolioId, allPortfolioIds)
    : getPortfolioTheme('', []);

  if (portfoliosLoading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${portfolioTheme.containerHover}`}>
        <div className="text-xl text-gray-600 dark:text-gray-400">Loading portfolios...</div>
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <>
        <div className={`max-w-5xl mx-auto p-6 ${portfolioTheme.containerHover}`}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Welcome to Portfolio Tracker
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have any portfolios yet. Create your first portfolio to get started.
            </p>
            <button
              onClick={() => {
                setEditingPortfolio(null);
                setIsPortfolioModalOpen(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Create Your First Portfolio
            </button>
          </div>
        </div>

        {/* Portfolio Modal - needed for empty state too */}
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
      </>
    );
  }

  // Apply portfolioTheme to other relevant sections
  return (
    <div className={`dashboard-container ${portfolioTheme.containerHover}`}>
      <div className="max-w-5xl mx-auto">
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

        {/* Action Buttons */}
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setIsAddStockModalOpen(true)}
            disabled={!selectedPortfolioId}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Stock</span>
          </button>

          <button
            onClick={handleRefreshPrices}
            disabled={!selectedPortfolioId || !(stocks || []).length || isRefreshingPrices}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${isRefreshingPrices ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isRefreshingPrices ? 'Updating...' : 'Refresh Prices'}</span>
          </button>

          <button
            onClick={() => setIsAiSidebarOpen(!isAiSidebarOpen)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
              isAiSidebarOpen
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg'
                : 'bg-gradient-to-r from-purple-700 to-purple-800 dark:bg-gray-800 text-white dark:text-gray-100 hover:from-purple-500 hover:to-purple-600 dark:hover:bg-purple-600 dark:hover:text-white hover:shadow-purple-400/50 backdrop-blur-sm shadow-lg hover:shadow-xl hover:scale-105'
            }`}
            title="Toggle AI Co-Pilot"
          >
            <span className="text-xl">✨</span>
            <span>AI Co-Pilot</span>
          </button>
        </div>

        {/* Portfolio Header */}
        <PortfolioHeader
          accountValue={metrics.currentValue }
          dayChange={dayChange}
          dayChangePercent={dayChangePercent}
          unrealizedGainLoss={metrics.unrealizedPL }
          unrealizedGainLossPercent={metrics.unrealizedPLPercent}
          theme={portfolioTheme}
        />

        {/* Holdings - Asset Cards */}
        <div className="space-y-4 mb-6">
          {(stocks || []).length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-8 rounded-lg text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No stocks in this portfolio yet.
              </p>
              <button
                onClick={() => setIsAddStockModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Add Your First Stock
              </button>
            </div>
          ) : (
            stocks.map((stock: Stock) => {
              const isUnavailable = stock.currentPrice === null || isNaN(stock.currentPrice);
              const costBasis = stock.shares * stock.avgPrice;
              const currentPrice = isUnavailable ? null : stock.currentPrice;
              const previousPrice = isUnavailable ? null : (stock.previousPrice ?? stock.currentPrice);
              const priceChange = (currentPrice !== null && previousPrice !== null) ? currentPrice - previousPrice : null;
              const marketValue = isUnavailable ? null : stock.actualValue ?? null;
              const dayChangeValue = (isUnavailable || previousPrice === null || marketValue === null) ? null : marketValue - (stock.shares * previousPrice);
              const dayChangePercent = (isUnavailable || previousPrice === null || previousPrice === 0) ? null : (dayChangeValue! / (stock.shares * previousPrice)) * 100;
              const gainLoss = (isUnavailable || marketValue === null) ? null : marketValue - costBasis;
              const gainLossPercent = (isUnavailable || costBasis <= 0 || gainLoss === null) ? null : (gainLoss / costBasis) * 100;

              return (
                <AssetCard
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  type="Stock"
                  shares={stock.shares}
                  price={currentPrice ?? NaN}
                  priceChange={priceChange ?? NaN}
                  marketValue={marketValue ?? NaN}
                  dayChange={dayChangeValue ?? NaN}
                  dayChangePercent={dayChangePercent ?? NaN}
                  gainLoss={gainLoss ?? NaN}
                  gainLossPercent={gainLossPercent ?? NaN}
                  onEdit={() => {
                    setEditingStock(stock);
                    setIsEditStockModalOpen(true);
                  }}
                  theme={portfolioTheme}
                />
              );
            })
          )}
        </div>

        {/* Portfolio Metrics - Value Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Portfolio Value Card */}
          <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg ${portfolioTheme.metricCardHover}`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Portfolio Value</p>
            <p className={`text-xl font-bold ${metrics.unrealizedPL > 0.0001 ? 'text-green-600 dark:text-green-400' : metrics.unrealizedPL < -0.0001 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
              {metrics.currentValue > 0 ? `$${metrics.currentValue.toFixed(0)}` : 'N/A'}
            </p>
          </div>

          {/* Cost Basis Card */}
          <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg ${portfolioTheme.metricCardHover}`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Basis</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
              ${metrics.costBasis.toFixed(0)}
            </p>
          </div>

          {/* Unrealized P&L Card */}
          <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg ${portfolioTheme.metricCardHover}`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Unrealized P&L</p>
            {metrics.currentValue > 0 ? (
              <div>
                <p className={`text-xl font-bold ${metrics.unrealizedPL > 0.0001 ? 'text-green-600 dark:text-green-400' : metrics.unrealizedPL < -0.0001 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {metrics.unrealizedPL >= 0 ? '+' : ''}${metrics.unrealizedPL.toFixed(2)}
                </p>
                <p className={`text-xs mt-1 ${metrics.unrealizedPLPercent > 0.0001 ? 'text-green-600 dark:text-green-400' : metrics.unrealizedPLPercent < -0.0001 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                  ({metrics.unrealizedPLPercent >= 0 ? '+' : ''}{metrics.unrealizedPLPercent.toFixed(2)}%)
                </p>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">N/A</p>
            )}
          </div>

          {/* Target Value Card */}
          {selectedPortfolio && (
            <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg ${portfolioTheme.metricCardHover}`}>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Target Value</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                ${selectedPortfolio.targetValue.toLocaleString()}
              </p>
              {selectedPortfolio.borrowedAmount > 0 && (
                <p className="text-xs mt-1 text-orange-600 dark:text-orange-400">
                  Borrowed: ${selectedPortfolio.borrowedAmount.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* News Section - Show for all portfolios */}
      {selectedPortfolio && (
        <div className="max-w-5xl mx-auto mt-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedPortfolio.name} Market News
              </h2>
              {newsLoading && (
                <div className="text-sm text-gray-600 dark:text-gray-400">Loading news...</div>
              )}
            </div>

            {newsError && (
              <div className="text-red-600 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <strong>Error loading news:</strong> {newsError}
              </div>
            )}

            {!newsLoading && !newsError && news.length === 0 && (
              <div className="text-gray-600 dark:text-gray-400 text-center py-8">
                No news available at this time.
              </div>
            )}

            <div className="space-y-3">
              {(news || []).slice(0, 5).map((article, idx) => (
                <NewsCard key={idx} article={article} />
              ))}
            </div>

            {news.length > 5 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing 5 of {news.length} articles
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <AddStockModal
        isOpen={isAddStockModalOpen}
        portfolioId={selectedPortfolioId!}
        onClose={() => setIsAddStockModalOpen(false)}
        onAdd={handleAddStock}
      />

      <EditStockModal
        isOpen={isEditStockModalOpen}
        stock={editingStock}
        onClose={() => {
          setIsEditStockModalOpen(false);
          setEditingStock(null);
        }}
        onUpdate={handleUpdateStock}
        onDelete={handleDeleteStock}
      />

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

      {/* AI Co-Pilot Sidebar */}
      {isAiSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 transition-opacity animate-fadeIn"
            onClick={() => setIsAiSidebarOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-full sm:w-[90%] md:w-[600px] lg:w-[700px] xl:w-[800px] bg-white dark:bg-gray-950 z-50 shadow-2xl transform transition-transform duration-300 ease-in-out overflow-hidden animate-slideInRight">
            <button
              onClick={() => setIsAiSidebarOpen(false)}
              className="absolute top-4 right-4 z-[60] p-2 bg-gray-200 dark:bg-gray-800 hover:bg-red-600 rounded-lg transition border border-gray-300 dark:border-gray-700"
              title="Close AI Co-Pilot"
            >
              <svg className="w-6 h-6 text-gray-900 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {!isAiInternalSidebarCollapsed && selectedPortfolio && (
              <div className="absolute top-4 left-4 z-[60] px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-opacity duration-300">
                <span>📊</span>
                <span>{selectedPortfolio.name}</span>
              </div>
            )}
            <div className="h-full w-full">
              <StonksAI
                tickers={currentPortfolioTickers}
                onSidebarToggle={setIsAiInternalSidebarCollapsed}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
