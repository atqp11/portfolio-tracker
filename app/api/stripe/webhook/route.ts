/**
 * Stripe Webhook Handler
 * 
 * POST /api/stripe/webhook - Process Stripe webhook events
 * 
 * This is a thin wrapper that delegates to the Stripe service layer.
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

import { NextRequest, NextResponse } from 'next/server';
import { processStripeWebhook } from '@/src/backend/modules/stripe/stripe.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get webhook data
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // Validate configuration
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    // Delegate to service layer
    const result = await processStripeWebhook({
      body,
      signature,
      webhookSecret,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
