'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminPanelError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error for debugging
    console.error('Admin panel error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
            Something went wrong in the Admin Panel
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
            We encountered an error. Please try again or contact support if the problem persists.
          </p>
          <button
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
            onClick={() => reset()}
          >
            Try again
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-4 text-xs text-red-600 dark:text-red-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-4 rounded max-w-lg overflow-auto">
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
