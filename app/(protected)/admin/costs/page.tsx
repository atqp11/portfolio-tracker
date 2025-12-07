'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TelemetryStats {
  period: { start: Date; end: Date };
  totalRequests: number;
  cacheHitRate: number;
  escalationRate: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalCostUsd: number;
  avgCostPerRequest: number;
  costByProvider: Record<string, number>;
  requestsByTaskType: Record<string, number>;
  avgConfidence: number;
  lowConfidenceCount: number;
}

interface TelemetryResponse {
  period: string;
  stats: TelemetryStats;
  warnings: string[];
  recentLogs: any[];
}

const COLORS = {
  groq: '#10b981',
  gemini: '#3b82f6',
  openai: '#f59e0b',
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
};

export default function CostTrackingDashboard() {
  const [period, setPeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [data, setData] = useState<TelemetryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/telemetry/ai?period=${period}`);
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Failed to fetch telemetry data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, period]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Failed to Load Data</h2>
            <p className="text-gray-600 dark:text-gray-400">Unable to fetch telemetry data. Please try again.</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { stats, warnings } = data;

  // Prepare chart data
  const costByProviderData = Object.entries(stats.costByProvider).map(([provider, cost]) => ({
    provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    cost: Number(cost.toFixed(4)),
    percentage: ((cost / stats.totalCostUsd) * 100).toFixed(1),
  }));

  const requestsByTypeData = Object.entries(stats.requestsByTaskType).map(([type, count]) => ({
    type: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count,
    percentage: ((count / stats.totalRequests) * 100).toFixed(1),
  }));

  const metricsData = [
    {
      name: 'Cache Hit Rate',
      value: stats.cacheHitRate * 100,
      target: 85,
      status: stats.cacheHitRate >= 0.85 ? 'success' : stats.cacheHitRate >= 0.80 ? 'warning' : 'danger',
    },
    {
      name: 'Escalation Rate',
      value: stats.escalationRate * 100,
      target: 10,
      status: stats.escalationRate <= 0.10 ? 'success' : stats.escalationRate <= 0.15 ? 'warning' : 'danger',
    },
    {
      name: 'Avg Confidence',
      value: stats.avgConfidence * 100,
      target: 85,
      status: stats.avgConfidence >= 0.85 ? 'success' : stats.avgConfidence >= 0.75 ? 'warning' : 'danger',
    },
  ];

  const projectedMonthlyCost = (stats.totalCostUsd / getPeriodHours(period)) * 730; // 730 hours/month

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <a href="/admin" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 mb-4 inline-block">
          ← Back to Admin Dashboard
        </a>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">AI Cost Tracking Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time monitoring of AI usage, costs, and performance metrics
            </p>
          </div>
          <div className="flex gap-4">
            <div className="flex gap-2">
              {(['1h', '24h', '7d', '30d'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-lg transition ${
                    period === p
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded-lg transition ${
                autoRefresh
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-500 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <span className="text-2xl">⚠️</span>
              Performance Warnings
            </h3>
            <ul className="space-y-2">
              {warnings.map((warning, i) => (
                <li key={i} className="text-yellow-700 dark:text-yellow-300">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Requests"
            value={stats.totalRequests.toLocaleString()}
            subtitle={`${period.toUpperCase()} period`}
            icon="📊"
          />
          <MetricCard
            title="Total Cost"
            value={`$${stats.totalCostUsd.toFixed(4)}`}
            subtitle={`Projected: $${projectedMonthlyCost.toFixed(2)}/mo`}
            icon="💰"
            valueColor="text-green-400"
          />
          <MetricCard
            title="Avg Cost/Request"
            value={`$${stats.avgCostPerRequest.toFixed(6)}`}
            subtitle={stats.avgCostPerRequest < 0.05 ? 'Under target' : 'Above target'}
            icon="📈"
            valueColor={stats.avgCostPerRequest < 0.05 ? 'text-green-400' : 'text-yellow-400'}
          />
          <MetricCard
            title="Cache Hit Rate"
            value={`${(stats.cacheHitRate * 100).toFixed(1)}%`}
            subtitle={stats.cacheHitRate >= 0.85 ? 'Excellent' : stats.cacheHitRate >= 0.80 ? 'Good' : 'Needs improvement'}
            icon="⚡"
            valueColor={stats.cacheHitRate >= 0.85 ? 'text-green-400' : stats.cacheHitRate >= 0.80 ? 'text-yellow-400' : 'text-red-400'}
          />
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cost by Provider */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Cost by Provider</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={costByProviderData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ provider, percentage }) => `${provider}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="cost"
                >
                  {costByProviderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.provider.toLowerCase() as keyof typeof COLORS] || COLORS.primary} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toFixed(4)}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {costByProviderData.map((item) => (
                <div key={item.provider} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{item.provider}</span>
                  <span className="font-mono text-gray-900 dark:text-white">${item.cost.toFixed(4)} ({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Requests by Task Type */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Requests by Task Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={requestsByTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="type" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  formatter={(value: number) => value.toLocaleString()}
                />
                <Bar dataKey="count" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {metricsData.map((metric) => (
            <div key={metric.name} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
              <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">{metric.name}</h4>
              <div className="flex items-end justify-between mb-4">
                <span className={`text-3xl font-bold ${
                  metric.status === 'success' ? 'text-green-400' :
                  metric.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metric.value.toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-500">Target: {metric.target}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    metric.status === 'success' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(metric.value, 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* Latency Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <LatencyCard
            title="Average Latency"
            value={stats.avgLatencyMs}
            target={1500}
            unit="ms"
          />
          <LatencyCard
            title="P50 Latency"
            value={stats.p50LatencyMs}
            target={1500}
            unit="ms"
          />
          <LatencyCard
            title="P95 Latency"
            value={stats.p95LatencyMs}
            target={4000}
            unit="ms"
          />
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Cost Efficiency</h3>
            <div className="space-y-4">
              <MetricRow
                label="Requests Served"
                value={stats.totalRequests.toLocaleString()}
              />
              <MetricRow
                label="Cache Hits"
                value={Math.round(stats.totalRequests * stats.cacheHitRate).toLocaleString()}
                valueColor="text-green-400"
              />
              <MetricRow
                label="API Calls (Fresh)"
                value={Math.round(stats.totalRequests * (1 - stats.cacheHitRate)).toLocaleString()}
                valueColor="text-yellow-400"
              />
              <MetricRow
                label="Escalations"
                value={Math.round(stats.totalRequests * stats.escalationRate).toLocaleString()}
                valueColor="text-orange-400"
              />
              <MetricRow
                label="Cost Savings (Cache)"
                value={`$${(stats.totalCostUsd / (1 - stats.cacheHitRate) - stats.totalCostUsd).toFixed(4)}`}
                valueColor="text-green-400"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Quality Metrics</h3>
            <div className="space-y-4">
              <MetricRow
                label="Average Confidence"
                value={`${(stats.avgConfidence * 100).toFixed(1)}%`}
                valueColor={stats.avgConfidence >= 0.85 ? 'text-green-400' : 'text-yellow-400'}
              />
              <MetricRow
                label="Low Confidence Responses"
                value={stats.lowConfidenceCount.toLocaleString()}
                valueColor="text-red-400"
              />
              <MetricRow
                label="Low Confidence Rate"
                value={`${((stats.lowConfidenceCount / stats.totalRequests) * 100).toFixed(2)}%`}
                valueColor={(stats.lowConfidenceCount / stats.totalRequests) < 0.05 ? 'text-green-400' : 'text-red-400'}
              />
              <MetricRow
                label="Escalation Rate"
                value={`${(stats.escalationRate * 100).toFixed(1)}%`}
                valueColor={stats.escalationRate <= 0.10 ? 'text-green-400' : 'text-yellow-400'}
              />
            </div>
          </div>
        </div>

        {/* Projected Costs */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Cost Projections</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <ProjectionCard
              period="Daily"
              cost={(stats.totalCostUsd / getPeriodHours(period)) * 24}
            />
            <ProjectionCard
              period="Weekly"
              cost={(stats.totalCostUsd / getPeriodHours(period)) * 168}
            />
            <ProjectionCard
              period="Monthly"
              cost={projectedMonthlyCost}
              target={60}
            />
            <ProjectionCard
              period="Annual"
              cost={projectedMonthlyCost * 12}
              target={720}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, valueColor = 'text-gray-900 dark:text-white' }: {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm text-gray-600 dark:text-gray-400">{title}</h3>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
    </div>
  );
}

function LatencyCard({ title, value, target, unit }: {
  title: string;
  value: number;
  target: number;
  unit: string;
}) {
  const percentage = (value / target) * 100;
  const status = value <= target ? 'success' : value <= target * 1.5 ? 'warning' : 'danger';

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
      <h4 className="text-sm text-gray-600 dark:text-gray-400 mb-2">{title}</h4>
      <div className="flex items-end justify-between mb-4">
        <span className={`text-3xl font-bold ${
          status === 'success' ? 'text-green-600 dark:text-green-400' :
          status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {value.toFixed(0)}{unit}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-500">Target: {target}{unit}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            status === 'success' ? 'bg-green-500' :
            status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}

function MetricRow({ label, value, valueColor = 'text-gray-900 dark:text-white' }: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-mono font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

function ProjectionCard({ period, cost, target }: {
  period: string;
  cost: number;
  target?: number;
}) {
  const withinTarget = target ? cost <= target : true;

  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{period}</p>
      <p className={`text-2xl font-bold ${withinTarget ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        ${cost.toFixed(2)}
      </p>
      {target && (
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Target: ${target.toFixed(2)}
        </p>
      )}
    </div>
  );
}

function getPeriodHours(period: string): number {
  switch (period) {
    case '1h': return 1;
    case '24h': return 24;
    case '7d': return 168;
    case '30d': return 720;
    default: return 24;
  }
}
