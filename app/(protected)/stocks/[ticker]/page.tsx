'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import FundamentalMetricCard from '@/components/FundamentalMetricCard';
import FinancialStatementTable from '@/components/FinancialStatementTable';
import Navigation from '@/components/Navigation';

interface FundamentalsMetrics {
  pe?: number | null;
  pb?: number | null;
  evToEbitda?: number | null;
  grahamNumber?: number | null;
  roe?: number | null;
  roic?: number | null;
  roa?: number | null;
  netMargin?: number | null;
  operatingMargin?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  marginOfSafety?: number | null;
  peIndicator?: 'undervalued' | 'fair' | 'overvalued' | null;
  pbIndicator?: 'undervalued' | 'fair' | 'overvalued' | null;
  evEbitdaIndicator?: 'undervalued' | 'fair' | 'overvalued' | null;
}

interface CompanyOverview {
  Name?: string;
  Symbol?: string;
  Description?: string;
  Exchange?: string;
  Sector?: string;
  Industry?: string;
  MarketCapitalization?: string;
  Beta?: string | number;
  '52WeekHigh'?: number | null;
  '52WeekLow'?: number | null;
  [key: string]: unknown;
}

interface FinancialReport {
  fiscalDateEnding?: string;
  reportedCurrency?: string;
  [key: string]: unknown;
}

interface FinancialStatementsData {
  annualReports?: FinancialReport[];
  quarterlyReports?: FinancialReport[];
}

interface FundamentalsData {
  ticker: string;
  price: number;
  fundamentals: Record<string, unknown>;
  metrics: FundamentalsMetrics;
  overview: CompanyOverview;
  income: FinancialStatementsData;
  balance: FinancialStatementsData;
  cashFlow: FinancialStatementsData;
  source: string;
  fetchedAt: string;
}

export default function StockDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = typeof params?.ticker === 'string' ? params.ticker : undefined;
  
  const [fundamentals, setFundamentals] = useState<FundamentalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to safely get a value from fundamentals object
  const getFundamentalValue = (key: string): string | number | null | undefined => {
    const value = fundamentals?.fundamentals?.[key];
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string' || typeof value === 'number') return value;
    return undefined;
  };

  // Helper to parse string or number values
  const parseValue = (val: string | number | null | undefined): number | undefined => {
    if (val === null || val === undefined) return undefined;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return isNaN(num) ? undefined : num;
  };

  useEffect(() => {
    if (!ticker) return;

    const fetchFundamentals = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fundamentals?ticker=${ticker.toUpperCase()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch fundamentals');
        }

        const data = await response.json();
        console.log('[Stock Detail] API Response:', data);
        console.log('[Stock Detail] Fundamentals:', data.fundamentals);
        console.log('[Stock Detail] TrailingPE:', data.fundamentals?.trailingPE);
        setFundamentals(data);
      } catch (err: unknown) {
        console.error('Error fetching fundamentals:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load fundamental data';
        setError(errorMessage);
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
            <h1 className="text-4xl font-bold text-[#FAFAFA]">{ticker?.toUpperCase() ?? 'Unknown'}</h1>
            {fundamentals && (
              <>
                <span className="text-2xl text-[#A1A1AA]">{(fundamentals.overview?.Name ?? ticker?.toUpperCase()) ?? 'Unknown'}</span>
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
              <p className="text-[#A1A1AA]">Loading fundamental data for {ticker?.toUpperCase() ?? 'stock'}...</p>
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
                      ${(parseFloat(fundamentals.overview?.MarketCapitalization ?? '0') / 1e9).toFixed(2)}B
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
                      {parseValue(fundamentals.overview?.['52WeekHigh']) !== undefined 
                        ? `$${parseValue(fundamentals.overview?.['52WeekHigh'])!.toFixed(2)}` 
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#71717A] text-sm mb-1">52W Low</div>
                    <div className="text-[#EF4444] font-semibold">
                      {parseValue(fundamentals.overview?.['52WeekLow']) !== undefined 
                        ? `$${parseValue(fundamentals.overview?.['52WeekLow'])!.toFixed(2)}` 
                        : 'N/A'}
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
                  value={parseValue(getFundamentalValue('trailingPE') ?? getFundamentalValue('pe')) ?? null}
                  indicator={fundamentals.metrics?.peIndicator}
                  description="Price-to-Earnings ratio. Lower is generally better for value investors."
                />
                <FundamentalMetricCard
                  name="P/B Ratio"
                  value={parseValue(getFundamentalValue('priceToBook') ?? getFundamentalValue('pb')) ?? null}
                  indicator={fundamentals.metrics?.pbIndicator}
                  description="Price-to-Book ratio. Below 1.0 suggests stock may be undervalued."
                />
                <FundamentalMetricCard
                  name="EV/EBITDA"
                  value={parseValue(getFundamentalValue('evToEbitda')) ?? null}
                  indicator={fundamentals.metrics?.evEbitdaIndicator}
                  description="Enterprise Value to EBITDA. Measures company value relative to earnings."
                />
                <FundamentalMetricCard
                  name="Graham Number"
                  value={parseValue(fundamentals.metrics?.grahamNumber) ?? null}
                  unit=""
                  description="Intrinsic value estimate using Benjamin Graham's formula."
                />

                {/* Profitability Metrics */}
                <FundamentalMetricCard
                  name="ROE"
                  value={(() => {
                    const val = parseValue(getFundamentalValue('returnOnEquity'));
                    return val !== undefined ? val * 100 : null;
                  })()}
                  unit="%"
                  description="Return on Equity. Measures profitability relative to shareholder equity."
                />
                <FundamentalMetricCard
                  name="ROIC"
                  value={(() => {
                    const val = parseValue(getFundamentalValue('roic'));
                    return val !== undefined ? val * 100 : null;
                  })()}
                  unit="%"
                  description="Return on Invested Capital. Warren Buffett's preferred metric."
                />
                <FundamentalMetricCard
                  name="ROA"
                  value={(() => {
                    const val = parseValue(getFundamentalValue('returnOnAssets'));
                    return val !== undefined ? val * 100 : null;
                  })()}
                  unit="%"
                  description="Return on Assets. Measures how efficiently company uses assets."
                />
                <FundamentalMetricCard
                  name="Net Margin"
                  value={(() => {
                    const val = parseValue(getFundamentalValue('profitMargins'));
                    return val !== undefined ? val * 100 : null;
                  })()}
                  unit="%"
                  description="Net profit margin. Higher margins indicate better profitability."
                />

                {/* Leverage & Liquidity */}
                <FundamentalMetricCard
                  name="Debt/Equity"
                  value={parseValue(getFundamentalValue('debtToEquity')) ?? null}
                  description="Debt-to-Equity ratio. Lower values indicate less financial risk."
                />
                <FundamentalMetricCard
                  name="Current Ratio"
                  value={parseValue(getFundamentalValue('currentRatio')) ?? null}
                  description="Current assets / Current liabilities. Above 1.5 is healthy."
                />
                
                {/* Value Investing */}
                <FundamentalMetricCard
                  name="Margin of Safety"
                  value={fundamentals.metrics?.marginOfSafety ?? null}
                  unit="%"
                  description="Difference between intrinsic value and current price. Higher is better."
                />
                <FundamentalMetricCard
                  name="Operating Margin"
                  value={(() => {
                    const val = parseValue(getFundamentalValue('operatingMargins'));
                    return val !== undefined ? val * 100 : null;
                  })()}
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
