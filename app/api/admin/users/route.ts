import { NextRequest } from 'next/server';
import { requireAdmin } from '@lib/auth/admin';
import { adminController } from '@/src/backend/modules/admin/admin.controller';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(req);
  if (authError) return authError;

  // Delegate to controller
  return await adminController.getUsers(req);
}