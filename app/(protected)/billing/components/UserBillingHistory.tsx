import type Stripe from 'stripe';

interface UserBillingHistoryProps {
  invoices: Stripe.Invoice[];
}

export default function UserBillingHistory({ invoices }: UserBillingHistoryProps) {
  if (!invoices || invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing History</h2>
        <div className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          No billing history found. Invoices will appear here once you have an active subscription.
        </div>
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

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return '—';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null, currency: string = 'usd') => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-900 dark:text-white">Billing History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Description
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {sortedInvoices.map((invoice) => {
              const statusBadge = getStatusBadge(invoice.status);
              const description = invoice.lines?.data[0]?.description || 
                                 `Invoice ${invoice.number || invoice.id.slice(-8)}`;
              
              return (
                <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.created)}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {description}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency || 'usd')}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs text-white ${statusBadge.color}`}>
                      {statusBadge.label}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm">
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Invoice
                      </a>
                    ) : invoice.invoice_pdf ? (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Download PDF
                      </a>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">—</span>
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
