/**
 * Stripe Checkout Session Creation
 * 
 * POST /api/stripe/checkout - Create checkout session
 * GET /api/stripe/checkout - Get checkout info
 * 
 * Uses middleware pattern consistent with other API routes.
 */

import { NextRequest } from 'next/server';
import { stripeController } from '@backend/modules/stripe/stripe.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withValidation } from '@backend/common/middleware/validation.middleware';
import { withAuth } from '@backend/common/middleware/auth.middleware';
import { checkoutRequestSchema } from '@lib/stripe/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/checkout
 * Create a Stripe checkout session for subscription upgrade
 */
export const POST = withErrorHandler(
  withAuth(
    withValidation(checkoutRequestSchema)(
      (req: NextRequest, context: any) => stripeController.createCheckoutSession(req, context)
    )
  )
);

/**
 * GET /api/stripe/checkout
 * Get checkout information for current user
 */
export const GET = withErrorHandler(
  withAuth(
    (req: NextRequest, context: any) => stripeController.getCheckoutInfo(req, context)
  )
);
