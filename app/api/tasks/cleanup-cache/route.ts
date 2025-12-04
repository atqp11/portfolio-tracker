/**
 * Cache Cleanup Cron Job API Route
 *
 * This route is called by Vercel Cron to clean up expired L3 cache entries.
 * Runs daily at 3:00 AM UTC.
 *
 * Security: Protected by CRON_SECRET authorization header
 *
 * @module api/tasks/cleanup-cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseCache } from '@lib/cache/database-cache.adapter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tasks/cleanup-cache
 *
 * Cleans up expired cache entries in the L3 (database) cache.
 *
 * Authorization: Requires CRON_SECRET in Authorization header
 *
 * @returns JSON response with cleanup statistics
 *
 * @example
 * // Vercel Cron configuration in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/tasks/cleanup-cache",
 *     "schedule": "0 3 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ========================================================================
    // SECURITY: Verify cron secret
    // ========================================================================
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (!authHeader || authHeader !== expectedAuth) {
      console.error('[Cache Cleanup] Unauthorized access attempt');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Invalid or missing CRON_SECRET',
        },
        { status: 401 }
      );
    }

    console.log('[Cache Cleanup] Starting L3 cache cleanup job...');

    // ========================================================================
    // CLEANUP EXPIRED ENTRIES
    // ========================================================================
    const dbCache = getDatabaseCache();

    // Get stats before cleanup
    const statsBefore = await dbCache.getStats();
    console.log('[Cache Cleanup] Stats before:', statsBefore);

    // Run cleanup
    const deletedCount = await dbCache.cleanupExpiredData();

    // Get stats after cleanup
    const statsAfter = await dbCache.getStats();
    console.log('[Cache Cleanup] Stats after:', statsAfter);

    // ========================================================================
    // CALCULATE METRICS
    // ========================================================================
    const duration = Date.now() - startTime;
    const spaceSavedMB = parseFloat(
      (statsBefore.total_size_estimate_mb - statsAfter.total_size_estimate_mb).toFixed(2)
    );

    // ========================================================================
    // RETURN RESULTS
    // ========================================================================
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      deleted_entries: deletedCount,
      space_saved_mb: spaceSavedMB,
      stats: {
        before: statsBefore,
        after: statsAfter,
      },
    };

    console.log('[Cache Cleanup] Job completed successfully:', result);

    return NextResponse.json(result);
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    console.error('[Cache Cleanup] Job failed:', error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Cache cleanup job failed',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks/cleanup-cache
 *
 * Manual trigger for cache cleanup (for testing or emergency use)
 * Requires admin authentication
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // ========================================================================
    // SECURITY: For manual triggers, you might want to add admin auth here
    // ========================================================================
    // const session = await getServerSession();
    // if (!session?.user?.isAdmin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('[Cache Cleanup] Manual cleanup triggered');

    // ========================================================================
    // CLEANUP LOGIC (same as GET)
    // ========================================================================
    const dbCache = getDatabaseCache();
    const statsBefore = await dbCache.getStats();
    const deletedCount = await dbCache.cleanupExpiredData();
    const statsAfter = await dbCache.getStats();

    const duration = Date.now() - startTime;
    const spaceSavedMB = parseFloat(
      (statsBefore.total_size_estimate_mb - statsAfter.total_size_estimate_mb).toFixed(2)
    );

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      deleted_entries: deletedCount,
      space_saved_mb: spaceSavedMB,
      triggered_by: 'manual',
      stats: {
        before: statsBefore,
        after: statsAfter,
      },
    };

    console.log('[Cache Cleanup] Manual cleanup completed:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cache Cleanup] Manual cleanup failed:', error);

    const duration = Date.now() - startTime;

    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Manual cache cleanup failed',
      },
      { status: 500 }
    );
  }
}
