/**
 * Loading Skeleton Component for Risk Metrics Test Page
 *
 * Displays an animated placeholder UI while:
 * - Fetching portfolio stock data from the server
 * - Loading portfolio information
 * - Waiting for risk calculation server actions
 *
 * Provides visual feedback to improve perceived performance
 * and maintain layout stability during data loading.
 */
export default function RiskMetricsLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header Skeleton */}
        <div className="h-9 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse mb-6" />

        {/* Button Skeleton */}
        <div className="h-10 w-56 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mb-6" />

        {/* Risk Metrics Panel Skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 space-y-6">
          {/* Panel Header */}
          <div className="flex items-center justify-between">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-5 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Additional Metrics */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>

        {/* Debug Info Skeleton */}
        <div className="mt-8 space-y-2">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
