import { usersService } from '@backend/modules/admin/service/users.service';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';
import ClearCacheButton from '../components/ClearCacheButton';
import { getUser } from '@lib/auth/session';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
  // searchParams can be a Promise of URLSearchParams (older Next) or a plain object
  // depending on the server runtime. Resolve safely below.
  searchParams: Promise<URLSearchParams | Record<string, string | string[]>>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const searchParamsResolved = await searchParams;

  const getParam = (sp: URLSearchParams | Record<string, string | string[]>, key: string): string | undefined => {
    if (!sp) return undefined;
    if (typeof (sp as URLSearchParams).get === 'function') {
      return (sp as URLSearchParams).get(key) ?? undefined;
    }
    // Treat sp as a plain object: support string or string[] values
    const v = (sp as Record<string, string | string[]>)[key];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  const email = getParam(searchParamsResolved, 'email');
  const tier = getParam(searchParamsResolved, 'tier');
  const status = getParam(searchParamsResolved, 'status');

  // Get current user ID to prevent self-deactivation
  const currentUser = await getUser();
  const currentUserId = currentUser?.id || null;

  // fetch all users with usage info, then apply optional filters
  const allUsers = await usersService.fetchAllUsersWithUsage();

  const usersWithUsage = allUsers.filter((u) => {
    if (email && !u.email?.toLowerCase().includes(String(email).toLowerCase())) return false;
    if (tier && String(u.tier) !== String(tier)) return false;
    if (status) {
      // status filter may be 'active', 'deactivated', or subscription status
      // Use camelCase from service (isActive, subscriptionStatus)
      if (status === 'active' && u.isActive === false) return false;
      if (status === 'deactivated' && u.isActive !== false) return false;
      // otherwise match subscriptionStatus
      if (status !== 'active' && status !== 'deactivated' && String(u.subscriptionStatus) !== String(status)) return false;
    }

    return true;
  });

  // precompute stats on server
  const total = usersWithUsage.length;
  const freeCount = usersWithUsage.filter((u) => u.tier === 'free').length;
  const basicCount = usersWithUsage.filter((u) => u.tier === 'basic').length;
  const premiumCount = usersWithUsage.filter((u) => u.tier === 'premium').length;

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
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-sm text-gray-300 mt-1">Manage users, subscriptions, and billing</p>
          </div>

        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">All time</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Free Tier</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{freeCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Active</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Basic Tier</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{basicCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Active</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Premium Tier</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{premiumCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Active</p>
          </div>
        </div>
          {/* Cache management card to match /admin page */}
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:col-span-1">
              <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-1">Cache Management</h3>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">Clear or inspect L2/L3 caches used by the application.</p>
              <div className="flex items-center">
                <ClearCacheButton />
              </div>
            </div>
        {/* Filters + table */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <UserFilters />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  

            <div className="md:col-span-3 space-y-4">
     

              <UserTable users={usersWithUsage} currentUserId={currentUserId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
