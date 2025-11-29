/**
 * Create User Profile API Route (Admin Operation)
 *
 * Uses service role key to bypass RLS for admin operations.
 * Note: With Supabase, profiles are automatically created via the
 * handle_new_user() trigger when a user signs up through Supabase Auth.
 * This endpoint is mainly for backward compatibility or manual profile creation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SuccessResponse, ErrorResponse } from '@lib/types/base/response.dto';
import { createProfileSchema, formatZodError } from '@lib/validators/schemas';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = createProfileSchema.safeParse(body);
    if (!validation.success) {
      const formatted = formatZodError(validation.error);
      return NextResponse.json(
        ErrorResponse.validation('Invalid profile data', undefined, formatted.errors),
        { status: 400 }
      );
    }

    const { id, email, name, tier } = validation.data;

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
      return NextResponse.json(SuccessResponse.create(existingProfile));
    }

    // Create new profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        id,
        email,
        name: name || null,
        tier,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return NextResponse.json(
        ErrorResponse.internal('Failed to create user profile', error.message),
        { status: 500 }
      );
    }

    console.log(`Profile created: ${email} (${id}) - Tier: ${tier}`);

    return NextResponse.json(
      SuccessResponse.create(profile),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      ErrorResponse.internal('Failed to create user'),
      { status: 500 }
    );
  }
}
