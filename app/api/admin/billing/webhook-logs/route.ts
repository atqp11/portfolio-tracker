import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { getWebhookLogs } from '@backend/modules/admin/service/admin.service';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/billing/webhook-logs
 * Get webhook logs with pagination
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

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = await getWebhookLogs(limit);

    return NextResponse.json({ logs });
  }
);


