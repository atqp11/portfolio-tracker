import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { getSyncErrors } from '@backend/modules/admin/service/admin.service';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing/sync-errors
 * Get DB sync errors (failed webhooks with mismatches)
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

    const errors = await getSyncErrors();

    return NextResponse.json({ errors });
  }
);


