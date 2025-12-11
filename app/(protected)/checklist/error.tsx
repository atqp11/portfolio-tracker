'use client';

/**
 * Error Boundary Component for Daily Checklist Page
 *
 * Provides a fallback UI when errors occur during:
 * - Server-side checklist data fetching
 * - Server Action mutations (toggle task, create, update, delete)
 * - Component rendering
 *
 * Features:
 * - User-friendly error messaging
 * - Retry functionality via reset()
 * - Navigation fallback to dashboard
 * - Development-only error digest display
 *
 * @param error - Error object with optional digest for tracking
 * @param reset - Function to attempt recovery by re-rendering the segment
 */
export default function ChecklistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 text-center mb-2">
          Failed to Load Checklist
        </h2>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
          {error.message || 'An unexpected error occurred while loading your checklist.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>

        {process.env.NODE_ENV === 'development' && error.digest && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500 text-center">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
