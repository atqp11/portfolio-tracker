import React from 'react';
import type { RiskMetrics } from '@/lib/calculator';

interface RiskMetricsPanelProps {
  metrics: RiskMetrics | null;
  loading?: boolean;
  error?: string | null;
}

export default function RiskMetricsPanel({ metrics, loading, error }: RiskMetricsPanelProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg p-6 text-center shadow">
        <span className="text-blue-600 dark:text-blue-400 font-bold">Loading risk metrics...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-lg p-6 text-center shadow">
        <span className="text-red-600 dark:text-red-400 font-bold">Error: {error}</span>
      </div>
    );
  }
  if (!metrics) {
    return null;
  }
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Risk Analytics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <MetricCard label="Sharpe Ratio" value={metrics.sharpe} />
        <MetricCard label="Sortino Ratio" value={metrics.sortino} />
        <MetricCard label="Alpha" value={metrics.alpha} />
        <MetricCard label="Beta" value={metrics.beta} />
        <MetricCard label="Calmar Ratio" value={metrics.calmar} />
        <MetricCard label="Std Dev" value={metrics.stdDev} />
        <MetricCard label="Max Drawdown" value={metrics.maxDrawdown} format="percent" />
        <MetricCard label="Current Drawdown" value={metrics.currentDrawdown} format="percent" />
        <MetricCard label="R-Squared" value={metrics.rSquared} format="percent" />
      </div>
    </div>
  );
}

function MetricCard({ label, value, format }: { label: string; value: number | null; format?: 'percent' }) {
  let display = value === null || value === undefined ? '--' : value.toFixed(2);
  if (format === 'percent' && value !== null && value !== undefined) {
    display = (value * 100).toFixed(2) + '%';
  }
  return (
    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-600">
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</div>
      <div className="text-2xl font-mono text-gray-900 dark:text-gray-100">{display}</div>
    </div>
  );
}
