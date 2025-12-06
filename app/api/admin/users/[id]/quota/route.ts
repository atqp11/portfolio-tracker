/**
 * Admin Reset Quota API Route
 *
 * DELETE /api/admin/users/[id]/quota - Reset user's quota
 *
 * Uses middleware pattern consistent with other routes.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminController } from '@backend/modules/admin/admin.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAdminContext } from '@backend/common/middleware/auth.middleware';

export const dynamic = 'force-dynamic';

// Params schema for [id] route
const idParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * DELETE /api/admin/users/[id]/quota
 * Reset user's quota (delete usage tracking records)
 */
export const DELETE = withErrorHandler(
  withAdminContext(
    async (req: NextRequest, context: any) => {
      const params = await context.params;
      const validated = idParamsSchema.parse(params);
      return adminController.resetUserQuota(req, { ...context, params: validated });
    }
  )
);
