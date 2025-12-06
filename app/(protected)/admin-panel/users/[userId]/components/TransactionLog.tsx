'use client';

import { useEffect, useState } from 'react';

interface TransactionLogProps {
  userId: string;
}

export default function TransactionLog({ userId }: TransactionLogProps) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTransactionLog() {
      try {
        const response = await fetch(`/api/admin/users/${userId}/transactions`);
        if (!response.ok) {
          throw new Error('Failed to fetch transaction log');
        }
        const data = await response.json();
        setTransactions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchTransactionLog();
  }, [userId]);

  if (loading) {
    return <div>Loading transaction log...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow mt-4">
      <h2 className="text-xl font-bold mb-4">Transaction Log</h2>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2">Date</th>
            <th className="py-2">Event Type</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction: any) => (
            <tr key={transaction.id}>
              <td className="border px-4 py-2">
                {new Date(transaction.created_at).toLocaleString()}
              </td>
              <td className="border px-4 py-2">{transaction.event_type}</td>
              <td className="border px-4 py-2">{transaction.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
