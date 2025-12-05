'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FundamentalMetricCard from '@/components/FundamentalMetricCard';
import FinancialStatementTable from '@/components/FinancialStatementTable';
import Navigation from '@/components/Navigation';

interface FundamentalsData {
  ticker: string;
  price: number;
  metrics: any;
  overview: any;
  income: any;
  balance: any;
  cashFlow: any;
  source: string;
  fetchedAt: string;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = params?.ticker as string;
  
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) return;

    const fetchFundamentals = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fundamentals?ticker=${ticker.toUpperCase()}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch fundamentals');
        }

        const data = await response.json();
        setFundamentals(data);
      } catch (err: any) {
        console.error('Error fetching fundamentals:', err);
        setError(err.message || 'Failed to load fundamental data');
      } finally {
        setLoading(false);
      }
    };

    fetchFundamentals();
  }, [ticker]);

  if (!ticker) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-[#EF4444]">Invalid ticker symbol</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-[#71717A] hover:text-[#A1A1AA] transition-colors mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Portfolio
          </button>

          <div className="flex items-baseline gap-4">
            <h1 className="text-4xl font-bold text-[#FAFAFA]">{ticker.toUpperCase()}</h1>
            {fundamentals && (
              <>
                <span className="text-2xl text-[#A1A1AA]">{fundamentals.overview?.Name || ticker.toUpperCase()}</span>
                <span className="text-lg text-[#3B82F6] font-mono">
                  {fundamentals.price != null ? `$${fundamentals.price.toFixed(2)}` : 'N/A'}
                </span>
              </>
            )}
          </div>

          {fundamentals && (
            <div className="flex gap-4 mt-2 text-sm text-[#71717A]">
              <span>{fundamentals.overview?.Exchange}</span>
              <span>•</span>
              <span>{fundamentals.overview?.Sector}</span>
              <span>•</span>
              <span>{fundamentals.overview?.Industry}</span>
              <span>•</span>
              <span className="text-[#A1A1AA]">
                Data source: {fundamentals.source === 'cache' ? '📦 Cached' : '🔍 Live'}
              </span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3B82F6] mb-4"></div>
              <p className="text-[#A1A1AA]">Loading fundamental data for {ticker.toUpperCase()}...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[#111111] border border-[#EF4444]/20 rounded-lg p-6 text-center">
            <div className="text-[#EF4444] text-lg mb-2">⚠️ Error Loading Data</div>
            <p className="text-[#A1A1AA]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Fundamentals Content */}
        {fundamentals && !loading && !error && (
          <div className="space-y-8">
            {/* Company Overview */}
            <section>
              <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Company Overview</h2>
              <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
                <p className="text-[#A1A1AA] leading-relaxed">
                  {fundamentals.overview?.Description || 'No description available'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#1A1A1A]">
                  <div>
                    <div className="text-[#71717A] text-sm mb-1">Market Cap</div>
                    <div className="text-[#FAFAFA] font-semibold">
                      ${(parseFloat(fundamentals.overview?.MarketCapitalization || 0) / 1e9).toFixed(2)}B
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71717A] text-sm mb-1">Beta</div>
                    <div className="text-[#FAFAFA] font-semibold">
                      {fundamentals.overview?.Beta || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71717A] text-sm mb-1">52W High</div>
                    <div className="text-[#10B981] font-semibold">
                      ${parseFloat(fundamentals.overview?.['52WeekHigh'] || 0).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71717A] text-sm mb-1">52W Low</div>
                    <div className="text-[#EF4444] font-semibold">
                      ${parseFloat(fundamentals.overview?.['52WeekLow'] || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Metrics Grid */}
            <section>
              <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Key Fundamental Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Valuation Metrics */}
                <FundamentalMetricCard
                  name="P/E Ratio"
                  value={fundamentals.metrics?.pe ?? "N/A"}
                  indicator={fundamentals.metrics?.peIndicator}
                  description="Price-to-Earnings ratio. Lower is generally better for value investors."
                />
                <FundamentalMetricCard
                  name="P/B Ratio"
                  value={fundamentals.metrics?.pb ?? "N/A"}
                  indicator={fundamentals.metrics?.pbIndicator}
                  description="Price-to-Book ratio. Below 1.0 suggests stock may be undervalued."
                />
                <FundamentalMetricCard
                  name="EV/EBITDA"
                  value={fundamentals.metrics?.evToEbitda ?? "N/A"}
                  indicator={fundamentals.metrics?.evEbitdaIndicator}
                  description="Enterprise Value to EBITDA. Measures company value relative to earnings."
                />
                <FundamentalMetricCard
                  name="Graham Number"
                  value={fundamentals.metrics?.grahamNumber ?? "N/A"}
                  unit=""
                  description="Intrinsic value estimate using Benjamin Graham's formula."
                />

                {/* Profitability Metrics */}
                <FundamentalMetricCard
                  name="ROE"
                  value={fundamentals.metrics?.roe ?? "N/A"}
                  unit="%"
                  description="Return on Equity. Measures profitability relative to shareholder equity."
                />
                <FundamentalMetricCard
                  name="ROIC"
                  value={fundamentals.metrics?.roic ?? "N/A"}
                  unit="%"
                  description="Return on Invested Capital. Warren Buffett's preferred metric."
                />
                <FundamentalMetricCard
                  name="ROA"
                  value={fundamentals.metrics?.roa ?? "N/A"}
                  unit="%"
                  description="Return on Assets. Measures how efficiently company uses assets."
                />
                <FundamentalMetricCard
                  name="Net Margin"
                  value={fundamentals.metrics?.netMargin ?? "N/A"}
                  unit="%"
                  description="Net profit margin. Higher margins indicate better profitability."
                />

                {/* Leverage & Liquidity */}
                <FundamentalMetricCard
                  name="Debt/Equity"
                  value={fundamentals.metrics?.debtToEquity ?? "N/A"}
                  description="Debt-to-Equity ratio. Lower values indicate less financial risk."
                />
                <FundamentalMetricCard
                  name="Current Ratio"
                  value={fundamentals.metrics?.currentRatio ?? "N/A"}
                  description="Current assets / Current liabilities. Above 1.5 is healthy."
                />
                
                {/* Value Investing */}
                <FundamentalMetricCard
                  name="Margin of Safety"
                  value={fundamentals.metrics?.marginOfSafety ?? "N/A"}
                  unit="%"
                  description="Difference between intrinsic value and current price. Higher is better."
                />
                <FundamentalMetricCard
                  name="Operating Margin"
                  value={fundamentals.metrics?.operatingMargin ?? "N/A"}
                  unit="%"
                  description="Operating profit margin. Indicates operational efficiency."
                />
              </div>
            </section>

            {/* Financial Statements */}
            <section>
              <h2 className="text-2xl font-bold text-[#FAFAFA] mb-4">Historical Financial Statements</h2>
              <FinancialStatementTable
                income={fundamentals.income?.annualReports || []}
                balance={fundamentals.balance?.annualReports || []}
                cashFlow={fundamentals.cashFlow?.annualReports || []}
              />
            </section>

            {/* Data Attribution */}
            <div className="text-center text-sm text-[#71717A] py-4">
              <p>
                Data provided by Alpha Vantage • Last updated: {new Date(fundamentals.fetchedAt).toLocaleString()}
              </p>
              <p className="mt-1">
                This is not investment advice. Always do your own research.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
