import type { Profile } from '@lib/supabase/db';

interface TransactionData {
  id: string;
  eventType: string;
  status: string;
  createdIso: string | null;
}

interface ErrorsMismatchesProps {
  user: Profile;
  transactions: TransactionData[];
}

interface ErrorItem {
  type: 'fatal' | 'warning' | 'error';
  message: string;
}

export default function ErrorsMismatches({ user, transactions }: ErrorsMismatchesProps) {
  // Detect errors
  const errors: ErrorItem[] = [];

  // Missing stripe_customer_id
  if (!user.stripe_customer_id && user.tier !== 'free') {
    errors.push({
      type: 'warning',
      message: 'Missing Stripe Customer ID',
    });
  }

  // Missing subscription
  if (!user.stripe_subscription_id && (user.tier === 'basic' || user.tier === 'premium')) {
    errors.push({
      type: 'error',
      message: 'Missing subscription for paid tier',
    });
  }

  // Last webhook failed
  const failedWebhooks = transactions.filter(t => t.status === 'failed');
  if (failedWebhooks.length > 0) {
    const lastFailed = failedWebhooks.sort((a, b) => {
      const aTime = a.createdIso ? new Date(a.createdIso).getTime() : 0;
      const bTime = b.createdIso ? new Date(b.createdIso).getTime() : 0;
      return bTime - aTime;
    })[0];
    
    errors.push({
      type: 'error',
      message: `Last webhook failed: ${lastFailed.eventType}`,
    });
  }

  // Subscription stuck in incomplete
  if (user.subscription_status === 'incomplete' || user.subscription_status === 'incomplete_expired') {
    errors.push({
      type: 'fatal',
      message: `Subscription stuck in ${user.subscription_status} status`,
    });
  }

  // DB mismatch (simplified - would need Stripe API call for full check)
  if (user.subscription_status === 'past_due' && user.tier !== 'free') {
    errors.push({
      type: 'warning',
      message: 'Subscription is past due',
    });
  }

  const getErrorColor = (type: string) => {
    if (type === 'fatal') return 'bg-red-600';
    if (type === 'error') return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const getErrorBorder = (type: string) => {
    if (type === 'fatal') return 'border-red-600';
    if (type === 'error') return 'border-red-500';
    return 'border-yellow-500';
  };

  if (errors.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Errors & Mismatches</h2>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <span className="text-xl">✓</span>
          <span>No errors found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Errors & Mismatches</h2>
      <div className="space-y-3">
        {errors.map((error, index) => {
          const bgColor = error.type === 'fatal' || error.type === 'error' 
            ? 'bg-red-50 dark:bg-red-900/20' 
            : 'bg-yellow-50 dark:bg-yellow-900/20';
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${getErrorBorder(error.type)} ${bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-1 rounded text-xs text-white ${getErrorColor(error.type)}`}>
                      {error.type.toUpperCase()}
                    </span>
                    <span className="text-gray-900 dark:text-white font-medium">{error.message}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
