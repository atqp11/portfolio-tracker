/**
 * Admin Sync Subscription API Route
 *
 * POST /api/admin/users/[userId]/sync-subscription - Sync user's subscription from Stripe
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
 * POST /api/admin/users/[userId]/sync-subscription
 * Sync user's subscription from Stripe
 */
export const POST = withErrorHandler(
  withAdminContext(
    async (req: NextRequest, context: any) => {
      const params = await context.params;
      const validated = userIdParamsSchema.parse(params);
      return adminController.syncSubscription(req, { ...context, params: validated });
    }
  )
);
