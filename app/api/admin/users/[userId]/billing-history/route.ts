/**
 * Admin User Billing History API Route
 *
 * GET /api/admin/users/[userId]/billing-history - Get user's billing history
 *
 * Uses middleware pattern consistent with other routes.
 */

import { NextRequest } from 'next/server';
import { adminController } from '@backend/modules/admin/admin.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAdminContext } from '@backend/common/middleware/auth.middleware';
import { userIdParamsSchema } from '@lib/validators/admin-schemas';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[userId]/billing-history
 * Get user's billing history
 */
export const GET = withErrorHandler(
  withAdminContext(
    async (req: NextRequest, context: any) => {
      const params = await context.params;
      const validated = userIdParamsSchema.parse(params);
      return adminController.getBillingHistory(req, { ...context, params: validated });
    }
  )
);
