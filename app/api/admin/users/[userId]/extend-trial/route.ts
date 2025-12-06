import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@lib/supabase/admin';
import { getUserProfile } from '@lib/auth/session';
import { getStripe } from '@lib/stripe/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const extendTrialSchema = z.object({
  days: z.number().int().positive(),
  reason: z.string().optional(),
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
    const validation = extendTrialSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { days, reason } = validation.data;
    const { userId } = await params;

    const supabase = createAdminClient();

    // Get user's subscription
    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select('stripe_subscription_id, trial_ends_at')
      .eq('id', userId)
      .single();

    if (userError || !user?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'User has no active subscription' },
        { status: 400 }
      );
    }

    // Extend trial in Stripe
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

    const newTrialEnd = new Date(subscription.trial_end ? subscription.trial_end * 1000 : Date.now());
    newTrialEnd.setDate(newTrialEnd.getDate() + days);

    await stripe.subscriptions.update(user.stripe_subscription_id, {
      trial_end: Math.floor(newTrialEnd.getTime() / 1000),
    });

    // Update trial end in database
    const { error: dbError } = await supabase
      .from('profiles')
      .update({ trial_ends_at: newTrialEnd.toISOString() })
      .eq('id', userId);

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ success: true, newTrialEnd: newTrialEnd.toISOString() });
  } catch (error) {
    console.error('Error extending trial:', error);
    return NextResponse.json(
      { error: 'Failed to extend trial' },
      { status: 500 }
    );
  }
}
