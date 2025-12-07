import { getUserDetails, getUserBillingHistory, getUserTransactions } from '@/src/backend/modules/admin/service/admin.service';
import UserProfile from './components/UserProfile';
import SubscriptionCard from './components/SubscriptionCard';
import BillingHistory from './components/BillingHistory';
import TransactionLog from './components/TransactionLog';
import ErrorLog from './components/ErrorLog';
import AdminActionsPanel from './components/AdminActionsPanel';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const paramsResolved = await params;
  const { userId } = paramsResolved;

  const user = await getUserDetails(userId);

  if (!user) {
    notFound();
  }

  // Fetch related data in parallel
  const [billingHistoryRaw, transactionsRaw] = await Promise.all([
    getUserBillingHistory(userId).catch(() => []),
    getUserTransactions(userId).catch(() => []),
  ]);

  // Normalize and pre-format time fields on the server to produce deterministic HTML
  const billingHistory = (billingHistoryRaw || []).map((c: any) => ({
    id: c.id,
    amount: c.amount,
    currency: c.currency,
    status: c.status,
    description: c.description,
    refunded: c.refunded,
    createdIso: c.created ? new Date(c.created * 1000).toISOString() : null,
  }));

  const transactions = (transactionsRaw || []).map((t: any) => ({
    id: t.id,
    event_type: t.event_type,
    status: t.status,
    metadata: t.metadata,
    createdIso: t.created_at ? new Date(t.created_at).toISOString() : null,
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">User Details</h1>
            <p className="text-sm text-gray-300 mt-1">User billing, transactions and administrative actions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <UserProfile user={user} />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <SubscriptionCard user={user} />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <AdminActionsPanel user={user} />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <BillingHistory charges={billingHistory} userId={userId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <TransactionLog transactions={transactions} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <ErrorLog transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  );
}
