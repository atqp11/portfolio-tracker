import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { getBillingOverview } from '@backend/modules/admin/service/admin.service';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing/overview
 * Get billing overview metrics
 */
export const GET = withErrorHandler(
  async (req: NextRequest) => {
    // Auth check
    await requireUser();
    const viewerProfile = await getUserProfile();
    if (!viewerProfile?.is_admin) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 403 }
      );
    }

    const overview = await getBillingOverview();

    return NextResponse.json(overview);
  }
);


