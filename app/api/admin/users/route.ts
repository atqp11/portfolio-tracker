/**
 * Admin Users API Route
 *
 * Admin-only endpoint to manage users.
 * Uses admin client to bypass RLS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@lib/auth/admin';
import { getAllUsers, getCurrentUserUsage } from '@lib/supabase/db';
import { SuccessResponse, ErrorResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 *
 * Get all users with their tier and usage information (Admin only)
 */
export async function GET(request: NextRequest) {
  // Check admin authorization
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    // Fetch all users (uses admin client, bypasses RLS)
    const users = await getAllUsers();

    // Fetch usage data for each user
    const usersWithUsage = await Promise.all(
      users.map(async (user) => {
        const usage = await getCurrentUserUsage(user.id);
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tier: user.tier,
          is_admin: user.is_admin,
          created_at: user.created_at,
          stripe_customer_id: user.stripe_customer_id,
          subscription_status: user.subscription_status,
          usage: {
            daily: usage.daily
              ? {
                  chatQueries: usage.daily.chat_queries,
                  portfolioAnalysis: usage.daily.portfolio_analysis,
                  secFilings: usage.daily.sec_filings,
                }
              : null,
            monthly: usage.monthly
              ? {
                  chatQueries: usage.monthly.chat_queries,
                  portfolioAnalysis: usage.monthly.portfolio_analysis,
                  secFilings: usage.monthly.sec_filings,
                }
              : null,
          },
        };
      })
    );

    return NextResponse.json(
      SuccessResponse.create({
        users: usersWithUsage,
        total: usersWithUsage.length,
      })
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to fetch users'),
      { status: 500 }
    );
  }
}
