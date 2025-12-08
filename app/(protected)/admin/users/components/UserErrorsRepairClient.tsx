'use client';

import { useState } from 'react';
import Link from 'next/link';
import SyncRetryButton from './SyncRetryButton';
import RetryWebhookButton from './RetryWebhookButton';

interface WebhookFailure {
  id: string;
  event_type: string;
  created_at: string;
}

interface UserError {
  userId: string;
  email: string;
  errorType: 'subscription_incomplete' | 'subscription_past_due' | 'webhook_failed';
  message: string;
  subscriptionStatus?: string;
  webhookFailures?: WebhookFailure[];
  webhookCount?: number;
}

interface UserErrorsRepairClientProps {
  errors: UserError[];
}

export default function UserErrorsRepairClient({ errors }: UserErrorsRepairClientProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">User Errors & Repair</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Error</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {errors.map((error) => {
              const rowKey = `${error.userId}-${error.errorType}`;
              const isExpanded = expandedRows.has(rowKey);
              const hasMultipleFailures = error.webhookFailures && error.webhookFailures.length > 1;

              return (
                <>
                  <tr key={rowKey} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/users/${error.userId}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {error.email}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2">
                        <span>{error.message}</span>
                        {error.webhookCount && error.webhookCount > 1 && (
                          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                            {error.webhookCount} failures
                          </span>
                        )}
                        {hasMultipleFailures && (
                          <button
                            onClick={() => toggleRow(rowKey)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${
                        error.errorType === 'subscription_incomplete' 
                          ? 'bg-red-500 text-white' 
                          : error.errorType === 'subscription_past_due'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}>
                        {error.subscriptionStatus || error.errorType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {error.errorType === 'webhook_failed' && error.webhookFailures && error.webhookFailures.length > 0 ? (
                        <RetryWebhookButton eventId={error.webhookFailures[0].id} />
                      ) : (
                        <SyncRetryButton userId={error.userId} />
                      )}
                    </td>
                  </tr>
                  {isExpanded && hasMultipleFailures && error.webhookFailures && (
                    <tr key={`${rowKey}-expanded`}>
                      <td colSpan={4} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                        <div className="pl-8 space-y-2">
                          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            All Failed Webhooks:
                          </div>
                          {error.webhookFailures.map((failure) => (
                            <div
                              key={failure.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex-1">
                                <div className="text-sm text-gray-900 dark:text-gray-100">
                                  <span className="font-medium">{failure.event_type}</span>
                                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                                    {new Date(failure.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
                                  {failure.id}
                                </div>
                              </div>
                              <div className="ml-4">
                                <RetryWebhookButton eventId={failure.id} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
