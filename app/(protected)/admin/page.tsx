'use client';

import Link from 'next/link';

export default function DashboardHome() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cost Tracking Dashboard */}
          <Link href="/admin/costs">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-indigo-500 transition cursor-pointer">
              <div className="text-4xl mb-4">💰</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Cost Tracking</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Monitor AI usage, costs, and performance metrics in real-time
              </p>
              <div className="mt-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                View Dashboard →
              </div>
            </div>
          </Link>

          {/* Waitlist Management */}
          <Link href="/admin/waitlist">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-indigo-500 transition cursor-pointer">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Waitlist</h2>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage waitlist signups
              </p>
              <div className="mt-4 text-indigo-600 dark:text-indigo-400 font-semibold">
                View Waitlist →
              </div>
            </div>
          </Link>

          {/* User & Billing Management */}
          <Link href="/admin/users">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 hover:border-indigo-500 transition cursor-pointer">
              <div className="text-4xl mb-4">👥</div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">User & Billing Management</h2>
              <p className="text-gray-600 dark:text-gray-400">Manage users, subscriptions, billing events, and webhook diagnostics.</p>
              <div className="mt-4 text-indigo-600 dark:text-indigo-400 font-semibold">Manage Users →</div>
            </div>
          </Link>

          {/* Analytics (Coming Soon) */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 opacity-50">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Analytics</h2>
            <p className="text-gray-600 dark:text-gray-400">
              User behavior, conversion rates, and business metrics
            </p>
            <div className="mt-4 text-gray-500 dark:text-gray-500 font-semibold">
              Coming Soon
            </div>
          </div>

          {/* System Health (Coming Soon) */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 opacity-50">
            <div className="text-4xl mb-4">🏥</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">System Health</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Database status, API health, and uptime monitoring
            </p>
            <div className="mt-4 text-gray-500 dark:text-gray-500 font-semibold">
              Coming Soon
            </div>
          </div>

          {/* API Keys (Coming Soon) */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 opacity-50">
            <div className="text-4xl mb-4">🔑</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">API Keys</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage API keys and provider configurations
            </p>
            <div className="mt-4 text-gray-500 dark:text-gray-500 font-semibold">
              Coming Soon
            </div>
          </div>

          {/* Settings */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 opacity-50">
            <div className="text-4xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Configure thresholds, alerts, and preferences
            </p>
            <div className="mt-4 text-gray-500 dark:text-gray-500 font-semibold">
              Coming Soon
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Quick Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="Active Users" value="0" subtitle="Last 24h" />
            <StatCard title="Total Requests" value="0" subtitle="Last 24h" />
            <StatCard title="Total Cost" value="$0.00" subtitle="Last 24h" />
            <StatCard title="Uptime" value="99.9%" subtitle="Last 30 days" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">{subtitle}</p>
    </div>
  );
}
