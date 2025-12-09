import { requireUser } from '@lib/auth/session';
import { isUserAdmin } from '@lib/supabase/db';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication and admin check
  const user = await requireUser();
  const isAdmin = await isUserAdmin(user.id);

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return <div>{children}</div>;
}
