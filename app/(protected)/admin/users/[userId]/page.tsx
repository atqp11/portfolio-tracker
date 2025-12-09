import { adminController } from '@backend/modules/admin/admin.controller';
import { requireAdmin } from '@lib/auth/session';
import UserHeader from './components/UserHeader';
import StateDiagnostics from './components/StateDiagnostics';
import PlanManagement from './components/PlanManagement';
import AdminActionsGrouped from './components/AdminActionsGrouped';
import BillingHistory from './components/BillingHistory';
import WebhookEventsLog from './components/WebhookEventsLog';
import ErrorsMismatches from './components/ErrorsMismatches';
import DebugTools from './components/DebugTools';
import { notFound, redirect } from 'next/navigation';
import { CaseConverter } from '@lib/transformers/base-transformer';
import Link from 'next/link';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  await requireAdmin();

  const paramsResolved = await params;
  const { userId } = paramsResolved;

  const user = await adminController.getUserDetailsData(userId);

  if (!user) {
    notFound();
  }

  // Fetch related data in parallel
  const [billingHistoryRaw, transactionsRaw, stripeStatus] = await Promise.all([
    adminController.getUserBillingHistoryData(userId).catch(() => []),
    adminController.getUserTransactionsData(userId).catch(() => []),
    adminController.getStripeSubscriptionStatusData(userId).catch(() => ({ status: null, lastSync: null })),
  ]);

  // Transform invoices from Stripe API
  const invoices: Stripe.Invoice[] = (billingHistoryRaw || []) as Stripe.Invoice[];

  // Transform transactions from database
  interface TransactionData {
    id: string;
    eventType: string;
    status: string;
    metadata?: Record<string, unknown>;
    createdIso: string | null;
  }

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/users"
            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← Back to User Management
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Details</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">User billing, transactions and administrative actions</p>
          </div>
        </div>

        {/* 1. Unified Header: User Profile + Subscription */}
        <UserHeader user={user} />

        {/* 2. State Diagnostics */}
        <StateDiagnostics user={user} transactions={transactions} stripeStatus={stripeStatus} />

        {/* 3. Plan Management */}
        <PlanManagement user={user} />

        {/* 4. Primary Actions + Danger Zone */}
        <AdminActionsGrouped user={user} />

        {/* 5. Billing History */}
        <BillingHistory invoices={invoices} userId={userId} user={user} />

        {/* 6. Webhook Events Log */}
        <WebhookEventsLog transactions={transactions} />

        {/* 7. Errors & Mismatches */}
        <ErrorsMismatches user={user} transactions={transactions} />

        {/* 8. Debug Tools */}
        <DebugTools user={user} />
      </div>
    </div>
  );
}
