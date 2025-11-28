'use client';

import { useState, useEffect } from 'react';
import { getUsageStats, type TierName } from '@/lib/tiers';
import Link from 'next/link';

interface UsageStats {
  tier: TierName;
  usage: {
    daily: {
      chatQueries: { used: number; limit: number; remaining: number };
      portfolioAnalysis: { used: number; limit: number; remaining: number };
    };
    monthly: {
      secFilings: { used: number; limit: number; remaining: number };
    };
    periodStart: {
      daily: Date;
      monthly: Date;
    };
    periodEnd: {
      daily: Date;
      monthly: Date;
    };
  };
  percentages: {
    chatQueries: number;
    portfolioAnalysis: number;
    secFilings: number;
  };
  warnings: {
    chatQueries: boolean;
    portfolioAnalysis: boolean;
    secFilings: boolean;
  };
}

export default function UsagePage() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsageStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchUsageStats, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUsageStats() {
    try {
      const response = await fetch('/api/user/usage');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view your usage statistics.');
        } else {
          setError(data.error || 'Failed to load usage stats');
        }
        setLoading(false);
        return;
      }

      if (data.success) {
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error || 'Failed to load usage stats');
      }
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage stats');
      setLoading(false);
    }
  }

  const formatLimit = (limit: number) => {
    return limit === Infinity ? '∞' : (limit ?? 0).toString();
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTimeUntilReset = (endDate: Date) => {
    const now = new Date();
    const diff = new Date(endDate).getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading usage statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            Unable to Load Usage Stats
          </h2>
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Link
            href="/auth/signin"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const tierDisplayNames = {
    free: 'Free',
    basic: 'Basic',
    premium: 'Premium',
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Usage & Quotas
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Monitor your API usage and subscription limits
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Plan</p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {tierDisplayNames[stats.tier]}
            </p>
            {stats.tier !== 'premium' && (
              <Link
                href="/pricing"
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Upgrade →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Daily Quotas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Daily Quotas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resets in {getTimeUntilReset(stats.usage.periodEnd.daily)}
          </p>
        </div>

        {/* Chat Queries */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                AI Chat Queries
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ask questions about your investments
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {stats.usage.daily.chatQueries.used} / {formatLimit(stats.usage.daily.chatQueries.limit)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.usage.daily.chatQueries.remaining === Infinity
                  ? 'Unlimited'
                  : `${stats.usage.daily.chatQueries.remaining} remaining`}
              </p>
            </div>
          </div>
          {stats.usage.daily.chatQueries.limit !== Infinity && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(stats.percentages.chatQueries)}`}
                style={{ width: `${Math.min(100, stats.percentages.chatQueries)}%` }}
              />
            </div>
          )}
          {stats.warnings.chatQueries && (
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ You're approaching your daily limit
            </p>
          )}
        </div>

        {/* Portfolio Analysis */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                Portfolio Analysis
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate portfolio insights and recommendations
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {stats.usage.daily.portfolioAnalysis.used} / {formatLimit(stats.usage.daily.portfolioAnalysis.limit)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.usage.daily.portfolioAnalysis.remaining === Infinity
                  ? 'Unlimited'
                  : `${stats.usage.daily.portfolioAnalysis.remaining} remaining`}
              </p>
            </div>
          </div>
          {stats.usage.daily.portfolioAnalysis.limit !== Infinity && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(stats.percentages.portfolioAnalysis)}`}
                style={{ width: `${Math.min(100, stats.percentages.portfolioAnalysis)}%` }}
              />
            </div>
          )}
          {stats.warnings.portfolioAnalysis && (
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ You're approaching your daily limit
            </p>
          )}
        </div>
      </div>

      {/* Monthly Quotas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Monthly Quotas
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Resets in {getTimeUntilReset(stats.usage.periodEnd.monthly)}
          </p>
        </div>

        {/* SEC Filings */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">
                SEC Filing Access
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Access to 10-K, 10-Q, and other SEC documents
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {stats.usage.monthly.secFilings.used} / {formatLimit(stats.usage.monthly.secFilings.limit)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stats.usage.monthly.secFilings.remaining === Infinity
                  ? 'Unlimited'
                  : `${stats.usage.monthly.secFilings.remaining} remaining`}
              </p>
            </div>
          </div>
          {stats.usage.monthly.secFilings.limit !== Infinity && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getProgressColor(stats.percentages.secFilings)}`}
                style={{ width: `${Math.min(100, stats.percentages.secFilings)}%` }}
              />
            </div>
          )}
          {stats.warnings.secFilings && (
            <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ You're approaching your monthly limit
            </p>
          )}
        </div>
      </div>

      {/* Upgrade Prompt */}
      {(stats.warnings.chatQueries || stats.warnings.portfolioAnalysis || stats.warnings.secFilings) && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Need More Capacity?
          </h3>
          <p className="text-blue-800 dark:text-blue-300 mb-4">
            You're approaching your usage limits. Upgrade to a higher tier for more capacity and advanced features.
          </p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            View Pricing Plans
          </Link>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          How Usage Tracking Works
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Daily quotas reset at midnight UTC</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Monthly quotas reset on the 1st of each month</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Unused quota does not roll over to the next period</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Cached responses don't count against your quota</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
