 'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import { TIER_CONFIG, type TierName } from '@lib/tiers/config';

interface AdminActionsPanelProps {
  user: Profile;
}

import ConfirmModal from '@/components/shared/ConfirmModal';

export default function AdminActionsPanel({ user }: AdminActionsPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    endpoint: string;
    body?: Record<string, unknown>;
    inputKey?: string; // key to attach input value to in payload (eg 'days' or 'reason')
  } | null>(null);
  const [pendingRequiresInput, setPendingRequiresInput] = useState(false);
  const [pendingInputType, setPendingInputType] = useState<'number' | 'text'>('number');
  const [pendingInputValue, setPendingInputValue] = useState<string>('7');
  const tiers = Object.keys(TIER_CONFIG) as TierName[];
  const [selectedTier, setSelectedTier] = useState<string>(user.tier ?? tiers[0]);

  const performAction = async () => {
    if (!pendingAction) return;

    const { action, endpoint, body } = pendingAction;

    setLoading(true);
    try {
      // Build payload and attach typed input under the configured inputKey
      let payload: Record<string, unknown> = {};
      if (pendingRequiresInput && pendingAction?.inputKey) {
        if (!pendingInputValue || String(pendingInputValue).trim().length === 0) {
          alert('Please enter a value before continuing');
          setLoading(false);
          return;
        }

        payload = { ...(body || {}) };
        if (pendingInputType === 'number') {
          payload[pendingAction.inputKey] = parseInt(pendingInputValue as string, 10);
        } else {
          payload[pendingAction.inputKey] = pendingInputValue;
        }
      } else {
        payload = body || {};
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {}),
      });

      if (!response.ok) {
        // Try to extract a useful error message from the server response.
        // API errors commonly come back as { success: false, error: { message, details } }
        const payload = await response.json().catch(() => null);
        const serverMessage = payload?.error?.message || payload?.message || null;

        // Format validation details (array of { field, message }) into a readable string
        let detailsMsg = '';
        const details = payload?.error?.details || payload?.details || null;
        if (Array.isArray(details) && details.length > 0) {
          const lines = details.map((d: unknown) => {
            if (typeof d === 'string') return d;
            if (typeof d === 'object' && d !== null) {
              const detailObj = d as Record<string, unknown>;
              const fld = detailObj.field ?? detailObj.path ?? detailObj.key ?? 'field';
              const m = detailObj.message ?? JSON.stringify(d);
              return `${fld}: ${m}`;
            }
            return String(d);
          });
          detailsMsg = ` - Details: ${lines.join('; ')}`;
        }

        const msg = `${serverMessage || `Failed to ${action}`}${detailsMsg}`;
        throw new Error(msg);
      }

      alert(`${action} successful`);
      router.refresh();
    } catch (error) {
      // Prefer Error.message when available, otherwise try to stringify an object payload
      if (error instanceof Error) {
        alert(error.message);
      } else if (typeof error === 'object' && error !== null) {
        try {
          alert(JSON.stringify(error));
        } catch {
          alert('An error occurred');
        }
      } else {
        alert(String(error || 'An error occurred'));
      }
    } finally {
      setLoading(false);
      setConfirmOpen(false);
      setPendingAction(null);
    }
  };

  const triggerAction = (
    action: string,
    endpoint: string,
    body?: Record<string, unknown>,
    requiresInput = false,
    defaultInput = '7',
    inputType: 'number' | 'text' = 'number',
    inputKey?: string
  ) => {
    setPendingAction({ action, endpoint, body, inputKey });
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
          onClick={() => triggerAction('sync subscription', `/api/admin/users/${user.id}/sync-subscription`)}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Sync Subscription
        </button>

        {user.subscription_status !== 'canceled' && (
          <button
            onClick={() =>
              triggerAction('cancel subscription', `/api/admin/users/${user.id}/cancel-subscription`)
            }
            disabled={loading}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
          >
            Cancel Subscription
          </button>
        )}

        <button
            onClick={() => {
              // Open modal with numeric input
              triggerAction('extend trial', `/api/admin/users/${user.id}/extend-trial`, {}, true, '7', 'number', 'days');
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
                  `/api/admin/users/${user.id}/change-tier`,
                  { tier: selectedTier },
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
