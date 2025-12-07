export default function AdminUsersLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
      
      {/* Filter skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="h-10 bg-gray-200 rounded w-48"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
        <div className="h-10 bg-gray-200 rounded w-32"></div>
      </div>
      
      {/* Table skeleton */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow overflow-hidden">
        <div className="h-12 bg-gray-800 border-b border-gray-700"></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b">
            <div className="h-4 bg-gray-700 rounded w-48"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
            <div className="h-8 bg-gray-700 rounded w-20 ml-auto"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
