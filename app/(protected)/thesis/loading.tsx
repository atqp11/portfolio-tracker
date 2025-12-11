/**
 * Loading Skeleton Component for Investment Thesis Page
 *
 * Displays an animated placeholder UI while:
 * - Fetching thesis data from the server
 * - Loading portfolio metrics and summary
 * - Waiting for server actions to complete
 *
 * Provides visual feedback to improve perceived performance
 * and maintain layout stability during data loading.
 */
export default function ThesisLoading() {
  return (
    <div className="space-y-6">
      {/* Portfolio Selector Skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Portfolio Summary Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
              <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
            </div>
          ))}
        </div>
      </div>

      {/* Thesis Cards Skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>

            {/* Metrics */}
            <div className="space-y-2">
              {[1, 2].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
