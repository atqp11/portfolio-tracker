'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import { TIER_CONFIG, type TierName } from '@lib/tiers/config';
import ConfirmModal from '@/components/shared/ConfirmModal';
import {
  syncSubscription,
  cancelSubscription,
  changeTier,
  extendTrial,
} from '../actions';

interface AdminActionsPanelProps {
  user: Profile;
}

export default function AdminActionsPanel({ user }: AdminActionsPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    inputKey?: string; // key to attach input value to in payload (eg 'days' or 'reason')
  } | null>(null);
  const [pendingRequiresInput, setPendingRequiresInput] = useState(false);
  const [pendingInputType, setPendingInputType] = useState<'number' | 'text'>('number');
  const [pendingInputValue, setPendingInputValue] = useState<string>('7');
  const tiers = Object.keys(TIER_CONFIG) as TierName[];
  const [selectedTier, setSelectedTier] = useState<string>(user.tier ?? tiers[0]);

  const performAction = async () => {
    if (!pendingAction) return;

    const { action } = pendingAction;

    setLoading(true);
    try {
      // Validate input if required
      if (pendingRequiresInput) {
        if (!pendingInputValue || String(pendingInputValue).trim().length === 0) {
          alert('Please enter a value before continuing');
          setLoading(false);
          return;
        }
      }

      // Call appropriate server action based on action type
      if (action === 'sync subscription') {
        await syncSubscription(user.id);
      } else if (action === 'cancel subscription') {
        await cancelSubscription(user.id);
      } else if (action === 'change tier') {
        if (!pendingInputValue || String(pendingInputValue).trim().length === 0) {
          alert('Please enter a reason before continuing');
          setLoading(false);
          return;
        }
        await changeTier(user.id, selectedTier, pendingInputValue);
      } else if (action === 'extend trial') {
        const days = parseInt(pendingInputValue, 10);
        if (isNaN(days) || days <= 0) {
          alert('Please enter a valid number of days');
          setLoading(false);
          return;
        }
        await extendTrial(user.id, days);
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
    requiresInput = false,
    defaultInput = '7',
    inputType: 'number' | 'text' = 'number',
    inputKey?: string
  ) => {
    setPendingAction({ action, inputKey });
    setPendingRequiresInput(requiresInput);
    setPendingInputType(inputType);
    setPendingInputValue(defaultInput);
    setConfirmOpen(true);
  };

  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">Admin Actions</h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => triggerAction('sync subscription')}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Sync Subscription
        </button>

        {user.subscription_status !== 'canceled' && (
          <button
            onClick={() => triggerAction('cancel subscription')}
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Cancel Subscription
          </button>
        )}

        <button
          onClick={() => {
            // Open modal with numeric input
            triggerAction('extend trial', true, '7', 'number', 'days');
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
                // Prompt admin for a required reason (changeTier schema requires `reason` and `tier`)
                triggerAction(
                  'change tier',
                  true,
                  '',
                  'text',
                  'reason'
                );
              }
            }}
            disabled={loading || selectedTier === user.tier}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Apply
          </button>
        </div>
          <ConfirmModal
            isOpen={confirmOpen}
            title={pendingAction ? `Confirm ${pendingAction.action}` : undefined}
            description={pendingAction ? `Are you sure you want to ${pendingAction.action}? This action may be destructive.` : undefined}
            showInput={pendingRequiresInput}
            inputLabel={
              pendingRequiresInput
                ? pendingAction?.action?.includes('extend')
                  ? 'Days to extend trial'
                  : pendingAction?.action?.includes('change')
                  ? 'Reason for change'
                  : 'Input'
                : undefined
            }
            inputType={pendingRequiresInput ? pendingInputType : undefined}
            inputValue={pendingInputValue}
            inputPlaceholder={pendingRequiresInput ? 'e.g. 7' : undefined}
            onInputChange={(val) => setPendingInputValue(val)}
            confirmLabel="Yes, continue"
            cancelLabel="Cancel"
            onConfirm={performAction}
            onCancel={() => setConfirmOpen(false)}
          />
      </div>
    </div>
  );
}
