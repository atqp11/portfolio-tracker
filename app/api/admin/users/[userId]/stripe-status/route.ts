import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getUserProfile } from '@lib/auth/session';
import * as adminService from '@backend/modules/admin/service/admin.service';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[userId]/stripe-status
 * Get Stripe subscription status for diagnostics
 */
export const GET = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
    // Auth check
    await requireUser();
    const viewerProfile = await getUserProfile();
    if (!viewerProfile?.is_admin) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    const paramsResolved = await params;
    const { userId } = paramsResolved;

    const status = await adminService.getStripeSubscriptionStatus(userId);

    return NextResponse.json(status);
  }
);

