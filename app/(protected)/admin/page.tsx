import { redirect } from 'next/navigation';
import { requireUser, getUserProfile } from '@lib/auth/session';
import AdminPageClient from './AdminPageClient';

export default async function AdminPage() {
  // Server-side authentication and admin check
  const user = await requireUser();
  const profile = await getUserProfile();

  // Ensure user is admin
  if (!profile?.is_admin) {
    redirect('/dashboard');
  }

  return <AdminPageClient />;
}
