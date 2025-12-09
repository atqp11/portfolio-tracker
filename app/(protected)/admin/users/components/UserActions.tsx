'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deactivateUser, reactivateUser } from '../[userId]/actions';

interface UserActionsProps {
  userId: string;
  isActive: boolean;
  currentUserId?: string | null;
}

export default function UserActions({ userId, isActive, currentUserId }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const isCurrentUser = userId === currentUserId;

  const handleDeactivate = async () => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    setLoading(true);
    try {
      await deactivateUser(userId, 'Admin deactivation');
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error deactivating user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate this user?')) return;

    setLoading(true);
    try {
      await reactivateUser(userId);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error reactivating user');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <span className="text-gray-500 dark:text-gray-400">Processing...</span>;

  return (
    <div className="inline-block">
      {isActive ? (
        <button 
          onClick={handleDeactivate} 
          disabled={isCurrentUser || loading}
          className={`${
            isCurrentUser 
              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' 
              : 'text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isCurrentUser ? 'You cannot deactivate your own account' : 'Deactivate user'}
        >
          Deactivate
        </button>
      ) : (
        <button onClick={handleReactivate} className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
          Reactivate
        </button>
      )}
    </div>
  );
}
