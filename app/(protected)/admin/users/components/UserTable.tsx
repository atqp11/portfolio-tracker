'use client';

import type { AdminUserDto } from '@backend/modules/admin/dto/admin.dto';
import UserActions from './UserActions';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// (old Profile-based typing removed — this component now receives AdminUserDto)

interface UserTableProps {
  users: AdminUserDto[];
  currentUserId?: string | null;
}

export default function UserTable({ users, currentUserId }: UserTableProps) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usage</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                    {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name || user.email.split('@')[0]}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                  </div>
                </div>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <select
                  defaultValue={user.tier ?? 'free'}
                  onChange={async (e) => {
                    const newTier = e.target.value;
                    try {
                        const res = await fetch(`/api/admin/users/${user.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tier: newTier }),
                        });
                        if (!res.ok) throw new Error('Failed to update tier');
                      // refresh to reflect changes without full page reload
                      router.refresh();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Failed to update tier');
                    }
                  }}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                >
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                </select>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {/* Admin flag column */}
                {user.isAdmin ? (
                  <span className="px-2 py-1 rounded text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">Admin</span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">User</span>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {/* Usage - service returns camelCase */}
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  <div>Chat: {user.usage?.daily?.chatQueries ?? 0}</div>
                  <div>Analysis: {user.usage?.daily?.portfolioAnalysis ?? 0}</div>
                  <div>SEC: {user.usage?.monthly?.secFilings ?? 0}</div>
                </div>
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {user.isActive === false ? (
                  <span className="px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Deactivated</span>
                ) : (
                  <span className="px-2 py-1 rounded text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Active</span>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                <Link href={`/admin/users/${user.id}`} className="text-indigo-400 hover:text-indigo-300 dark:text-indigo-500 dark:hover:text-indigo-400">
                  View
                </Link>
                <UserActions userId={user.id} isActive={user.isActive ?? false} currentUserId={currentUserId} />
                <button
                  onClick={async () => {
                    if (!confirm('Reset quota for this user?')) return;
                    try {
                      const r = await fetch(`/api/admin/users/${user.id}/quota`, { method: 'DELETE' });
                      if (!r.ok) throw new Error('Failed to reset quota');
                      alert('Quota reset');
                      router.refresh();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Failed to reset quota');
                    }
                  }}
                  className="text-sm text-red-400 hover:text-red-300 dark:text-red-500 dark:hover:text-red-400 ml-3"
                >
                  Reset Quota
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
