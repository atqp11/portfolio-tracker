/**
 * Loading Skeleton Component for Daily Checklist Page
 *
 * Displays an animated placeholder UI while:
 * - Fetching checklist data from the server
 * - Waiting for server actions to complete
 * - Loading portfolio information
 *
 * Provides visual feedback to improve perceived performance
 * and maintain layout stability during data loading.
 */
export default function ChecklistLoading() {
  return (
    <div className="space-y-6">
      {/* Portfolio Selector Skeleton */}
      <div className="flex gap-4">
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>

      {/* Checklist Card Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
        {/* Header */}
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />

        {/* Task items */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
