import { getWebhookLogs } from '@backend/modules/admin/service/admin.service';
import RetryButton from './RetryButton';

export default async function WebhookLogsTable() {
  const logs = await getWebhookLogs(100);

  const formatLatency = (ms: number | null) => {
    if (ms === null) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed' || status === 'succeeded') {
      return { label: 'Processed', color: 'bg-green-500' };
    }
    if (status === 'failed') {
      return { label: 'Error', color: 'bg-red-500' };
    }
    return { label: status, color: 'bg-gray-500' };
  };

  const getRecoveryStatusBadge = (status: string) => {
    if (status === 'auto') {
      return { label: 'Auto', color: 'bg-blue-500' };
    }
    return { label: 'Manual', color: 'bg-purple-500' };
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Webhook Logs</h2>
      
      {logs.length === 0 ? (
        <div className="text-gray-600 dark:text-gray-400">No webhook events found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Latency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recovery Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Retry Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => {
                const statusBadge = getStatusBadge(log.status);
                const recoveryBadge = getRecoveryStatusBadge(log.recoveryStatus);
                return (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900 dark:text-gray-100">
                      {log.eventId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {log.eventType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs text-white ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatLatency(log.latency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs text-white ${recoveryBadge.color}`}>
                        {recoveryBadge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {log.retryCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {log.status === 'failed' && log.eventId && (
                        <RetryButton eventId={log.eventId} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


