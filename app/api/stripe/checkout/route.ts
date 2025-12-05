/**
 * Stripe Checkout Session Creation
 * 
 * POST /api/stripe/checkout - Create checkout session
 * GET /api/stripe/checkout - Get checkout info
 * 
 * This is a thin wrapper that delegates to the Stripe service layer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@lib/auth/session';
import { checkoutRequestSchema } from '@lib/stripe/validation';
import { 
  createStripeCheckoutSession, 
  getCheckoutInfo 
} from '@/src/backend/modules/stripe/stripe.service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request
    const body = await req.json();
    const validation = checkoutRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    // Delegate to service layer
    const result = await createStripeCheckoutSession({
      profile,
      ...validation.data,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Checkout session creation error:', error);
    return NextResponse.json(
      { 
        error: 'CHECKOUT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create checkout session',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const profile = await getUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delegate to service layer
    const result = await getCheckoutInfo(profile);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get checkout info error:', error);
    return NextResponse.json(
      { error: 'Failed to get checkout info' },
      { status: 500 }
    );
  }
}
