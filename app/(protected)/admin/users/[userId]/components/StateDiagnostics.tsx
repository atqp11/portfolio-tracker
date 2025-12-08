'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';

interface TransactionData {
  id: string;
  eventType: string;
  status: string;
  createdIso: string | null;
}

interface StateDiagnosticsProps {
  user: Profile;
  transactions: TransactionData[];
}

interface StripeStatus {
  status: string | null;
  lastSync: string | null;
}

export default function StateDiagnostics({ user, transactions }: StateDiagnosticsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Fetch Stripe subscription status
  useEffect(() => {
    const fetchStripeStatus = async () => {
      if (!user.stripe_subscription_id) {
        setLoadingStatus(false);
        return;
      }

      try {
        const response = await fetch(`/api/admin/users/${user.id}/stripe-status`);
        if (response.ok) {
          const data = await response.json();
          setStripeStatus(data);
        }
      } catch (error) {
        console.error('Error fetching Stripe status:', error);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchStripeStatus();
  }, [user.id, user.stripe_subscription_id]);

  // Get last webhook event
  const lastWebhook = transactions.length > 0 
    ? transactions.sort((a, b) => {
        const aTime = a.createdIso ? new Date(a.createdIso).getTime() : 0;
        const bTime = b.createdIso ? new Date(b.createdIso).getTime() : 0;
        return bTime - aTime;
      })[0]
    : null;

  // Check for mismatch
  const dbStatus = user.subscription_status || 'unknown';
  const stripeStatusValue = stripeStatus?.status || 'unknown';
  const hasMismatch = stripeStatus && stripeStatus.status && stripeStatus.status !== dbStatus;

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}/sync-subscription`, {
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
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">State Diagnostics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Stripe Status:</div>
          <div className="text-gray-900 dark:text-white font-medium capitalize">
            {loadingStatus ? 'Loading...' : (stripeStatusValue || 'N/A')}
          </div>
        </div>
        
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">DB Status:</div>
          <div className="text-gray-900 dark:text-white font-medium capitalize">
            {dbStatus || 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Webhook Received:</div>
          <div className="text-gray-900 dark:text-white text-sm">
            {lastWebhook?.createdIso 
              ? new Date(lastWebhook.createdIso).toLocaleString()
              : 'Never'}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Sync:</div>
          <div className="text-gray-900 dark:text-white text-sm">
            {stripeStatus?.lastSync 
              ? new Date(stripeStatus.lastSync).toLocaleString()
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Mismatch Detection */}
      {hasMismatch && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-red-500 text-xl">⚠️</span>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                Possible Mismatch Detected
              </h3>
              <div className="text-sm text-red-700 dark:text-red-300 space-y-1">
                <div>Stripe says: <strong>{stripeStatus.status}</strong></div>
                <div>DB says: <strong>{dbStatus}</strong></div>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleSync}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                >
                  {loading ? 'Syncing...' : 'Run Sync Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasMismatch && stripeStatus && (
        <div className="mt-4">
          <span className="px-2 py-1 rounded text-xs bg-green-500 text-white">
            No Mismatch Detected
          </span>
        </div>
      )}
    </div>
  );
}

