/**
 * Stripe Controller - Request/Response Layer
 * 
 * Handles HTTP concerns for Stripe API endpoints and provides data methods for Server Actions.
 * Delegates business logic to stripe.service.ts.
 * 
 * Pattern: 
 * - API Routes → Controller (returns NextResponse)
 * - Server Actions → Controller (returns DTOs)
 * - Controller → Service → External API (Stripe)
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
import type {
  CreateCheckoutSessionResult,
  GetCheckoutInfoResult,
  CreatePortalSessionResult,
} from './stripe.service';
import type { Profile } from '@lib/supabase/db';

/**
 * Stripe Controller
 * 
 * Provides both:
 * - HTTP methods (for API routes) - return NextResponse
 * - Data methods (for Server Actions) - return DTOs
 */
export const stripeController = {
  // ============================================================================
  // DATA METHODS (For Server Actions - return DTOs)
  // ============================================================================

  /**
   * Create checkout session (for Server Actions)
   * Returns DTO, not HTTP response
   * 
   * Note: priceId should be server-resolved, not client-provided
   */
  async createCheckoutSessionData(
    profile: Profile,
    params: {
      tier: string;
      priceId: string; // Required: server-resolved price ID
      successUrl: string;
      cancelUrl: string;
      trialDays?: number;
    }
  ): Promise<CreateCheckoutSessionResult> {
    return await createStripeCheckoutSession({
      profile,
      tier: params.tier as 'basic' | 'premium',
      priceId: params.priceId, // Server-resolved price ID
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
      trialDays: params.trialDays,
    });
  },

  /**
   * Get checkout info (for Server Actions)
   * Returns DTO, not HTTP response
   */
  async getCheckoutInfoData(profile: Profile): Promise<GetCheckoutInfoResult> {
    return await getCheckoutInfo(profile);
  },

  /**
   * Create portal session (for Server Actions)
   * Returns DTO, not HTTP response
   */
  async createPortalSessionData(
    profile: Profile,
    returnUrl: string
  ): Promise<CreatePortalSessionResult> {
    return await createStripePortalSession({
      profile,
      returnUrl,
    });
  },

  /**
   * Get portal info (for Server Actions)
   * Returns DTO, not HTTP response
   */
  async getPortalInfoData(profile: Profile) {
    return await getPortalInfo(profile);
  },

  // ============================================================================
  // HTTP METHODS (For API Routes - return NextResponse)
  // ============================================================================

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
