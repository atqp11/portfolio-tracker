import { getBillingOverview } from '@backend/modules/admin/service/admin.service';

export default async function BillingOverview() {
  let overview;
  try {
    overview = await getBillingOverview();
  } catch (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing Overview</h2>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error loading billing overview</p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing Overview</h2>

      {/* Show warning if Stripe not configured */}
      {!overview.stripeConfigured && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Stripe Not Configured
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  Stripe integration is not configured. Some metrics (MRR, Churn, Upcoming Invoices) 
                  require STRIPE_SECRET_KEY to be set in your environment variables.
                </p>
                <p className="mt-1 font-mono text-xs">
                  Add STRIPE_SECRET_KEY to your .env.local file
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">User Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.userStats.totalUsers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">All time</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">New Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.userStats.newUsers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Last 30 days</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Inactive Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.userStats.inactiveUsers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Deactivated</p>
          </div>
        </div>
      </div>

      {/* Subscription Stats */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Subscription Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Subscriptions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.subscriptionStats.activeSubscriptions}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Free Tier</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.subscriptionStats.tierBreakdown.free}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Basic Tier</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.subscriptionStats.tierBreakdown.basic}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Premium Tier</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.subscriptionStats.tierBreakdown.premium}</p>
          </div>
        </div>
      </div>

      {/* MRR and Churn */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Revenue & Churn</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monthly Recurring Revenue</p>
            {overview.stripeConfigured ? (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(overview.mrr)}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">MRR</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Requires Stripe</p>
              </>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Churn (30 days)</p>
            {overview.stripeConfigured ? (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.churn.last30Days}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Cancellations</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Requires Stripe</p>
              </>
            )}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Churn (90 days)</p>
            {overview.stripeConfigured ? (
              <>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.churn.last90Days}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Cancellations</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">—</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Requires Stripe</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Invoices */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Upcoming Invoices</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          {overview.stripeConfigured ? (
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Count</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.upcomingInvoices.count}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(overview.upcomingInvoices.totalAmount)}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 dark:text-gray-500">—</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Requires Stripe</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


