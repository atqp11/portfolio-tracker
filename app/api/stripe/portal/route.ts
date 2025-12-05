/**
 * Stripe Customer Portal
 * 
 * POST /api/stripe/portal - Create portal session
 * GET /api/stripe/portal - Get portal info
 * 
 * This is a thin wrapper that delegates to the Stripe service layer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile } from '@lib/auth/session';
import { portalRequestSchema } from '@lib/stripe/validation';
import { 
  createStripePortalSession, 
  getPortalInfo 
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
    const validation = portalRequestSchema.safeParse(body);
    
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
    const result = await createStripePortalSession({
      profile,
      returnUrl: validation.data.returnUrl,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Portal session creation error:', error);
    return NextResponse.json(
      { 
        error: 'PORTAL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create portal session',
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
    const result = await getPortalInfo(profile);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get portal info error:', error);
    return NextResponse.json(
      { error: 'Failed to get portal info' },
      { status: 500 }
    );
  }
}
