import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const deactivateSchema = z.object({
  reason: z.string().min(1),
  notes: z.string().optional(),
});

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

    const body = await req.json();
    const validation = deactivateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { reason, notes } = validation.data;
    const { userId } = await params;

    const supabase = createAdminClient();

    // Deactivate user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivation_reason: reason,
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    // Log deactivation
    const { error: logError } = await supabase
      .from('user_deactivations')
      .insert({
        user_id: userId,
        admin_id: profile.id,
        reason,
        notes,
      });

    if (logError) {
      // Log the error but don't fail the request
      console.error('Failed to log deactivation:', logError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}
