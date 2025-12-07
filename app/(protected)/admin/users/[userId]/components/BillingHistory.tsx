"use client";

import { useState } from "react";
import RefundModal from "./RefundModal";

interface NormalizedCharge {
  id: string;
  amount: number; // cents
  currency?: string;
  status?: string;
  description?: string | null;
  refunded?: boolean;
  createdIso?: string | null; // ISO date string
}

interface BillingHistoryProps {
  charges: NormalizedCharge[];
  userId: string;
}

export default function BillingHistory({ charges, userId }: BillingHistoryProps) {
  const [selectedCharge, setSelectedCharge] = useState<NormalizedCharge | null>(null);

  if (!charges || charges.length === 0) {
    return (
      <div className="bg-transparent p-0 mt-0 text-gray-100">
        <h2 className="text-xl font-bold mb-4 text-gray-100">Billing History</h2>
        <div className="text-gray-400">No billing history found.</div>
      </div>
    );
  }

  const sortedCharges = [...charges].sort((a, b) => {
    const aTs = a.createdIso ? Date.parse(a.createdIso) : 0;
    const bTs = b.createdIso ? Date.parse(b.createdIso) : 0;
    return bTs - aTs;
  });

  const latestChargeId = sortedCharges[0]?.id;

  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">Billing History</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-gray-200">
          <thead>
            <tr className="border-b">
              <th className="py-2">Date</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
              <th className="py-2">Description</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedCharges.map((charge) => (
              <tr key={charge.id} className="border-b last:border-0">
                <td className="py-2">{charge.createdIso ? charge.createdIso.slice(0, 10) : '—'}</td>
                <td className="py-2">{(charge.amount / 100).toFixed(2)} {charge.currency?.toUpperCase()}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    charge.status === 'succeeded' ? 'bg-green-800 text-green-100' :
                    charge.status === 'failed' ? 'bg-red-800 text-red-100' :
                    'bg-gray-700 text-gray-100'
                  }`}>
                    {charge.status}
                  </span>
                </td>
                <td className="py-2 text-gray-300">{charge.description || 'N/A'}</td>
                <td className="py-2">
                  <a
                    href={`https://dashboard.stripe.com/payments/${charge.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline mr-2"
                  >
                    Stripe
                  </a>
                  {charge.status === 'succeeded' && !charge.refunded && charge.id === latestChargeId && (
                    <button
                      className="text-red-400 hover:underline"
                      onClick={() => setSelectedCharge(charge)}
                    >
                      Refund
                    </button>
                  )}
                  {charge.status === 'succeeded' && !charge.refunded && charge.id !== latestChargeId && (
                    <span className="text-gray-400 text-xs" title="Only the latest payment can be refunded via Admin Panel">
                      Refund (Latest Only)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCharge && (
        <RefundModal
          userId={userId}
          chargeId={selectedCharge.id}
          amount={selectedCharge.amount}
          currency={selectedCharge.currency || 'usd'}
          isOpen={!!selectedCharge}
          onClose={() => setSelectedCharge(null)}
        />
      )}
    </div>
  );
}
