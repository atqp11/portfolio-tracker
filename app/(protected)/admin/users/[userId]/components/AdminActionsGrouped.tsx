'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { syncSubscription, cancelSubscription } from '../actions';

interface AdminActionsGroupedProps {
  user: Profile;
}

export default function AdminActionsGrouped({ user }: AdminActionsGroupedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    endpoint: string;
    body?: Record<string, unknown>;
  } | null>(null);

  const performAction = async () => {
    if (!pendingAction) return;

    const { action, endpoint } = pendingAction;

    setLoading(true);
    try {
      if (action === 'sync subscription') {
        await syncSubscription(user.id);
      } else if (action === 'cancel subscription') {
        await cancelSubscription(user.id);
      } else {
        throw new Error(`Unknown action: ${action}`);
      }

      alert(`${action} successful`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('An error occurred');
      }
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const triggerAction = (
    action: string,
    endpoint: string
  ) => {
    setPendingAction({ action, endpoint });
    setConfirmOpen(true);
  };

  const openStripeCustomer = () => {
    if (user.stripe_customer_id) {
      window.open(`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`, '_blank');
    } else {
      alert('No Stripe Customer ID found');
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Admin Actions</h2>
      
      <div className="space-y-6">
        {/* Primary Actions */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Primary Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => triggerAction('sync subscription', `/api/admin/users/${user.id}/sync-subscription`)}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Sync Subscription
            </button>

            <button
              onClick={openStripeCustomer}
              disabled={!user.stripe_customer_id}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open Stripe Customer
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Danger Zone</h3>
          {user.subscription_status !== 'canceled' && (
            <button
              onClick={() => triggerAction('cancel subscription', `/api/admin/users/${user.id}/cancel-subscription`)}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 w-full md:w-auto"
            >
              Cancel Subscription
            </button>
          )}
          {user.subscription_status === 'canceled' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">Subscription is already canceled</p>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        title={pendingAction ? `Confirm ${pendingAction.action}` : undefined}
        description={pendingAction ? `Are you sure you want to ${pendingAction.action}? This action may be destructive.` : undefined}
        showInput={false}
        confirmLabel="Yes, continue"
        cancelLabel="Cancel"
        onConfirm={performAction}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

