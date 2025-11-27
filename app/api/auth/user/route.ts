/**
 * Get User Profile API Route
 *
 * Fetches user profile from Supabase profiles table (RLS enforced).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase/db';
import { SuccessResponse, ErrorResponse } from '@/lib/dto/base/response.dto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        ErrorResponse.badRequest('Missing user ID'),
        { status: 400 }
      );
    }

    // Fetch profile from Supabase (RLS enforced)
    const profile = await getProfile(userId);

    if (!profile) {
      return NextResponse.json(
        ErrorResponse.notFound('Profile'),
        { status: 404 }
      );
    }

    // Return profile data
    return NextResponse.json(
      SuccessResponse.create({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        tier: profile.tier,
        is_admin: profile.is_admin,
        created_at: profile.created_at,
      })
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to fetch profile'),
      { status: 500 }
    );
  }
}
