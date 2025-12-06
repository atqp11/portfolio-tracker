/**
 * Admin Update User API Route (Legacy)
 *
 * PUT /api/admin/users/[id] - Update user tier or admin status
 *
 * Uses middleware pattern consistent with other routes.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminController } from '@backend/modules/admin/admin.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAdminContext } from '@backend/common/middleware/auth.middleware';
import { updateUserSchema } from '@lib/validators/admin-schemas';

export const dynamic = 'force-dynamic';

// Params schema for [id] route
const idParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * PUT /api/admin/users/[id]
 * Update user tier or admin status
 */
export const PUT = withErrorHandler(
  withAdminContext(
    withValidation(updateUserSchema)(
      async (req: NextRequest, context: any) => {
        const params = await context.params;
        const validated = idParamsSchema.parse(params);
        return adminController.updateUser(req, { ...context, params: validated });
      }
    )
  )
);
