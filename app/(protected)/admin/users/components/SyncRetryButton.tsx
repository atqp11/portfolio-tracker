'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SyncRetryButtonProps {
  userId: string;
}

export default function SyncRetryButton({ userId }: SyncRetryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/sync-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to sync' }));
        alert(error.error?.message || error.message || 'Failed to sync subscription');
        return;
      }

      alert('Subscription synced successfully');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Syncing...' : 'Sync'}
    </button>
  );
}


