'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserActionsProps {
  userId: string;
  isActive: boolean;
}

export default function UserActions({ userId, isActive }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin deactivation' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }
      
      router.refresh();
    } catch (error) {
      alert('Error deactivating user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate this user?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/reactivate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate user');
      }

      router.refresh();
    } catch (error) {
      alert('Error reactivating user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <span className="text-gray-500">Processing...</span>;

  return (
    <div className="inline-block">
      {isActive ? (
        <button onClick={handleDeactivate} className="text-red-500 hover:text-red-700">
          Deactivate
        </button>
      ) : (
        <button onClick={handleReactivate} className="text-green-500 hover:text-green-700">
          Reactivate
        </button>
      )}
    </div>
  );
}
