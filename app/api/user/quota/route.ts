/**
 * User Quota API
 *
 * Provides quota information for different subscription tiers.
 * Uses database-backed usage tracking for reliability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTierConfig, TIER_CONFIG, EXAMPLE_SCENARIOS, type TierName } from '@lib/tiers';
import { getUserProfile } from '@lib/auth/session';
import { getCurrentUserUsage } from '@lib/supabase/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/user/quota
 *
 * Returns quota information for authenticated user
 * Uses RLS-protected database queries
 */
export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const profile = await getUserProfile();

    if (!profile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const tier = profile.tier as TierName;
    const tierConfig = getTierConfig(tier);
    const usage = await getCurrentUserUsage(profile.id);

    // Calculate quotas
    const chatUsed = usage.daily?.chat_queries || 0;
    const analysisUsed = usage.daily?.portfolio_analysis || 0;
    const filingsUsed = usage.monthly?.sec_filings || 0;

    const chatRemaining =
      tierConfig.chatQueriesPerDay === Infinity
        ? Infinity
        : Math.max(0, tierConfig.chatQueriesPerDay - chatUsed);

    const analysisRemaining =
      tierConfig.portfolioAnalysisPerDay === Infinity
        ? Infinity
        : Math.max(0, tierConfig.portfolioAnalysisPerDay - analysisUsed);

    const filingsRemaining =
      tierConfig.secFilingsPerMonth === Infinity
        ? Infinity
        : Math.max(0, tierConfig.secFilingsPerMonth - filingsUsed);

    return NextResponse.json({
      userId: profile.id,
      tier,
      limits: {
        chatQueriesPerDay: tierConfig.chatQueriesPerDay,
        portfolioAnalysisPerDay: tierConfig.portfolioAnalysisPerDay,
        secFilingsPerMonth: tierConfig.secFilingsPerMonth,
      },
      quotas: {
        chatQueries: {
          used: chatUsed,
          limit: tierConfig.chatQueriesPerDay,
          remaining: chatRemaining,
        },
        portfolioAnalysis: {
          used: analysisUsed,
          limit: tierConfig.portfolioAnalysisPerDay,
          remaining: analysisRemaining,
        },
        secFilings: {
          used: filingsUsed,
          limit: tierConfig.secFilingsPerMonth,
          remaining: filingsRemaining,
        },
      },
      resetAt: {
        daily: getNextMidnight(),
        monthly: getNextMonthStart(),
      },
    });
  } catch (error) {
    console.error('Error fetching quota:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quota information' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/quota
 *
 * Returns all tier configurations and pricing
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  if (action === 'get-tiers') {
    return NextResponse.json({
      tiers: TIER_CONFIG,
      breakEvenAnalysis: EXAMPLE_SCENARIOS,
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
