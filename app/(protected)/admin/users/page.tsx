import Link from 'next/link';
import UsersPageClient from './components/UsersPageClient';
import UsersTab from './components/UsersTab';
import BillingAdminTab from './components/BillingAdminTab';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<URLSearchParams | Record<string, string | string[]>>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          >
            ← Back to Admin Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User & Billing Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Manage users, subscriptions, billing events, and webhook diagnostics.</p>
          </div>
        </div>

        <UsersPageClient
          usersTab={<UsersTab searchParams={searchParams} />}
          billingTab={<BillingAdminTab />}
        />
      </div>
    </div>
  );
}
