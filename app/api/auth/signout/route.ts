/**
 * Sign Out API Route
 *
 * Handles user sign out and session cleanup.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@lib/supabase/server';
import { SuccessResponse, ErrorResponse } from '@lib/types/base/response.dto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return NextResponse.json(
        ErrorResponse.internal(error.message),
        { status: 500 }
      );
    }

    // Clear session cookie
    const response = NextResponse.json(SuccessResponse.create({ signedOut: true }));
    response.cookies.set('session', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error signing out:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to sign out'),
      { status: 500 }
    );
  }
}
