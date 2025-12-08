import { usersService } from '@backend/modules/admin/service/users.service';
import UserTable from './UserTable';
import UserFilters from './UserFilters';
import { getUser } from '@lib/auth/session';
import ClearCacheButton from '../../components/ClearCacheButton';

interface UsersTabProps {
  searchParams: Promise<URLSearchParams | Record<string, string | string[]>>;
}

export default async function UsersTab({ searchParams }: UsersTabProps) {
  const searchParamsResolved = await searchParams;

  const getParam = (sp: URLSearchParams | Record<string, string | string[]>, key: string): string | undefined => {
    if (!sp) return undefined;
    if (typeof (sp as URLSearchParams).get === 'function') {
      return (sp as URLSearchParams).get(key) ?? undefined;
    }
    const v = (sp as Record<string, string | string[]>)[key];
    if (Array.isArray(v)) return v[0];
    return v ?? undefined;
  };

  const email = getParam(searchParamsResolved, 'email');
  const tier = getParam(searchParamsResolved, 'tier');
  const status = getParam(searchParamsResolved, 'status');

  const currentUser = await getUser();
  const currentUserId = currentUser?.id || null;

  const allUsers = await usersService.fetchAllUsersWithUsage();

  const usersWithUsage = allUsers.filter((u) => {
    if (email && !u.email?.toLowerCase().includes(String(email).toLowerCase())) return false;
    if (tier && String(u.tier) !== String(tier)) return false;
    if (status) {
      if (status === 'active' && u.isActive === false) return false;
      if (status === 'deactivated' && u.isActive !== false) return false;
      if (status !== 'active' && status !== 'deactivated' && String(u.subscriptionStatus) !== String(status)) return false;
    }
    return true;
  });

  const total = usersWithUsage.length;
  const freeCount = usersWithUsage.filter((u) => u.tier === 'free').length;
  const basicCount = usersWithUsage.filter((u) => u.tier === 'basic').length;
  const premiumCount = usersWithUsage.filter((u) => u.tier === 'premium').length;

  return (
    <>
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

      {/* Cache management card */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 md:col-span-1 mb-6">
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
    </>
  );
}


