import { getUserDetails, getUserBillingHistory, getUserTransactions } from '@backend/modules/admin/service/admin.service';
import { requireUser, getUserProfile } from '@lib/auth/session';
import UserProfile from './components/UserProfile';
import SubscriptionCard from './components/SubscriptionCard';
import BillingHistory from './components/BillingHistory';
import TransactionLog from './components/TransactionLog';
import ErrorLog from './components/ErrorLog';
import AdminActionsPanel from './components/AdminActionsPanel';
import { notFound, redirect } from 'next/navigation';
import { CaseConverter } from '@lib/transformers/base-transformer';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  // Server-side auth & admin check — require login and ensure viewer is admin
  await requireUser();
  const viewerProfile = await getUserProfile();
  if (!viewerProfile?.is_admin) return redirect('/dashboard');

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
  // Billing history comes from Stripe API (already camelCase)
  interface StripeCharge {
    id: string;
    amount: number;
    currency: string;
    status: string;
    description?: string | null;
    refunded?: boolean;
    created?: number;
  }

  interface TransactionData {
    id: string;
    eventType: string;
    status: string;
    metadata?: Record<string, unknown>;
    createdIso: string | null;
  }

  const billingHistory = (billingHistoryRaw || []).map((c: StripeCharge) => ({
    id: c.id,
    amount: c.amount,
    currency: c.currency,
    status: c.status,
    description: c.description,
    refunded: c.refunded,
    createdIso: c.created ? new Date(c.created * 1000).toISOString() : null,
  }));

  // Transactions come from database (snake_case) - transform to camelCase for API contract
  const transactions: TransactionData[] = (transactionsRaw || []).map((t: Record<string, unknown>) => {
    const transformed = CaseConverter.objectSnakeToCamel<{ id: string; eventType: string; status: string; metadata?: Record<string, unknown>; createdAt?: string }>(t);
    return {
      id: transformed.id,
      eventType: transformed.eventType,
      status: transformed.status,
      metadata: transformed.metadata,
      createdIso: transformed.createdAt ? new Date(transformed.createdAt).toISOString() : null,
    };
  });

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Details</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">User billing, transactions and administrative actions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <UserProfile user={user} />
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <SubscriptionCard user={user} />
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <AdminActionsPanel user={user} />
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <BillingHistory charges={billingHistory} userId={userId} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <TransactionLog transactions={transactions} />
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <ErrorLog transactions={transactions} />
          </div>
        </div>
      </div>
    </div>
  );
}
