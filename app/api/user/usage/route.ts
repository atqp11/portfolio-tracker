/**
 * User Usage API
 *
 * Provides user's current usage statistics and quota information
 * Uses RLS-protected SSR client for security
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTierConfig, type TierName } from '@/lib/tiers';
import { getUserProfile } from '@/lib/auth/session';
import { getCurrentUserUsage } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/user/usage
 *
 * Returns current usage statistics for authenticated user
 * Uses SSR client with RLS for security
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching user usage...');

    // Get user profile
    const profile = await getUserProfile();
    console.log('👤 User profile:', profile ? `Found (${profile.id})` : 'Not found');

    if (!profile) {
      console.log('❌ No profile found, returning 401');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in to view your usage statistics.' },
        { status: 401 }
      );
    }

    console.log('📊 Fetching usage stats for user:', profile.id, 'tier:', profile.tier);

    // Get current usage using RLS-protected SSR client
    const usage = await getCurrentUserUsage(profile.id);
    const tierConfig = getTierConfig(profile.tier as TierName);

    // Calculate usage statistics
    const now = new Date();
    const dailyStart = new Date(now);
    dailyStart.setUTCHours(0, 0, 0, 0);
    const dailyEnd = new Date(dailyStart);
    dailyEnd.setUTCHours(23, 59, 59, 999);

    const monthlyStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthlyEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    // Format stats for frontend
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

    const chatPercent =
      tierConfig.chatQueriesPerDay === Infinity
        ? 0
        : (chatUsed / tierConfig.chatQueriesPerDay) * 100;

    const analysisPercent =
      tierConfig.portfolioAnalysisPerDay === Infinity
        ? 0
        : (analysisUsed / tierConfig.portfolioAnalysisPerDay) * 100;

    const filingPercent =
      tierConfig.secFilingsPerMonth === Infinity
        ? 0
        : (filingsUsed / tierConfig.secFilingsPerMonth) * 100;

    const stats = {
      tier: profile.tier,
      usage: {
        daily: {
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
        },
        monthly: {
          secFilings: {
            used: filingsUsed,
            limit: tierConfig.secFilingsPerMonth,
            remaining: filingsRemaining,
          },
        },
        periodStart: {
          daily: dailyStart,
          monthly: monthlyStart,
        },
        periodEnd: {
          daily: dailyEnd,
          monthly: monthlyEnd,
        },
      },
      percentages: {
        chatQueries: Math.min(100, chatPercent),
        portfolioAnalysis: Math.min(100, analysisPercent),
        secFilings: Math.min(100, filingPercent),
      },
      warnings: {
        chatQueries: chatPercent >= 80,
        portfolioAnalysis: analysisPercent >= 80,
        secFilings: filingPercent >= 80,
      },
    };

    console.log('✅ Usage stats fetched successfully (RLS-protected)');

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('❌ Error fetching user usage:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch usage stats',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
