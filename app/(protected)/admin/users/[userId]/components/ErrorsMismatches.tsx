'use client';

import type { Profile } from '@lib/supabase/db';
import { syncUserSubscription } from '@/app/(protected)/admin/actions';
import { useState, useTransition } from 'react';

interface TransactionData {
  id: string;
  eventType: string;
  status: string;
  createdIso: string | null;
}

interface ErrorsMismatchesProps {
  user: Profile;
  transactions: TransactionData[];
  stripeStatus?: {
    status: string | null;
    tier: string | null;
    subscriptionId?: string | null;
  } | null;
}

interface ErrorItem {
  type: 'fatal' | 'warning' | 'error';
  message: string;
  showSyncButton?: boolean;
}

export default function ErrorsMismatches({ user, transactions, stripeStatus }: ErrorsMismatchesProps) {
  const [isPending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Detect errors and mismatches (regardless of tier)
  const errors: ErrorItem[] = [];

  // Check for subscription mismatch between Stripe and DB
  const hasStripeSubscription = stripeStatus?.subscriptionId;
  const hasDbSubscription = user.stripe_subscription_id;

  // CRITICAL: Missing DB subscription but has Stripe subscription (metadata-based lookup)
  if (hasStripeSubscription && !hasDbSubscription) {
    errors.push({
      type: 'error',
      message: `Missing DB subscription record. Stripe has subscription (${hasStripeSubscription}) but DB shows no subscription. Use sync button to fix.`,
      showSyncButton: true,
    });
  }

  // Subscription ID mismatch
  if (hasStripeSubscription && hasDbSubscription && hasStripeSubscription !== hasDbSubscription) {
    errors.push({
      type: 'error',
      message: `Subscription ID mismatch: Stripe (${hasStripeSubscription}) vs DB (${hasDbSubscription}). Use sync button to fix.`,
      showSyncButton: true,
    });
  }

  // Status mismatch
  if (stripeStatus?.status && user.subscription_status && stripeStatus.status !== user.subscription_status) {
    errors.push({
      type: 'warning',
      message: `Status mismatch: Stripe (${stripeStatus.status}) vs DB (${user.subscription_status}). Use sync button to fix.`,
      showSyncButton: true,
    });
  }

  // Tier mismatch
  if (stripeStatus?.tier && user.tier && stripeStatus.tier !== user.tier) {
    errors.push({
      type: 'warning',
      message: `Tier mismatch: Stripe (${stripeStatus.tier}) vs DB (${user.tier}). Use sync button to fix.`,
      showSyncButton: true,
    });
  }

  // Has subscription but tier is free (legacy detection)
  if (hasDbSubscription && user.tier === 'free' && user.subscription_status === 'active') {
    errors.push({
      type: 'error',
      message: 'Has active subscription in DB but tier is FREE (needs sync)',
      showSyncButton: true,
    });
  }

  // Missing subscription for paid tier
  if (!hasDbSubscription && (user.tier === 'basic' || user.tier === 'premium')) {
    errors.push({
      type: 'error',
      message: `Missing subscription for paid tier (${user.tier}). Check Stripe for subscription with userid metadata.`,
      showSyncButton: true,
    });
  }

  // Last webhook failed
  const failedWebhooks = transactions.filter(t => t.status === 'failed');
  if (failedWebhooks.length > 0) {
    const lastFailed = failedWebhooks.sort((a, b) => {
      const aTime = a.createdIso ? new Date(a.createdIso).getTime() : 0;
      const bTime = b.createdIso ? new Date(b.createdIso).getTime() : 0;
      return bTime - aTime;
    })[0];
    
    errors.push({
      type: 'error',
      message: `Last webhook failed: ${lastFailed.eventType}`,
    });
  }

  // Subscription stuck in incomplete
  if (user.subscription_status === 'incomplete' || user.subscription_status === 'incomplete_expired') {
    errors.push({
      type: 'fatal',
      message: `Subscription stuck in ${user.subscription_status} status`,
    });
  }

  // DB mismatch (simplified - would need Stripe API call for full check)
  if (user.subscription_status === 'past_due' && user.tier !== 'free') {
    errors.push({
      type: 'warning',
      message: 'Subscription is past due',
    });
  }

  const getErrorColor = (type: string) => {
    if (type === 'fatal') return 'bg-red-600';
    if (type === 'error') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getErrorBorder = (type: string) => {
    if (type === 'fatal') return 'border-red-600';
    if (type === 'error') return 'border-red-500';
    return 'border-yellow-500';
  };

  const handleSync = () => {
    startTransition(async () => {
      try {
        setSyncMessage(null);
        await syncUserSubscription(user.id);
        setSyncMessage({ type: 'success', text: 'Subscription synced successfully! Refresh page to see updates.' });
      } catch (error) {
        setSyncMessage({ 
          type: 'error', 
          text: error instanceof Error ? error.message : 'Failed to sync subscription' 
        });
      }
    });
  };

  if (errors.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Errors & Mismatches</h2>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <span className="text-xl">✓</span>
          <span>No errors found</span>
        </div>
      </div>
    );
  }

  const hasAnySyncableError = errors.some(e => e.showSyncButton);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Errors & Mismatches</h2>
        {hasAnySyncableError && (
          <button
            onClick={handleSync}
            disabled={isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isPending ? 'Syncing...' : 'Sync from Stripe'}
          </button>
        )}
      </div>

      {syncMessage && (
        <div className={`mb-4 p-3 rounded-lg ${syncMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'}`}>
          {syncMessage.text}
        </div>
      )}

      <div className="space-y-3">
        {errors.map((error, index) => {
          const bgColor = error.type === 'fatal' || error.type === 'error' 
            ? 'bg-red-50 dark:bg-red-900/20' 
            : 'bg-yellow-50 dark:bg-yellow-900/20';
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getErrorBorder(error.type)} ${bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs text-white ${getErrorColor(error.type)}`}>
                      {error.type.toUpperCase()}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">{error.message}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
