'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RetryButtonProps {
  eventId: string;
}

export default function RetryButton({ eventId }: RetryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/webhooks/${eventId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to retry' }));
        alert(error.error?.message || error.message || 'Failed to retry webhook');
        return;
      }

      const result = await response.json();
      if (result.success) {
        alert(`Retry successful (attempt ${result.retryCount})`);
      } else {
        alert(`Retry failed: ${result.error || 'Unknown error'}`);
      }
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRetry}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Retrying...' : 'Retry'}
    </button>
  );
}


