'use client';

import { useState } from 'react';

interface ClearCacheResponse {
  success: boolean;
  timestamp: string;
  message: string;
  stats?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
}

interface ClearCacheError {
  success: false;
  error: string;
  message: string;
}

type ClearCacheResult = ClearCacheResponse | ClearCacheError;

export default function ClearCacheButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClearCacheResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function clearCache() {
    if (!confirm('Are you sure you want to clear the Redis cache?')) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/clear-cache', { method: 'POST' });
      const json = await res.json();
      
      if (!res.ok) {
        setError(json.message || json.error || 'Failed to clear cache');
        return;
      }
      
      setResult(json);
      alert('Cache cleared successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear cache';
      console.error('Clear cache error:', err);
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-2">
        <button
          onClick={clearCache}
          disabled={loading}
          className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Clearing...' : 'Clear Cache'}
        </button>
        {result && result.success && (
          <div className="text-xs text-gray-600 dark:text-gray-300">
            Last cleared: {new Date(result.timestamp).toLocaleString()}
          </div>
        )}
      </div>
      
      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
          {error}
        </div>
      )}
      
      {result && result.success && result.stats && (
        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-3 py-2">
          ✓ {result.message}
        </div>
      )}
    </div>
  );
}
