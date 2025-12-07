'use client';

import type { Profile } from '@lib/supabase/db';

interface UserProfileProps {
  user: Profile;
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="bg-transparent p-0 mt-0 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-100">User Profile</h2>
      <div className="text-gray-300">
        <strong className="text-gray-200">Email:</strong> {user.email}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Name:</strong> {user.full_name}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">User ID:</strong> {user.id}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Created:</strong> {new Date(user.created_at).toLocaleString()}
      </div>
      <div className="text-gray-300">
        <strong className="text-gray-200">Account Status:</strong> {user.is_active ? 'Active' : 'Deactivated'}
      </div>
    </div>
  );
}
