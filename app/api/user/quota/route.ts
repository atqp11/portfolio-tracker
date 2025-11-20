/**
 * User Quota API
 *
 * Provides quota information for different subscription tiers.
 * Used to enforce rate limits and display usage to users.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserUsageStats,
  TIER_CONFIGS,
  calculateBreakEvenMetrics,
  type UserTier,
} from '@/lib/auth/tier-limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/user/quota
 *
 * Query params:
 * - userId: string (required)
 * - tier: 'free' | 'pro' | 'premium' (optional, defaults to 'free')
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const tier = (searchParams.get('tier') as UserTier) || 'free';

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
  }

  // Get user's current usage and limits
  const stats = getUserUsageStats(userId, tier);

  return NextResponse.json({
    userId,
    tier: stats.tier,
    limits: stats.limits,
    quotas: stats.quotas,
    usage: {
      today: stats.usage.today,
      thisMonth: stats.usage.thisMonth,
    },
    resetAt: {
      daily: stats.quotas.chatQueries.remaining > 0 ? getNextMidnight() : null,
      monthly: stats.quotas.secFilings.remaining > 0 ? getNextMonthStart() : null,
    },
  });
}

/**
 * GET /api/user/quota/tiers
 *
 * Returns all tier configurations and pricing
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'get-tiers') {
    const breakEven = calculateBreakEvenMetrics();

    return NextResponse.json({
      tiers: TIER_CONFIGS,
      breakEvenAnalysis: breakEven,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

function getNextMonthStart(): Date {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth;
}
