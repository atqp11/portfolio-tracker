import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { getProfileAsAdmin } from '@/lib/supabase/db';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/admin/users/[id]/quota
 *
 * Reset user's quota (delete usage tracking records)
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check admin authorization
  const authError = await requireAdmin(request);
  if (authError) return authError;

  try {
    const { id: userId } = await params;

    // Validate user exists
    const user = await getProfileAsAdmin(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete all usage tracking records for this user
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('usage_tracking')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error resetting quota:', error);
      return NextResponse.json(
        { error: 'Failed to reset quota' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'User quota reset successfully',
      userId,
    });
  } catch (error) {
    console.error('Error resetting quota:', error);
    return NextResponse.json(
      { error: 'Failed to reset quota' },
      { status: 500 }
    );
  }
}
