'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';

interface AdminActionsPanelProps {
  user: Profile;
}

export default function AdminActionsPanel({ user }: AdminActionsPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const tiers = ['free', 'basic', 'premium'];
  const [selectedTier, setSelectedTier] = useState<string>(user.tier ?? tiers[0]);

  const handleAction = async (action: string, endpoint: string, body?: any) => {
    if (!confirm(`Are you sure you want to ${action}?`)) return;

    setLoading(true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action}`);
      }

      alert(`${action} successful`);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">Admin Actions</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleAction('sync subscription', `/api/admin/users/${user.id}/sync-subscription`)}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Sync Subscription
        </button>

        {user.subscription_status !== 'canceled' && (
          <button
            onClick={() => handleAction('cancel subscription', `/api/admin/users/${user.id}/cancel-subscription`)}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Cancel Subscription
          </button>
        )}

        <button
          onClick={() => {
            const days = prompt('Enter days to extend trial:', '7');
            if (days) {
              handleAction('extend trial', `/api/admin/users/${user.id}/extend-trial`, { days: parseInt(days) });
            }
          }}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Extend Trial
        </button>

        <div className="flex items-center gap-2">
          <label htmlFor="tier-select" className="sr-only">
            Change tier for user
          </label>
          <select
            id="tier-select"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            disabled={loading}
            className="bg-transparent border border-neutral-700 text-sm text-gray-100 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {tiers.map((t) => (
              <option key={t} value={t} className="text-black">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              if (selectedTier && selectedTier !== user.tier) {
                handleAction('change tier', `/api/admin/users/${user.id}/change-tier`, { newTier: selectedTier });
              }
            }}
            disabled={loading || selectedTier === user.tier}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
