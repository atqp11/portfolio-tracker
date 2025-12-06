/**
 * Admin User Details API Route
 *
 * GET /api/admin/users/[userId] - Get single user details
 * PUT /api/admin/users/[userId] - Update user tier or admin status
 *
 * Uses middleware pattern consistent with other routes.
 */

import { NextRequest } from 'next/server';
import { adminController } from '@backend/modules/admin/admin.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAdminContext } from '@backend/common/middleware/auth.middleware';
import { userIdParamsSchema, updateUserSchema } from '@lib/validators/admin-schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[userId]
 * Get single user details
 */
export const GET = withErrorHandler(
  withAdminContext(
    async (req: NextRequest, context: any) => {
      // Await and validate params
      const params = await context.params;
      const validated = userIdParamsSchema.parse(params);
      return adminController.getUserById(req, { ...context, params: validated });
    }
  )
);

/**
 * PUT /api/admin/users/[userId]
 * Update user tier or admin status
 */
export const PUT = withErrorHandler(
  withAdminContext(
    withValidation(updateUserSchema)(
      async (req: NextRequest, context: any) => {
        const params = await context.params;
        const validated = userIdParamsSchema.parse(params);
        return adminController.updateUser(req, { ...context, params: validated });
      }
    )
  )
);
