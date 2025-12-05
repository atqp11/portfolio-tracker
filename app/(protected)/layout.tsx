import DashboardLayout from '@/components/layout/DashboardLayout';
import { requireUser } from '@lib/auth/session';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication check
  await requireUser();
  
  return <DashboardLayout>{children}</DashboardLayout>;
}
