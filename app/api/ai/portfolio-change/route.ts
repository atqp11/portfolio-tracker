/**
 * Portfolio Change Quota API Route
 *
 * Handles checking and tracking portfolio change quota for batch cache refresh.
 * 
 * SIMPLIFIED DESIGN:
 * - Client (localStorage) handles change DETECTION
 * - Server only COUNTS changes against quota
 * 
 * Free tier: Limited portfolio changes per day (3)
 * Basic/Premium: Unlimited portfolio changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@backend/common/middleware/error-handler.middleware';
import { withAuth } from '@backend/common/middleware/auth.middleware';
import { checkQuota, trackUsage, getUserUsage } from '@lib/tiers/usage-tracker';
import { getTierConfig, TierName } from '@lib/tiers/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/ai/portfolio-change
 * Check quota status for portfolio changes
 * 
 * Response:
 * - allowed: boolean - whether another change is allowed
 * - remaining: number - remaining portfolio changes for the day
 * - limit: number - daily limit for portfolio changes
 * - unlimited: boolean - whether user has unlimited changes
 */
async function handleGet(req: NextRequest, context: { userId: string; userTier: TierName }) {
  const { userId, userTier } = context;
  
  const tierConfig = getTierConfig(userTier);
  
  // Basic and Premium tiers have unlimited changes
  if (tierConfig.portfolioChangesPerDay === Infinity) {
    return NextResponse.json({
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      unlimited: true,
    });
  }
  
  // Free tier - check quota
  const quota = await checkQuota(userId, 'portfolioChange', userTier);
  
  return NextResponse.json({
    allowed: quota.allowed,
    remaining: quota.remaining,
    limit: quota.limit,
    unlimited: false,
    reason: quota.reason,
  });
}

/**
 * POST /api/ai/portfolio-change
 * Record a portfolio change (called after successful batch refresh)
 * 
 * Body:
 * - success: boolean - whether the batch refresh succeeded
 * 
 * This should be called AFTER a successful batch refresh where portfolio changed
 */
async function handlePost(req: NextRequest, context: { userId: string; userTier: TierName }) {
  const { userId, userTier } = context;
  
  const body = await req.json();
  const { success } = body;
  
  if (!success) {
    return NextResponse.json({
      tracked: false,
      reason: 'Batch was not successful',
    });
  }
  
  const tierConfig = getTierConfig(userTier);
  
  // Don't track for unlimited tiers
  if (tierConfig.portfolioChangesPerDay === Infinity) {
    return NextResponse.json({
      tracked: false,
      reason: 'Unlimited tier',
      unlimited: true,
    });
  }
  
  // Track the portfolio change
  await trackUsage(userId, 'portfolioChange', userTier);
  
  // Get updated quota
  const usage = await getUserUsage(userId, userTier);
  
  return NextResponse.json({
    tracked: true,
    remaining: usage.daily.portfolioChanges.remaining,
    limit: tierConfig.portfolioChangesPerDay,
  });
}

export const GET = withErrorHandler(
  withAuth(handleGet)
);

export const POST = withErrorHandler(
  withAuth(handlePost)
);