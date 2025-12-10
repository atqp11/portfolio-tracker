'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { syncSubscription, cancelSubscription, createPortalSessionForUser, getCancellationPreview, refundUser } from '../actions';
import type { RefundStatusDto } from '@backend/modules/admin/dto/admin.dto';

interface AdminActionsGroupedProps {
  user: Profile;
  refundStatus?: RefundStatusDto | null;
}

interface CancellationPreview {
  immediate: {
    refundAmount: number;
    refundCurrency: string;
    unusedDays: number;
    totalDays: number;
  } | null;
  periodEnd: {
    accessUntil: string;
    noRefund: boolean;
  } | null;
}

export default function AdminActionsGrouped({ user, refundStatus }: AdminActionsGroupedProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [cancellationPreview, setCancellationPreview] = useState<CancellationPreview | null>(null);
  const [selectedCancelMode, setSelectedCancelMode] = useState<'immediate' | 'period_end'>('period_end');
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundNote, setRefundNote] = useState<string>('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);
  const [selectedChargeId, setSelectedChargeId] = useState<string>(''); // For charge selection
  const [pendingAction, setPendingAction] = useState<{
    action: string;
  } | null>(null);

  // Get currency from refund status for consistent formatting
  const currency = refundStatus?.currency || 'usd';

  // Helper to format currency dynamically
  const formatAmount = (amountCents: number, currencyCode?: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: (currencyCode || currency).toUpperCase(),
    }).format(amountCents / 100);
  };

  const performAction = async () => {
    if (!pendingAction) return;

    const { action } = pendingAction;

    setLoading(true);
    try {
      if (action === 'sync subscription') {
        await syncSubscription(user.id);
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

  const triggerAction = (action: string) => {
    setPendingAction({ action });
    setConfirmOpen(true);
  };

  const handleCancelSubscriptionClick = async () => {
    setLoading(true);
    try {
      const result = await getCancellationPreview(user.id);
      if (result.success && result.data) {
        setCancellationPreview(result.data as CancellationPreview);
        setCancelModalOpen(true);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to load cancellation preview');
    } finally {
      setLoading(false);
    }
  };

  const confirmCancelSubscription = async () => {
    setLoading(true);
    try {
      const immediate = selectedCancelMode === 'immediate';
      await cancelSubscription(user.id, immediate);
      alert(`Subscription ${immediate ? 'canceled immediately' : 'scheduled to cancel at period end'}`);
      setCancelModalOpen(false);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get selected charge info for validation
  const getSelectedChargeInfo = () => {
    if (!selectedChargeId || !refundStatus?.charges) {
      // Default to last payment
      return refundStatus?.lastPayment ? {
        refundable: refundStatus.lastPayment.amount,
        currency: refundStatus.lastPayment.currency,
        chargeId: refundStatus.lastPayment.chargeId,
      } : null;
    }
    return refundStatus.charges.find(c => c.id === selectedChargeId);
  };

  const handleRefundClick = () => {
    setRefundError(null);
    setRefundSuccess(null);
    // Set default charge to most recent with refundable amount
    const defaultCharge = refundStatus?.charges?.find(c => c.refundable > 0);
    if (defaultCharge) {
      setSelectedChargeId(defaultCharge.id);
      setRefundAmount((defaultCharge.refundable / 100).toFixed(2));
    } else if (refundStatus?.lastPayment) {
      setSelectedChargeId(refundStatus.lastPayment.chargeId || '');
      setRefundAmount((refundStatus.lastPayment.amount / 100).toFixed(2));
    } else {
      setSelectedChargeId('');
      setRefundAmount('');
    }
    setRefundReason('');
    setRefundNote('');
    setRefundModalOpen(true);
  };

  const handleChargeSelect = (chargeId: string) => {
    setSelectedChargeId(chargeId);
    const charge = refundStatus?.charges?.find(c => c.id === chargeId);
    if (charge) {
      setRefundAmount((charge.refundable / 100).toFixed(2));
    }
  };

  const handleRefundSubmit = async () => {
    setRefundError(null);
    setRefundSuccess(null);
    
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setRefundError('Please enter a valid refund amount');
      return;
    }

    if (!refundReason.trim()) {
      setRefundError('Please provide a reason for the refund');
      return;
    }

    // Client-side validation of max refundable
    const chargeInfo = getSelectedChargeInfo();
    if (chargeInfo && amount * 100 > chargeInfo.refundable) {
      setRefundError(`Maximum refundable amount is ${formatAmount(chargeInfo.refundable)}`);
      return;
    }

    setRefundLoading(true);
    try {
      await refundUser(user.id, Math.round(amount * 100), refundReason, refundNote || undefined, selectedChargeId || undefined);
      const formattedAmount = formatAmount(Math.round(amount * 100));
      setRefundSuccess(`Refund of ${formattedAmount} processed successfully!`);
      setTimeout(() => {
        setRefundModalOpen(false);
        router.refresh();
      }, 2000);
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  };

  const handleRefundSync = async () => {
    setRefundLoading(true);
    setRefundError(null);
    try {
      await syncSubscription(user.id);
      setRefundSuccess('Subscription synced successfully!');
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : 'Failed to sync subscription');
    } finally {
      setRefundLoading(false);
    }
  };

  const openStripeCustomer = () => {
    if (user.stripe_customer_id) {
      window.open(`https://dashboard.stripe.com/customers/${user.stripe_customer_id}`, '_blank');
    } else {
      alert('No Stripe Customer ID found');
    }
  };

  const handleManageUserSubscription = async () => {
    setPortalLoading(true);
    try {
      const returnUrl = `${window.location.origin}/admin/users/${user.id}`;
      const result = await createPortalSessionForUser(user.id, returnUrl);
      
      if (result.url) {
        window.open(result.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert(error instanceof Error ? error.message : 'Failed to open billing portal. Please try again.');
    } finally {
      setPortalLoading(false);
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
              onClick={() => triggerAction('sync subscription')}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Sync Subscription
            </button>

            {user.stripe_customer_id && user.subscription_status && user.subscription_status !== 'canceled' && (
              <button
                onClick={handleManageUserSubscription}
                disabled={portalLoading}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {portalLoading ? 'Loading...' : 'Manage Subscription'}
              </button>
            )}

            <button
              onClick={openStripeCustomer}
              disabled={!user.stripe_customer_id}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Open Stripe Customer
            </button>

            {user.stripe_customer_id && (
              <button
                onClick={handleRefundClick}
                disabled={refundLoading}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refundLoading ? 'Processing...' : 'Process Refund'}
              </button>
            )}
          </div>
        </div>

        {/* Danger Zone - only show if there are actions to display */}
        {user.subscription_status !== 'canceled' && user.stripe_subscription_id && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">Danger Zone</h3>
            <button
              onClick={handleCancelSubscriptionClick}
              disabled={loading}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 w-full md:w-auto"
            >
              Cancel Subscription
            </button>
          </div>
        )}
        {user.subscription_status === 'canceled' && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Subscription is already canceled</p>
        )}
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

      {/* Cancellation Modal with Preview */}
      {cancelModalOpen && cancellationPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Cancel Subscription</h2>
              
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Choose how to cancel this subscription:
              </p>

              {/* Cancellation Options */}
              <div className="space-y-4 mb-6">
                {/* Option 1: Cancel at Period End */}
                {cancellationPreview.periodEnd && (
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-blue-500 dark:border-gray-700 dark:hover:border-blue-500">
                    <input
                      type="radio"
                      name="cancelMode"
                      value="period_end"
                      checked={selectedCancelMode === 'period_end'}
                      onChange={(e) => setSelectedCancelMode(e.target.value as 'period_end')}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        Cancel at Period End (Recommended)
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>• User keeps access until <strong>{formatDate(cancellationPreview.periodEnd.accessUntil)}</strong></p>
                        <p>• No refund needed (fair billing)</p>
                        <p>• Subscription automatically ends after current period</p>
                      </div>
                      <div className="mt-2 inline-block px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-semibold rounded">
                        ✓ Fair Billing
                      </div>
                    </div>
                  </label>
                )}

                {/* Option 2: Cancel Immediately */}
                {cancellationPreview.immediate && (
                  <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-orange-500 dark:border-gray-700 dark:hover:border-orange-500">
                    <input
                      type="radio"
                      name="cancelMode"
                      value="immediate"
                      checked={selectedCancelMode === 'immediate'}
                      onChange={(e) => setSelectedCancelMode(e.target.value as 'immediate')}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white mb-1">
                        Cancel Immediately
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <p>• User loses access immediately</p>
                        <p>• Automatic refund: <strong>{formatCurrency(cancellationPreview.immediate.refundAmount, cancellationPreview.immediate.refundCurrency)}</strong></p>
                        <p>• Unused time: <strong>{cancellationPreview.immediate.unusedDays} of {cancellationPreview.immediate.totalDays} days</strong></p>
                        <p>• Downgraded to free tier instantly</p>
                      </div>
                      <div className="mt-2 inline-block px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-xs font-semibold rounded">
                        ⚠️ Immediate - With Refund
                      </div>
                    </div>
                  </label>
                )}
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Warning:</strong> This action cannot be undone. The subscription will be canceled in Stripe and the database will be updated immediately.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={confirmCancelSubscription}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Processing...' : selectedCancelMode === 'immediate' ? 'Cancel & Refund Now' : 'Cancel at Period End'}
                </button>
                <button
                  onClick={() => setCancelModalOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Keep Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Process Refund</h3>
            
            {refundError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">{refundError}</p>
                <button
                  onClick={handleRefundSync}
                  disabled={refundLoading}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                >
                  Try syncing subscription data
                </button>
              </div>
            )}

            {refundSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3 mb-4">
                <p className="text-sm text-green-800 dark:text-green-200">{refundSuccess}</p>
              </div>
            )}

            <div className="space-y-4 mb-6">
              {/* Charge Selection (if multiple charges exist) */}
              {refundStatus?.charges && refundStatus.charges.length > 1 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Payment to Refund
                  </label>
                  <select
                    value={selectedChargeId}
                    onChange={(e) => handleChargeSelect(e.target.value)}
                    disabled={refundLoading}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
                  >
                    {refundStatus.charges.map((charge) => (
                      <option key={charge.id} value={charge.id} disabled={charge.refundable <= 0}>
                        {formatDate(charge.date)} - {formatAmount(charge.amount, charge.currency)}
                        {charge.refundable < charge.amount && ` (${formatAmount(charge.refundable, charge.currency)} refundable)`}
                        {charge.refundable <= 0 && ' [Fully refunded]'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Refund Amount ({currency.toUpperCase()})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={getSelectedChargeInfo()?.refundable ? (getSelectedChargeInfo()!.refundable / 100) : undefined}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  disabled={refundLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
                  placeholder="0.00"
                />
                {getSelectedChargeInfo() && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Max refundable: {formatAmount(getSelectedChargeInfo()!.refundable, getSelectedChargeInfo()!.currency)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  disabled={refundLoading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
                >
                  <option value="">Select reason...</option>
                  <option value="duplicate">Duplicate charge</option>
                  <option value="fraudulent">Fraudulent charge</option>
                  <option value="requested_by_customer">Customer request</option>
                  <option value="service_not_delivered">Service not delivered</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Internal Note (optional)
                </label>
                <textarea
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  disabled={refundLoading}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
                  placeholder="Add internal note..."
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRefundSubmit}
                disabled={refundLoading}
                className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refundLoading ? 'Processing...' : 'Submit Refund'}
              </button>
              <button
                onClick={() => {
                  setRefundModalOpen(false);
                  setRefundError(null);
                  setRefundSuccess(null);
                }}
                disabled={refundLoading}
                className="flex-1 bg-gray-300 dark:bg-gray-600 px-4 py-2 rounded hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

