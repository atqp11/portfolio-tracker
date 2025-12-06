/**
 * Admin Users API Routes
 *
 * GET /api/admin/users - List all users with optional filters
 * 
 * Uses middleware pattern consistent with other CRUD entities.
 */

import { NextRequest } from 'next/server';
import { adminController } from '@backend/modules/admin/admin.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAdminContext } from '@backend/common/middleware/auth.middleware';
import { getUsersQuerySchema } from '@lib/validators/admin-schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * List all users with optional filters
 */
export const GET = withErrorHandler(
  withAdminContext(
    withValidation(undefined, getUsersQuerySchema)(
      (req: NextRequest, context: any) => adminController.getUsers(req, context)
    )
  )
);