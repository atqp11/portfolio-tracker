'use client';

import { useState } from 'react';
import RetryWebhookButton from '../../components/RetryWebhookButton';

interface TransactionData {
  id: string;
  eventType: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdIso: string | null;
}

interface WebhookEventsLogProps {
  transactions: TransactionData[];
}

export default function WebhookEventsLog({ transactions }: WebhookEventsLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Webhook Events Log</h2>
        <div className="text-gray-600 dark:text-gray-400">No webhook events found.</div>
      </div>
    );
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aTime = a.createdIso ? new Date(a.createdIso).getTime() : 0;
    const bTime = b.createdIso ? new Date(b.createdIso).getTime() : 0;
    return bTime - aTime;
  });

  // Separate failed and successful webhooks
  const failedWebhooks = sortedTransactions.filter(t => t.status === 'failed');
  const successfulWebhooks = sortedTransactions.filter(t => t.status !== 'failed');

  const getStatusBadge = (status: string) => {
    if (status === 'completed' || status === 'succeeded') {
      return { label: 'Succeeded', color: 'bg-green-500' };
    }
    if (status === 'failed') {
      return { label: 'Failed', color: 'bg-red-500' };
    }
    return { label: status, color: 'bg-gray-500' };
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Webhook Events Log</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Received At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {/* Failed Webhooks Summary Row */}
            {failedWebhooks.length > 0 && (
              <>
                <tr className="bg-red-50 dark:bg-red-900/20">
                  <td colSpan={5} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          Failed Webhooks
                        </span>
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                          {failedWebhooks.length} {failedWebhooks.length === 1 ? 'failure' : 'failures'}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={expanded ? 'Collapse' : 'Expand'}
                      >
                        {expanded ? '▼' : '▶'}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded && failedWebhooks.map((transaction) => {
                  const statusBadge = getStatusBadge(transaction.status);
                  return (
                    <tr key={transaction.id} className="bg-red-50/50 dark:bg-red-900/10">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 pl-12">
                        {transaction.eventType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900 dark:text-gray-100">
                        {transaction.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {transaction.createdIso 
                          ? new Date(transaction.createdIso).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs text-white ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <RetryWebhookButton eventId={transaction.id} />
                      </td>
                    </tr>
                  );
                })}
              </>
            )}

            {/* Successful Webhooks - Always Visible */}
            {successfulWebhooks.map((transaction) => {
              const statusBadge = getStatusBadge(transaction.status);
              return (
                <tr key={transaction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{transaction.eventType}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900 dark:text-gray-100">{transaction.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {transaction.createdIso 
                      ? new Date(transaction.createdIso).toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs text-white ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {/* No action for successful webhooks */}
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
