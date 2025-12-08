'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BillingError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for debugging
    console.error('Billing page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mb-2 text-center">
            Something went wrong loading your billing information
          </h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 text-center max-w-md">
            We encountered an error while loading your billing data. Please try again or contact support if the problem persists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              onClick={() => reset()}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium text-center"
            >
              Return to Dashboard
            </a>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-6 text-xs text-red-600 dark:text-red-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-4 rounded max-w-full overflow-auto w-full">
              {error.message}
              {error.stack && (
                <>
                  <br />
                  {error.stack}
                </>
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
