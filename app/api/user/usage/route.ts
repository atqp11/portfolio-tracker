/**
 * User Usage API Route
 *
 * Thin route handler using middleware chain.
 * Follows MVC pattern: Route → Controller → Service → Repository
 *
 * Pipeline:
 * 1. Error handling (withErrorHandler)
 * 2. Authentication (withAuthContext)
 * 3. Controller → Service → Repository
 */

import { NextRequest } from 'next/server';
import { userController } from '@backend/modules/user/user.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAuthContext } from '@backend/common/middleware/cache-quota.middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/user/usage
 * Returns current usage statistics for authenticated user
 */
export const GET = withErrorHandler(
  withAuthContext(
    (req: NextRequest, context: any) => userController.getUsage(req, context)
  )
);
