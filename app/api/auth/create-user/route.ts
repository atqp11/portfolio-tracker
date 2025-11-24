import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Create User Profile API Route
 *
 * Note: With Supabase, profiles are automatically created via the
 * handle_new_user() trigger when a user signs up through Supabase Auth.
 * This endpoint is mainly for backward compatibility or manual profile creation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name } = body;

    // Validate required fields
    if (!id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: id, email' },
        { status: 400 }
      );
    }

    // Use service role key to bypass RLS for admin operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (existingProfile) {
      // Profile already exists, return success
      return NextResponse.json({
        success: true,
        user: existingProfile,
      });
    }

    // Create new profile with default "free" tier
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id,
        email,
        name: name || null,
        tier: 'free',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return NextResponse.json(
        {
          error: 'Failed to create user profile',
          details: error.message,
        },
        { status: 500 }
      );
    }

    console.log(`Profile created: ${email} (${id}) - Tier: free`);

    return NextResponse.json({
      success: true,
      user: profile,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
