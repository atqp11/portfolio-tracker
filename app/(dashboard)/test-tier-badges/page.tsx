'use client';

import TierBadge from '@/components/shared/TierBadge';

/**
 * Test Page for Tier Badge Component
 *
 * Visual testing for all tier badge variations
 * Access at: /test-tier-badges
 */
export default function TestTierBadgesPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Tier Badge Component Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visual testing for all tier badge variations and sizes
        </p>
      </div>

      {/* Size Variations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Size Variations
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Small (sm)</p>
            <div className="flex gap-3">
              <TierBadge tier="free" size="sm" />
              <TierBadge tier="basic" size="sm" />
              <TierBadge tier="premium" size="sm" />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Medium (md) - Default</p>
            <div className="flex gap-3">
              <TierBadge tier="free" size="md" />
              <TierBadge tier="basic" size="md" />
              <TierBadge tier="premium" size="md" />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Large (lg)</p>
            <div className="flex gap-3">
              <TierBadge tier="free" size="lg" />
              <TierBadge tier="basic" size="lg" />
              <TierBadge tier="premium" size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Icon Variations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Icon Variations
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">With Icons (default)</p>
            <div className="flex gap-3">
              <TierBadge tier="free" showIcon={true} />
              <TierBadge tier="basic" showIcon={true} />
              <TierBadge tier="premium" showIcon={true} />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Without Icons</p>
            <div className="flex gap-3">
              <TierBadge tier="free" showIcon={false} />
              <TierBadge tier="basic" showIcon={false} />
              <TierBadge tier="premium" showIcon={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Clickable vs Non-Clickable */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Clickable vs Non-Clickable
        </h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Clickable (default) - Hover to see effect, links to /usage
            </p>
            <div className="flex gap-3">
              <TierBadge tier="free" clickable={true} />
              <TierBadge tier="basic" clickable={true} />
              <TierBadge tier="premium" clickable={true} />
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Non-Clickable</p>
            <div className="flex gap-3">
              <TierBadge tier="free" clickable={false} />
              <TierBadge tier="basic" clickable={false} />
              <TierBadge tier="premium" clickable={false} />
            </div>
          </div>
        </div>
      </div>

      {/* In Context Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          In Context Examples
        </h2>
        <div className="space-y-4">
          {/* User Card - Free */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
                J
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">John Doe</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">john@example.com</p>
              </div>
            </div>
            <TierBadge tier="free" size="sm" />
          </div>

          {/* User Card - Basic */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                S
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Sarah Smith</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">sarah@example.com</p>
              </div>
            </div>
            <TierBadge tier="basic" size="sm" />
          </div>

          {/* User Card - Premium */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
                M
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Mike Johnson</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">mike@example.com</p>
              </div>
            </div>
            <TierBadge tier="premium" size="sm" />
          </div>
        </div>
      </div>

      {/* Dark Mode Test */}
      <div className="bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Dark Mode Test
        </h2>
        <div className="flex gap-3">
          <TierBadge tier="free" />
          <TierBadge tier="basic" />
          <TierBadge tier="premium" />
        </div>
      </div>

      {/* All Combinations Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          All Combinations
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Tier
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Small
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Medium
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 dark:text-gray-100">
                  Large
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Free</td>
                <td className="px-4 py-3">
                  <TierBadge tier="free" size="sm" />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier="free" size="md" />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier="free" size="lg" />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Basic</td>
                <td className="px-4 py-3">
                  <TierBadge tier="basic" size="sm" />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier="basic" size="md" />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier="basic" size="lg" />
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">Premium</td>
                <td className="px-4 py-3">
                  <TierBadge tier="premium" size="sm" />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier="premium" size="md" />
                </td>
                <td className="px-4 py-3">
                  <TierBadge tier="premium" size="lg" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
          Usage Instructions
        </h3>
        <pre className="text-sm text-blue-800 dark:text-blue-300 bg-white dark:bg-gray-900 p-4 rounded overflow-x-auto">
{`import TierBadge from '@/components/shared/TierBadge';

// Basic usage (clickable, medium size, with icon)
<TierBadge tier="free" />

// Custom size
<TierBadge tier="basic" size="sm" />

// Without icon
<TierBadge tier="premium" showIcon={false} />

// Non-clickable
<TierBadge tier="free" clickable={false} />

// With custom className
<TierBadge tier="premium" className="shadow-lg" />`}
        </pre>
      </div>
    </div>
  );
}
