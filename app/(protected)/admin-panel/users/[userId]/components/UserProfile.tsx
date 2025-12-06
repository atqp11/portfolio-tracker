'use client';

import type { Profile } from '@lib/supabase/db';

interface UserProfileProps {
  user: Profile;
}

export default function UserProfile({ user }: UserProfileProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">User Profile</h2>
      <div>
        <strong>Email:</strong> {user.email}
      </div>
      <div>
        <strong>Name:</strong> {user.full_name}
      </div>
      <div>
        <strong>User ID:</strong> {user.id}
      </div>
      <div>
        <strong>Created:</strong> {new Date(user.created_at).toLocaleString()}
      </div>
      <div>
        <strong>Account Status:</strong> {user.is_active ? 'Active' : 'Deactivated'}
      </div>
    </div>
  );
}
