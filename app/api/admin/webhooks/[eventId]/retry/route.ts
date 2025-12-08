import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getUserProfile } from '@lib/auth/session';
import { retryWebhookEvent } from '@backend/modules/admin/service/retry.service';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/webhooks/[eventId]/retry
 * Manually retry a failed webhook event
 */
export const POST = withErrorHandler(
  async (req: NextRequest, { params }: { params: Promise<{ eventId: string }> }) => {
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
    const { eventId } = paramsResolved;

    if (!eventId) {
      return NextResponse.json(
        { error: { message: 'Event ID is required' } },
        { status: 400 }
      );
    }

    try {
      const result = await retryWebhookEvent(eventId);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: { message: error instanceof Error ? error.message : 'Failed to retry webhook' } },
        { status: 500 }
      );
    }
  }
);


