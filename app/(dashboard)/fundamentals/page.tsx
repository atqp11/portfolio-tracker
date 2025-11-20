'use client';

import { useState, useEffect } from 'react';
import { usePortfolio, useStocks } from '@/lib/hooks/useDatabase';

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
  const [portfolioType, setPortfolioType] = useState<'energy' | 'copper'>('energy');
  const { portfolio, loading: portfolioLoading } = usePortfolio(portfolioType);
  const { stocks, loading: stocksLoading } = useStocks(portfolio?.id);
  const [fundamentals, setFundamentals] = useState<Record<string, StockFundamentals>>({});
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);

  const loading = portfolioLoading || stocksLoading;

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

            fundamentalsData[stock.symbol] = {
              symbol: stock.symbol,
              name: stock.name || stock.symbol,
              price: stock.currentPrice || data.price || 0,
              pe: fundamentals.pe || fundamentals.peRatio || fundamentals.trailingPE,
              eps: fundamentals.eps || fundamentals.epsTrailing,
              marketCap: fundamentals.marketCap,
              dividend: fundamentals.dividendYield || fundamentals.dividend,
              beta: fundamentals.beta,
              week52High: fundamentals.week52High || fundamentals.fiftyTwoWeekHigh,
              week52Low: fundamentals.week52Low || fundamentals.fiftyTwoWeekLow,
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
      {(loading || loadingFundamentals) && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading fundamentals...</p>
        </div>
      )}

      {/* Fundamentals Grid */}
      {!loading && !loadingFundamentals && stocks && stocks.length > 0 && (
        <div className="space-y-4">
          {stocks.map((stock) => {
            const data = fundamentals[stock.symbol];
            if (!data) return null;

            return (
              <div key={stock.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                {/* Stock Header */}
                <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{data.symbol}</h3>
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
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">P/E Ratio</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.pe !== undefined ? data.pe.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">EPS</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.eps !== undefined ? `$${data.eps.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Market Cap</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.marketCap !== undefined
                        ? `$${(data.marketCap / 1e9).toFixed(2)}B`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dividend Yield</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.dividend !== undefined ? `${(data.dividend * 100).toFixed(2)}%` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Beta</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.beta !== undefined ? data.beta.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">52W High</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.week52High !== undefined ? `$${data.week52High.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">52W Low</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {data.week52Low !== undefined ? `$${data.week52Low.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
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
      {!loading && !loadingFundamentals && (!stocks || stocks.length === 0) && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">No stocks available</p>
        </div>
      )}
    </div>
  );
}
