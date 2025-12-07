'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RefundModalProps {
  userId: string;
  chargeId: string;
  amount: number; // in cents
  currency: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function RefundModal({ userId, chargeId, amount, currency, isOpen, onClose }: RefundModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState(amount / 100); // Display in dollars/major unit
  const [reason, setReason] = useState<'duplicate' | 'fraudulent' | 'requested_by_customer'>('requested_by_customer');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirm('Are you sure you want to process this refund? This action cannot be undone.')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: Math.round(refundAmount * 100),
          reason,
          note,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      alert('Refund processed successfully');
      router.refresh();
      onClose();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full text-gray-900 dark:text-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Process Refund</h2>
        
        <form onSubmit={handleRefund}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Refund Amount ({currency.toUpperCase()})
            </label>
            <input
              type="number"
              step="0.01"
              max={amount / 100}
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value))}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded"
              required
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Max: {(amount / 100).toFixed(2)} {currency.toUpperCase()}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded"
            >
              <option value="requested_by_customer">Requested by Customer</option>
              <option value="duplicate">Duplicate</option>
              <option value="fraudulent">Fraudulent</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Process Refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
