import { adminController } from '@backend/modules/admin/admin.controller';
import SyncRetryButton from './SyncRetryButton';
import { isStripeConfigured } from '@lib/stripe/client';

export default async function SyncErrorsTable() {
  let errors;
  try {
    errors = await adminController.getSyncErrorsData();
  } catch (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">DB Sync Errors</h2>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-semibold">Error loading sync errors</p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  const stripeConfigured = isStripeConfigured();

  const getLastRetryStatusBadge = (status: string) => {
    if (status === 'completed') {
      return { label: 'Success', color: 'bg-green-500' };
    }
    if (status === 'failed') {
      return { label: 'Failed', color: 'bg-red-500' };
    }
    if (status === 'pending') {
      return { label: 'Pending', color: 'bg-yellow-500' };
    }
    return { label: 'None', color: 'bg-gray-500' };
  };

  if (errors.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">DB Sync Errors</h2>
        {!stripeConfigured && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Note: Stripe mismatch detection requires STRIPE_SECRET_KEY to be configured.
            </p>
          </div>
        )}
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <span className="text-xl">✓</span>
          <span>No sync errors found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">DB Sync Errors</h2>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stripe Event ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mismatch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Retry Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {errors.map((error) => {
              const retryBadge = getLastRetryStatusBadge(error.lastRetryStatus);
              return (
                <tr key={error.transactionId}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900 dark:text-gray-100">
                    {error.userId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900 dark:text-gray-100">
                    {error.stripeEventId || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {error.mismatch}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs text-white ${retryBadge.color}`}>
                      {retryBadge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <SyncRetryButton userId={error.userId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


