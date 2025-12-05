'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for debugging purposes
    console.error('Error in StockDetailPage:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-6">
      <h1 className="text-3xl font-bold text-red-700 mb-4">Something went wrong!</h1>
      <p className="text-red-600 mb-6 text-center">
        We encountered an issue while loading the stock details. Please try again.
      </p>
      <button
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
        onClick={() => reset()}
      >
        Retry
      </button>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-6 text-xs text-red-500 bg-red-100 p-3 rounded-lg max-w-lg overflow-x-auto">
          {error.message}
          <br />
          {error.stack}
        </pre>
      )}
    </div>
  );
}