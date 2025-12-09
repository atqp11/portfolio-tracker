'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TierBadge from '@/components/shared/TierBadge';
import type { SubscriptionData } from '@lib/types/billing';
import { createPortalSession, syncMySubscription } from '../actions';

interface SubscriptionOverviewProps {
  subscriptionData: SubscriptionData;
}

export default function SubscriptionOverview({ subscriptionData }: SubscriptionOverviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleManageSubscription = async () => {
    setLoading(true);
    setError(null);
    try {
      const returnUrl = `${window.location.origin}/billing`;
      const result = await createPortalSession(returnUrl);
      
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      setError(error instanceof Error ? error.message : 'Failed to open billing portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSubscription = async () => {
    setSyncing(true);
    setError(null);
    try {
      await syncMySubscription();
      // Refresh the page to show updated data
      router.refresh();
    } catch (error) {
      console.error('Error syncing subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to sync subscription. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (date: string | number | null) => {
    if (!date) return '—';
    const dateObj = typeof date === 'string' ? new Date(date) : new Date(date * 1000);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number | null, currency: string = 'usd') => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const getStatusColor = (status: string | null) => {
    if (!status) return 'text-gray-500';
    const statusLower = status.toLowerCase();
    if (statusLower === 'active' || statusLower === 'trialing') return 'text-green-600 dark:text-green-400';
    if (statusLower === 'past_due' || statusLower === 'unpaid') return 'text-yellow-600 dark:text-yellow-400';
    if (statusLower === 'canceled' || statusLower === 'incomplete_expired') return 'text-red-600 dark:text-red-400';
    return 'text-gray-500';
  };

  const price = subscriptionData.subscription?.items[0]?.price;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Subscription</h2>
        {subscriptionData.hasSubscription && (
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm sm:text-base"
          >
            {loading ? 'Loading...' : 'Manage Subscription'}
          </button>
        )}
      </div>

      {/* Mismatch Warning - Prominent Red Card (shown if auto-sync failed or mismatch persists) */}
      {subscriptionData.hasMismatch && subscriptionData.mismatchDetails && (
        <div className="mb-6 p-6 bg-red-50 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 rounded-lg shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                Subscription Mismatch Detected
              </h3>
              {subscriptionData.syncAttempted && subscriptionData.syncError && (
                <div className="mb-3 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>Auto-sync failed:</strong> {subscriptionData.syncError}
                  </p>
                </div>
              )}
              {subscriptionData.syncAttempted && !subscriptionData.syncError && (
                <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/40 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Auto-sync attempted</strong> but mismatch persists. Please try manual sync or contact support.
                  </p>
                </div>
              )}
              <div className="text-sm text-red-700 dark:text-red-300 space-y-2 mb-4">
                {subscriptionData.mismatchDetails.statusMismatch && (
                  <div>
                    <strong>Status Mismatch:</strong> Database shows <strong>{subscriptionData.subscriptionStatus || 'unknown'}</strong>, 
                    but Stripe shows <strong>{subscriptionData.mismatchDetails.expectedStatus}</strong>
                  </div>
                )}
                {subscriptionData.mismatchDetails.tierMismatch && (
                  <div>
                    <strong>Tier Mismatch:</strong> Database shows <strong>{subscriptionData.tier}</strong>, 
                    but Stripe subscription indicates <strong>{subscriptionData.mismatchDetails.expectedTier}</strong>
                  </div>
                )}
                <p className="mt-2 font-medium">
                  This usually happens when a webhook fails. Please try syncing your subscription or contact support if the issue persists.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSyncSubscription}
                  disabled={syncing}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
                >
                  {syncing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    </span>
                  ) : (
                    'Sync Subscription Now'
                  )}
                </button>
                <a
                  href="mailto:support@portfoliotracker.com?subject=Subscription%20Sync%20Issue&body=Hi,%20I%20am%20experiencing%20a%20subscription%20sync%20issue.%20My%20account%20shows%20a%20mismatch%20between%20the%20database%20and%20Stripe.%20Please%20help%20me%20resolve%20this."
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg text-center"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* Current Tier */}
        <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Current Plan</span>
          <TierBadge tier={subscriptionData.tier} size="md" />
        </div>

        {/* Subscription Status */}
        {subscriptionData.hasSubscription && subscriptionData.subscription && (
          <>
            <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
              <span className={`text-xs sm:text-sm font-semibold ${getStatusColor(subscriptionData.subscription.status)}`}>
                {subscriptionData.subscription.status.charAt(0).toUpperCase() + 
                 subscriptionData.subscription.status.slice(1).replace('_', ' ')}
              </span>
            </div>

            {/* Price */}
            {price && (
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Price</span>
                <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                  {formatCurrency(price.amount, price.currency)} / {price.interval || 'month'}
                </span>
              </div>
            )}

            {/* Current Period */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 gap-1 sm:gap-0">
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Current Period</span>
              <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 text-right">
                {formatDate(subscriptionData.currentPeriodStart)} - {formatDate(subscriptionData.currentPeriodEnd)}
              </span>
            </div>

            {/* Trial End */}
            {subscriptionData.subscription.trial_end && (
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Trial Ends</span>
                <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(subscriptionData.subscription.trial_end)}
                </span>
              </div>
            )}

            {/* Cancellation Notice */}
            {subscriptionData.cancelAtPeriodEnd && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Subscription will cancel</strong> at the end of the current billing period ({formatDate(subscriptionData.currentPeriodEnd)}).
                  You'll continue to have access until then.
                </p>
              </div>
            )}
          </>
        )}

        {/* No Subscription */}
        {!subscriptionData.hasSubscription && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
              You're currently on the <strong>{subscriptionData.tier}</strong> plan.
            </p>
            <a
              href="/pricing"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Upgrade Plan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
