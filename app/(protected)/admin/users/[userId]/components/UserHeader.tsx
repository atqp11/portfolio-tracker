import type { Profile } from '@lib/supabase/db';
import type { RefundStatusDto } from '@backend/modules/admin/dto/admin.dto';

interface UserHeaderProps {
  user: Profile;
  refundStatus?: RefundStatusDto | null;
}

function getStatusBadge(status: string | null) {
  if (!status) return { label: 'Unknown', color: 'bg-gray-500' };
  
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'active') {
    return { label: 'Active', color: 'bg-green-500' };
  }
  if (statusLower === 'trialing') {
    return { label: 'Trialing', color: 'bg-orange-500' };
  }
  if (statusLower === 'past_due' || statusLower === 'incomplete' || statusLower === 'incomplete_expired') {
    return { label: status.replace('_', ' '), color: 'bg-red-500' };
  }
  if (statusLower === 'canceled') {
    return { label: 'Canceled', color: 'bg-red-600' };
  }
  
  return { label: status, color: 'bg-orange-500' };
}

export default function UserHeader({ user, refundStatus }: UserHeaderProps) {
  const statusBadge = getStatusBadge(user.subscription_status || null);
  const accountStatusBadge = user.is_active 
    ? { label: 'Active', color: 'bg-green-500' }
    : { label: 'Deactivated', color: 'bg-red-500' };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      {/* Refund Status Banner - Prominent */}
      {refundStatus && refundStatus.hasPendingRefunds && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg shadow-md">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-yellow-800 dark:text-yellow-200">
                Pending Refunds: {formatCurrency(refundStatus.totalPendingAmount, refundStatus.currency)}
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {refundStatus.refunds.length} refund{refundStatus.refunds.length !== 1 ? 's' : ''} pending processing
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {refundStatus.refunds.slice(0, 3).map((refund) => (
                  <span key={refund.id} className="inline-flex items-center px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                    {formatCurrency(refund.amount, refundStatus.currency)} - {refund.status}
                  </span>
                ))}
                {refundStatus.refunds.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded">
                    +{refundStatus.refunds.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: User Profile */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">User Profile</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Email:</span>
              <span className="text-gray-900 dark:text-white">{user.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Name:</span>
              <span className="text-gray-900 dark:text-white">{user.full_name || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">User ID:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Created:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Account Status:</span>
              <span className={`px-2 py-1 rounded text-xs text-white ${accountStatusBadge.color}`}>
                {accountStatusBadge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Subscription */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Subscription</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Tier:</span>
              <span className="text-gray-900 dark:text-white capitalize">{user.tier || 'free'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Status:</span>
              <span className={`px-2 py-1 rounded text-xs text-white ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Stripe Customer ID:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                {user.stripe_customer_id || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Subscription ID:</span>
              <span className="text-gray-900 dark:text-white font-mono text-xs">
                {user.stripe_subscription_id || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Current Period:</span>
              <span className="text-gray-900 dark:text-white text-xs">
                {user.current_period_start && user.current_period_end
                  ? `${new Date(user.current_period_start).toLocaleDateString()} - ${new Date(user.current_period_end).toLocaleDateString()}`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 font-medium">Trial Ends:</span>
              <span className="text-gray-900 dark:text-white">
                {user.trial_ends_at ? new Date(user.trial_ends_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

