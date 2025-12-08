'use client';

import { useState } from 'react';
import type { Profile } from '@lib/supabase/db';

interface DebugToolsProps {
  user: Profile;
}

export default function DebugTools({ user }: DebugToolsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  const openStripeDashboard = (type: 'customer' | 'subscription') => {
    if (type === 'customer' && user.stripe_customer_id) {
      window.open(`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`, '_blank');
    } else if (type === 'subscription' && user.stripe_subscription_id) {
      window.open(`https://dashboard.stripe.com/subscriptions/${user.stripe_subscription_id}`, '_blank');
    } else {
      alert(`No Stripe ${type} ID found`);
    }
  };

  const hasCustomerId = !!user.stripe_customer_id;
  const hasSubscriptionId = !!user.stripe_subscription_id;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Debug Tools</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Copy Stripe Customer ID */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => hasCustomerId && copyToClipboard(user.stripe_customer_id!, 'customer')}
            disabled={!hasCustomerId}
            className={`px-4 py-2 rounded text-sm flex-1 ${
              hasCustomerId
                ? 'bg-gray-500 hover:bg-gray-600 text-white cursor-pointer'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {copied === 'customer' ? 'Copied!' : 'Copy Stripe Customer ID'}
          </button>
          {hasCustomerId ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {user.stripe_customer_id!.slice(0, 12)}...
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">No ID</span>
          )}
        </div>

        {/* Copy Subscription ID */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => hasSubscriptionId && copyToClipboard(user.stripe_subscription_id!, 'subscription')}
            disabled={!hasSubscriptionId}
            className={`px-4 py-2 rounded text-sm flex-1 ${
              hasSubscriptionId
                ? 'bg-gray-500 hover:bg-gray-600 text-white cursor-pointer'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {copied === 'subscription' ? 'Copied!' : 'Copy Subscription ID'}
          </button>
          {hasSubscriptionId ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {user.stripe_subscription_id!.slice(0, 12)}...
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">No ID</span>
          )}
        </div>

        {/* Open Stripe Dashboard - Customer */}
        <button
          onClick={() => openStripeDashboard('customer')}
          disabled={!hasCustomerId}
          className={`px-4 py-2 rounded text-sm ${
            hasCustomerId
              ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Open Stripe Customer Dashboard
        </button>

        {/* Open Stripe Dashboard - Subscription */}
        <button
          onClick={() => openStripeDashboard('subscription')}
          disabled={!hasSubscriptionId}
          className={`px-4 py-2 rounded text-sm ${
            hasSubscriptionId
              ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          Open Stripe Subscription Dashboard
        </button>
      </div>
    </div>
  );
}

