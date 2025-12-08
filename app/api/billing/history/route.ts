/**
 * User Billing History API Route
 * 
 * GET /api/billing/history - Get current user's billing history (invoices)
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
 * GET /api/billing/history
 * Get current user's billing history (invoices)
 */
export const GET = withErrorHandler(
  withAuthContext(
    (req: NextRequest, context: any) => billingController.getHistory(req, context)
  )
);
