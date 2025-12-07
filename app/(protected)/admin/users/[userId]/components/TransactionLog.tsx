"use client";

interface NormalizedTransaction {
  id: string;
  event_type: string;
  status: string;
  metadata?: any;
  createdIso?: string | null;
}

interface TransactionLogProps {
  transactions: NormalizedTransaction[];
}

export default function TransactionLog({ transactions }: TransactionLogProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-transparent p-0 mt-0 text-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-100">Transaction Log</h2>
        <div className="text-gray-400">No transactions found.</div>
      </div>
    );
  }

  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">Transaction Log</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-200">
          <thead>
            <tr className="border-b">
              <th className="py-2">Date</th>
              <th className="py-2">Event Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction: any) => (
              <tr key={transaction.id} className="border-b last:border-0">
                <td className="py-2">
                  {/* Use server-provided ISO timestamp for deterministic output */}
                  {transaction.createdIso ? transaction.createdIso.replace('T', ' ').slice(0, 19) : '—'}
                </td>
                <td className="py-2">{transaction.event_type}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    transaction.status === 'completed' ? 'bg-green-800 text-green-100' :
                    transaction.status === 'failed' ? 'bg-red-800 text-red-100' :
                    'bg-gray-700 text-gray-100'
                  }`}>
                    {transaction.status}
                  </span>
                </td>
                <td className="py-2 text-xs text-gray-400 max-w-xs truncate">
                  {JSON.stringify(transaction.metadata)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
