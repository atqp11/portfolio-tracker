export default function BillingLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse">
        {/* Header */}
        <div className="mb-8">
          <div className="h-8 sm:h-9 bg-gray-200 dark:bg-gray-800 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full sm:w-96"></div>
        </div>

        <div className="space-y-6">
          {/* Subscription Overview Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full sm:w-48"></div>
            </div>

            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing History Skeleton */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
            
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <div className="min-w-full">
                  {/* Table Header */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-t-lg">
                    <div className="grid grid-cols-5 gap-4 px-6 py-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-3 bg-gray-200 dark:bg-gray-800 rounded"></div>
                      ))}
                    </div>
                  </div>
                  {/* Table Rows */}
                  {[1, 2, 3].map((row) => (
                    <div key={row} className="grid grid-cols-5 gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-4">
                {[1, 2, 3].map((card) => (
                  <div key={card} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="flex justify-between items-center">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
