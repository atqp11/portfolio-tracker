'use client';

import { useEffect, useState } from 'react';
import type { Profile } from '@lib/supabase/db';
import UserTable from './components/UserTable';
import UserFilters from './components/UserFilters';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const handleFilterChange = (filters: any) => {
    let filtered = users;
    if (filters.email) {
      filtered = filtered.filter((user) =>
        user.email.toLowerCase().includes(filters.email.toLowerCase())
      );
    }
    if (filters.tier) {
      filtered = filtered.filter((user) => user.tier === filters.tier);
    }
    if (filters.status) {
      filtered = filtered.filter((user) => user.subscription_status === filters.status);
    }
    setFilteredUsers(filtered);
  };

  const handleDeactivate = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin deactivation' }),
      });
      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }
      // a temp variable to hold the updated users
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, is_active: false } : user
      );
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to reactivate user');
      }
      const updatedUsers = users.map((user) =>
        user.id === userId ? { ...user, is_active: true } : user
      );
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <UserFilters onFilterChange={handleFilterChange} />
      <UserTable 
        users={filteredUsers} 
        onDeactivate={handleDeactivate}
        onReactivate={handleReactivate}
      />
    </div>
  );
}
