import type { Profile } from '@lib/supabase/db';

interface UserHeaderProps {
  user: Profile;
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

export default function UserHeader({ user }: UserHeaderProps) {
  const statusBadge = getStatusBadge(user.subscription_status || null);
  const accountStatusBadge = user.is_active 
    ? { label: 'Active', color: 'bg-green-500' }
    : { label: 'Deactivated', color: 'bg-red-500' };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
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

