"use client";

import type { Profile } from '@lib/supabase/db';
import type Stripe from 'stripe';

interface BillingHistoryProps {
  invoices: Stripe.Invoice[];
  userId: string;
  user: Profile;
}

export default function BillingHistory({ invoices, userId, user }: BillingHistoryProps) {
  // If user is on free tier, show message
  if (user.tier === 'free' || !user.stripe_customer_id) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing History</h2>
        <div className="text-gray-600 dark:text-gray-400">
          This user is on a free tier. No billing history.
        </div>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing History</h2>
        <div className="text-gray-600 dark:text-gray-400">No billing history found.</div>
      </div>
    );
  }

  const sortedInvoices = [...invoices].sort((a, b) => {
    return (b.created || 0) - (a.created || 0);
  });

  const getStatusBadge = (status: string | null) => {
    if (!status) return { label: 'Unknown', color: 'bg-gray-500' };
    
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid') {
      return { label: 'Paid', color: 'bg-green-500' };
    }
    if (statusLower === 'open') {
      return { label: 'Open', color: 'bg-yellow-500' };
    }
    if (statusLower === 'void') {
      return { label: 'Void', color: 'bg-gray-500' };
    }
    if (statusLower === 'uncollectible') {
      return { label: 'Uncollectible', color: 'bg-red-500' };
    }
    return { label: status, color: 'bg-gray-500' };
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Next Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedInvoices.map((invoice) => {
              const statusBadge = getStatusBadge(invoice.status);
              return (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-900 dark:text-gray-100">{invoice.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {invoice.created ? new Date(invoice.created * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    ${((invoice.amount_due || 0) / 100).toFixed(2)} {invoice.currency?.toUpperCase() || 'USD'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs text-white ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {invoice.next_payment_attempt
                      ? new Date(invoice.next_payment_attempt * 1000).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invoice.hosted_invoice_url && (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline mr-2"
                      >
                        View Invoice
                      </a>
                    )}
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Download PDF
                      </a>
                    )}
                    {!invoice.hosted_invoice_url && !invoice.invoice_pdf && (
                      <a
                        href={`https://dashboard.stripe.com/invoices/${invoice.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Stripe Dashboard
                      </a>
                    )}
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
