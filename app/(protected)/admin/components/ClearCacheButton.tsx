'use client';

import { useState } from 'react';

export default function ClearCacheButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  async function clearCache() {
    if (!confirm('Are you sure you want to clear the Redis cache?')) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/clear-cache', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to clear cache');
      const json = await res.json();
      setResult(json);
      alert('Cache cleared');
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={clearCache}
        disabled={loading}
        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? 'Clearing...' : 'Clear Cache'}
      </button>
      {result && (
        <div className="text-xs text-gray-300">Last: {new Date(result.timestamp).toLocaleString()}</div>
      )}
    </div>
  );
}
