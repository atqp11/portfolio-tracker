'use client';

import { useState } from 'react';

interface UserActionsProps {
  userId: string;
  isActive: boolean;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
}

export default function UserActions({ userId, isActive, onDeactivate, onReactivate }: UserActionsProps) {
  const handleDeactivate = async () => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      onDeactivate(userId);
    }
  };

  const handleReactivate = async () => {
    if (confirm('Are you sure you want to reactivate this user?')) {
      onReactivate(userId);
    }
  };

  return (
    <div>
      {isActive ? (
        <button onClick={handleDeactivate} className="text-red-500">
          Deactivate
        </button>
      ) : (
        <button onClick={handleReactivate} className="text-green-500">
          Reactivate
        </button>
      )}
    </div>
  );
}
