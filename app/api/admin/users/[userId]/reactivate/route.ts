import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin
    const profile = await getUserProfile();
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await params;

    const supabase = createAdminClient();

    // Reactivate user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        deactivated_at: null,
        deactivation_reason: null,
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Update deactivation log
    const { error: logError } = await supabase
      .from('user_deactivations')
      .update({
        reactivated_at: new Date().toISOString(),
        reactivated_by: profile.id,
      })
      .eq('user_id', userId)
      .is('reactivated_at', null);

    if (logError) {
      // Log the error but don't fail the request
      console.error('Failed to update deactivation log:', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reactivating user:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate user' },
      { status: 500 }
    );
  }
}
