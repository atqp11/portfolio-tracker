/**
 * Error Boundary for Usage Page
 *
 * Catches and displays errors that occur during:
 * - Server-side data fetching in page.tsx
 * - Server Action execution
 * - Component rendering
 *
 * Provides user-friendly error messages with retry functionality
 * and authentication redirects when needed.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function UsageError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Usage page error:', error);
  }, [error]);

  // Determine error type for better messaging
  const isAuthError = error.message.includes('Authentication') ||
                      error.message.includes('Unauthorized') ||
                      error.message.includes('401');

  if (isAuthError) {
    return (
      <div className="max-w-4xl">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
            Authentication Required
          </h2>
          <p className="text-red-700 dark:text-red-300 mb-4">
            Please sign in to view your usage statistics and quotas.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
          Unable to Load Usage Statistics
        </h2>
        <p className="text-red-700 dark:text-red-300 mb-4">
          {error.message || 'An unexpected error occurred while loading your usage data.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
