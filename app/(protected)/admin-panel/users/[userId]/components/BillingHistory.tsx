'use client';

import { useEffect, useState } from 'react';

interface BillingHistoryProps {
  userId: string;
}

export default function BillingHistory({ userId }: BillingHistoryProps) {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBillingHistory() {
      try {
        const response = await fetch(`/api/admin/users/${userId}/billing-history`);
        if (!response.ok) {
          throw new Error('Failed to fetch billing history');
        }
        const data = await response.json();
        setCharges(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchBillingHistory();
  }, [userId]);

  if (loading) {
    return <div>Loading billing history...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-xl font-bold mb-4">Billing History</h2>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2">Date</th>
            <th className="py-2">Amount</th>
            <th className="py-2">Status</th>
            <th className="py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((charge: any) => (
            <tr key={charge.id}>
              <td className="border px-4 py-2">
                {new Date(charge.created * 1000).toLocaleDateString()}
              </td>
              <td className="border px-4 py-2">
                ${(charge.amount / 100).toFixed(2)} {charge.currency.toUpperCase()}
              </td>
              <td className="border px-4 py-2">{charge.status}</td>
              <td className="border px-4 py-2">
                {charge.status === 'succeeded' && (
                  <button className="text-blue-500">Refund</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
