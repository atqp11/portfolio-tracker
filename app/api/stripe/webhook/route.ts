/**
 * Stripe Webhook Handler
 * 
 * POST /api/stripe/webhook - Process Stripe webhook events
 * 
 * Uses middleware pattern for error handling.
 * Note: Webhooks use Stripe signature verification instead of auth middleware.
 * 
 * Set this URL in Stripe Dashboard:
 * https://yourdomain.com/api/stripe/webhook
 * 
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import { NextRequest } from 'next/server';
import { stripeController } from '@backend/modules/stripe/stripe.controller';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/webhook
 * Process Stripe webhook events
 * 
 * Note: No auth middleware - uses Stripe signature verification instead
 */
export const POST = withErrorHandler(
  async (req: NextRequest) => {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') || '';

    return stripeController.processWebhook(req, { body, signature });
  }
);
