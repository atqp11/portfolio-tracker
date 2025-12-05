'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TestFundamentalsPage() {
  const [ticker, setTicker] = useState('AAPL');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testTickers = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META', 'AMZN', 'XLE', 'COPX', 'FCX'];

  const testAPI = async (testTicker: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setTicker(testTicker);

    try {
      const res = await fetch(`/api/fundamentals?ticker=${testTicker}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResponse(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-[#FAFAFA] mb-8">
          🧪 Fundamental Metrics Test Page
        </h1>

        <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-[#FAFAFA] mb-4">Quick Test</h2>
          <p className="text-[#A1A1AA] mb-4">
            Click a ticker to test the Alpha Vantage API integration:
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {testTickers.map((t) => (
              <button
                key={t}
                onClick={() => testAPI(t)}
                disabled={loading}
                className="px-4 py-2 bg-[#3B82F6] hover:bg-[#2563EB] disabled:bg-[#1A1A1A] disabled:text-[#71717A] text-white rounded-lg transition-colors font-mono"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Enter ticker..."
              className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#1A1A1A] rounded-lg text-[#FAFAFA] focus:border-[#3B82F6] focus:outline-none"
            />
            <button
              onClick={() => testAPI(ticker)}
              disabled={loading || !ticker}
              className="px-6 py-2 bg-[#10B981] hover:bg-[#059669] disabled:bg-[#1A1A1A] disabled:text-[#71717A] text-white rounded-lg transition-colors font-semibold"
            >
              {loading ? 'Testing...' : 'Test API'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-[#111111] border border-[#3B82F6]/20 rounded-lg p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3B82F6] mb-4"></div>
            <p className="text-[#A1A1AA]">Fetching data for {ticker}...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[#111111] border border-[#EF4444]/20 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <div className="text-[#EF4444] text-2xl">⚠️</div>
              <div>
                <h3 className="text-[#EF4444] font-bold mb-2">Error</h3>
                <p className="text-[#A1A1AA]">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {response && !loading && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-[#111111] border border-[#10B981]/20 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-[#10B981] text-2xl">✅</div>
                <div>
                  <h3 className="text-[#10B981] font-bold">API Test Successful</h3>
                  <p className="text-[#71717A] text-sm">
                    Data source: {response.source} • Fetched at: {new Date(response.fetchedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[#71717A] text-xs mb-1">Ticker</div>
                  <div className="text-[#FAFAFA] font-bold text-lg">{response.ticker}</div>
                </div>
                <div>
                  <div className="text-[#71717A] text-xs mb-1">Price</div>
                  <div className="text-[#3B82F6] font-bold text-lg font-mono">${response.price?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[#71717A] text-xs mb-1">Company</div>
                  <div className="text-[#FAFAFA] font-semibold truncate">{response.overview?.Name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-[#71717A] text-xs mb-1">Sector</div>
                  <div className="text-[#FAFAFA] font-semibold truncate">{response.overview?.Sector || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Metrics Summary */}
            <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#FAFAFA] mb-4">Calculated Metrics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricDisplay label="P/E Ratio" value={response.metrics?.pe} indicator={response.metrics?.peIndicator} />
                <MetricDisplay label="P/B Ratio" value={response.metrics?.pb} indicator={response.metrics?.pbIndicator} />
                <MetricDisplay label="ROE" value={response.metrics?.roe} unit="%" />
                <MetricDisplay label="ROIC" value={response.metrics?.roic} unit="%" />
                <MetricDisplay label="ROA" value={response.metrics?.roa} unit="%" />
                <MetricDisplay label="Net Margin" value={response.metrics?.netMargin} unit="%" />
                <MetricDisplay label="Debt/Equity" value={response.metrics?.debtToEquity} />
                <MetricDisplay label="Graham #" value={response.metrics?.grahamNumber} unit="$" />
              </div>
            </div>

            {/* View Full Page */}
            <div className="bg-[#111111] border border-[#7C3AED]/20 rounded-lg p-6 text-center">
              <p className="text-[#A1A1AA] mb-4">Want to see the full fundamentals page with charts and financial statements?</p>
              <Link
                href={`/stocks/${response.ticker}`}
                className="inline-block px-6 py-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg transition-colors font-semibold"
              >
                View Full Fundamentals Page for {response.ticker}
              </Link>
            </div>

            {/* Raw Response */}
            <details className="bg-[#111111] border border-[#1A1A1A] rounded-lg">
              <summary className="p-4 cursor-pointer text-[#A1A1AA] hover:text-[#FAFAFA] font-mono text-sm">
                📋 View Raw API Response
              </summary>
              <pre className="p-4 text-xs text-[#71717A] overflow-x-auto border-t border-[#1A1A1A]">
                {JSON.stringify(response, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricDisplay({ label, value, unit = '', indicator }: any) {
  const getIndicatorColor = (ind: string) => {
    if (ind === 'undervalued') return 'text-[#10B981]';
    if (ind === 'overvalued') return 'text-[#EF4444]';
    if (ind === 'fair') return 'text-[#F59E0B]';
    return 'text-[#A1A1AA]';
  };

  const formatValue = (val: number | null): string => {
    if (val === null || val === undefined) return 'N/A';
    if (Math.abs(val) >= 1000) return val.toFixed(0);
    if (Math.abs(val) >= 10) return val.toFixed(1);
    return val.toFixed(2);
  };

  return (
    <div className="bg-[#0A0A0A] p-3 rounded border border-[#1A1A1A]">
      <div className="text-[#71717A] text-xs mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${indicator ? getIndicatorColor(indicator) : 'text-[#FAFAFA]'}`}>
        {value !== null ? `${unit === '$' ? unit : ''}${formatValue(value)}${unit !== '$' ? unit : ''}` : 'N/A'}
      </div>
      {indicator && (
        <div className="text-xs text-[#71717A] mt-1 capitalize">{indicator}</div>
      )}
    </div>
  );
}
