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
    <div className="flex flex-col items-center justify-center min-h-[50vh] bg-red-50 p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-red-700 mb-2">
        Something went wrong in the Admin Panel
      </h2>
      <p className="text-red-600 mb-4 text-center">
        We encountered an error. Please try again or contact support if the problem persists.
      </p>
      <button
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        onClick={() => reset()}
      >
        Try again
      </button>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 text-xs text-red-500 bg-red-100 p-2 rounded max-w-lg overflow-auto">
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
  );
}
