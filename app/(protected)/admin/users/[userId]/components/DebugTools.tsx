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

  const handleRecalculateAccess = async () => {
    // TODO: Implement force recalculate access endpoint
    alert('Force recalculate access functionality will be implemented');
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Debug Tools</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Copy Stripe Customer ID */}
        {user.stripe_customer_id && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(user.stripe_customer_id!, 'customer')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm flex-1"
            >
              {copied === 'customer' ? 'Copied!' : 'Copy Stripe Customer ID'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {user.stripe_customer_id.slice(0, 12)}...
            </span>
          </div>
        )}

        {/* Copy Subscription ID */}
        {user.stripe_subscription_id && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => copyToClipboard(user.stripe_subscription_id!, 'subscription')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm flex-1"
            >
              {copied === 'subscription' ? 'Copied!' : 'Copy Subscription ID'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {user.stripe_subscription_id.slice(0, 12)}...
            </span>
          </div>
        )}

        {/* Open Stripe Dashboard - Customer */}
        {user.stripe_customer_id && (
          <button
            onClick={() => openStripeDashboard('customer')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Open Stripe Customer Dashboard
          </button>
        )}

        {/* Open Stripe Dashboard - Subscription */}
        {user.stripe_subscription_id && (
          <button
            onClick={() => openStripeDashboard('subscription')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm"
          >
            Open Stripe Subscription Dashboard
          </button>
        )}

        {/* Force Recalculate Access */}
        <button
          onClick={handleRecalculateAccess}
          className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm"
        >
          Force Recalculate Access
        </button>
      </div>
    </div>
  );
}

