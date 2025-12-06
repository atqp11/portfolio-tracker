'use client';

import type { Profile } from '@lib/supabase/db';
import UserActions from './UserActions';

interface UserTableProps {
  users: Profile[];
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
}

export default function UserTable({ users, onDeactivate, onReactivate }: UserTableProps) {
  return (
    <table className="min-w-full bg-white">
      <thead>
        <tr>
          <th className="py-2">Email</th>
          <th className="py-2">Tier</th>
          <th className="py-2">Status</th>
          <th className="py-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="border px-4 py-2">{user.email}</td>
            <td className="border px-4 py-2">{user.tier}</td>
            <td className="border px-4 py-2">{user.subscription_status}</td>
            <td className="border px-4 py-2">
              <a href={`/admin-panel/users/${user.id}`} className="text-blue-500 mr-4">
                View
              </a>
              <UserActions
                userId={user.id}
                isActive={user.is_active ?? false}
                onDeactivate={onDeactivate}
                onReactivate={onReactivate}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
