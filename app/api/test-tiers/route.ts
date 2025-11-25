/**
 * Test API Endpoint for Tier System
 *
 * Tests tier configuration, usage tracking, and quota enforcement
 *
 * Usage:
 * GET /api/test-tiers - Run all tests
 * GET /api/test-tiers?test=config - Test configuration only
 * GET /api/test-tiers?test=usage&userId=xxx&tier=free - Test usage for specific user
 * POST /api/test-tiers - Simulate usage (body: { userId, tier, action, count })
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getTierConfig,
  hasFeature,
  hasTierLevel,
  getNextTier,
  getUserUsage,
  checkQuota,
  trackUsage,
  getUsageStats,
  type TierName,
  type UsageAction,
} from '@/lib/tiers';

export const dynamic = 'force-dynamic';

/**
 * GET - Run tests
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testType = searchParams.get('test') || 'all';
  const userId = searchParams.get('userId') || 'test-user-' + Date.now();
  const tier = (searchParams.get('tier') || 'free') as TierName;

  const results: any = {
    timestamp: new Date().toISOString(),
    testType,
    userId,
  };

  try {
    // Test 1: Configuration
    if (testType === 'all' || testType === 'config') {
      results.configuration = {
        free: getTierConfig('free'),
        basic: getTierConfig('basic'),
        premium: getTierConfig('premium'),
      };

      results.features = {
        free: {
          advancedAI: hasFeature('free', 'advancedAI'),
          technicalAnalysis: hasFeature('free', 'technicalAnalysis'),
          monteCarloSimulations: hasFeature('free', 'monteCarloSimulations'),
        },
        basic: {
          advancedAI: hasFeature('basic', 'advancedAI'),
          technicalAnalysis: hasFeature('basic', 'technicalAnalysis'),
          monteCarloSimulations: hasFeature('basic', 'monteCarloSimulations'),
        },
        premium: {
          advancedAI: hasFeature('premium', 'advancedAI'),
          technicalAnalysis: hasFeature('premium', 'technicalAnalysis'),
          monteCarloSimulations: hasFeature('premium', 'monteCarloSimulations'),
        },
      };

      results.hierarchy = {
        freeHasBasic: hasTierLevel('free', 'basic'),
        basicHasBasic: hasTierLevel('basic', 'basic'),
        basicHasPremium: hasTierLevel('basic', 'premium'),
        premiumHasBasic: hasTierLevel('premium', 'basic'),
      };

      results.upgrades = {
        freeNext: getNextTier('free'),
        basicNext: getNextTier('basic'),
        premiumNext: getNextTier('premium'),
      };
    }

    // Test 2: Usage tracking (database operations)
    if (testType === 'all' || testType === 'usage') {
      try {
        const usage = await getUserUsage(userId, tier);
        const stats = await getUsageStats(userId, tier);

        results.usage = {
          tier,
          userId,
          usage,
          stats,
        };
      } catch (error) {
        results.usageError = {
          message: error instanceof Error ? error.message : String(error),
          note: 'Make sure the usage_tracking table exists in your database',
        };
      }
    }

    // Test 3: Quota checks
    if (testType === 'all' || testType === 'quota') {
      const actions: UsageAction[] = ['chatQuery', 'portfolioAnalysis', 'secFiling'];

      results.quotaChecks = {};

      for (const action of actions) {
        try {
          const quota = await checkQuota(userId, action, tier);
          results.quotaChecks[action] = quota;
        } catch (error) {
          results.quotaChecks[action] = {
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Simulate usage tracking
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId = 'test-user-' + Date.now(),
      tier = 'free',
      action = 'chatQuery',
      count = 1,
    } = body;

    // Validate tier
    if (!['free', 'basic', 'premium'].includes(tier)) {
      return NextResponse.json(
        {
          error: 'Invalid tier',
          validTiers: ['free', 'basic', 'premium'],
          received: tier,
        },
        { status: 400 }
      );
    }

    // Validate action
    if (!['chatQuery', 'portfolioAnalysis', 'secFiling'].includes(action)) {
      return NextResponse.json(
        {
          error: 'Invalid action',
          validActions: ['chatQuery', 'portfolioAnalysis', 'secFiling'],
          received: action,
        },
        { status: 400 }
      );
    }

    const results = [];
    let quotaExceeded = false;

    // Track usage multiple times
    for (let i = 0; i < count; i++) {
      // Check quota before tracking
      const quota = await checkQuota(userId, action as UsageAction, tier as TierName);

      if (!quota.allowed) {
        results.push({
          iteration: i + 1,
          success: false,
          message: quota.reason || 'Quota exceeded',
          remaining: quota.remaining,
          limit: quota.limit,
        });
        quotaExceeded = true;
        break;
      }

      // Track the usage
      await trackUsage(userId, action as UsageAction, tier as TierName);

      // Check quota after tracking
      const afterUsage = await checkQuota(userId, action as UsageAction, tier as TierName);

      results.push({
        iteration: i + 1,
        success: true,
        remaining: afterUsage.remaining,
        limit: afterUsage.limit,
        percentUsed: afterUsage.limit === Infinity ? 0 : ((afterUsage.limit - afterUsage.remaining) / afterUsage.limit) * 100,
      });
    }

    // Get final stats
    const finalStats = await getUsageStats(userId, tier as TierName);

    return NextResponse.json({
      success: true,
      userId,
      tier,
      action,
      requestedCount: count,
      actuallyTracked: results.filter((r) => r.success).length,
      quotaExceeded,
      results,
      finalStats,
    });
  } catch (error) {
    console.error('Tracking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
