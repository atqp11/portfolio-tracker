export default function AdminUserDetailLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64"></div>

          {/* User Profile & Subscription Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-2/3"></div>
              </div>
            </div>
          </div>

          {/* Admin Actions Panel Skeleton */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-40 mb-4"></div>
            <div className="flex gap-2">
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
            </div>
          </div>

          {/* Billing History Skeleton */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-40 mb-4"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
              </div>
            ))}
          </div>

          {/* Transaction & Error Logs Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-36 mb-4"></div>
              {[1, 2].map((i) => (
                <div key={i} className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-800 last:border-0">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
              <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-36 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
