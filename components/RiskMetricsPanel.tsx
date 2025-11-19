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
      <div className="bg-[#111111] border border-[#3B82F6]/20 rounded-lg p-6 text-center animate-fadeIn">
        <span className="text-[#3B82F6] font-bold">Loading risk metrics...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-[#111111] border border-[#EF4444]/20 rounded-lg p-6 text-center animate-fadeIn">
        <span className="text-[#EF4444] font-bold">Error: {error}</span>
      </div>
    );
  }
  if (!metrics) {
    return null;
  }
  return (
    <div className="bg-[#111111] border border-[#1A1A1A] rounded-lg p-6 animate-fadeIn">
      <h2 className="text-xl font-bold text-[#FAFAFA] mb-4">Risk Analytics</h2>
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
    <div className="bg-[#1A1A1A] rounded-lg p-4 text-center border border-[#27272A]">
      <div className="text-sm text-[#A1A1AA] mb-1">{label}</div>
      <div className="text-2xl font-mono text-[#FAFAFA]">{display}</div>
    </div>
  );
}
