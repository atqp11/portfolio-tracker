/**
 * Admin Users API Route
 *
 * Admin-only endpoint to manage users.
 * Uses admin client to bypass RLS.
 */

import { NextRequest } from 'next/server';
import { adminController } from '@backend/modules/admin/admin.controller';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return adminController.getUsers(request);
}
