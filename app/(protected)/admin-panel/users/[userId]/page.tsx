'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Profile } from '@lib/supabase/db';
import UserProfile from './components/UserProfile';
import SubscriptionCard from './components/SubscriptionCard';
import BillingHistory from './components/BillingHistory';
import TransactionLog from './components/TransactionLog';
import ErrorLog from './components/ErrorLog';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUser() {
      if (!userId) return;
      try {
        const response = await fetch(`/api/admin/users/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, [userId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div>
      <UserProfile user={user} />
      <SubscriptionCard user={user} />
      <BillingHistory userId={userId} />
      <TransactionLog userId={userId} />
      <ErrorLog />
    </div>
  );
}
