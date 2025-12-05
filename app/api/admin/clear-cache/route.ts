/**
 * Clear Redis Cache API Route
 *
 * Manually clear all Redis cache entries on demand.
 * Requires admin authorization.
 *
 * @module api/admin/clear-cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin';
import { getCacheAdapter } from '@lib/cache/adapter';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/clear-cache
 *
 * Clears all Redis cache entries.
 *
 * Authorization: Requires admin user session
 *
 * @returns JSON response with clear operation result
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Check admin authorization
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    console.log('[Clear Cache] Starting Redis cache clear operation...');

    const cache = getCacheAdapter();

    // Get stats before clear
    const statsBefore = await cache.getStats();
    console.log('[Clear Cache] Stats before:', statsBefore);

    // Clear all cache entries
    await cache.clear();

    // Get stats after clear
    const statsAfter = await cache.getStats();
    console.log('[Clear Cache] Stats after:', statsAfter);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Redis cache cleared successfully',
      stats: {
        before: statsBefore,
        after: statsAfter,
      },
    };

    console.log('[Clear Cache] Operation completed:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Clear Cache] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}