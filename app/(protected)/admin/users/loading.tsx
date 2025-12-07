export default function AdminUsersLoading() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-6"></div>
          
          {/* Stat cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
              </div>
            ))}
          </div>
          
          {/* Filter skeleton */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
            <div className="flex gap-4 mb-6">
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
            </div>
            
            {/* Table skeleton */}
            <div className="overflow-hidden">
              <div className="h-12 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700"></div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-20 ml-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
