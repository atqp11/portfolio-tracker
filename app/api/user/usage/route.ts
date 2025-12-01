/**
 * User Usage API Route
 *
 * Thin route handler that delegates to UserController.
 * Follows MVC pattern: Route → Controller → Service → Repository
 *
 * Pipeline:
 * 1. Authenticate user (controller)
 * 2. Fetch raw usage data (service → repository)
 * 3. Calculate metrics and percentages (service)
 * 4. Generate warnings (service)
 */

import { NextRequest } from 'next/server';
import { userController } from '@backend/modules/user/user.controller';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/user/usage
 * Returns current usage statistics for authenticated user
 */
export async function GET(req: NextRequest) {
  return userController.getUsage(req);
}
