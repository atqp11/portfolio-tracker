/**
 * User Subscription Info API Route
 * 
 * GET /api/billing/subscription - Get current user's subscription details
 * 
 * Uses middleware pattern consistent with other API routes.
 */

import { NextRequest } from 'next/server';
import { billingController } from '@backend/modules/billing/billing.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAuthContext } from '@backend/common/middleware/cache-quota.middleware';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/billing/subscription
 * Get current user's subscription details
 */
export const GET = withErrorHandler(
  withAuthContext(
    (req: NextRequest, context: any) => billingController.getSubscription(req, context)
  )
);
