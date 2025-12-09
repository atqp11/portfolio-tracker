export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-gray-950 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center mb-16">
          <div className="h-12 bg-gray-800 rounded-lg w-96 mx-auto mb-4 animate-pulse" />
          <div className="h-6 bg-gray-800 rounded-lg w-2/3 mx-auto animate-pulse" />
        </div>

        {/* Billing Toggle Skeleton */}
        <div className="flex justify-center mb-12">
          <div className="h-12 bg-gray-800 rounded-full w-64 animate-pulse" />
        </div>

        {/* Pricing Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-gray-900 border border-gray-800 p-8 animate-pulse"
            >
              <div className="h-6 bg-gray-800 rounded w-24 mx-auto mb-2" />
              <div className="h-4 bg-gray-800 rounded w-32 mx-auto mb-8" />
              <div className="h-16 bg-gray-800 rounded w-32 mx-auto mb-8" />
              <div className="h-12 bg-gray-800 rounded-lg w-full mb-8" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 bg-gray-800 rounded w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

