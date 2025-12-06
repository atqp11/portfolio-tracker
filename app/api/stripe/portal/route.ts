/**
 * Stripe Customer Portal
 * 
 * POST /api/stripe/portal - Create portal session
 * GET /api/stripe/portal - Get portal info
 * 
 * Uses middleware pattern consistent with other API routes.
 */

import { NextRequest } from 'next/server';
import { stripeController } from '@backend/modules/stripe/stripe.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAuth } from '@backend/common/middleware/auth.middleware';
import { portalRequestSchema } from '@lib/stripe/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/portal
 * Create a Stripe customer portal session
 */
export const POST = withErrorHandler(
  withAuth(
    withValidation(portalRequestSchema)(
      (req: NextRequest, context: any) => stripeController.createPortalSession(req, context)
    )
  )
);

/**
 * GET /api/stripe/portal
 * Get portal information for current user
 */
export const GET = withErrorHandler(
  withAuth(
    (req: NextRequest, context: any) => stripeController.getPortalInfo(req, context)
  )
);
