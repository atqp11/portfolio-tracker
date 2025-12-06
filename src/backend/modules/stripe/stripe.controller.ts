/**
 * Stripe Controller - HTTP Request/Response Layer
 * 
 * Handles HTTP concerns for Stripe API endpoints.
 * Delegates business logic to stripe.service.ts.
 * 
 * Pattern: Controller → Service → External API (Stripe)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createStripeCheckoutSession,
  getCheckoutInfo,
  createStripePortalSession,
  getPortalInfo,
  processStripeWebhook,
} from './stripe.service';
import { getUserProfile } from '@lib/auth/session';
import type { CheckoutRequest, PortalRequest } from '@lib/stripe/validation';

/**
 * Extended request context with validated data
 */
interface StripeRequestContext {
  body?: CheckoutRequest | PortalRequest;
  query?: any;
}

/**
 * Stripe Controller
 */
export const stripeController = {
  /**
   * POST /api/stripe/checkout - Create checkout session
   */
  async createCheckoutSession(
    req: NextRequest,
    context: StripeRequestContext
  ): Promise<NextResponse> {
    const body = context.body as CheckoutRequest;
    const { tier, successUrl, cancelUrl, trialDays } = body;
    
    // Get profile - auth middleware already verified user exists
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User profile not found' } },
        { status: 401 }
      );
    }

    const result = await createStripeCheckoutSession({
      profile,
      tier,
      successUrl,
      cancelUrl,
      trialDays,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  },

  /**
   * GET /api/stripe/checkout - Get checkout info
   */
  async getCheckoutInfo(
    req: NextRequest,
    context: StripeRequestContext
  ): Promise<NextResponse> {
    // Get profile - auth middleware already verified user exists
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User profile not found' } },
        { status: 401 }
      );
    }

    const result = await getCheckoutInfo(profile);

    return NextResponse.json({
      success: true,
      data: result,
    });
  },

  /**
   * POST /api/stripe/portal - Create portal session
   */
  async createPortalSession(
    req: NextRequest,
    context: StripeRequestContext
  ): Promise<NextResponse> {
    const body = context.body as PortalRequest;
    const { returnUrl } = body;
    
    // Get profile - auth middleware already verified user exists
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User profile not found' } },
        { status: 401 }
      );
    }

    const result = await createStripePortalSession({
      profile,
      returnUrl,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  },

  /**
   * GET /api/stripe/portal - Get portal info
   */
  async getPortalInfo(
    req: NextRequest,
    context: StripeRequestContext
  ): Promise<NextResponse> {
    // Get profile - auth middleware already verified user exists
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User profile not found' } },
        { status: 401 }
      );
    }

    const result = await getPortalInfo(profile);

    return NextResponse.json({
      success: true,
      data: result,
    });
  },

  /**
   * POST /api/stripe/webhook - Process webhook event
   * 
   * Note: Webhooks use Stripe signature verification instead of auth middleware
   */
  async processWebhook(
    req: NextRequest,
    context: { body: string; signature: string }
  ): Promise<NextResponse> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFIGURATION_ERROR',
            message: 'Webhook secret not configured',
          },
        },
        { status: 500 }
      );
    }

    if (!context.signature) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing webhook signature',
          },
        },
        { status: 400 }
      );
    }

    const result = await processStripeWebhook({
      body: context.body,
      signature: context.signature,
      webhookSecret,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  },
};
