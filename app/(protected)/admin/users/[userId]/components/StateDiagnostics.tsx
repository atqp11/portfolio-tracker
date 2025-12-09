'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import { syncSubscription } from '../actions';

interface TransactionData {
  id: string;
  eventType: string;
  status: string;
  createdIso: string | null;
}

interface StripeStatus {
  status: string | null;
  tier: string | null;
  lastSync: string | null;
  hasMismatch?: boolean;
  mismatchDetails?: {
    statusMismatch?: boolean;
    tierMismatch?: boolean;
    expectedTier?: string;
    expectedStatus?: string;
  };
}

interface StateDiagnosticsProps {
  user: Profile;
  transactions: TransactionData[];
  stripeStatus: StripeStatus;
}

export default function StateDiagnostics({ user, transactions, stripeStatus: initialStripeStatus }: StateDiagnosticsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Get last webhook event
  const lastWebhook = transactions.length > 0 
    ? transactions.sort((a, b) => {
        const aTime = a.createdIso ? new Date(a.createdIso).getTime() : 0;
        const bTime = b.createdIso ? new Date(b.createdIso).getTime() : 0;
        return bTime - aTime;
      })[0]
    : null;

  // Check for mismatch (use mismatch info from service if available, otherwise check manually)
  const dbStatus = user.subscription_status || 'unknown';
  const dbTier = user.tier || 'unknown';
  const stripeStatusValue = initialStripeStatus?.status || 'unknown';
  const stripeTierValue = initialStripeStatus?.tier || 'unknown';
  
  // Use mismatch detection from service if available, otherwise fallback to manual check
  const hasMismatch = initialStripeStatus?.hasMismatch ?? 
    (initialStripeStatus && initialStripeStatus.status && initialStripeStatus.status !== dbStatus);
  
  const mismatchDetails = initialStripeStatus?.mismatchDetails;

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncSubscription(user.id);
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
            {stripeStatusValue || 'N/A'}
          </div>
        </div>
        
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">DB Status:</div>
          <div className="text-gray-900 dark:text-white font-medium capitalize">
            {dbStatus || 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Stripe Tier:</div>
          <div className="text-gray-900 dark:text-white font-medium capitalize">
            {stripeTierValue || 'N/A'}
          </div>
        </div>
        
        <div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">DB Tier:</div>
          <div className="text-gray-900 dark:text-white font-medium capitalize">
            {dbTier || 'N/A'}
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
            {initialStripeStatus?.lastSync 
              ? new Date(initialStripeStatus.lastSync).toLocaleString()
              : 'Never'}
          </div>
        </div>
      </div>

      {/* Mismatch Detection - Prominent Red Card */}
      {hasMismatch && (
        <div className="mt-6 p-6 bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded-lg shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-3">
                Subscription Mismatch Detected
              </h3>
              <div className="text-sm text-red-700 dark:text-red-300 space-y-2 mb-4">
                {mismatchDetails?.statusMismatch && (
                  <div>
                    <strong>Status Mismatch:</strong> Database shows <strong>{dbStatus}</strong>, 
                    but Stripe shows <strong>{mismatchDetails.expectedStatus || stripeStatusValue}</strong>
                  </div>
                )}
                {mismatchDetails?.tierMismatch && (
                  <div>
                    <strong>Tier Mismatch:</strong> Database shows <strong>{dbTier}</strong>, 
                    but Stripe subscription indicates <strong>{mismatchDetails.expectedTier || stripeTierValue}</strong>
                  </div>
                )}
                {!mismatchDetails && (
                  <>
                    <div>Stripe Status: <strong>{stripeStatusValue}</strong></div>
                    <div>DB Status: <strong>{dbStatus}</strong></div>
                  </>
                )}
                <p className="mt-2 font-medium">
                  This usually happens when a webhook fails. Click below to sync subscription status and tier.
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </span>
                ) : (
                  'Sync Subscription & Tier'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {!hasMismatch && initialStripeStatus && initialStripeStatus.status && (
        <div className="mt-4">
          <span className="px-2 py-1 rounded text-xs bg-green-500 text-white">
            No Mismatch Detected
          </span>
        </div>
      )}
    </div>
  );
}

