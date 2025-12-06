/**
 * Admin User Transactions API Route
 *
 * GET /api/admin/users/[userId]/transactions - Get user's transaction log
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
 * GET /api/admin/users/[userId]/transactions
 * Get user's transaction log
 */
export const GET = withErrorHandler(
  withAdminContext(
    async (req: NextRequest, context: any) => {
      const params = await context.params;
      const validated = userIdParamsSchema.parse(params);
      return adminController.getTransactions(req, { ...context, params: validated });
    }
  )
);
