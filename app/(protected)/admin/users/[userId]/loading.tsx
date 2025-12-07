export default function AdminUserDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* User Profile Skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow p-6 text-gray-100">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>

      {/* Subscription Card Skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow p-6 text-gray-100">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>

      {/* Billing History Skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow p-6 text-gray-100">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between py-3 border-b last:border-0">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Transaction Log Skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow p-6 text-gray-100">
        <div className="h-6 bg-gray-200 rounded w-36 mb-4"></div>
        {[1, 2].map((i) => (
          <div key={i} className="flex justify-between py-3 border-b last:border-0 border-gray-800">
            <div className="h-4 bg-gray-700 rounded w-48"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
