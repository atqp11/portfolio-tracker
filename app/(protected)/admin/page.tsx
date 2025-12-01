'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TierBadge from '@/components/shared/TierBadge';
import { TIER_CONFIG } from '@lib/tiers/config';

interface UserUsage {
  chatQueries: number;
  portfolioAnalysis: number;
  secFilings: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'basic' | 'premium';
  is_admin: boolean;
  created_at: string;
  subscription_status: string | null;
  usage: {
    daily: UserUsage | null;
    monthly: UserUsage | null;
  };
}

interface UsersResponse {
  users: User[];
  total: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/users');

      if (response.status === 401 || response.status === 403) {
        // Not authorized - redirect to dashboard
        router.push('/dashboard');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      // API returns { success: true, data: { users, total } }
      const data = result.data || result;
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function updateUserTier(userId: string, tier: 'free' | 'basic' | 'premium') {
    try {
      setActionLoading(`tier-${userId}`);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to update tier');
      }

      // Refresh users list
      await fetchUsers();
    } catch (err) {
      console.error('Error updating tier:', err);
      alert('Failed to update tier');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    try {
      setActionLoading(`admin-${userId}`);

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_admin: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update admin status');
      }

      // Refresh users list
      await fetchUsers();
    } catch (err) {
      console.error('Error updating admin status:', err);
      alert('Failed to update admin status');
    } finally {
      setActionLoading(null);
    }
  }

  async function resetQuota(userId: string, userName: string, userEmail: string) {
    const displayName = userName || userEmail;

    if (!confirm(`Are you sure you want to reset quota for ${displayName}?\n\nThis will clear all usage tracking and allow them to use their full quota immediately.`)) {
      return;
    }

    try {
      setActionLoading(`quota-${userId}`);

      const response = await fetch(`/api/admin/users/${userId}/quota`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reset quota');
      }

      // Refresh users list
      await fetchUsers();
      alert(`Quota reset successfully for ${displayName}`);
    } catch (err) {
      console.error('Error resetting quota:', err);
      alert(`Failed to reset quota for ${displayName}`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Admin Panel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage users, tiers, and quotas
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {users.length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Free Tier</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {users.filter((u) => u.tier === 'free').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Basic Tier</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {users.filter((u) => u.tier === 'basic').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Premium Tier</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {users.filter((u) => u.tier === 'premium').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((user) => {
                const dailyUsage = user.usage.daily;
                const tierLimits = TIER_CONFIG[user.tier];

                return (
                  <tr key={user.id}>
                    {/* User Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                          {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {user.name || user.email.split('@')[0]}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tier */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.tier}
                        onChange={(e) => updateUserTier(user.id, e.target.value as any)}
                        disabled={actionLoading === `tier-${user.id}`}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50"
                      >
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>

                    {/* Admin Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                        disabled={actionLoading === `admin-${user.id}`}
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          user.is_admin
                            ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                        } hover:opacity-80 disabled:opacity-50`}
                      >
                        {user.is_admin ? 'Admin' : 'User'}
                      </button>
                    </td>

                    {/* Usage */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
                        <div>
                          Chat: {dailyUsage?.chatQueries || 0} /{' '}
                          {tierLimits.chatQueriesPerDay === Infinity
                            ? '∞'
                            : tierLimits.chatQueriesPerDay}
                          <span className="text-xs text-gray-500 ml-1">(daily)</span>
                        </div>
                        <div>
                          Analysis: {dailyUsage?.portfolioAnalysis || 0} /{' '}
                          {tierLimits.portfolioAnalysisPerDay === Infinity
                            ? '∞'
                            : tierLimits.portfolioAnalysisPerDay}
                          <span className="text-xs text-gray-500 ml-1">(daily)</span>
                        </div>
                        <div>
                          SEC: {user.usage.monthly?.secFilings || 0} /{' '}
                          {tierLimits.secFilingsPerMonth === Infinity
                            ? '∞'
                            : tierLimits.secFilingsPerMonth}
                          <span className="text-xs text-gray-500 ml-1">(monthly)</span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => resetQuota(user.id, user.name || '', user.email)}
                        disabled={actionLoading === `quota-${user.id}`}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                      >
                        Reset Quota
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
