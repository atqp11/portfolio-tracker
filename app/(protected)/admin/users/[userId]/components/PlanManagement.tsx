'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import { TIER_CONFIG, type TierName } from '@lib/tiers/config';
import ConfirmModal from '@/components/shared/ConfirmModal';

interface PlanManagementProps {
  user: Profile;
}

export default function PlanManagement({ user }: PlanManagementProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    action: string;
    endpoint: string;
    body?: Record<string, unknown>;
    inputKey?: string;
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
        const payload = await response.json().catch(() => null);
        const serverMessage = payload?.error?.message || payload?.message || null;
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
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Plan Management</h2>
      
      <div className="space-y-4">
        {/* Change Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Change Plan
          </label>
          <div className="flex items-center gap-2">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              disabled={loading}
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tiers.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                if (selectedTier && selectedTier !== user.tier) {
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
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Extend Trial */}
        <div>
          <button
            onClick={() => {
              triggerAction('extend trial', `/api/admin/users/${user.id}/extend-trial`, {}, true, '7', 'number', 'days');
            }}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Extend Trial
          </button>
        </div>
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
  );
}

