"use client";
import React, { useState, useEffect } from 'react';
import RiskMetricsPanel from '@/components/RiskMetricsPanel';
import type { RiskMetrics } from '@/lib/calculator';
import { usePortfolio, useStocks } from '@/lib/hooks/useDatabase';
import { getPortfolioTheme } from '@/lib/utils/portfolioTheme';


export default function TestRiskMetricsPage() {
  // For demo, use 'energy' portfolio type. You can make this dynamic if needed.
  const portfolioType: 'energy' | 'copper' = 'energy';
  const { portfolio, loading: portfolioLoading, error: portfolioError } = usePortfolio(portfolioType);
  const { stocks, loading: stocksLoading, error: stocksError } = useStocks(portfolio?.id);
  const [metrics, setMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simulate historical prices for demo (replace with real history if available)
  function getPortfolioReturns(stocks: any[]): number[] {
    // If you have historical prices, replace this logic
    // Here, we use currentPrice and previousPrice for a single-period return
    if (!stocks || stocks.length === 0) return [];
    const currentValue = stocks.reduce((sum, s) => sum + (s.currentPrice || s.avgPrice) * s.shares, 0);
    const previousValue = stocks.reduce((sum, s) => sum + (s.previousPrice || s.avgPrice) * s.shares, 0);
    if (previousValue > 0) {
      return [(currentValue - previousValue) / previousValue];
    }
    return [];
  }

  // Simulate market returns using commodity price (replace with real history if available)
  function getMarketReturns(): number[] {
    // For demo, use a static value or fetch from commodity API if available
    // Replace with real market time series if you have it
    return [0.01]; // 1% single-period return as placeholder
  }

  const riskFreeRate = 0.045;

  // Use default blue theme for test page
  const theme = getPortfolioTheme('test-portfolio-id', ['test-portfolio-id']);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      // Compute returns from real data
      const safeStocks = stocks.map(stock => ({
        ...stock,
        currentPrice: stock.currentPrice === null ? undefined : stock.currentPrice,
      }));
      const portfolioReturns = getPortfolioReturns(safeStocks);
      const marketReturns = getMarketReturns();
      if (portfolioReturns.length === 0 || marketReturns.length === 0) {
        throw new Error('Insufficient data to calculate returns');
      }
      const res = await fetch('/api/risk-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolioReturns, marketReturns, riskFreeRate }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-[#FAFAFA] mb-6">🧪 Risk Metrics Test Page</h1>
        <button
          onClick={fetchMetrics}
          disabled={loading || portfolioLoading || stocksLoading}
          className="px-6 py-2 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#1A1A1A] disabled:text-[#71717A] text-white rounded-lg transition-colors font-semibold mb-6"
        >
          {loading ? 'Calculating...' : 'Run Risk Metrics Test'}
        </button>
        {(portfolioLoading || stocksLoading) && (
          <div className="text-blue-400 mb-4">Loading portfolio data...</div>
        )}
        {portfolioError && <div className="text-red-400 mb-4">Portfolio error: {portfolioError}</div>}
        {stocksError && <div className="text-red-400 mb-4">Stocks error: {stocksError}</div>}
        <RiskMetricsPanel metrics={metrics} loading={loading} error={error} theme={theme} />
        <div className="mt-8 text-sm text-gray-400">
          <div>Portfolio Returns: {JSON.stringify(getPortfolioReturns(stocks))}</div>
          <div>Market Returns: {JSON.stringify(getMarketReturns())}</div>
        </div>
      </div>
    </div>
      )
    }
