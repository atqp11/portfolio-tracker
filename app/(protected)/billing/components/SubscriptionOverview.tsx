'use client';

import { useState } from 'react';
import TierBadge from '@/components/shared/TierBadge';
import type { SubscriptionData } from '@lib/types/billing';
import { createPortalSession } from '../actions';

interface SubscriptionOverviewProps {
  subscriptionData: SubscriptionData;
}

export default function SubscriptionOverview({ subscriptionData }: SubscriptionOverviewProps) {
  const [loading, setLoading] = useState(false);
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
