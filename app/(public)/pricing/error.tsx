'use client';

import { useEffect } from 'react';

export default function PricingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Pricing page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Something went wrong</h1>
        <p className="text-gray-400 mb-8">
          {error.message || 'An unexpected error occurred while loading the pricing page.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-3 border border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg font-semibold transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}

