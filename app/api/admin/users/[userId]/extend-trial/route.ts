/**
 * Admin Extend Trial API Route
 *
 * POST /api/admin/users/[userId]/extend-trial - Extend user's trial period
 *
 * Uses middleware pattern consistent with other routes.
 */

import { NextRequest } from 'next/server';
import { adminController } from '@backend/modules/admin/admin.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAdminContext } from '@backend/common/middleware/auth.middleware';
import { userIdParamsSchema, extendTrialSchema } from '@lib/validators/admin-schemas';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/users/[userId]/extend-trial
 * Extend user's trial period
 */
export const POST = withErrorHandler(
  withAdminContext(
    withValidation(extendTrialSchema)(
      async (req: NextRequest, context: any) => {
        const params = await context.params;
        const validated = userIdParamsSchema.parse(params);
        return adminController.extendTrial(req, { ...context, params: validated });
      }
    )
  )
);
